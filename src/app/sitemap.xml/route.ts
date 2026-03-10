import { getAllPlayers } from "@/lib/squad-data";

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const staticRoutes = [
    { path: "/", changefreq: "daily", priority: "1.0" },
    { path: "/squad", changefreq: "weekly", priority: "0.9" },
    { path: "/fixtures", changefreq: "hourly", priority: "0.9" },
    { path: "/standings", changefreq: "daily", priority: "0.8" },
    { path: "/stats", changefreq: "daily", priority: "0.7" },
    { path: "/news", changefreq: "hourly", priority: "0.8" },
    { path: "/history", changefreq: "monthly", priority: "0.6" },
  ];

  const players = getAllPlayers();
  const playerUrls = players
    .map(
      (p) =>
        `  <url><loc>${siteUrl}/player/${p.slug}</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>`
    )
    .join("\n");

  const staticUrls = staticRoutes
    .map(
      ({ path, changefreq, priority }) =>
        `  <url><loc>${siteUrl}${path}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls}
${playerUrls}
</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml" },
  });
}
