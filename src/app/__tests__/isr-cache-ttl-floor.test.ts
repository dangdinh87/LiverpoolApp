import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Next lowers a page's ISR window to the shortest `unstable_cache` TTL the page
 * reads. On 30/10/2026 every article page in R2 carried revalidate=600, not its
 * own 3600, because the shared like/comment snapshot lived 600 s; player pages
 * were capped the same way by the fan-rating cache. Each render of an article
 * page costs ~450 ms of Worker CPU, so the cap multiplied the bill by six.
 *
 * Also pins the two reasons an article was scraped again on render: content
 * wiped by the cleanup at 7 days, and slugs of articles no longer in the DB.
 */
const read = (...parts: string[]) => readFileSync(join(process.cwd(), ...parts), "utf8");
const num = (src: string, re: RegExp) => Number(re.exec(src)?.[1]?.replace(/_/g, ""));

describe("cache TTLs read by ISR pages are not shorter than the page", () => {
  const articleRevalidate = num(read("src/app/[locale]/news/[...slug]/page.tsx"), /export const revalidate = (\d+);/);
  const playerRevalidate = num(read("src/app/[locale]/player/[id]/page.tsx"), /export const revalidate = (\d+);/);

  // Every unstable_cache the article page reads: engagement, related feed, next match.
  it.each([
    ["engagement", "src/lib/news/engagement.ts", /const ENGAGEMENT_TTL_SEC = ([\d_]+);/],
    ["related feed", "src/lib/news/cached-feed.ts", /const FEED_TTL_SEC = ([\d_]+);/],
    ["fixtures", "src/lib/football/cached-fixtures.ts", /const FIXTURES_TTL_SEC = ([\d_]+);/],
  ])("%s cache covers the article page window", (_name, file, re) => {
    expect(articleRevalidate).toBeGreaterThan(0);
    expect(num(read(file), re)).toBeGreaterThanOrEqual(articleRevalidate);
  });

  it("the article page reads no other unstable_cache", () => {
    const page = read("src/app/[locale]/news/[...slug]/page.tsx");
    const cached = page.match(/\bget(?:Cached\w+|ArticleEngagement)\(/g) ?? [];
    expect(new Set(cached)).toEqual(new Set(["getCachedNewsFeed(", "getCachedFixtures(", "getArticleEngagement("]));
  });

  it("player fan rating covers the player page window", () => {
    const src = read("src/lib/fan-predictions/leaderboard.ts");
    const block = src.slice(src.indexOf('["player-fan-rating-v1"]'));
    const ttl = num(block, /revalidate: ([\d_]+)/);
    expect(ttl).toBeGreaterThanOrEqual(playerRevalidate);
  });

  it("player mentions cache covers the player page window and avoids news sync tag", () => {
    const playerPage = read("src/app/[locale]/player/[id]/page.tsx");
    const block = playerPage.slice(playerPage.indexOf('["player-mentions-v1"]'));
    const options = /\{[\s\S]*?\}/.exec(block)?.[0] ?? "";
    const ttl = num(options, /revalidate: ([\d_]+)/);
    expect(ttl).toBeGreaterThanOrEqual(playerRevalidate);
    expect(options).not.toContain('"news"');
  });

  it("/analysis site-articles cache covers the /analysis page window", () => {
    const analysisPage = read("src/app/[locale]/analysis/page.tsx");
    const pageTtl = num(analysisPage, /export const revalidate = (\d+);/);
    const block = analysisPage.slice(analysisPage.indexOf('["analysis-list-v1"]'));
    const ttl = num(block, /revalidate: ([\d_]+)/);
    expect(ttl).toBeGreaterThanOrEqual(pageTtl);
  });

  it("/news video cache TTL covers /news page revalidate window", () => {
    const newsPage = read("src/app/[locale]/news/page.tsx");
    const pageTtl = num(newsPage, /export const revalidate = (\d+);/);
    const videoBlock = newsPage.slice(newsPage.indexOf('["news-page-video-v1"]'));
    const videoTtl = num(videoBlock, /revalidate: ([\d_]+)/);
    expect(videoTtl).toBeGreaterThanOrEqual(pageTtl);
  });

  it("/standings does not call uncached 300s getFixtures() directly in render", () => {
    const standingsPage = read("src/app/[locale]/standings/page.tsx");
    const pageTtl = num(standingsPage, /export const revalidate = (\d+);/);
    const cacheBlock = standingsPage.slice(standingsPage.indexOf('["standings-fixtures-v1"]'));
    const cacheTtl = num(cacheBlock, /revalidate: ([\d_]+)/);
    expect(cacheTtl).toBeGreaterThanOrEqual(pageTtl);
  });

  it("/gallery does not read server cookies so its ISR revalidate works", () => {
    const galleryPage = read("src/app/[locale]/gallery/page.tsx");
    expect(galleryPage).not.toContain("createServerSupabaseClient");
    expect(galleryPage).toMatch(/export const revalidate = \d+;/);
  });

  it("/analysis pages call setRequestLocale so next-intl keeps them static ISR", () => {
    expect(read("src/app/[locale]/analysis/page.tsx")).toContain("setRequestLocale(locale)");
    expect(read("src/app/[locale]/analysis/[slug]/page.tsx")).toContain("setRequestLocale(locale)");
  });

  it("fdo-matches current-season fixtures and espn scoreboard cache >= 1800s (never 300s)", () => {
    const fdoMatches = read("src/lib/football/fdo-matches.ts");
    const matchBlock = fdoMatches.slice(fdoMatches.indexOf("getFdoLfcFixtures"));
    const fdoTtl = num(matchBlock, /seasonRevalidate\(archivedSeason,\s*\d+\)\s*:\s*([\d_]+)/);
    expect(fdoTtl).toBeGreaterThanOrEqual(1800);

    const espn = read("src/lib/football/espn-events.ts");
    const scoreboardBlock = espn.slice(espn.indexOf("findLfcOnScoreboard"), espn.indexOf("resolveEspnRef"));
    const espnTtl = num(scoreboardBlock, /scoreboard\?dates=\$\{yyyymmdd\}`[\s\S]*?,\s*([\d_]+),/);
    expect(espnTtl).toBeGreaterThanOrEqual(1800);
  });

  it("/stats uses getCachedFixtures for current season and scorers TTL covers /stats page window", () => {
    const statsPageTtl = num(read("src/app/[locale]/stats/page.tsx"), /export const revalidate = ([\d_]+);/);
    const statsView = read("src/components/stats/stats-season-view.tsx");
    expect(statsView).toContain("isCurrentSeason ? getCachedFixtures() : getFixtures(selectedSeason)");

    const fdoProvider = read("src/lib/football/fdo-provider.ts");
    const scorersBlock = fdoProvider.slice(fdoProvider.indexOf("getScorersData"));
    const scorersTtl = num(scorersBlock, /scorers\?limit=50"[\s\S]*?,\s*([\d_]+),/);
    expect(scorersTtl).toBeGreaterThanOrEqual(statsPageTtl);
  });

  it("/predictions uses getCachedFixtures and leaderboard TTL covers /predictions page window", () => {
    const predPage = read("src/app/[locale]/predictions/page.tsx");
    const predTtl = num(predPage, /export const revalidate = ([\d_]+);/);
    expect(predPage).toContain("getCachedFixtures()");
    expect(predPage).not.toContain("getFixtures()");

    const lb = read("src/lib/fan-predictions/leaderboard.ts");
    const lbBlock = lb.slice(lb.indexOf('["prediction-leaderboard-v1"]'));
    const lbTtl = num(lbBlock, /revalidate: ([\d_]+)/);
    expect(lbTtl).toBeGreaterThanOrEqual(predTtl);
  });

  it("/analysis/[slug] caches cover the page window", () => {
    const slugPage = read("src/app/[locale]/analysis/[slug]/page.tsx");
    const pageTtl = num(slugPage, /export const revalidate = ([\d_]+);/);
    const bySlugTtl = num(slugPage.slice(slugPage.indexOf('["site-article-by-slug-v1"]')), /revalidate: ([\d_]+)/);
    const relatedTtl = num(slugPage.slice(slugPage.indexOf('["site-articles-related-v1"]')), /revalidate: ([\d_]+)/);
    expect(bySlugTtl).toBeGreaterThanOrEqual(pageTtl);
    expect(relatedTtl).toBeGreaterThanOrEqual(pageTtl);
  });

  it("/fixtures/[id] caches >= 1800s and live islands watch kick-off on the client", () => {
    const detailPageTtl = num(read("src/app/[locale]/fixtures/[id]/page.tsx"), /export const revalidate = ([\d_]+);/);
    expect(detailPageTtl).toBeGreaterThanOrEqual(1800);

    const liveDetail = read("src/components/fixtures/live-match-detail.tsx");
    const calls = liveDetail.match(/useLiveMatch\([^)]*\)/g) ?? [];
    expect(calls.length).toBeGreaterThanOrEqual(4);
    for (const call of calls) {
      expect(call).toBe("useLiveMatch(initial, true)");
    }
  });

  it("/injuries and /transfers pages export revalidate=21600, call setRequestLocale, and keep inner caches >= 21600", () => {
    const injuriesPage = read("src/app/[locale]/injuries/page.tsx");
    expect(num(injuriesPage, /export const revalidate = (\d+);/)).toBe(21600);
    expect(injuriesPage).toContain("setRequestLocale(locale)");

    const transfersPage = read("src/app/[locale]/transfers/page.tsx");
    const transfersTtl = num(transfersPage, /export const revalidate = (\d+);/);
    expect(transfersTtl).toBe(21600);
    expect(transfersPage).toContain("setRequestLocale(locale)");
    const digestBlock = transfersPage.slice(transfersPage.indexOf('["transfers-digest-v1"]'));
    expect(num(digestBlock, /revalidate: ([\d_]+)/)).toBeGreaterThanOrEqual(transfersTtl);
  });
});

describe("article bodies are not scraped again needlessly", () => {
  it("cleanup no longer wipes stored bodies before the row is deleted", () => {
    const cleanup = read("src/app/api/news/cleanup/route.ts");
    expect(cleanup).not.toMatch(/content_en:\s*null/);
  });

  it("stored content is trusted for the row's whole 14-day life", () => {
    const db = read("src/lib/news/db.ts");
    expect(db).toMatch(/const FRESH_CONTENT_TTL_MS = 14 \* 24 \* 3600 \* 1000;/);
  });

  it("the article page scrapes only articles the DB still holds", () => {
    const page = read("src/app/[locale]/news/[...slug]/page.tsx");
    // `=== false`: a DB that cannot answer (null) must still let the scrape run.
    expect(page).toMatch(/return \(await isArticleStored\(url\)\) === false \? null : scrapeArticle\(url\);/);
    // Every scrape on the page goes through that guard.
    expect(page.match(/scrapeArticle\(url\)/g)).toHaveLength(1);
  });

  it("an expired article reads only the publisher's <head>, never a full scrape", () => {
    const page = read("src/app/[locale]/news/[...slug]/page.tsx");
    const expired = page.slice(page.indexOf("const getExpiredArticleMeta"), page.indexOf("/** The instant"));
    expect(expired).toContain("fetchOgMeta(url");
    expect(expired).not.toContain("scrapeArticle");
  });
});
