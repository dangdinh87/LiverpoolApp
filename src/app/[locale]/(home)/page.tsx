import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { brandDescription, brandTitle } from "@/lib/brand";
import type { LocaleParams } from "@/i18n/routing";
import { unstable_cache } from "next/cache";
import { FOOTBALL_CACHE_TAG } from "@/lib/football/cache-tags";
import { requireNonEmptyArray } from "@/lib/football/fdo-client";
import { getFixtures, getStandings } from "@/lib/football";
import { getNewsFromDB, getPodcastItemsFromDB, getSocialItemsFromDB } from "@/lib/news";
import { requireNonEmptyNews } from "@/lib/news/db";
import type { NewsArticle } from "@/lib/news/types";
import { getCachedLatestDigest } from "@/lib/news/latest-digest";
import type { DigestRecord } from "@/lib/news/digest";
import { getSiteSetting, SITE_SETTINGS_CACHE_TAG } from "@/lib/gallery/queries";
import { Hero } from "@/components/home/hero";
import { NextMatchWidget } from "@/components/home/next-match-widget";
import { FormWidget, pickRecentResults } from "@/components/home/form-widget";
import { NewsSection } from "@/components/home/news-section";
import { PodcastStrip } from "@/components/news/podcast-strip";
import { SocialStrip } from "@/components/news/social-strip";
import { selectHomeNews } from "@/components/home/news-utils";
import { StandingsPreview } from "@/components/home/standings-preview";
import { DigestFeature } from "@/components/home/digest-feature";
import { PredictCta } from "@/components/home/predict-cta";
import { SectionHeader } from "@/components/ui/section-header";
import { ArticleCard } from "@/components/site-articles/article-card";
import { DataPulseStrip, PresetConnectedGrid } from "@/components/ui/hub-links";
import { getAllPlayers, getCoach, getSquadPlayers } from "@/lib/squad-data";
import { listSiteArticles, pickSiteArticleContent, type SiteArticleRow } from "@/lib/site-articles/db";
import type { SiteArticleContent } from "@/lib/site-articles/types";
import { JsonLd } from "@/components/seo/json-ld";
import { DEFAULT_OG_IMAGE, getCanonical, getLocalizedUrl, makePageMeta, SCHEMA_IDS } from "@/lib/seo";
import type { Fixture } from "@/lib/types/football";

function getOptimizedHeroUrl(url: string): string {
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) {
    return url;
  }
  const [head, tail] = url.split("/upload/");
  // Strip any existing transformation prefix (e.g. w_1920,h_1080,... saved by cover-selector)
  // so we never emit a double transform segment.
  const cleanTail = tail.replace(/^(?:[a-z]_[^/]+\/)+/i, "");
  return `${head}/upload/w_1280,h_720,c_fill,q_auto:eco,f_auto/${cleanTail}`;
}

/** "Tin nhanh" shows this many headlines; the query takes a few extra so the language mix can still fill it. */
const HOME_NEWS_SHOWN = 7;
// Enough headroom that seven slots still fill after same-story rewrites collapse
// into one card each (see selectHomeNews). One cached query, so the cost is flat.
const HOME_NEWS_LIMIT = 24;

const getCachedHomeFixtures = unstable_cache(
  async () => requireNonEmptyArray(getFixtures()),
  ["home-fixtures-v2"],
  // The window must not sit below the page's own, or every render re-queries by
  // definition. The tag is there so a post-match job could bust it from one place.
  { revalidate: 1800, tags: [FOOTBALL_CACHE_TAG] },
);

const getCachedHomeStandings = unstable_cache(
  async () => requireNonEmptyArray(getStandings()),
  ["home-standings-v2"],
  { revalidate: 3600, tags: [FOOTBALL_CACHE_TAG] },
);

// No language preference: the feed is English-only since the Vietnamese sources
// were dropped, so asking for a Vietnamese-first mix bought nothing — and it
// cost a second cache entry, because the key included the preference and the
// two locales could not share one snapshot.
const getCachedHomeNews = unstable_cache(
  async () => requireNonEmptyNews(getNewsFromDB(HOME_NEWS_LIMIT, undefined, { skipSync: true })),
  ["home-news-v4"],
  // The "news" tag makes this fresh on sync; the window is the fallback.
  { revalidate: 1800, tags: ["news"] },
);

const getCachedHomePodcasts = unstable_cache(
  async () => getPodcastItemsFromDB(3),
  ["home-podcasts-v1"],
  { revalidate: 1800, tags: ["news"] },
);

const getCachedHomeSocial = unstable_cache(
  async () => getSocialItemsFromDB(4),
  ["home-social-v1"],
  { revalidate: 1800, tags: ["news"] },
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
  { revalidate: 1800, tags: [SITE_SETTINGS_CACHE_TAG] },
);

const getCachedHomeAnalysis = unstable_cache(
  async () => {
    const rows = await listSiteArticles(4);
    if (rows.length === 0) {
      throw new Error("[homepage] empty site_articles response — not caching");
    }
    return rows;
  },
  ["home-analysis-v1"],
  { revalidate: 21600, tags: ["site-articles"] },
);

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Home.metadata" });
  const title = brandTitle(locale);
  // Not brandDescription: that one is display copy and runs to 183 characters,
  // past the ~155 Google renders, so the sentence that says what the site does
  // was being cut off mid-phrase in results. Home.metadata.description is the
  // slot meant for this and was sitting unread.
  const description = t("description");
  return {
    // The brand title already carries the site name, so it must not get the "| name" template suffix.
    title: { absolute: title },
    description,
    category: "sports",
    ...makePageMeta(title, description, { locale, path: "/" }),
  };
}

// 30 minutes, not 5. News is the only thing here that moves, it syncs hourly,
// and the sync busts the "news" tag — so freshness is event-driven and this
// timer is just the fallback. At 300s this page re-rendered up to 12 times an
// hour per locale, each render querying fixtures, standings, news and the hero
// setting, for data that changes once an hour.
export const revalidate = 1800;

function getSettledValue<T>(result: PromiseSettledResult<T>, fallback: T): T {
  if (result.status === "fulfilled") return result.value;
  console.error("[homepage] Data fetch error:", result.reason);
  return fallback;
}

/**
 * The home page as a node of the site-wide graph (see StructuredData).
 *
 * It used to restate the WebSite and the club as fresh anonymous entities,
 * declare itself in both languages at the English URL whichever locale was
 * served, carry a one-item breadcrumb, and list the latest headlines as an
 * ItemList of /news mirror pages — pages that are noindex on purpose.
 */
function buildHomeJsonLd(locale: string) {
  const url = getLocalizedUrl("/", locale);
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    name: brandTitle(locale),
    description: brandDescription(locale),
    url,
    inLanguage: locale,
    isPartOf: { "@id": SCHEMA_IDS.website },
    about: { "@id": SCHEMA_IDS.club },
    publisher: { "@id": SCHEMA_IDS.publisher },
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: getCanonical(DEFAULT_OG_IMAGE.url),
    },
  };
}

export default async function HomePage({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [
    tAnalysis,
    tHub,
    [fixturesResult, standingsResult, newsResult, digestResult, heroSettingResult, analysisResult, podcastResult, socialResult],
  ] = await Promise.all([
    getTranslations({ locale, namespace: "Home.analysis" }),
    getTranslations({ locale, namespace: "Hub" }),
    Promise.allSettled([
      getCachedHomeFixtures(),
      getCachedHomeStandings(),
      getCachedHomeNews(),
      getCachedLatestDigest(),
      getCachedHomeHeroSetting(),
      getCachedHomeAnalysis(),
      getCachedHomePodcasts(),
      getCachedHomeSocial(),
    ]),
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
  const digest = getSettledValue<DigestRecord | null>(digestResult, null);
  const heroSetting = getSettledValue<
    { gallery_image_id: string; cloudinary_url: string } | null
  >(heroSettingResult, null);
  const analysisRows = getSettledValue<SiteArticleRow[]>(analysisResult, []);
  const homePodcasts = getSettledValue<NewsArticle[]>(podcastResult, []);
  const homeSocial = getSettledValue<NewsArticle[]>(socialResult, []);
  const homeAnalyses = analysisRows
    .map((row) => {
      const content = pickSiteArticleContent(row, locale);
      return content ? { row, content } : null;
    })
    .filter((item): item is { row: SiteArticleRow; content: SiteArticleContent } => item !== null)
    .slice(0, 2);
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
  // The next match still open for predictions (not the live one).
  const upcoming = liveMatch ? null : nextMatch && nextMatch.fixture.id > 0 ? nextMatch : null;
  const topNews = selectHomeNews(allNews, uiLocale, HOME_NEWS_SHOWN);
  const squadPlayers = getSquadPlayers();
  const coach = getCoach();
  const onLoanCount = getAllPlayers().filter((p) => p.onLoan).length;
  const lfcStanding = standings.find((s) => s.team.id === 40);

  const clubPulseItems = [
    {
      label: tHub("metrics.squadSize"),
      value: squadPlayers.length,
      sublabel: coach.name,
      href: "/squad",
      accent: "red" as const,
    },
    ...(lfcStanding
      ? [
          {
            label: tHub("metrics.plRank"),
            value: `#${lfcStanding.rank}`,
            sublabel: `${lfcStanding.points} · ${lfcStanding.goalsDiff >= 0 ? "+" : ""}${lfcStanding.goalsDiff}`,
            href: "/standings",
            accent: "gold" as const,
          },
        ]
      : []),
    {
      label: tHub("metrics.majorHonours"),
      value: 68,
      sublabel: "20 + 6",
      href: "/history",
      accent: "gold" as const,
    },
    ...(onLoanCount > 0
      ? [
          {
            label: tHub("cards.transfers.title"),
            value: onLoanCount,
            sublabel: tHub("metrics.onLoan"),
            href: "/transfers",
            accent: "gold" as const,
          },
        ]
      : []),
  ];

  return (
    <>
      <JsonLd data={buildHomeJsonLd(locale)} />
      <Hero backgroundUrl={heroBackgroundUrl}>
        <NextMatchWidget fixture={nextMatch} />
      </Hero>
      <div className="page-container py-6 sm:py-10 lg:py-12">
        {/* The site's own daily briefing leads; the outlets' headlines follow. */}
        {digest && <DigestFeature digest={digest} locale={uiLocale} />}

        {/* grid-cols-1 = minmax(0,1fr): an implicit auto track grew to the widest nowrap row of the table preview (326px in a 256px card at 320px). */}
        <div className={`grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8 ${digest ? "mt-8 sm:mt-12" : ""}`}>
          <div className="lg:col-span-8">
            <NewsSection articles={topNews} locale={uiLocale} />
            {homeAnalyses.length > 0 && (
              <section aria-label={tAnalysis("title")} className="mt-8 sm:mt-10">
                <SectionHeader
                  title={tAnalysis("title")}
                  href="/analysis"
                  linkLabel={tAnalysis("viewAll")}
                />
                <ul className="grid gap-3 sm:grid-cols-2">
                  {homeAnalyses.map(({ row, content }) => (
                    <li key={row.id}>
                      <ArticleCard
                        article={{
                          slug: row.slug,
                          kind: row.kind,
                          title: content.title,
                          excerpt: content.excerpt,
                          publishedAt: row.match_date ?? row.published_at,
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
          <div className="flex flex-col gap-6 lg:col-span-4">
            <FormWidget results={pickRecentResults(fixtures)} />
            {upcoming && <PredictCta fixture={upcoming} />}
            <StandingsPreview standings={standings} />
          </div>
        </div>
        <PodcastStrip items={homePodcasts} locale={uiLocale} moreHref="/news#podcasts" />
        <SocialStrip items={homeSocial} locale={uiLocale} moreHref="/news#social" />

        <div className="mt-10 space-y-8 sm:mt-12">
          <div>
            <div className="mb-2.5 flex items-center gap-2">
              <Image
                src="/assets/lfc/crest.webp"
                alt=""
                width={20}
                height={24}
                className="h-6 w-5 shrink-0 object-contain"
              />
              <p className="section-label text-white">{tHub("seasonPulse")}</p>
            </div>
            <DataPulseStrip items={clubPulseItems} />
          </div>
          <PresetConnectedGrid
            preset="fromHome"
            metaOverrides={{
              squad: `${squadPlayers.length} ${tHub("cards.squad.badge")}`,
              ...(onLoanCount > 0 && { transfers: `${onLoanCount} ${tHub("metrics.onLoan")}` }),
              ...(analysisRows.length > 0 && { analysis: `${analysisRows.length} ${tHub("nav.analysis")}` }),
            }}
          />
        </div>
      </div>
    </>
  );
}
