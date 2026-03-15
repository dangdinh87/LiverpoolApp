export function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const body = `User-agent: *
Allow: /
Disallow: /profile
Disallow: /profile/
Disallow: /api/
Disallow: /auth/
Disallow: /chat
Disallow: /*?*

Sitemap: ${siteUrl}/sitemap.xml
`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain" },
  });
}
