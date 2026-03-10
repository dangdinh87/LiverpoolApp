import type { NewsArticle } from "./types";
import type { FeedAdapter } from "./adapters/base";
import { deduplicateArticles } from "./dedup";
import { enrichArticleMeta } from "./enrichers/og-meta";
import { categorizeArticle } from "./categories";
import { scoreArticle } from "./relevance";

export async function fetchAllNews(
  adapters: FeedAdapter[],
  limit: number
): Promise<NewsArticle[]> {
  // Fetch all sources in parallel — graceful per-source failure
  const results = await Promise.allSettled(
    adapters.map((a) => a.fetch())
  );

  const all: NewsArticle[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") all.push(...r.value);
  }

  if (all.length === 0) return [];

  // Dedup (URL + Jaccard title similarity)
  const unique = deduplicateArticles(all);

  // Categorize + score
  for (const a of unique) {
    a.category = categorizeArticle(a);
    a.relevanceScore = scoreArticle(a);
  }

  // Sort by relevance score desc
  unique.sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));

  const sliced = unique.slice(0, limit);

  // Enrich articles missing thumbnails/dates with OG meta (batched in chunks of 10)
  await enrichArticleMeta(sliced, 50);

  return sliced;
}
