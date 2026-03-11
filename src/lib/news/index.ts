import "server-only";
import { cache } from "react";
import { fetchAllNews } from "./pipeline";
import { RssAdapter } from "./adapters/rss-adapter";
import { LfcAdapter } from "./adapters/lfc-adapter";
import { BongdaplusAdapter } from "./adapters/bongdaplus-adapter";
import { RSS_FEEDS } from "./config";
import type { NewsArticle } from "./types";

// Re-export types for server consumers
export type { NewsArticle, ArticleContent, NewsSource, NewsLanguage, ArticleCategory } from "./types";

// Re-export scraping functions
export { scrapeArticle, getOgImage } from "./enrichers/article-extractor";

// Re-export DB query helpers
export { getNewsFromDB, searchArticles, getNewsPaginated } from "./db";

// Build adapter list
const adapters = [
  new LfcAdapter(),
  ...RSS_FEEDS.map((cfg) => new RssAdapter(cfg)),
  new BongdaplusAdapter(),
];

/** Fetch news directly from adapters (used by sync API). */
export const getNews = cache(async (limit = 50): Promise<NewsArticle[]> => {
  try {
    const { articles } = await fetchAllNews(adapters, limit);
    return articles;
  } catch (err) {
    console.error("[news] Fatal error:", err);
    return [];
  }
});
