// Shared types — no "server-only" guard so client components can import types

export type NewsSource =
  | "lfc" | "bbc" | "guardian" | "bongda" | "24h" | "bongdaplus"
  | "echo" | "anfield-watch" | "eotk" | "sky" | "mirror" | "independent"
  | "men" | "anfieldindex" | "liverpoolcom" | "tia" | "espn"
  | "dailymail" | "telegraph" | "talksport" | "fourfourtwo" | "rousingthekop" | "daveockop"
  | "vnexpress" | "tuoitre" | "thanhnien"
  | "dantri" | "zingnews" | "vietnamnet" | "webthethao" | "vietnamvn"
  | "bongda24h" | "thethao247" | "soha" | "goal"
  // Video, podcasts and Bluesky reporters. Kept out of the /news written-article
  // feed (via NON_ARTICLE_SOURCES) and surfaced in their own strips on /news.
  | "lfctv" | "yt-redmentv" | "yt-taw" | "yt-anfieldagenda" | "yt-bloodred"
  | "pod-walkon" | "pod-taw" | "pod-bloodred" | "pod-redmentv" | "pod-anfieldindex"
  | "bsky-gorst" | "bsky-doyle" | "bsky-ornstein" | "bsky-taw";

export type NewsLanguage = "en" | "vi";

export type ArticleCategory =
  | "match-report" | "transfer" | "injury" | "opinion"
  | "team-news" | "analysis" | "general";

export interface NewsArticle {
  title: string;
  link: string;
  pubDate: string;
  fetchedAt?: string;
  contentSnippet: string;
  thumbnail?: string;
  source: NewsSource;
  language: NewsLanguage;
  category?: ArticleCategory;
  relevanceScore?: number;
  author?: string;
  heroImage?: string;
  wordCount?: number;
  tags?: string[];
}

export interface ArticleContent {
  title: string;
  heroImage?: string;
  description?: string;
  publishedAt?: string;
  author?: string;
  paragraphs: string[];
  htmlContent?: string;
  images: string[];
  sourceUrl: string;
  sourceName: string;
  readingTime?: number;
  isThinContent?: boolean;
  videoUrl?: string;
}

export interface FeedConfig {
  url: string;
  source: NewsSource;
  language: NewsLanguage;
  filter?: string;
  /** Per-feed fetch timeout (default 3.5s); big feeds (vietnamnet ~900KB) need more. */
  timeoutMs?: number;
  /** Drop items older than this many days (default 14 = DB retention). */
  maxAgeDays?: number;
}
