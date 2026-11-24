// Server-side feed configuration — contains URLs, not safe for client
import "server-only";
import type { FeedConfig } from "./types";
import type { PodcastFeedConfig } from "./adapters/podcast-adapter";
import type { BlueskyFeedConfig } from "./adapters/bluesky-adapter";

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
  { url: "https://www.liverpoolecho.co.uk/all-about/liverpool-fc/?service=rss", source: "echo", language: "en" },
  { url: "https://www.espn.com/espn/rss/soccer/news", source: "espn", language: "en", filter: "lfc" },
  // English — additional web outlets verified Nov 2026
  { url: "https://www.dailymail.co.uk/sport/teampages/liverpool.rss", source: "dailymail", language: "en" },
  { url: "https://www.telegraph.co.uk/football/rss.xml", source: "telegraph", language: "en", filter: "lfc" },
  { url: "https://talksport.com/football/feed/", source: "talksport", language: "en", filter: "lfc", timeoutMs: 8_000 },
  { url: "https://www.fourfourtwo.com/feeds.xml", source: "fourfourtwo", language: "en", filter: "lfc", timeoutMs: 8_000 },
  { url: "https://www.rousingthekop.com/feed/", source: "rousingthekop", language: "en" },
  { url: "https://www.daveockop.com/feed/", source: "daveockop", language: "en" },
];

export const PODCAST_FEEDS: PodcastFeedConfig[] = [
  { url: "https://feeds.acast.com/public/shows/681ccc398b1f3232bc1e68ae", source: "pod-walkon", showName: "Walk On · The Athletic" },
  { url: "https://feeds.megaphone.fm/COMG6516013185", source: "pod-taw", showName: "The Anfield Wrap" },
  { url: "https://feeds.megaphone.fm/RPSL9422504008", source: "pod-bloodred", showName: "Blood Red Podcast" },
  { url: "https://feeds.acast.com/public/shows/52fa29b2-4f7d-4d5c-8d36-d1cb2a782d0e", source: "pod-redmentv", showName: "The Redmen TV Podcast" },
  { url: "https://feeds.megaphone.fm/COMG5209641071", source: "pod-anfieldindex", showName: "Anfield Index Podcast" },
];

export const BLUESKY_FEEDS: BlueskyFeedConfig[] = [
  { handle: "ptgorst.bsky.social", source: "bsky-gorst", authorName: "Paul Gorst" },
  { handle: "iandoylesport.bsky.social", source: "bsky-doyle", authorName: "Ian Doyle" },
  { handle: "david-ornstein.bsky.social", source: "bsky-ornstein", authorName: "David Ornstein", filter: "lfc" },
  { handle: "theanfieldwrap.bsky.social", source: "bsky-taw", authorName: "The Anfield Wrap" },
];

/**
 * Distinct written-news outlets in the pipeline: RSS feeds plus the club's own
 * editorial adapter. Video, podcast and social channels live in separate strips.
 */
export const NEWS_OUTLET_COUNT = new Set([...RSS_FEEDS.map((f) => f.source), "lfc"]).size;

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
  { term: "victor munoz", weight: 2.5 },
  { term: "munoz", weight: 1.5 },
  { term: "elliott", weight: 1.5 },
  { term: "endo", weight: 1.5 },
  { term: "ngumoha", weight: 1.5 },
  { term: "nyoni", weight: 1 },
  { term: "jaros", weight: 1 },
];

/** Flat keyword list derived from weighted — used for RSS/adapter filtering */
export const LFC_KEYWORDS = LFC_KEYWORDS_WEIGHTED.map((k) => k.term);
