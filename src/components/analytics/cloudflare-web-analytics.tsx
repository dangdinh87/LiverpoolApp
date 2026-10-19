import Script from "next/script";

// Cloudflare Web Analytics: cookie-less, counts real browsers (the edge numbers also
// include bots and scanners). The site token is public — it ships in the page — and is
// inlined at build time from NEXT_PUBLIC_CF_ANALYTICS_TOKEN.
//
// Added by hand rather than through Cloudflare's "automatic setup": the Worker answers
// from the OpenNext cache, and the dashboard is set to "Enable with JS Snippet
// installation" so the beacon is not injected a second time.
const TOKEN = process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN ?? "";

// 32 hex characters is what Cloudflare issues; anything else is dropped rather than
// written into an HTML attribute.
const TOKEN_SHAPE = /^[a-f0-9]{32}$/;

export function CloudflareWebAnalytics() {
  if (!TOKEN_SHAPE.test(TOKEN)) return null;
  return (
    <Script
      src="https://static.cloudflareinsights.com/beacon.min.js"
      strategy="afterInteractive"
      data-cf-beacon={JSON.stringify({ token: TOKEN })}
    />
  );
}
