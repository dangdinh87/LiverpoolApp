import { getAllPlayers } from "@/lib/squad-data";
import { getArticleSitemapData } from "@/lib/news/db";
import { getAllDigestDates } from "@/lib/news/digest";
import { getFixtures } from "@/lib/football";
import { encodeArticleSlug } from "@/lib/news-config";

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const today = new Date().toISOString().slice(0, 10);

  // ─── Static routes ────────────────────────────────────────────────────────
  const staticRoutes = [
    { path: "/", changefreq: "daily", priority: "1.0" },
    { path: "/news", changefreq: "hourly", priority: "0.9" },
    { path: "/squad", changefreq: "weekly", priority: "0.9" },
    { path: "/fixtures", changefreq: "daily", priority: "0.9" },
    { path: "/standings", changefreq: "daily", priority: "0.8" },
    { path: "/season", changefreq: "daily", priority: "0.8" },
    { path: "/stats", changefreq: "daily", priority: "0.7" },
    { path: "/gallery", changefreq: "weekly", priority: "0.7" },
    { path: "/history", changefreq: "monthly", priority: "0.6" },
    { path: "/about", changefreq: "monthly", priority: "0.4" },
  ];

  // ─── Player routes ────────────────────────────────────────────────────────
  const players = getAllPlayers();

  // ─── Dynamic routes from DB (graceful fallback if DB unavailable) ─────────
  let articles: { url: string; published_at: string }[] = [];
  let digests: { digest_date: string; generated_at: string }[] = [];
  let fixtureUrls: { id: number; date: string; label: string }[] = [];

  try {
    const [articleData, digestData, fixtures] = await Promise.allSettled([
      getArticleSitemapData(),
      getAllDigestDates(),
      getFixtures(),
    ]);
    if (articleData.status === "fulfilled") articles = articleData.value;
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
    lastmod: string,
    changefreq: string,
    priority: string,
  ): string {
    const loc = `${siteUrl}${path}`;
    return [
      `  <url>`,
      `    <loc>${escapeXml(loc)}</loc>`,
      `    <lastmod>${lastmod}</lastmod>`,
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
    urls.push(urlEntry(r.path, today, r.changefreq, r.priority));
  }

  // Player pages
  for (const p of players) {
    urls.push(urlEntry(`/player/${p.slug}`, today, "weekly", "0.6"));
  }

  // News article pages (last 90 days) — strip query params to avoid robots.txt /*?* conflict
  for (const a of articles) {
    const cleanUrl = a.url.split("?")[0];
    const slug = encodeArticleSlug(cleanUrl);
    const lastmod = a.published_at.slice(0, 10);
    urls.push(urlEntry(`/news/${slug}`, lastmod, "never", "0.5"));
  }

  // Digest pages
  for (const d of digests) {
    urls.push(urlEntry(`/news/digest/${d.digest_date}`, d.digest_date, "never", "0.5"));
  }

  // Fixture detail pages
  for (const f of fixtureUrls) {
    urls.push(urlEntry(`/fixtures/${f.id}`, f.date, "weekly", "0.5"));
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
