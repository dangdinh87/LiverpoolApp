/**
 * Rendered per-request rather than prerendered at build time.
 *
 * The sitemap pulls live rows from Supabase and the football API. Prerendering
 * it made a successful production build depend on those services being up — a
 * paused database failed the entire build. Serving it dynamically keeps the
 * build hermetic; the s-maxage header below still lets the CDN cache the result.
 */
export const dynamic = "force-dynamic";

import { getAllPlayers } from "@/lib/squad-data";
import { getAllDigestDates } from "@/lib/news/digest";
import { getFixtures } from "@/lib/football";
import { getCurrentSeasonYear, getSelectableSeasons } from "@/lib/football/current-season";
import { listSiteArticles } from "@/lib/site-articles/db";
import { getHreflangAlternates } from "@/lib/seo";

export async function GET() {
  const today = new Date().toISOString().slice(0, 10);

  // ─── Static routes ────────────────────────────────────────────────────────
  const staticRoutes = [
    { path: "/", changefreq: "daily", priority: "1.0" },
    { path: "/news", changefreq: "hourly", priority: "0.9" },
    { path: "/analysis", changefreq: "daily", priority: "0.9" },
    { path: "/squad", changefreq: "weekly", priority: "0.9" },
    { path: "/fixtures", changefreq: "daily", priority: "0.9" },
    { path: "/standings", changefreq: "daily", priority: "0.8" },
    { path: "/predictions", changefreq: "daily", priority: "0.6" },
    { path: "/season", changefreq: "daily", priority: "0.8" },
    { path: "/stats", changefreq: "daily", priority: "0.7" },
    { path: "/gallery", changefreq: "weekly", priority: "0.7" },
    { path: "/history", changefreq: "monthly", priority: "0.6" },
    { path: "/about", changefreq: "monthly", priority: "0.4" },
    { path: "/legal", changefreq: "yearly", priority: "0.2" },
  ];

  // ─── Player routes ────────────────────────────────────────────────────────
  const players = getAllPlayers();

  // ─── Dynamic routes from DB (graceful fallback if DB unavailable) ─────────
  let digests: { digest_date: string; generated_at: string }[] = [];
  let fixtureUrls: { id: number; date: string; label: string }[] = [];
  let ownArticles: { slug: string; published_at: string }[] = [];

  try {
    const [digestData, fixtures, articles] = await Promise.allSettled([
      getAllDigestDates(),
      getFixtures(),
      // These were declared and never fetched, so the one set of pages this
      // site writes itself — the only original content here — was missing from
      // the sitemap entirely while every scraped mirror was deliberately kept
      // out. Nothing was submitting them.
      listSiteArticles(200),
    ]);
    if (digestData.status === "fulfilled") digests = digestData.value;
    if (articles.status === "fulfilled") {
      ownArticles = articles.value.flatMap((a) =>
        a.published_at ? [{ slug: a.slug, published_at: a.published_at }] : [],
      );
    }
    if (fixtures.status === "fulfilled") {
      fixtureUrls = fixtures.value.map((f) => ({
        id: f.fixture.id,
        date: f.fixture.date.slice(0, 10),
        label: `${f.teams.home.name} vs ${f.teams.away.name}`,
      }));
    }
  } catch {
    // Static + player URLs still served if all DB calls fail
  }

  /**
   * One `<url>` per locale, each declaring the whole alternate set.
   *
   * The three hreflang lines used to point at the same URL — the English one —
   * for every entry, so the file told Google the Vietnamese page lived at the
   * English address and never mentioned a single `/vi/` URL. The alternates and
   * the canonical come from `getHreflangAlternates` now, which is the same
   * helper the pages' own <head> uses, so the two can no longer disagree.
   *
   * A sitemap must list every localised URL, not just the default one, and each
   * entry repeats the full set including x-default. That is what the protocol
   * asks for, and it is why this returns a group rather than one string.
   */
  function urlEntries(
    path: string,
    lastmod: string | null,
    changefreq: string,
    priority: string,
  ): string[] {
    const { languages } = getHreflangAlternates(path);
    const alternates = [
      ...Object.entries(languages).map(
        ([lang, href]) =>
          `    <xhtml:link rel="alternate" hreflang="${lang}" href="${escapeXml(href)}" />`,
      ),
    ];

    return Object.keys(languages)
      .filter((lang) => lang !== "x-default")
      .map((lang) =>
        [
          `  <url>`,
          `    <loc>${escapeXml(languages[lang as keyof typeof languages])}</loc>`,
          // Only real modification dates: Google ignores lastmod once it proves
          // unreliable, and "today on every request" (static pages) or a future
          // kickoff date (fixtures) both are.
          ...(lastmod ? [`    <lastmod>${lastmod}</lastmod>`] : []),
          `    <changefreq>${changefreq}</changefreq>`,
          `    <priority>${priority}</priority>`,
          ...alternates,
          `  </url>`,
        ].join("\n"),
      );
  }

  // ─── Assemble all URLs ────────────────────────────────────────────────────
  const urls: string[] = [];

  // Static pages
  for (const r of staticRoutes) {
    urls.push(...urlEntries(r.path, null, r.changefreq, r.priority));
  }

  // Archive stats, one URL per past season. These became real pages when
  // /stats?season= moved to a path segment; nothing was pointing crawlers at
  // them. The current season is canonical at /stats, already listed above.
  for (const year of getSelectableSeasons().filter((y) => y !== getCurrentSeasonYear())) {
    urls.push(...urlEntries(`/stats/${year}`, null, "monthly", "0.4"));
  }

  // Player pages
  for (const p of players) {
    urls.push(...urlEntries(`/player/${p.slug}`, null, "weekly", "0.6"));
  }

  // Scraped article pages (/news/<slug>) are excerpt-only mirrors of other
  // publishers' stories and are noindex (see generateMetadata) — keep them out
  // of the sitemap. Only our own digest pages below are listed.

  // The site's own articles: original content, unlike the /news mirrors, so
  // these are the pages here that are actually worth crawling.
  for (const a of ownArticles) {
    urls.push(...urlEntries(`/analysis/${a.slug}`, a.published_at.slice(0, 10), "monthly", "0.8"));
  }

  // Digest pages
  for (const d of digests) {
    urls.push(...urlEntries(`/news/digest/${d.digest_date}`, d.digest_date, "never", "0.5"));
  }

  // Fixture detail pages
  for (const f of fixtureUrls) {
    urls.push(...urlEntries(`/fixtures/${f.id}`, f.date <= today ? f.date : null, "weekly", "0.5"));
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

/** Escape special XML chars in URLs */
function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
