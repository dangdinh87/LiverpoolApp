// Client-safe. THE single host table for news sources — used by slug
// encode/decode (news-config.ts), the URL allow-list (isKnownNewsSourceUrl)
// and source detection (source-detect.ts). Add a source or alias here only.
import type { NewsSource } from "./types";

interface SourceHostEntry {
  id: NewsSource;
  /** Display name used by the article reader. */
  name: string;
  /** Host a bare `/news/{id}/{path}` slug decodes to (kept stable for old links). */
  canonical: string;
  /** Registrable domains; the domain itself and any subdomain belong to this source. */
  domains: string[];
}

export const SOURCE_HOST_TABLE: SourceHostEntry[] = [
  { id: "lfc", name: "LiverpoolFC.com", canonical: "www.liverpoolfc.com", domains: ["liverpoolfc.com"] },
  { id: "bbc", name: "BBC Sport", canonical: "www.bbc.com", domains: ["bbc.com", "bbc.co.uk"] },
  { id: "guardian", name: "The Guardian", canonical: "www.theguardian.com", domains: ["theguardian.com"] },
  { id: "echo", name: "Liverpool Echo", canonical: "www.liverpoolecho.co.uk", domains: ["liverpoolecho.co.uk"] },
  { id: "sky", name: "Sky Sports", canonical: "www.skysports.com", domains: ["skysports.com"] },
  { id: "mirror", name: "Daily Mirror", canonical: "www.mirror.co.uk", domains: ["mirror.co.uk"] },
  { id: "independent", name: "The Independent", canonical: "www.independent.co.uk", domains: ["independent.co.uk"] },
  { id: "men", name: "Manchester Evening News", canonical: "www.manchestereveningnews.co.uk", domains: ["manchestereveningnews.co.uk"] },
  { id: "anfieldindex", name: "Anfield Index", canonical: "anfieldindex.com", domains: ["anfieldindex.com"] },
  { id: "liverpoolcom", name: "Liverpool.com", canonical: "www.liverpool.com", domains: ["liverpool.com"] },
  { id: "tia", name: "This Is Anfield", canonical: "www.thisisanfield.com", domains: ["thisisanfield.com"] },
  { id: "espn", name: "ESPN", canonical: "www.espn.com", domains: ["espn.com", "espn.co.uk"] },
  { id: "anfield-watch", name: "Anfield Watch", canonical: "www.anfieldwatch.co.uk", domains: ["anfieldwatch.co.uk"] },
  { id: "eotk", name: "Empire of the Kop", canonical: "www.empireofthekop.com", domains: ["empireofthekop.com"] },
  { id: "goal", name: "GOAL", canonical: "www.goal.com", domains: ["goal.com"] },
  { id: "bongda", name: "Bongda.com.vn", canonical: "bongda.com.vn", domains: ["bongda.com.vn"] },
  { id: "24h", name: "24h.com.vn", canonical: "www.24h.com.vn", domains: ["24h.com.vn"] },
  { id: "bongdaplus", name: "Bongdaplus.vn", canonical: "bongdaplus.vn", domains: ["bongdaplus.vn"] },
  { id: "vnexpress", name: "VnExpress", canonical: "vnexpress.net", domains: ["vnexpress.net"] },
  { id: "tuoitre", name: "Tuổi Trẻ", canonical: "tuoitre.vn", domains: ["tuoitre.vn"] },
  { id: "thanhnien", name: "Thanh Niên", canonical: "thanhnien.vn", domains: ["thanhnien.vn"] },
  { id: "dantri", name: "Dân Trí", canonical: "dantri.com.vn", domains: ["dantri.com.vn"] },
  // ZNews rebranded from Zing News; feed links are mostly on lifestyle.zingnews.vn.
  { id: "zingnews", name: "ZNews", canonical: "znews.vn", domains: ["znews.vn", "zingnews.vn"] },
  { id: "vietnamnet", name: "VietNamNet", canonical: "vietnamnet.vn", domains: ["vietnamnet.vn"] },
  // webthethao / thethao247 / vietnamvn are no longer synced, but rows live up to 14 days.
  { id: "webthethao", name: "Webthethao", canonical: "webthethao.vn", domains: ["webthethao.vn"] },
  { id: "vietnamvn", name: "Vietnam.vn", canonical: "www.vietnam.vn", domains: ["vietnam.vn"] },
  { id: "bongda24h", name: "Bóng Đá 24h", canonical: "bongda24h.vn", domains: ["bongda24h.vn"] },
  { id: "thethao247", name: "Thể Thao 247", canonical: "thethao247.vn", domains: ["thethao247.vn"] },
  { id: "soha", name: "Soha", canonical: "soha.vn", domains: ["soha.vn"] },
];

const BY_ID = new Map(SOURCE_HOST_TABLE.map((e) => [e.id as string, e]));

export function getSourceEntry(id: string): SourceHostEntry | undefined {
  return BY_ID.get(id);
}

function hostBelongsTo(host: string, entry: SourceHostEntry): boolean {
  return entry.domains.some((d) => host === d || host.endsWith(`.${d}`));
}

/** Source entry owning a hostname (exact domain or any subdomain), if any. */
export function findSourceByHost(hostname: string): SourceHostEntry | undefined {
  const host = hostname.toLowerCase();
  return SOURCE_HOST_TABLE.find((e) => hostBelongsTo(host, e));
}

/** True when `hostname` is a valid host for source `id` (used to validate slug host overrides). */
export function isHostOfSource(id: string, hostname: string): boolean {
  const entry = BY_ID.get(id);
  return !!entry && hostBelongsTo(hostname.toLowerCase(), entry);
}

/** Vietnamese-language source IDs. */
export const VI_SOURCE_IDS: ReadonlySet<string> = new Set([
  "bongda", "24h", "bongdaplus", "vnexpress", "tuoitre", "thanhnien",
  "dantri", "zingnews", "vietnamnet", "webthethao", "vietnamvn",
  "bongda24h", "thethao247", "soha",
]);
