import type { NewsArticle, NewsSource } from "./types";

const LFC_KEYWORDS: { term: string; weight: number }[] = [
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

const SOURCE_PRIORITY: Record<NewsSource, number> = {
  lfc: 10,
  tia: 8,
  "anfield-watch": 8,
  eotk: 8,
  echo: 7,
  bbc: 6,
  guardian: 6,
  sky: 5,
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
  for (const { term, weight } of LFC_KEYWORDS) {
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
