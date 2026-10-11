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

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const today = new Date().toISOString().slice(0, 10);

  // ─── Static routes ────────────────────────────────────────────────────────
  const staticRoutes = [
    { path: "/", changefreq: "daily", priority: "1.0" },
    { path: "/news", changefreq: "hourly", priority: "0.9" },
    { path: "/analysis", changefreq: "daily", priority: "0.9" },
    { path: "/squad", changefreq: "weekly", priority: "0.9" },
    { path: "/fixtures", changefreq: "daily", priority: "0.9" },
    { path: "/standings", changefreq: "daily", priority: "0.8" },
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
  const ownArticles: { slug: string; published_at: string }[] = [];

  try {
    const [digestData, fixtures] = await Promise.allSettled([
      getAllDigestDates(),
      getFixtures(),
    ]);
    if (digestData.status === "fulfilled") digests = digestData.value;
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

  // ─── Build URL helper with hreflang ───────────────────────────────────────
  function urlEntry(
    path: string,
    lastmod: string | null,
    changefreq: string,
    priority: string,
  ): string {
    const loc = `${siteUrl}${path}`;
    return [
      `  <url>`,
      `    <loc>${escapeXml(loc)}</loc>`,
      // Only real modification dates: Google ignores lastmod once it proves
      // unreliable, and "today on every request" (static pages) or a future
      // kickoff date (fixtures) both are.
      ...(lastmod ? [`    <lastmod>${lastmod}</lastmod>`] : []),
      `    <changefreq>${changefreq}</changefreq>`,
      `    <priority>${priority}</priority>`,
      `    <xhtml:link rel="alternate" hreflang="vi" href="${escapeXml(loc)}" />`,
      `    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(loc)}" />`,
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(loc)}" />`,
      `  </url>`,
    ].join("\n");
  }

  // ─── Assemble all URLs ────────────────────────────────────────────────────
  const urls: string[] = [];

  // Static pages
  for (const r of staticRoutes) {
    urls.push(urlEntry(r.path, null, r.changefreq, r.priority));
  }

  // Player pages
  for (const p of players) {
    urls.push(urlEntry(`/player/${p.slug}`, null, "weekly", "0.6"));
  }

  // Scraped article pages (/news/<slug>) are excerpt-only mirrors of other
  // publishers' stories and are noindex (see generateMetadata) — keep them out
  // of the sitemap. Only our own digest pages below are listed.

  // The site's own articles: original content, unlike the /news mirrors, so
  // these are the pages here that are actually worth crawling.
  for (const a of ownArticles) {
    urls.push(urlEntry(`/analysis/${a.slug}`, a.published_at.slice(0, 10), "monthly", "0.8"));
  }

  // Digest pages
  for (const d of digests) {
    urls.push(urlEntry(`/news/digest/${d.digest_date}`, d.digest_date, "never", "0.5"));
  }

  // Fixture detail pages
  for (const f of fixtureUrls) {
    urls.push(urlEntry(`/fixtures/${f.id}`, f.date <= today ? f.date : null, "weekly", "0.5"));
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
