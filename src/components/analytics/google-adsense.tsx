import Script from "next/script";

/**
 * Google AdSense loader.
 *
 * The publisher ID is not a secret — it ships in the page source on every site
 * running AdSense — so it is committed as the default. `NEXT_PUBLIC_ADSENSE_CLIENT_ID`
 * overrides it for a different property (or is set empty to switch ads off).
 *
 * `afterInteractive` is Next's recommended strategy for third-party tags: the
 * script loads once hydration is done, so it never delays first paint. AdSense
 * auto-ads inject themselves after load, which does not require the tag to sit
 * in <head>.
 */
const ADSENSE_CLIENT_ID =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ?? "ca-pub-7702998853432249";

export function GoogleAdsense() {
  if (!ADSENSE_CLIENT_ID) return null;

  return (
    <Script
      id="google-adsense"
      strategy="afterInteractive"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
    />
  );
}
