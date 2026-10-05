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
// Mirror / Independent / MEN publish all-football streams (Oct 2026 audit: city
// stories and other clubs passed on the strength of the feed alone), so they are
// NOT in this set: their items need a Liverpool identity signal like any other.
const LFC_DEDICATED: Set<NewsSource> = new Set([
  "lfc",
  "anfield-watch",
  "eotk",
  "echo",
  "tia",
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

// "Liverpool" the city / other clubs, not Liverpool FC men's team news.
const NON_LFC_LIVERPOOL_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /liverpool\s+street|liverpool\s+lime\s+street|lime\s+street/i, label: "Liverpool Street / Lime Street station" },
  { pattern: /liverpool\s+city\s+(council|region|centre|center)|mayor of liverpool/i, label: "Liverpool city/council news" },
  { pattern: /\b(liverpool|lfc)(\s+fc)?\s+(women|ladies)\b|\blfcw\b|\bgareth taylor\b/i, label: "women's team" },
];

// "WSL" / "Women's Super League" alone is not enough (a men's story can mention it),
// but together with a women's-football marker it is the women's team.
const WSL_PATTERN = /\bwsl\b|women'?s super league/i;
const WOMENS_MARKER_PATTERN = /\b(women|ladies|female|she|her)\b/i;

// National-team reports name Liverpool players too ("ĐT Hà Lan thoát thua" via Van Dijk).
const NATIONAL_TEAM_PATTERN =
  /(?<![\p{L}\p{N}])(?:đt|đtqg|đội tuyển|tuyển (?!thủ)|national team|nations league|world cup|vòng loại|international (?:break|duty)|internationals?)(?![\p{L}\p{N}])/iu;


// Everton mentions are only "ours" when a clear LFC signal or a fixture/derby framing is present.
const EVERTON_PATTERN = /\beverton\b/i;
// "v" counts as versus only when whitespace-delimited: the "v" of Vietnamese
// "với" (with) must not satisfy the Everton guard.
const VERSUS = "(?:(?<=\\s)v(?=\\s)|\\bvs\\.?(?=\\s)|đối đầu|đấu với|đụng độ|gặp)";
const STRONG_LFC_SIGNAL_PATTERN = new RegExp(
  "\\blfc\\b|\\banfield\\b|\\bliverpool fc\\b|\\bthe kop\\b|\\bthe reds\\b|lữ\\s*đoàn\\s*đỏ|\\bderby\\b|" +
    `\\bliverpool\\b.{0,40}${VERSUS}.{0,40}\\beverton\\b|\\beverton\\b.{0,40}${VERSUS}.{0,40}\\bliverpool\\b`,
  "i"
);

function detectNonLfcContext(text: string, hasStrongPlayerIdentity: boolean): string | null {
  for (const { pattern, label } of NON_LFC_LIVERPOOL_PATTERNS) {
    if (pattern.test(text)) return label;
  }
  if (WSL_PATTERN.test(text) && WOMENS_MARKER_PATTERN.test(text)) return "women's team (WSL)";
  if (EVERTON_PATTERN.test(text) && !hasStrongPlayerIdentity && !STRONG_LFC_SIGNAL_PATTERN.test(text)) {
    return "Everton story mentioning Liverpool only as a place";
  }
  return null;
}

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

  const nonLfcContext = detectNonLfcContext(text, hasStrongPlayerIdentity);
  if (nonLfcContext) {
    return {
      score: -1,
      isRelevant: false,
      reasons: [`rejected: ${nonLfcContext}`],
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

  // A national-team report that merely names a Liverpool player is not club news:
  // it needs a Liverpool/Anfield mention or a second distinct player.
  if (!hasDirectIdentity && NATIONAL_TEAM_PATTERN.test(text) && players.labels.length < 2) {
    return {
      score: -1,
      isRelevant: false,
      reasons: ["rejected: national-team report without club context"],
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

  // The official LFC site is trusted: "Iraola: we must be brave against Man City" is ours.
  if (
    article.source !== "lfc" &&
    !hasDirectIdentity &&
    !hasStrongPlayerIdentity &&
    OTHER_BIG_CLUB_PATTERN.test(text)
  ) {
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
