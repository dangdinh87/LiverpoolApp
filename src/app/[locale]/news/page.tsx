import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { LocaleParams } from "@/i18n/routing";
import { getNewsFromDB, getVideoItemsFromDB } from "@/lib/news";
import { requireNonEmptyNews } from "@/lib/news/db";
import type { NewsArticle } from "@/lib/news/types";
import { getCachedLatestDigest, getDigestHeadline } from "@/lib/news/latest-digest";
import { clusterStories } from "@/lib/news/story-clusters";
import { NewsFeed } from "@/components/news/news-feed";
import { VideoStrip } from "@/components/news/video-strip";
import { DigestCard } from "@/components/news/digest-card";
import { NewStoriesCount } from "@/components/news/new-since";
import { cleanTitle } from "@/components/news/news-text";
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
// tag is busted by the sync and cleanup routes, so a fresh sync shows up
// immediately rather than waiting out the TTL below.
const getCachedNewsList = unstable_cache(
  async () => requireNonEmptyNews(getNewsFromDB(NEWS_PAGE_LIMIT, undefined, { skipSync: true })),
  ["news-page-list-v4"],
  // Fresh via the "news" tag on sync; this window only bounds a silent sync.
  { revalidate: 1800, tags: ["news"] },
);

// Videos are excluded from the feed queries on purpose (see NON_ARTICLE_SOURCES);
// this is the only reader that wants them. An empty list is a fine thing to
// cache here — the site runs without YOUTUBE_API_KEY and the strip hides itself.
const getCachedVideoItems = unstable_cache(
  async () => getVideoItemsFromDB(6),
  ["news-page-video-v1"],
  { revalidate: 900, tags: ["news"] },
);

// Was fresh only because the root layout forced dynamic rendering; the cached
// queries below revalidate on their own, this bounds the page itself.
// 30 minutes is safe because the hourly sync busts the "news" tag the moment
// it inserts anything, so a new article does not wait for this to expire.
export const revalidate = 1800;

// `?source=` used to be read here, which made every visit render on demand in a
// single region. NewsFeed reads it after hydration instead, so both locales are
// prerendered and served from the CDN edge — the articles are all in the HTML
// either way, the parameter only chooses which of them to show.
export default async function NewsPage({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("News");
  const userLang: "en" | "vi" = locale === "vi" ? "vi" : "en";

  const [allArticles, digest, videos] = await Promise.all([
    getCachedNewsList().catch((): NewsArticle[] => []),
    // The same cached read as the homepage: both lead with the same day's briefing.
    // getLatestDigest throws on a DB error so the failure is not cached.
    getCachedLatestDigest().catch(() => null),
    getCachedVideoItems().catch((): NewsArticle[] => []),
  ]);
  const nowMs = new Date().getTime();

  const localArticles = allArticles.filter((a) => a.language === "vi");
  const globalArticles = allArticles.filter((a) => a.language === "en");
  // When each story of the default view came out, so "N new stories" can count
  // them against the reader's previous visit in the browser (NewsFeed clusters
  // the same articles the same way, so the count matches the divider).
  const storyTimes = clusterStories(userLang === "vi" ? localArticles : globalArticles).map((s) =>
    new Date(s.lead.pubDate).getTime(),
  );

  return (
    <div className="min-h-screen">
      <JsonLd data={buildBreadcrumbJsonLd([
        { name: t("breadcrumb.home"), url: getCanonical("/") },
        { name: t("title"), url: getCanonical("/news") },
      ])} />

      <PageHero compact title={t("title")} description={t("heroDesc")} actions={<NewStoriesCount storyTimes={storyTimes} />} />

      {digest && (
        <div className="page-container py-3 sm:py-4">
          <DigestCard
            as="h2"
            date={digest.digest_date}
            title={cleanTitle(getDigestHeadline(digest))}
            articleCount={digest.article_count}
          />
        </div>
      )}

      <NewsFeed
        localArticles={localArticles}
        globalArticles={globalArticles}
        locale={userLang}
        nowMs={nowMs}
      />

      <div className="page-container">
        <VideoStrip items={videos} locale={userLang} />
      </div>

      <p className="page-container max-w-3xl pb-14 text-[13px] leading-relaxed text-stadium-muted">{t("attribution")}</p>
    </div>
  );
}
