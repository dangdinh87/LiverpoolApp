/**
 * The one place that names the site. Renaming it, or rewording the tagline,
 * is a change to this file only: the header, footer, metadata, manifest,
 * JSON-LD and share image all read from here.
 *
 * Identity rules (see plans/261007-1000-brand-ux-upgrade/design-spec.md):
 * - The mark is the LFCVN wordmark (League Gothic outlines) and the red "L"
 *   square. The club crest / Liver bird is never the site's own logo; crests
 *   appear only as match data.
 * - This is an unofficial fan site. Nothing here may imply endorsement.
 */

export const BRAND = {
  /** Display name. Open question for the owner: it collides with the official supporters club abbreviation. */
  name: "LFCVN",
  tagline: {
    vi: "Fan Liverpool Việt Nam · Giờ đá, kết quả, tin nhanh",
    en: "Liverpool fans in Vietnam · Kick-off times, results, quick news",
  },
  /** Meta description: the tagline expanded to one readable sentence. */
  description: {
    vi: "Fan Liverpool Việt Nam: giờ đá theo giờ Việt Nam, kết quả, bảng xếp hạng, đội hình và tin nhanh về The Reds. Trang fan không chính thức.",
    en: "Liverpool fans in Vietnam: kick-off times in Vietnam time, results, standings, squad and quick news about The Reds. Unofficial fan site.",
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
  /** Static copies of the mark live in public/brand/. */
  assets: {
    wordmark: "/brand/lfcvn-wordmark.svg",
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
  return locale === "en" ? "en" : "vi";
}

export const brandTagline = (locale: string) => BRAND.tagline[brandLocale(locale)];
export const brandUnofficial = (locale: string) => BRAND.unofficial[brandLocale(locale)];
export const brandDescription = (locale: string) => BRAND.description[brandLocale(locale)];
/** `LFCVN — <tagline>`: the home page title and the default for pages without one. */
export const brandTitle = (locale: string) => `${BRAND.name} — ${brandTagline(locale)}`;

/**
 * LFCVN wordmark: League Gothic outlines (SIL OFL), cap height 100 units, wide
 * tracking, with the short red bar under the first letters. Drawn as paths so
 * it needs no font and renders identically in the header, the share image and
 * public/brand/lfcvn-wordmark.svg.
 */
export const WORDMARK = {
  width: 292.33,
  height: 121,
  letters:
    "M0 100V0H14.69V86.39H34.15V100Z M58.15 100V0H93.12V15.1H72.84V41.36H86.45V56.46H72.84V100Z M136.71 101.09Q130.45 101.09 126.06 98.27Q121.67 95.44 119.39 90.54Q117.12 85.65 117.12 79.46V20.54Q117.12 14.42 119.46 9.52Q121.81 4.63 126.23 1.77Q130.65 -1.09 136.71 -1.09Q141.27 -1.09 144.87 0.61Q148.48 2.31 151.03 5.27Q153.58 8.23 154.94 12.14Q156.3 16.05 156.3 20.54V34.29H142.56V20.54Q142.56 17.41 141.27 15.31Q139.97 13.2 136.98 13.2Q134.26 13.2 133.03 15.37Q131.81 17.55 131.81 20.54V79.46Q131.81 82.45 133.14 84.63Q134.46 86.8 136.98 86.8Q140.04 86.8 141.3 84.69Q142.56 82.59 142.56 79.46V65.71H156.3V79.46Q156.3 85.58 153.92 90.48Q151.54 95.37 147.15 98.23Q142.76 101.09 136.71 101.09Z M195.54 100 180.3 0H194.59L201.93 59.05L202.48 68.71H203.29L203.84 59.05L211.18 0H225.47L210.23 100Z M249.47 100V0H263.21L276.82 52.11L278.04 56.73H278.86V0H292.33V100H279.95L264.98 47.89L263.76 43.27H262.94V100Z",
  bar: { x: 0, y: 112, width: 56, height: 9 },
} as const;
