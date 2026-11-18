import "server-only";

// Re-export types for server consumers
export type { NewsArticle, ArticleContent, NewsSource, NewsLanguage, ArticleCategory } from "./types";

// Re-export scraping functions
export { scrapeArticle, getOgImage } from "./enrichers/article-extractor";

// Re-export DB query helpers
export {
  getNewsFromDB,
  getVideoItemsFromDB,
  searchArticles,
  getNewsPaginated,
  getArticleRefsByUrls,
  getArticlesMentioning,
  getArticleContentFromDB,
  getArticleByUrl,
  isArticleStored,
} from "./db";

// Re-export engagement helpers
export { getArticleEngagement, ARTICLE_ENGAGEMENT_TAG } from "./engagement";
export type { ArticleEngagement } from "./engagement";
