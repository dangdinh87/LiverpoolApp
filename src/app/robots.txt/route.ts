export function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  // `Disallow: /*?*` used to sit here and blocked every URL carrying a query
  // string. That is worse than it sounds: `/news?source=bbc` and
  // `/fixtures?view=results` are real links readers share, and a disallowed URL
  // is a URL Google never fetches — so it never reads the `rel=canonical` that
  // would have folded it into the clean page. Blocking replaced a signal that
  // works with no signal at all. The pages that genuinely must stay out are
  // noindex in their own metadata (/chat, /profile, /auth, the scraped mirrors).
  const body = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /chat
Disallow: /profile
Disallow: /auth/

Sitemap: ${siteUrl}/sitemap.xml
`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
