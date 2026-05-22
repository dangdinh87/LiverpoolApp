import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { getTranslations } from "next-intl/server";
import { getLocale } from "next-intl/server";
import { getNewsFromDB, getArticleEngagement } from "@/lib/news";
import { getLatestDigest } from "@/lib/news/digest";
import { NewsFeed } from "@/components/news/news-feed";
import { DigestCard } from "@/components/news/digest-card";
import { makePageMeta, buildBreadcrumbJsonLd, getCanonical } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("News.metadata");
  const title = t("title");
  const description = t("description");
  return { title, description, ...makePageMeta(title, description, { path: "/news" }) };
}

const NEWS_PAGE_LIMIT = 60;

// Cache the heavy DB reads across requests (Next Data Cache). The page itself
// stays dynamic because it reads the locale cookie, but the article/digest/
// engagement queries now hit the cache instead of Supabase on every load.
// `lang` is part of the cache key so EN/VI keep separate entries. The "news"
// tag is busted by the sync route, so a fresh sync shows up immediately.
const getCachedNewsList = unstable_cache(
  async (lang: "en" | "vi") => getNewsFromDB(NEWS_PAGE_LIMIT, lang, { skipSync: true }),
  ["news-page-list-v1"],
  { revalidate: 300, tags: ["news"] },
);

const getCachedNewsDigest = unstable_cache(
  async () => getLatestDigest(),
  ["news-page-digest-v1"],
  { revalidate: 1800, tags: ["news-digest"] },
);

const getCachedNewsEngagement = unstable_cache(
  async () => Array.from((await getArticleEngagement()).entries()),
  ["news-page-engagement-v1"],
  { revalidate: 300, tags: ["news"] },
);

export default async function NewsPage() {
  const [t, locale] = await Promise.all([
    getTranslations("News"),
    getLocale(),
  ]);
  const userLang: "en" | "vi" = locale === "vi" ? "vi" : "en";
  // Fetch both VI + EN articles, biased toward the current locale for the default tab.
  const [allArticles, digest, engagementEntries] = await Promise.all([
    getCachedNewsList(userLang),
    getCachedNewsDigest(),
    getCachedNewsEngagement(),
  ]);
  const engagementMap = new Map(engagementEntries);
  // Serialize engagement map for client component
  const engagement: Record<string, { likes: number; comments: number; total: number }> = {};
  for (const [url, data] of engagementMap) {
    engagement[url] = { likes: data.likes, comments: data.comments, total: data.total };
  }
  const nowMs = new Date().getTime();
  // Ensure very recent articles (last 12h) are visible in both tabs if they are highly relevant
  const freshThreshold = nowMs - 12 * 60 * 60 * 1000;
  
  const localArticles = allArticles.filter((a) => a.language === userLang || new Date(a.pubDate).getTime() > freshThreshold);
  const globalArticles = allArticles.filter((a) => a.language !== userLang || new Date(a.pubDate).getTime() > freshThreshold);

  // Re-sort both to ensure chronological order after mixing
  localArticles.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
  globalArticles.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

  const sources = [
    "LiverpoolFC.com", "BBC Sport", "The Guardian", "This Is Anfield",
    "Liverpool Echo", "Sky Sports", "Anfield Watch", "Empire of the Kop",
    "Daily Mirror", "The Independent", "MEN", "Anfield Index", "Liverpool.com", "ESPN",
    "Bóng Đá", "Bóng Đá+", "24h", "VnExpress", "Tuổi Trẻ", "Thanh Niên",
    "Dân Trí", "Zing News", "VietNamNet", "Webthethao", "Vietnam.vn",
    "Bóng Đá 24h", "Thể Thao 247", "Soha",
  ].join(", ");

  return (
    <div className="min-h-screen">
      <JsonLd data={buildBreadcrumbJsonLd([
        { name: "Home", url: getCanonical("/") },
        { name: "News", url: getCanonical("/news") },
      ])} />
      {/* Hero Banner — compact, with pt for navbar clearance */}
      <div className="relative min-h-[160px] flex items-end pt-16">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('/assets/lfc/fans/fans-anfield-crowd.webp')",
          }}
        />
        <div className="absolute inset-0 bg-linear-to-t from-stadium-bg via-stadium-bg/70 to-transparent" />
        <div className="absolute inset-0 bg-linear-to-r from-stadium-bg/80 to-transparent" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 pt-6 w-full">
          <h1 className="font-bebas text-5xl md:text-6xl text-white tracking-wider leading-none mb-1">
            {t("title")}
          </h1>
          <p className="font-inter text-stadium-muted text-sm max-w-2xl">
            {t("heroDesc")}
          </p>
        </div>
      </div>

      {/* News Feed */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-16">
        {digest && (
          <div className="mb-4">
            <DigestCard
              date={digest.digest_date}
              title={digest.title}
              summary={digest.summary}
              articleCount={digest.article_count}
              generatedAt={digest.generated_at}
            />
          </div>
        )}

        <NewsFeed
          localArticles={localArticles}
          globalArticles={globalArticles}
          locale={userLang}
          nowMs={nowMs}
          engagement={engagement}
        />

        {/* Attribution */}
        <p className="text-center text-stadium-muted font-inter text-xs mt-10">
          {t("attribution", { sources })}
        </p>
      </div>
    </div>
  );
}
