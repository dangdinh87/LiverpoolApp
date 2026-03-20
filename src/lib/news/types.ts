// Shared types — no "server-only" guard so client components can import types

export type NewsSource =
  | "lfc" | "bbc" | "guardian" | "bongda" | "24h" | "bongdaplus"
  | "echo" | "anfield-watch" | "eotk"
  | "vnexpress" | "tuoitre" | "thanhnien"
  | "dantri" | "zingnews" | "vietnamnet" | "webthethao" | "vietnamvn"
  | "goal";

export type NewsLanguage = "en" | "vi";

export type ArticleCategory =
  | "match-report" | "transfer" | "injury" | "opinion"
  | "team-news" | "analysis" | "general";

export interface NewsArticle {
  title: string;
  link: string;
  pubDate: string;
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
}
