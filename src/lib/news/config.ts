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
  echo: { label: "Liverpool Echo", color: "bg-purple-700 text-purple-100", language: "en" },
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
  vietnamvn: { label: "Vietnam.vn", color: "bg-red-700 text-red-100", language: "vi" },
  goal: { label: "GOAL", color: "bg-[#00234B] text-white", language: "en" },
};

// Vietnam.vn scraper config (no RSS, scrape sports category)
export const VIETNAMVN_URLS = [
  "https://www.vietnam.vn/category/the-thao",
];

// Bongdaplus scraper config
export const BONGDAPLUS_URLS = [
  "https://bongdaplus.vn/ngoai-hang-anh",
  "https://bongdaplus.vn/champions-league-cup-c1",
];

/** Single source of truth for LFC keyword matching + relevance scoring */
export const LFC_KEYWORDS_WEIGHTED: { term: string; weight: number }[] = [
  // Club identity — highest weight
  { term: "liverpool", weight: 3 },
  { term: "anfield", weight: 3 },
  { term: "lfc", weight: 3 },
  { term: "the kop", weight: 2.5 },
  { term: "lữ đoàn đỏ", weight: 2.5 },
  // Manager — full name only
  { term: "arne slot", weight: 2.5 },
  // Star players
  { term: "salah", weight: 2.5 },
  { term: "van dijk", weight: 2.5 },
  { term: "virgil", weight: 2 },
  // New signings — high interest
  { term: "florian wirtz", weight: 3 },
  { term: "alexander isak", weight: 3 },
  { term: "kerkez", weight: 2 },
  { term: "frimpong", weight: 2 },
  { term: "ekitike", weight: 2 },
  { term: "mamardashvili", weight: 2 },
  { term: "chiesa", weight: 2 },
  // Core squad — unique names only
  { term: "alisson", weight: 1.5 },
  { term: "kelleher", weight: 1.5 },
  { term: "robertson", weight: 1.5 },
  { term: "konate", weight: 1.5 },
  { term: "quansah", weight: 1 },
  { term: "gakpo", weight: 1.5 },
  { term: "mac allister", weight: 1.5 },
  { term: "gravenberch", weight: 1.5 },
  { term: "szoboszlai", weight: 1.5 },
  { term: "jota", weight: 1.5 },
];

/** Flat keyword list derived from weighted — used for RSS/adapter filtering */
export const LFC_KEYWORDS = LFC_KEYWORDS_WEIGHTED.map((k) => k.term);
