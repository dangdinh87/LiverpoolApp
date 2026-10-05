import type { NewsArticle } from "./types";

import { canonicalizeArticleUrl } from "./url";

// URL normalization: canonical form (no tracking params / trailing slash), minus protocol and www
function normalizeUrl(url: string): string {
  return canonicalizeArticleUrl(url)
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .toLowerCase();
}

// Reach plc sites syndicate the same story under different numeric ids
// (…/slug-name-12345678 on Echo, Mirror, MEN, liverpool.com).
const REACH_HOST = /(^|\.)(mirror\.co\.uk|liverpoolecho\.co\.uk|liverpool\.com|manchestereveningnews\.co\.uk|dailystar\.co\.uk|express\.co\.uk)$/i;

function hostOf(url: string): string {
  try { return new URL(url).hostname; } catch { return ""; }
}

/** `/a/b/some-slug-name-12345678?x` -> `some-slug-name`; "" when not a Reach URL / slug too short to trust. */
export function reachSlugKey(url: string): string {
  if (!REACH_HOST.test(hostOf(url))) return "";
  try {
    const last = new URL(url).pathname.split("/").filter(Boolean).pop() ?? "";
    const slug = last.replace(/\.(?:html?|ece)$/i, "").replace(/-?(?:ar)?\d{5,}$/i, "").toLowerCase();
    return slug.length >= 20 ? slug : "";
  } catch {
    return "";
  }
}

/** Image identity for syndication matching: the file name (sister sites use different CDN hosts), size/query dropped. */
export function reachImageKey(thumbnail: string | undefined, url: string): string {
  if (!thumbnail || !REACH_HOST.test(hostOf(url))) return "";
  try {
    const u = new URL(thumbnail);
    // Reach image paths embed a size ("/ALTERNATES/s615b/…") — the file name is the identity.
    const file = u.pathname.split("/").filter(Boolean).pop() ?? "";
    return file.length >= 12 ? file.toLowerCase() : "";
  } catch {
    return "";
  }
}

// Jaccard similarity on title tokens
const STOPWORDS = new Set([
  "a", "an", "the", "is", "in", "of", "to", "and", "for", "on", "at",
  "with", "by", "from", "as", "but", "or", "not", "be", "are", "was",
]);

export function tokenize(text: string): Set<string> {
  return new Set(
    text
      .normalize("NFC")
      .toLowerCase()
      // Keep letters/digits of every script: `[^\w\s]` stripped Vietnamese letters ("Liên" → "lin").
      .replace(/[^\p{L}\p{N}\s]/gu, "")
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

/** A row already stored (recent window): same story under another URL means skip. */
export interface ExistingArticleRef {
  url: string;
  title: string;
}

export function deduplicateArticles(
  articles: NewsArticle[],
  existing: ExistingArticleRef[] = []
): NewsArticle[] {
  const seenUrls = new Set<string>();
  const seenSlugs = new Map<string, NewsArticle>();
  const seenImages = new Map<string, NewsArticle>();
  const kept: { tokens: Set<string>; article: NewsArticle }[] = [];

  const existingUrls = new Set(existing.map((e) => normalizeUrl(e.url)));
  const existingTokens = existing.map((e) => tokenize(e.title.slice(0, 60)));

  for (const a of articles) {
    // 1. URL dedup
    const urlKey = normalizeUrl(a.link);
    if (seenUrls.has(urlKey)) continue;
    seenUrls.add(urlKey);

    // 2. Reach syndication: same slug (ignoring the numeric id) or same image file
    const slugKey = reachSlugKey(a.link);
    const imageKey = reachImageKey(a.thumbnail, a.link);
    const syndicated = (slugKey && seenSlugs.get(slugKey)) || (imageKey && seenImages.get(imageKey)) || undefined;
    if (syndicated) {
      if (!syndicated.thumbnail && a.thumbnail) syndicated.thumbnail = a.thumbnail;
      continue;
    }

    // 3. Jaccard title-prefix dedup (first 60 chars) — within the batch ...
    const prefix = a.title.slice(0, 60);
    const tokens = tokenize(prefix);
    const isDupe = kept.some(
      (existingItem) => jaccardSimilarity(tokens, existingItem.tokens) > JACCARD_THRESHOLD
    );
    if (isDupe) continue;

    // ... and against rows stored in the last 48h, unless this IS one of them
    // (a re-fetch of a stored article must still go through as an update).
    if (!existingUrls.has(urlKey)) {
      const dupOfStored = existingTokens.some((t) => jaccardSimilarity(tokens, t) > JACCARD_THRESHOLD);
      if (dupOfStored) continue;
    }

    if (slugKey) seenSlugs.set(slugKey, a);
    if (imageKey) seenImages.set(imageKey, a);
    kept.push({ tokens, article: a });
  }

  return kept.map((k) => k.article);
}
