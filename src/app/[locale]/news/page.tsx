import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { LocaleParams } from "@/i18n/routing";
import { getNewsFromDB } from "@/lib/news";
import { requireNonEmptyNews } from "@/lib/news/db";
import type { NewsArticle } from "@/lib/news/types";
import { getLatestDigest } from "@/lib/news/digest";
import { NewsFeed } from "@/components/news/news-feed";
import { DigestCard } from "@/components/news/digest-card";
import { PageHero } from "@/components/ui/page-hero";
import { makePageMeta, buildBreadcrumbJsonLd, getCanonical } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "News.metadata" });
  const title = t("title");
  const description = t("description");
  return { title, description, ...makePageMeta(title, description, { locale, path: "/news" }) };
}

// Enough articles for the feed to find the same story told by several outlets
// (StoryCard); 36 rarely held two takes on one story.
const NEWS_PAGE_LIMIT = 72;

// Cache the heavy DB reads across requests (Next Data Cache). The page itself
// stays dynamic because it reads the locale cookie, but the article/digest/
// engagement queries now hit the cache instead of Supabase on every load.
// `lang` is part of the cache key so EN/VI keep separate entries. The "news"
// tag is busted by the sync route, so a fresh sync shows up immediately.
const getCachedNewsList = unstable_cache(
  async () => requireNonEmptyNews(getNewsFromDB(NEWS_PAGE_LIMIT, undefined, { skipSync: true })),
  ["news-page-list-v4"],
  { revalidate: 300, tags: ["news"] },
);

const getCachedNewsDigest = unstable_cache(
  async () => getLatestDigest(),
  ["news-page-digest-v1"],
  { revalidate: 1800, tags: ["news-digest"] },
);

// Was fresh only because the root layout forced dynamic rendering; the cached
// queries below revalidate on their own, this bounds the page itself.
export const revalidate = 600;

// `?source=` used to be read here, which made every visit render on demand in a
// single region. NewsFeed reads it after hydration instead, so both locales are
// prerendered and served from the CDN edge — the articles are all in the HTML
// either way, the parameter only chooses which of them to show.
export default async function NewsPage({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("News");
  const userLang: "en" | "vi" = locale === "vi" ? "vi" : "en";

  const [allArticles, digest] = await Promise.all([
    getCachedNewsList().catch((): NewsArticle[] => []),
    // getLatestDigest throws on a DB error so the failure is not cached.
    getCachedNewsDigest().catch(() => null),
  ]);
  const nowMs = new Date().getTime();

  const localArticles = allArticles.filter((a) => a.language === "vi");
  const globalArticles = allArticles.filter((a) => a.language === "en");

  return (
    <div className="min-h-screen">
      <JsonLd data={buildBreadcrumbJsonLd([
        { name: t("breadcrumb.home"), url: getCanonical("/") },
        { name: t("title"), url: getCanonical("/news") },
      ])} />

      <PageHero
        eyebrow={t("tagline")}
        title={t("title")}
        description={t("heroDesc")}
        image="/assets/lfc/fans/fans-anfield.webp"
      />

      {digest && (
        <div className="page-container pb-4 pt-4 sm:pb-6 sm:pt-6">
          <DigestCard
            as="h2"
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
      />

      <p className="page-container max-w-3xl pb-14 text-[13px] leading-relaxed text-stadium-muted">{t("attribution")}</p>
    </div>
  );
}
