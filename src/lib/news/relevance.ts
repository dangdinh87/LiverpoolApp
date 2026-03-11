import type { NewsArticle, NewsSource } from "./types";
import { LFC_KEYWORDS_WEIGHTED } from "./config";

const SOURCE_PRIORITY: Partial<Record<NewsSource, number>> = {
  lfc: 10,
  "anfield-watch": 8,
  eotk: 8,
  echo: 7,
  bbc: 6,
  guardian: 6,
  bongda: 4,
  bongdaplus: 3,
  "24h": 3,
  vnexpress: 3,
  tuoitre: 3,
  thanhnien: 3,
  dantri: 3,
  zingnews: 3,
  vietnamnet: 3,
  webthethao: 2,
};

export function scoreArticle(article: NewsArticle): number {
  const text = `${article.title} ${article.contentSnippet}`.toLowerCase();

  // Keyword relevance (0-10)
  let keywordScore = 0;
  for (const { term, weight } of LFC_KEYWORDS_WEIGHTED) {
    if (text.includes(term)) keywordScore += weight;
  }
  keywordScore = Math.min(keywordScore, 10);

  // Source priority (0-10)
  const srcScore = SOURCE_PRIORITY[article.source] ?? 3;

  // Freshness: full score within 2h, halved at 24h, near-zero at 7d
  const ageHours = (Date.now() - new Date(article.pubDate).getTime()) / 3600000;
  const freshnessScore = Math.max(0, 10 * Math.exp(-ageHours / 24));

  // Weighted: freshness 40%, keywords 30%, source 30%
  return freshnessScore * 0.4 + keywordScore * 0.3 + srcScore * 0.3;
}
