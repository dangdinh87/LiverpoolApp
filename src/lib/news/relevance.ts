import type { NewsArticle, NewsSource } from "./types";
import { LFC_KEYWORDS_WEIGHTED } from "./config";

interface WeightedPattern {
  pattern: RegExp;
  weight: number;
  label: string;
}

export interface ArticleRelevanceAnalysis {
  score: number;
  isRelevant: boolean;
  reasons: string[];
  signals: {
    identity: number;
    source: number;
    freshness: number;
    topic: number;
    language: number;
    penalty: number;
  };
}

const SOURCE_PRIORITY: Partial<Record<NewsSource, number>> = {
  lfc: 10,
  "anfield-watch": 7,
  eotk: 7,
  echo: 7,
  tia: 7,
  sky: 5,
  mirror: 4,
  independent: 4,
  men: 4,
  anfieldindex: 5,
  liverpoolcom: 5,
  espn: 3,
  bbc: 6,
  guardian: 6,
  bongda: 8,
  bongdaplus: 8,
  bongda24h: 8,
  thethao247: 7,
  "24h": 6,
  vnexpress: 6,
  tuoitre: 6,
  thanhnien: 6,
  dantri: 6,
  zingnews: 6,
  vietnamnet: 6,
  webthethao: 6,
  vietnamvn: 5,
  soha: 4,
};

// Liverpool-dedicated feeds get a trust boost, but still pass through identity/competitor checks.
const LFC_DEDICATED: Set<NewsSource> = new Set([
  "lfc",
  "anfield-watch",
  "eotk",
  "echo",
  "tia",
  "mirror",
  "independent",
  "men",
  "anfieldindex",
  "liverpoolcom",
]);

const DIRECT_LFC_PATTERNS: WeightedPattern[] = [
  { pattern: /\bliverpool\b/i, weight: 5, label: "mentions Liverpool" },
  { pattern: /\blfc\b/i, weight: 5, label: "mentions LFC" },
  { pattern: /\banfield\b/i, weight: 4, label: "mentions Anfield" },
  { pattern: /\bthe kop\b/i, weight: 3, label: "mentions The Kop" },
  { pattern: /lữ\s*đoàn\s*đỏ/i, weight: 5, label: "mentions Lữ đoàn đỏ" },
  { pattern: /đội bóng vùng merseyside/i, weight: 3, label: "mentions Merseyside club" },
];

const TOPIC_PATTERNS: WeightedPattern[] = [
  {
    pattern:
      /transfer|sign(s|ed|ing)?|deal|bid|target|contract|chuyển nhượng|ký hợp đồng|gia nhập|chiêu mộ|hợp đồng/i,
    weight: 2,
    label: "transfer topic",
  },
  {
    pattern:
      /\d+\s*[-–]\s*\d+|match report|preview|line-?up|kết quả|nhận định|đội hình|trước trận|tỷ số/i,
    weight: 2,
    label: "match topic",
  },
  {
    pattern: /injur(y|ed|ies)|fitness|ruled out|chấn thương|vắng mặt|hồi phục/i,
    weight: 1.5,
    label: "injury/team fitness topic",
  },
  {
    pattern: /analysis|tactical|ratings?|opinion|phân tích|bình luận|chấm điểm|đánh giá/i,
    weight: 1,
    label: "analysis topic",
  },
];

const OTHER_BIG_CLUB_PATTERN =
  /\b(man\s?utd|manchester united|mu|arsenal|chelsea|man city|manchester city|tottenham|real madrid|barcelona|psg|bayern)\b|quỷ đỏ/i;

const CONTEXTUAL_PLAYER_TERMS = new Set(
  LFC_KEYWORDS_WEIGHTED
    .map(({ term }) => term)
    .filter(
      (term) =>
        !["liverpool", "lfc", "anfield", "the kop", "lữ đoàn đỏ"].includes(term)
    )
);

function scorePatternGroup(text: string, patterns: WeightedPattern[]) {
  let score = 0;
  const labels: string[] = [];
  for (const { pattern, weight, label } of patterns) {
    if (pattern.test(text)) {
      score += weight;
      labels.push(label);
    }
  }
  return { score, labels };
}

function scoreContextualPlayers(text: string) {
  let score = 0;
  const labels: string[] = [];

  for (const { term, weight } of LFC_KEYWORDS_WEIGHTED) {
    if (!CONTEXTUAL_PLAYER_TERMS.has(term)) continue;
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(
      `(^|[^\\p{L}\\p{N}])${escaped}([^\\p{L}\\p{N}]|$)`,
      "iu"
    );
    if (pattern.test(text)) {
      score += weight;
      labels.push(`mentions ${term}`);
    }
  }

  return { score: Math.min(score, 5), labels };
}

export function analyzeArticleRelevance(article: NewsArticle): ArticleRelevanceAnalysis {
  const title = article.title.toLowerCase();
  const text = `${article.title} ${article.contentSnippet}`.toLowerCase();
  const reasons: string[] = [];
  const isDedicatedSource = LFC_DEDICATED.has(article.source);

  const direct = scorePatternGroup(text, DIRECT_LFC_PATTERNS);
  const directInTitle = scorePatternGroup(title, DIRECT_LFC_PATTERNS);
  const players = scoreContextualPlayers(text);
  const playersInTitle = scoreContextualPlayers(title);

  const hasDirectIdentity = direct.score > 0;
  const hasStrongPlayerIdentity = players.score >= 2.5;

  if (!isDedicatedSource && !hasDirectIdentity && !hasStrongPlayerIdentity) {
    return {
      score: -1,
      isRelevant: false,
      reasons: ["rejected: no Liverpool identity signal"],
      signals: {
        identity: 0,
        source: SOURCE_PRIORITY[article.source] ?? 3,
        freshness: 0,
        topic: 0,
        language: 0,
        penalty: 0,
      },
    };
  }

  if (!hasDirectIdentity && !hasStrongPlayerIdentity && OTHER_BIG_CLUB_PATTERN.test(text)) {
    return {
      score: -1,
      isRelevant: false,
      reasons: ["rejected: competitor-only article"],
      signals: {
        identity: 0,
        source: SOURCE_PRIORITY[article.source] ?? 3,
        freshness: 0,
        topic: 0,
        language: 0,
        penalty: 4,
      },
    };
  }

  const sourceScore = SOURCE_PRIORITY[article.source] ?? 3;
  const dedicatedBase = isDedicatedSource ? 3 : 0;
  const titleBonus = Math.min(
    2,
    directInTitle.score > 0 ? 1.4 : playersInTitle.score > 0 ? 0.8 : 0
  );
  const identityScore = Math.min(10, direct.score + players.score + dedicatedBase + titleBonus);

  if (direct.labels.length) reasons.push(...direct.labels);
  if (!direct.labels.length && players.labels.length) reasons.push(...players.labels);
  if (isDedicatedSource) reasons.push("trusted Liverpool source");

  const topic = scorePatternGroup(text, TOPIC_PATTERNS);
  const topicScore = Math.min(10, topic.score);
  if (topic.labels.length) reasons.push(...topic.labels);

  const publishedMs = new Date(article.pubDate).getTime();
  const ageHours = Number.isFinite(publishedMs)
    ? (Date.now() - publishedMs) / 3600000
    : 168;
  const freshnessScore = Math.max(0, 10 * Math.exp(-Math.max(0, ageHours) / 24));
  const languageScore = article.language === "vi" ? 10 : 0;

  let penalty = 0;
  if (OTHER_BIG_CLUB_PATTERN.test(text) && !hasDirectIdentity) {
    penalty += 2;
    reasons.push("penalty: competitor-heavy context");
  }

  const score = Math.max(
    0,
    Math.min(
      10,
      identityScore * 0.36 +
        freshnessScore * 0.24 +
        sourceScore * 0.2 +
        topicScore * 0.12 +
        languageScore * 0.08 -
        penalty
    )
  );

  return {
    score,
    isRelevant: score > 0,
    reasons,
    signals: {
      identity: identityScore,
      source: sourceScore,
      freshness: freshnessScore,
      topic: topicScore,
      language: languageScore,
      penalty,
    },
  };
}

export function scoreArticle(article: NewsArticle): number {
  return analyzeArticleRelevance(article).score;
}
