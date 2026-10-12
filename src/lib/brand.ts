/**
 * The one place that names the site. Renaming it, or rewording the tagline,
 * is a change to this file only: the header, footer, metadata, manifest,
 * JSON-LD and share image all read from here.
 *
 * Identity rules (see plans/261007-1000-brand-ux-upgrade/design-spec.md):
 * - The mark is the "Anfield Daily" wordmark set in League Gothic, plus the red
 *   tile with two pages folded into an "A" and a gold crossbar (MARK below). The club crest /
 *   Liver bird is never the site's own logo; crests appear only as match data.
 * - The site is for reading Liverpool news fast (gathered, de-duplicated,
 *   summed up daily) — not "for fans abroad". Copy and art say news.
 * - The name deliberately contains neither "Liverpool" nor "LFC": a fan site
 *   carrying the club's marks is the weakest position in a trademark dispute
 *   (plans/reports/researcher-261007-1201-global-name-legal-indonesia.md).
 * - This is an unofficial fan site. Nothing here may imply endorsement.
 */

export const BRAND = {
  /** Display name. */
  name: "Anfield Daily",
  tagline: {
    vi: "Tin Liverpool nhanh · Tổng hợp và tóm tắt mỗi ngày",
    en: "Liverpool news, fast · Gathered and summed up daily",
  },
  /** Meta description: the tagline expanded to one readable sentence. */
  description: {
    vi: "Tin Liverpool từ hơn 20 tờ báo tiếng Anh và tiếng Việt, gom về một chỗ, lọc trùng và tóm tắt mỗi ngày. Kèm lịch thi đấu, kết quả và bảng xếp hạng. Trang fan không chính thức.",
    en: "Liverpool news from more than 20 English and Vietnamese outlets, gathered in one place, de-duplicated and summed up every day. Plus fixtures, results and the table. Unofficial fan site.",
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
  /** Accent used sparingly — the crossbar of the mark's A. */
  gold: "#f6eb61",
  /** Static copies of the mark live in public/brand/. */
  assets: {
    wordmark: "/brand/anfield-daily-wordmark.svg",
    icon: "/brand/icon.svg",
    icon192: "/brand/icon-192.png",
    icon512: "/brand/icon-512.png",
    favicon32: "/brand/favicon-32.png",
    iconMaskable: "/brand/icon-maskable-512.png",
    appleTouchIcon: "/brand/apple-touch-icon.png",
  },
} as const;

/**
 * The mark: two pages folded into an "A" — the front page white, the page
 * behind it in a shade of the fold — with a gold rule for the crossbar, the
 * headline rule of a front page. Red rounded tile, 512 box. One source for
 * BrandMark, the share image and the files in public/brand/ (tested to match).
 */
export const MARK = {
  size: 512,
  radius: 112,
  /** The page behind, drawn first so the front page keeps a clean apex. */
  back: "232,92 280,92 400,420 328,420",
  front: "232,92 280,92 184,420 112,420",
  backFill: "#f3d3d9",
  rule: { x: 196, y: 296, width: 124, height: 36 },
  /** The maskable app icon shrinks the art to this, inside the 0.4-radius safe zone. */
  maskableScale: 0.88,
} as const;

export type BrandLocale = keyof typeof BRAND.tagline;

/** Narrow any locale string (next-intl hands out plain strings) to one we have copy for. */
export function brandLocale(locale: string): BrandLocale {
  return locale === "vi" ? "vi" : "en";
}

export const brandTagline = (locale: string) => BRAND.tagline[brandLocale(locale)];
export const brandUnofficial = (locale: string) => BRAND.unofficial[brandLocale(locale)];
export const brandDescription = (locale: string) => BRAND.description[brandLocale(locale)];
/** `Anfield Daily — <tagline>`: the home title and the default for pages without one. */
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
