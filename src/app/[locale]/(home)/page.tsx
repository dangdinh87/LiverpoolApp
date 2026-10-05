import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { LocaleParams } from "@/i18n/routing";
import { unstable_cache } from "next/cache";
import { getFixtures, getStandings } from "@/lib/football";
import { getNewsFromDB } from "@/lib/news";
import { requireNonEmptyNews } from "@/lib/news/db";
import { getLatestDigest } from "@/lib/news/digest";
import { getSiteSetting, SITE_SETTINGS_CACHE_TAG } from "@/lib/gallery/queries";
import { Hero } from "@/components/home/hero";
import { NextMatchWidget } from "@/components/home/next-match-widget";
import { FormWidget, pickRecentResults } from "@/components/home/form-widget";
import { NewsSection, NewsByCategory } from "@/components/home/news-section";
import { selectHomeNews } from "@/components/home/news-utils";
import { StandingsPreview } from "@/components/home/standings-preview";
import { SquadCarousel } from "@/components/home/squad-carousel";
import { getSquadPlayers } from "@/lib/squad-data";
import { JsonLd } from "@/components/seo/json-ld";
import { buildBreadcrumbJsonLd, DEFAULT_OG_IMAGE, getCanonical, makePageMeta } from "@/lib/seo";
import { getArticleUrl } from "@/lib/news-config";
import type { Fixture } from "@/lib/types/football";

function getOptimizedHeroUrl(url: string): string {
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) {
    return url;
  }
  if (url.includes("/upload/w_1280,h_720,c_fill,q_auto,f_auto/")) {
    return url;
  }
  return url.replace(
    "/upload/",
    "/upload/w_1280,h_720,c_fill,q_auto,f_auto/"
  );
}

const HOME_TITLE = "Liverpool FC Việt Nam — Tin tức, Lịch thi đấu, Đội hình | YNWA";
const HOME_DESCRIPTION =
  "Trang fan Liverpool FC Việt Nam — Tin tức mới nhất, đội hình, lịch thi đấu, bảng xếp hạng Ngoại hạng Anh, thống kê và lịch sử CLB Liverpool.";
const HOME_NEWS_LIMIT = 18;

const getCachedHomeFixtures = unstable_cache(
  async () => getFixtures(),
  ["home-fixtures-v1"],
  { revalidate: 300 },
);

const getCachedHomeStandings = unstable_cache(
  async () => getStandings(),
  ["home-standings-v1"],
  { revalidate: 3600 },
);

const getCachedHomeNews = unstable_cache(
  async () => requireNonEmptyNews(getNewsFromDB(HOME_NEWS_LIMIT, "vi", { skipSync: true })),
  ["home-news-vi-first-v2"],
  { revalidate: 300, tags: ["news"] },
);

const getCachedHomeDigest = unstable_cache(
  async () => getLatestDigest(),
  ["home-digest-v1"],
  { revalidate: 1800, tags: ["news-digest"] },
);

// Errors resolve to null *inside* the cache: unstable_cache never stores a
// rejection, so a throwing lookup re-ran against a dead database on every
// homepage request. With null the default hero shows for one 5-min window.
const getCachedHomeHeroSetting = unstable_cache(
  async () =>
    getSiteSetting<{
      gallery_image_id: string;
      cloudinary_url: string;
    }>("homepage_hero_image").catch((err: unknown) => {
      console.warn("[homepage] Hero setting unavailable:", err instanceof Error ? err.message : err);
      return null;
    }),
  ["home-hero-setting-v2"],
  { revalidate: 300, tags: [SITE_SETTINGS_CACHE_TAG] },
);

export const metadata: Metadata = {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  applicationName: "Liverpool FC Việt Nam",
  category: "sports",
  ...makePageMeta(
    HOME_TITLE,
    HOME_DESCRIPTION,
    { path: "/" },
  ),
};

// Revalidate every 5 minutes — balances freshness vs performance
export const revalidate = 300;

function getSettledValue<T>(result: PromiseSettledResult<T>, fallback: T): T {
  if (result.status === "fulfilled") return result.value;
  console.error("[homepage] Data fetch error:", result.reason);
  return fallback;
}

function buildHomeJsonLd(articles: Awaited<ReturnType<typeof getNewsFromDB>>) {
  const canonical = getCanonical("/");
  const newsItems = articles.slice(0, 6).map((article, index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: getCanonical(getArticleUrl(article.link)),
    name: article.title,
    ...(article.thumbnail && { image: article.thumbnail }),
    ...(article.pubDate && { datePublished: article.pubDate }),
  }));

  return [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: HOME_TITLE,
      description: HOME_DESCRIPTION,
      url: canonical,
      inLanguage: ["vi", "en"],
      isPartOf: {
        "@type": "WebSite",
        name: "Liverpool FC Việt Nam",
        url: canonical,
      },
      about: {
        "@type": "SportsTeam",
        name: "Liverpool FC",
        sport: "Football",
      },
      primaryImageOfPage: {
        "@type": "ImageObject",
        url: getCanonical(DEFAULT_OG_IMAGE.url),
      },
    },
    buildBreadcrumbJsonLd([{ name: "Home", url: canonical }]),
    ...(newsItems.length
      ? [
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Latest Liverpool FC news",
            itemListElement: newsItems,
          },
        ]
      : []),
  ];
}

export default async function HomePage({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [fixturesResult, standingsResult, newsResult, digestResult, heroSettingResult] =
    await Promise.allSettled([
      getCachedHomeFixtures(),
      getCachedHomeStandings(),
      getCachedHomeNews(),
      getCachedHomeDigest(),
      getCachedHomeHeroSetting(),
    ]);

  const fixtures = getSettledValue<Fixture[]>(fixturesResult, []);
  const standings = getSettledValue<Awaited<ReturnType<typeof getStandings>>>(
    standingsResult,
    [],
  );
  const allNews = getSettledValue<Awaited<ReturnType<typeof getNewsFromDB>>>(
    newsResult,
    [],
  );
  const digest = getSettledValue<Awaited<ReturnType<typeof getLatestDigest>>>(
    digestResult,
    null,
  );
  const heroSetting = getSettledValue<
    { gallery_image_id: string; cloudinary_url: string } | null
  >(heroSettingResult, null);
  const heroBackgroundUrl = heroSetting?.cloudinary_url
    ? getOptimizedHeroUrl(heroSetting.cloudinary_url)
    : undefined;

  // Live match takes priority, otherwise earliest upcoming
  const LIVE = new Set(["1H", "HT", "2H", "ET", "P", "BT", "LIVE"]);
  const liveMatch = fixtures.find(
    (f) => LIVE.has(f.fixture.status.short) && (f.teams.home.id === 40 || f.teams.away.id === 40)
  ) ?? null;

  const nextMatch: Fixture | null =
    liveMatch ??
    [...fixtures]
      .filter((f) => f.fixture.status.short === "NS")
      .sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime())[0] ?? null;

  const uiLocale: "vi" | "en" = locale === "en" ? "en" : "vi";
  const topNews = selectHomeNews(allNews, uiLocale, 5);
  const shown = new Set(topNews.map((a) => a.link));
  const moreNews = allNews.filter((a) => !shown.has(a.link));
  const squadTeaser = getSquadPlayers()
    .sort((a, b) => a.shirtNumber - b.shirtNumber)
    .slice(0, 12);

  return (
    <>
      <JsonLd data={buildHomeJsonLd(allNews)} />
      <Hero backgroundUrl={heroBackgroundUrl}>
        <NextMatchWidget fixture={nextMatch} />
      </Hero>
      <div className="page-container py-6 sm:py-10 lg:py-12">
        {/* grid-cols-1 = minmax(0,1fr): an implicit auto track grew to the widest nowrap row of the table preview (326px in a 256px card at 320px). */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-x-8 lg:gap-y-6">
          {/* Mobile order: results, news, table. On desktop news spans two rows beside both widgets. */}
          <div className="lg:col-span-4 lg:col-start-9 lg:row-start-1">
            <FormWidget results={pickRecentResults(fixtures)} />
          </div>
          <div className="lg:col-span-8 lg:col-start-1 lg:row-span-2 lg:row-start-1">
            <NewsSection articles={topNews} digest={digest} locale={uiLocale} />
          </div>
          <div className="lg:col-span-4 lg:col-start-9 lg:row-start-2">
            <StandingsPreview standings={standings} />
          </div>
        </div>
        <div className="mt-10 space-y-10 sm:mt-14 sm:space-y-14">
          <SquadCarousel players={squadTeaser} />
          <NewsByCategory articles={moreNews} locale={uiLocale} />
        </div>
      </div>
    </>
  );
}
