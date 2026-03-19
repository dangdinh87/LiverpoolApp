import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { getNewsFromDB, getArticleEngagement } from "@/lib/news";
import type { ArticleEngagement } from "@/lib/news";
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

// Always fetch fresh data from DB on each request
export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const [t, locale] = await Promise.all([
    getTranslations("News"),
    getLocale(),
  ]);
  const userLang = locale === "vi" ? "vi" : "en";
  // Fetch both vi + en articles — balanced 30 each (no lang bias so both tabs have content)
  const [allArticles, digest, engagementMap] = await Promise.all([
    getNewsFromDB(60),
    getLatestDigest(),
    getArticleEngagement(),
  ]);
  // Serialize engagement map for client component
  const engagement: Record<string, { likes: number; comments: number; total: number }> = {};
  for (const [url, data] of engagementMap) {
    engagement[url] = { likes: data.likes, comments: data.comments, total: data.total };
  }
  // Always split by Vietnamese vs International (not relative to user locale)
  const localArticles = allArticles.filter((a) => a.language === "vi");
  const globalArticles = allArticles.filter((a) => a.language !== "vi");

  const sources = [
    "LiverpoolFC.com", "BBC Sport", "The Guardian", "This Is Anfield",
    "Liverpool Echo", "Sky Sports", "Anfield Watch",
    "Bóng Đá", "Bóng Đá+", "24h", "VnExpress", "Tuổi Trẻ", "Thanh Niên",
    "Dân Trí", "Zing News", "VietNamNet", "Webthethao", "Vietnam.vn",
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
        <div className="absolute inset-0 bg-gradient-to-t from-stadium-bg via-stadium-bg/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-stadium-bg/80 to-transparent" />
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
