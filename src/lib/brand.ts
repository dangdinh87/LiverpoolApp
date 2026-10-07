/**
 * The one place that names the site. Renaming it, or rewording the tagline,
 * is a change to this file only: the header, footer, metadata, manifest,
 * JSON-LD and share image all read from here.
 *
 * Identity rules (see plans/261007-1000-brand-ux-upgrade/design-spec.md):
 * - The mark is the "Reds Abroad" wordmark set in League Gothic, plus the red
 *   globe tile. The club crest / Liver bird is never the site's own logo;
 *   crests appear only as match data.
 * - The name deliberately contains neither "Liverpool" nor "LFC": a fan site
 *   carrying the club's marks is the weakest position in a trademark dispute
 *   (plans/reports/researcher-261007-1201-global-name-legal-indonesia.md).
 * - This is an unofficial fan site. Nothing here may imply endorsement.
 */

export const BRAND = {
  /** Display name. */
  name: "Reds Abroad",
  tagline: {
    vi: "Fan Liverpool khắp thế giới · Giờ đá theo giờ của bạn",
    en: "Liverpool fans everywhere · Kick-off times in your time zone",
  },
  /** Meta description: the tagline expanded to one readable sentence. */
  description: {
    vi: "Giờ đá theo múi giờ của bạn, kết quả, bảng xếp hạng, đội hình và tin nhanh cho fan Liverpool ở khắp nơi. Trang fan không chính thức.",
    en: "Kick-off times in your own time zone, results, standings, squad and quick news for Liverpool supporters wherever they are. Unofficial fan site.",
  },
  /** One-line notice for places without room for the full footer text (share image). */
  unofficial: {
    vi: "Fan site không chính thức, không liên kết với Liverpool FC hay Premier League",
    en: "Unofficial fan site, not affiliated with Liverpool FC or the Premier League",
  },
  /** Shown in the footer. It is the owner's personal address: flagged to the lead. */
  contactEmail: "nguyendangdinh47@gmail.com",
  /** Brand colour (fills only; use the `text-brand` utility for red text). */
  red: "#c8102e",
  /** Accent used sparingly — the locator dot in the mark. */
  gold: "#f6eb61",
  /** Static copies of the mark live in public/brand/. */
  assets: {
    wordmark: "/brand/reds-abroad-wordmark.svg",
    icon: "/brand/icon.svg",
    icon192: "/brand/icon-192.png",
    icon512: "/brand/icon-512.png",
    favicon32: "/brand/favicon-32.png",
    appleTouchIcon: "/brand/apple-touch-icon.png",
  },
} as const;

export type BrandLocale = keyof typeof BRAND.tagline;

/** Narrow any locale string (next-intl hands out plain strings) to one we have copy for. */
export function brandLocale(locale: string): BrandLocale {
  return locale === "vi" ? "vi" : "en";
}

export const brandTagline = (locale: string) => BRAND.tagline[brandLocale(locale)];
export const brandUnofficial = (locale: string) => BRAND.unofficial[brandLocale(locale)];
export const brandDescription = (locale: string) => BRAND.description[brandLocale(locale)];
/** `Reds Abroad — <tagline>`: the home title and the default for pages without one. */
export const brandTitle = (locale: string) => `${BRAND.name} — ${brandTagline(locale)}`;

/**
 * Wordmark typography.
 *
 * The name is set in League Gothic as live text rather than baked into SVG
 * paths. The paths were outlines of the literal letters "LFCVN", so the promise
 * at the top of this file — that a rename touches only this file — was not
 * true: renaming meant redrawing glyphs. Both places that draw the wordmark
 * (the header component and the share image) now render BRAND.name directly.
 */
export const WORDMARK = {
  /** Matches the League Gothic look in the header: tight, wide-tracked caps. */
  letterSpacing: "0.18em",
  /** Short red rule under the first letters. Fractions of the drawn width. */
  bar: { widthRatio: 0.19, thicknessEm: 0.075, gapEm: 0.1 },
} as const;
