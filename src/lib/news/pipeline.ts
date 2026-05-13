import type { NewsArticle } from "./types";
import type { FeedAdapter } from "./adapters/base";
import { deduplicateArticles } from "./dedup";
import { enrichArticleMeta } from "./enrichers/og-meta";
import { categorizeArticle } from "./categories";
import { scoreArticle } from "./relevance";

export interface SourceStats {
  fetched: number;
  parsed: number;
  failed: number;
  thin: number;
}

export interface PipelineResult {
  articles: NewsArticle[];
  stats: Record<string, SourceStats>;
}

export async function fetchAllNews(
  adapters: FeedAdapter[],
  limit: number
): Promise<PipelineResult> {
  // Fetch all sources in parallel — graceful per-source failure
  const results = await Promise.allSettled(
    adapters.map((a) => a.fetch())
  );

  const all: NewsArticle[] = [];
  const stats: Record<string, SourceStats> = {};

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const source = adapters[i].name;
    if (r.status === "fulfilled") {
      const articles = r.value;
      const thin = articles.reduce((count, a) => count + ((a.wordCount ?? 0) < 50 ? 1 : 0), 0);
      stats[source] = { fetched: articles.length, parsed: articles.length, failed: 0, thin };
      all.push(...articles);
    } else {
      stats[source] = { fetched: 0, parsed: 0, failed: 1, thin: 0 };
      console.error(`[pipeline] ${source} failed:`, r.reason);
    }
  }

  if (all.length === 0) return { articles: [], stats };

  // Dedup (URL + Jaccard title similarity)
  const unique = deduplicateArticles(all);

  // Categorize + score, filter out irrelevant articles (score -1)
  for (const a of unique) {
    a.category = categorizeArticle(a);
    a.relevanceScore = scoreArticle(a);
  }
  const relevant = unique.filter((a) => (a.relevanceScore ?? 0) >= 0);

  // Prioritize freshness first, then relevance as tie-breaker.
  // This prevents older but high-score posts from crowding out latest match-day news.
  relevant.sort((a, b) => {
    const timeDiff = new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
    if (timeDiff !== 0) return timeDiff;
    return (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0);
  });

  const sliced = relevant.slice(0, limit);

  // Enrich articles missing thumbnails/dates with OG meta (batched in chunks of 10)
  await enrichArticleMeta(sliced, 50);

  return { articles: sliced, stats };
}
