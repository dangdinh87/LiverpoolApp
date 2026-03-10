import type { NewsArticle } from "./types";

// URL normalization: strip protocol, www, trailing slashes
function normalizeUrl(url: string): string {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "")
    .toLowerCase();
}

// Jaccard similarity on title tokens
const STOPWORDS = new Set([
  "a", "an", "the", "is", "in", "of", "to", "and", "for", "on", "at",
  "with", "by", "from", "as", "but", "or", "not", "be", "are", "was",
]);

export function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
  );
}

export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  const intersection = new Set([...a].filter((x) => b.has(x)));
  const union = new Set([...a, ...b]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

const JACCARD_THRESHOLD = 0.6;

export function deduplicateArticles(articles: NewsArticle[]): NewsArticle[] {
  const seenUrls = new Set<string>();
  const kept: { tokens: Set<string>; article: NewsArticle }[] = [];

  for (const a of articles) {
    // 1. URL dedup
    const urlKey = normalizeUrl(a.link);
    if (seenUrls.has(urlKey)) continue;
    seenUrls.add(urlKey);

    // 2. Jaccard title-prefix dedup (first 60 chars)
    const prefix = a.title.slice(0, 60);
    const tokens = tokenize(prefix);
    const isDupe = kept.some(
      (existing) => jaccardSimilarity(tokens, existing.tokens) > JACCARD_THRESHOLD
    );
    if (isDupe) continue;

    kept.push({ tokens, article: a });
  }

  return kept.map((k) => k.article);
}
