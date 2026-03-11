// Server-side feed configuration — contains URLs, not safe for client
import "server-only";
import type { FeedConfig, NewsSource, NewsLanguage } from "./types";

export const RSS_FEEDS: FeedConfig[] = [
  // English — LFC-specific feeds
  { url: "https://feeds.bbci.co.uk/sport/football/teams/liverpool/rss.xml", source: "bbc", language: "en" },
  { url: "https://www.theguardian.com/football/liverpool/rss", source: "guardian", language: "en" },
  // thisisanfield.com disabled — persistent redirect loop (ERR_TOO_MANY_REDIRECTS)
  // { url: "https://www.thisisanfield.com/feed", source: "tia", language: "en" },
  { url: "https://www.anfieldwatch.co.uk/feed", source: "anfield-watch", language: "en" },
  { url: "https://www.empireofthekop.com/feed/", source: "eotk", language: "en" },
  // English — general feeds with keyword filter
  { url: "https://www.liverpoolecho.co.uk/all-about/liverpool-fc/?service=rss", source: "echo", language: "en" },
  // Vietnamese — Liverpool-specific feed (best source, ~50 articles)
  { url: "https://bongda.com.vn/liverpool.rss", source: "bongda", language: "vi" },
  // Vietnamese — general sport feeds filtered by LFC_KEYWORDS
  { url: "https://cdn.24h.com.vn/upload/rss/bongda.rss", source: "24h", language: "vi", filter: "lfc" },
  { url: "https://vnexpress.net/rss/the-thao.rss", source: "vnexpress", language: "vi", filter: "lfc" },
  { url: "https://tuoitre.vn/rss/the-thao.rss", source: "tuoitre", language: "vi", filter: "lfc" },
  { url: "https://thanhnien.vn/rss/the-thao.rss", source: "thanhnien", language: "vi", filter: "lfc" },
  // Vietnamese — 5 new sources
  { url: "https://dantri.com.vn/rss/the-thao.rss", source: "dantri", language: "vi", filter: "lfc" },
  { url: "https://znews.vn/rss/the-thao.rss", source: "zingnews", language: "vi", filter: "lfc" },
  { url: "https://vietnamnet.vn/rss/the-thao.rss", source: "vietnamnet", language: "vi", filter: "lfc" },
  { url: "https://webthethao.vn/rss/rss.php", source: "webthethao", language: "vi", filter: "lfc" },
];

export const SOURCE_CONFIG: Record<
  NewsSource,
  { label: string; color: string; language: NewsLanguage }
> = {
  lfc: { label: "Liverpool FC", color: "bg-lfc-red text-white", language: "en" },
  bbc: { label: "BBC Sport", color: "bg-[#BB1919] text-white", language: "en" },
  guardian: { label: "The Guardian", color: "bg-[#052962] text-[#9DBFFF]", language: "en" },
  tia: { label: "This Is Anfield", color: "bg-amber-700 text-amber-100", language: "en" },
  echo: { label: "Liverpool Echo", color: "bg-purple-700 text-purple-100", language: "en" },
  sky: { label: "Sky Sports", color: "bg-red-700 text-red-100", language: "en" },
  "anfield-watch": { label: "Anfield Watch", color: "bg-rose-700 text-rose-100", language: "en" },
  eotk: { label: "Empire of the Kop", color: "bg-red-800 text-red-100", language: "en" },
  bongda: { label: "Bóng Đá", color: "bg-emerald-700 text-emerald-100", language: "vi" },
  "24h": { label: "24h", color: "bg-orange-700 text-orange-100", language: "vi" },
  bongdaplus: { label: "Bóng Đá+", color: "bg-sky-700 text-sky-100", language: "vi" },
  vnexpress: { label: "VnExpress", color: "bg-blue-800 text-blue-100", language: "vi" },
  tuoitre: { label: "Tuổi Trẻ", color: "bg-teal-700 text-teal-100", language: "vi" },
  thanhnien: { label: "Thanh Niên", color: "bg-amber-800 text-amber-100", language: "vi" },
  dantri: { label: "Dân Trí", color: "bg-cyan-700 text-cyan-100", language: "vi" },
  zingnews: { label: "ZNews", color: "bg-violet-700 text-violet-100", language: "vi" },
  vietnamnet: { label: "VietNamNet", color: "bg-lime-700 text-lime-100", language: "vi" },
  webthethao: { label: "Webthethao", color: "bg-pink-700 text-pink-100", language: "vi" },
};

// Bongdaplus scraper config
export const BONGDAPLUS_URLS = [
  "https://bongdaplus.vn/ngoai-hang-anh",
  "https://bongdaplus.vn/champions-league-cup-c1",
];

export const LFC_KEYWORDS = [
  // Club identity — strict, unique to Liverpool
  "liverpool", "anfield", "the kop", "lfc", "lữ đoàn đỏ",
  // Manager — full name only (avoid "slot" alone)
  "arne slot",
  // Star players — unique names only (avoid common names like "jones", "elliott")
  "salah", "van dijk", "virgil",
  "alisson", "kelleher",
  "robertson", "konate", "quansah",
  "mac allister", "gravenberch", "szoboszlai",
  "gakpo", "jota", "chiesa",
  // New signings 2025/26
  "florian wirtz", "alexander isak",
  "kerkez", "frimpong", "ekitike",
  "mamardashvili",
];
