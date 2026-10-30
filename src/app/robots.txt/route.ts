import { routing, withLocalePrefix } from "@/i18n/routing";

/**
 * SEO-tool crawlers. They index the web for paying customers' backlink and
 * audit reports and send this site no readers; they were 32% of its HTML
 * requests in the 24 h to 30/10/2026, each one a Worker render. All of them
 * honour robots.txt. Search engines and AI answer crawlers are not listed:
 * blocking those is a visibility decision, not a cost one.
 * PetalBot was already blocked in the Vercel firewall before the move.
 */
const SEO_TOOL_BOTS = [
  "SemrushBot",
  "SiteAuditBot",
  "AhrefsBot",
  "MJ12bot",
  "SERankingBacklinksBot",
  "DotBot",
  "BLEXBot",
  "DataForSeoBot",
  "Barkrowler",
  "PetalBot",
];

export function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  // `Disallow: /*?*` used to sit here and blocked every URL carrying a query
  // string. That is worse than it sounds: `/news?source=bbc` and
  // `/fixtures?view=results` are real links readers share, and a disallowed URL
  // is a URL Google never fetches — so it never reads the `rel=canonical` that
  // would have folded it into the clean page. Blocking replaced a signal that
  // works with no signal at all. The pages that genuinely must stay out are
  // noindex in their own metadata (/profile, /auth, the scraped mirrors).
  // Each private section is listed under every locale's prefix: written as bare
  // paths only, /vi/profile and /vi/auth/ were open to crawlers.
  const privatePaths = ["/profile", "/auth/"];
  const disallow = [
    "/api/",
    ...routing.locales.flatMap((locale) => privatePaths.map((p) => withLocalePrefix(p, locale))),
  ];
  // One group naming several agents (RFC 9309); a listed bot follows this group
  // and ignores the `*` one.
  const body = `User-agent: *
Allow: /
${disallow.map((p) => `Disallow: ${p}`).join("\n")}

${SEO_TOOL_BOTS.map((bot) => `User-agent: ${bot}`).join("\n")}
Disallow: /

Sitemap: ${siteUrl}/sitemap.xml
`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
