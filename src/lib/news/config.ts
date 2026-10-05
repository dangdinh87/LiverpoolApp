// Server-side feed configuration — contains URLs, not safe for client
import "server-only";
import type { FeedConfig } from "./types";

export const RSS_FEEDS: FeedConfig[] = [
  // English — LFC-specific feeds
  { url: "https://feeds.bbci.co.uk/sport/football/teams/liverpool/rss.xml", source: "bbc", language: "en" },
  { url: "https://www.theguardian.com/football/liverpool/rss", source: "guardian", language: "en" },
  { url: "https://www.thisisanfield.com/feed/", source: "tia", language: "en" },
  { url: "https://www.anfieldwatch.co.uk/feed", source: "anfield-watch", language: "en" },
  { url: "https://www.empireofthekop.com/feed/", source: "eotk", language: "en" },
  // Sky: /rss/11669 is the football feed (/rss/12040 is broad sports, 0 Liverpool items).
  { url: "https://www.skysports.com/rss/11669", source: "sky", language: "en", filter: "lfc" },
  { url: "https://www.mirror.co.uk/all-about/liverpool-fc/?service=rss", source: "mirror", language: "en" },
  // The Independent's topic RSS is empty (0 items); the football feed works with the LFC filter.
  { url: "https://www.independent.co.uk/sport/football/rss", source: "independent", language: "en", filter: "lfc" },
  // MEN's Liverpool topic feed carries ~2 items (3.6 KB) — not worth a request; old `men` rows still render.
  // 300 items / ~650 KB: needs more than the default timeout.
  { url: "https://anfieldindex.com/feed", source: "anfieldindex", language: "en", timeoutMs: 8_000 },
  { url: "https://www.liverpool.com/?service=rss", source: "liverpoolcom", language: "en" },
  // English — general feeds with keyword filter
  { url: "https://www.liverpoolecho.co.uk/all-about/liverpool-fc/?service=rss", source: "echo", language: "en" },
  { url: "https://www.espn.com/espn/rss/soccer/news", source: "espn", language: "en", filter: "lfc" },
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
  // ~1000 unsorted items (~900 KB), dates are modified-times: longer timeout, sorted + age-cut in the adapter.
  { url: "https://vietnamnet.vn/rss/the-thao/bong-da-quoc-te.rss", source: "vietnamnet", language: "vi", filter: "lfc", timeoutMs: 10_000 },
  // Vietnamese — additional football feeds researched May 2026
  { url: "https://bongda24h.vn/RSS/172.rss", source: "bongda24h", language: "vi", filter: "lfc" },
  { url: "https://bongda24h.vn/RSS/187.rss", source: "bongda24h", language: "vi", filter: "lfc" },
  // soha's section is dormant (months-old items): tight age cutoff.
  { url: "https://soha.vn/rss/the-thao/anh.rss", source: "soha", language: "vi", filter: "lfc", maxAgeDays: 7 },
];

// Bongdaplus scraper config
// Tag pages list Liverpool stories only; the section pages (ngoai-hang-anh, c1) were ~95% other clubs.
export const BONGDAPLUS_URLS = [
  "https://bongdaplus.vn/liverpool-tags",
  "https://bongdaplus.vn/tin-chuyen-nhuong-liverpool",
];

/** Single source of truth for LFC keyword matching + relevance scoring */
export const LFC_KEYWORDS_WEIGHTED: { term: string; weight: number }[] = [
  // Club identity — highest weight
  { term: "liverpool", weight: 3 },
  { term: "anfield", weight: 3 },
  { term: "lfc", weight: 3 },
  { term: "the kop", weight: 2.5 },
  { term: "lữ đoàn đỏ", weight: 2.5 },
  // Head coach (Andoni Iraola) and sporting director — surname alone is distinctive
  { term: "iraola", weight: 2.5 },
  { term: "julian ward", weight: 2 },
  { term: "the reds", weight: 2 },
  // Star players
  { term: "van dijk", weight: 2.5 },
  { term: "virgil", weight: 2 },
  // New signings — high interest
  { term: "bradley barcola", weight: 3 },
  { term: "ronald araujo", weight: 3 },
  { term: "florian wirtz", weight: 3 },
  { term: "alexander isak", weight: 3 },
  { term: "kerkez", weight: 2 },
  { term: "frimpong", weight: 2 },
  { term: "ekitike", weight: 2 },
  { term: "mamardashvili", weight: 2 },
  { term: "chiesa", weight: 2 },
  { term: "jacquet", weight: 2 },
  { term: "leoni", weight: 2 },
  // Core squad — unique names only
  { term: "alisson", weight: 1.5 },
  { term: "gakpo", weight: 2.5 },
  { term: "mac allister", weight: 2.5 },
  { term: "gravenberch", weight: 2.5 },
  { term: "szoboszlai", weight: 2.5 },
  { term: "konaté", weight: 2.5 },
  { term: "konate", weight: 2.5 },
  { term: "elliott", weight: 1.5 },
  { term: "endo", weight: 1.5 },
  { term: "ngumoha", weight: 1.5 },
  { term: "nyoni", weight: 1 },
  { term: "jaros", weight: 1 },
];

/** Flat keyword list derived from weighted — used for RSS/adapter filtering */
export const LFC_KEYWORDS = LFC_KEYWORDS_WEIGHTED.map((k) => k.term);
