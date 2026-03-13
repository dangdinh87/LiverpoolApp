import type { NewsSource } from "./types";

/** URL domain → [NewsSource ID, display name] */
const SOURCE_MAP: [string, NewsSource, string][] = [
  ["liverpoolfc.com", "lfc", "LiverpoolFC.com"],
  ["bbc.com", "bbc", "BBC Sport"],
  ["bbc.co.uk", "bbc", "BBC Sport"],
  ["theguardian.com", "guardian", "The Guardian"],
  ["liverpoolecho.co.uk", "echo", "Liverpool Echo"],
  ["anfieldwatch.co.uk", "anfield-watch", "Anfield Watch"],
  ["empireofthekop.com", "eotk", "Empire of the Kop"],
  ["bongda.com.vn", "bongda", "Bongda.com.vn"],
  ["24h.com.vn", "24h", "24h.com.vn"],
  ["bongdaplus.vn", "bongdaplus", "Bongdaplus.vn"],
  ["znews.vn", "zingnews", "ZNews"],     // M6 fix: was missing in [...slug]/page.tsx
  ["zingnews.vn", "zingnews", "ZNews"],   // legacy domain
  ["vnexpress.net", "vnexpress", "VnExpress"],
  ["dantri.com.vn", "dantri", "Dân Trí"],
  ["vietnamnet.vn", "vietnamnet", "VietNamNet"],
  ["tuoitre.vn", "tuoitre", "Tuổi Trẻ"],
  ["thanhnien.vn", "thanhnien", "Thanh Niên"],
  ["webthethao.vn", "webthethao", "Webthethao"],
  ["vietnam.vn", "vietnamvn", "Vietnam.vn"],
];

/**
 * Unified source detection: URL → { id, name }.
 * Single source of truth for both article-extractor and article detail page.
 */
export function detectSource(url: string): { id: NewsSource; name: string } {
  for (const [domain, id, name] of SOURCE_MAP) {
    if (url.includes(domain)) return { id, name };
  }
  return { id: "bbc", name: new URL(url).hostname };
}

/** Vietnamese source IDs */
export const VI_SOURCES = new Set<NewsSource>([
  "bongda", "24h", "bongdaplus", "vnexpress", "tuoitre", "thanhnien",
  "dantri", "zingnews", "vietnamnet", "webthethao", "vietnamvn",
]);
