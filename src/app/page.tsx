import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { getFixtures, getStandings } from "@/lib/football";
import { getNewsFromDB } from "@/lib/news";
import { getLatestDigest } from "@/lib/news/digest";
import { getSiteSetting } from "@/lib/gallery/queries";
import { Hero } from "@/components/home/hero";
import { BentoGrid } from "@/components/home/bento-grid";
import { NewsSection } from "@/components/home/news-section";
import { LiveMatchBanner } from "@/components/home/live-match-banner";
import { JsonLd } from "@/components/seo/json-ld";
import { buildBreadcrumbJsonLd, getCanonical, makePageMeta } from "@/lib/seo";
import { getArticleUrl } from "@/lib/news-config";
import type { Fixture } from "@/lib/types/football";

function getOptimizedHeroUrl(url: string): string {
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) {
    return url;
  }
  if (url.includes("/upload/w_1920,h_1080,c_fill,q_auto,f_auto/")) {
    return url;
  }
  return url.replace(
    "/upload/",
    "/upload/w_1920,h_1080,c_fill,q_auto,f_auto/"
  );
}

const HOME_TITLE = "Liverpool FC Việt Nam — Tin tức, Lịch thi đấu, Đội hình | YNWA";
const HOME_DESCRIPTION =
  "Trang fan Liverpool FC Việt Nam — Tin tức mới nhất, đội hình, lịch thi đấu, bảng xếp hạng Ngoại hạng Anh, thống kê và lịch sử CLB Liverpool.";
const HOME_OG_IMAGE = "/assets/lfc/branding/lfc-crest-main.webp";
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
  async () => getNewsFromDB(HOME_NEWS_LIMIT, undefined, { skipSync: true }),
  ["home-news-v2"],
  { revalidate: 300, tags: ["news"] },
);

const getCachedHomeDigest = unstable_cache(
  async () => getLatestDigest(),
  ["home-digest-v1"],
  { revalidate: 1800, tags: ["news-digest"] },
);

const getCachedHomeHeroSetting = unstable_cache(
  async () =>
    getSiteSetting<{
      gallery_image_id: string;
      cloudinary_url: string;
    }>("homepage_hero_image"),
  ["home-hero-setting-v1"],
  { revalidate: 300 },
);

export const metadata: Metadata = {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  applicationName: "Liverpool FC Việt Nam",
  category: "sports",
  ...makePageMeta(
    HOME_TITLE,
    HOME_DESCRIPTION,
    { path: "/", image: HOME_OG_IMAGE },
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
        url: getCanonical(HOME_OG_IMAGE),
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

export default async function HomePage() {
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

  return (
    <>
      <JsonLd data={buildHomeJsonLd(allNews)} />
      <LiveMatchBanner fixtures={fixtures} />
      <Hero backgroundUrl={heroBackgroundUrl} />
      <section className="py-10 pb-16">
        <NewsSection articles={allNews} digest={digest} />
      </section>
      <section className="py-10">
        <BentoGrid nextMatch={nextMatch} standings={standings} />
      </section>
    </>
  );
}
