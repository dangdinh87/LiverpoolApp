"use client";

import { usePathname } from "next/navigation";
import { GoogleAdsense } from "./google-adsense";

// Article pages (/news/<slug>, or /en/news/<slug>) reproduce someone else's
// copyrighted text — running ads there is the single biggest factor in how
// aggressively a publisher is likely to pursue a takedown or claim, on top of
// the reproduction itself. Ads stay everywhere else, including /news (the
// list) and /news/digest/* (our own AI-written summary, not scraped text).
//
// This renders above <NextIntlClientProvider> in the layout, so it uses the
// raw next/navigation pathname (locale prefix included) rather than
// next-intl's locale-aware one, which needs that provider. `en` is hardcoded
// as the only prefixed locale per src/i18n/routing.ts (`localePrefix: 'as-needed'`,
// vi is the default and stays unprefixed) — update this if that changes.
// Client-only so the pages themselves stay static/ISR.
const SCRAPED_ARTICLE_PATH = /^\/(?:en\/)?news\/(?!digest(?:\/|$))/;

export function AdsenseGate() {
  const pathname = usePathname();
  if (SCRAPED_ARTICLE_PATH.test(pathname)) return null;
  return <GoogleAdsense />;
}
