import type { NewsArticle } from "./types";
import type { FeedAdapter, SourceFetchStatus } from "./adapters/base";
import { worseStatus } from "./adapters/base";
import { deduplicateArticles, type ExistingArticleRef } from "./dedup";
import { enrichArticleMeta } from "./enrichers/og-meta";
import { categorizeArticle } from "./categories";
import { scoreArticle } from "./relevance";
import { compareDatesDesc } from "./date";
import { canonicalizeArticleUrl } from "./url";

export interface SourceStats {
  fetched: number;
  parsed: number;
  failed: number;
  /** Items kept after dedup + relevance (what the source actually contributed). */
  kept?: number;
  /** ok | http_error | timeout | parse_error | error — adapters swallow errors, so this is the only trace. */
  status?: SourceFetchStatus["state"];
  httpStatus?: number;
  error?: string;
}

export interface PipelineResult {
  articles: NewsArticle[];
  stats: Record<string, SourceStats>;
}

export interface PipelineOptions {
  metaFetches?: number;
  /** Rows stored in the last 48h: same story under another URL is not re-inserted. */
  existing?: ExistingArticleRef[];
}

function addSourceStats(
  stats: Record<string, SourceStats>,
  source: string,
  next: SourceStats,
  fetchStatus?: SourceFetchStatus
) {
  const current = stats[source] ?? { fetched: 0, parsed: 0, failed: 0 };
  const merged = worseStatus(
    current.status ? { state: current.status, httpStatus: current.httpStatus, error: current.error } : undefined,
    fetchStatus ?? (next.failed ? { state: "error" } : undefined)
  );
  stats[source] = {
    fetched: current.fetched + next.fetched,
    parsed: current.parsed + next.parsed,
    failed: current.failed + next.failed,
    ...(merged
      ? {
          status: merged.state,
          ...(merged.httpStatus !== undefined ? { httpStatus: merged.httpStatus } : {}),
          ...(merged.error ? { error: merged.error } : {}),
        }
      : {}),
  };
}

export async function fetchAllNews(
  adapters: FeedAdapter[],
  limit: number,
  options: PipelineOptions = {}
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
      addSourceStats(
        stats,
        source,
        { fetched: articles.length, parsed: articles.length, failed: 0 },
        adapters[i].status ?? { state: "ok" }
      );
      for (const a of articles) {
        // ONE canonical URL form (see url.ts) before anything keys on it.
        all.push({ ...a, link: a.link === "#" ? a.link : canonicalizeArticleUrl(a.link) });
      }
    } else {
      const message = r.reason instanceof Error ? r.reason.message : String(r.reason);
      addSourceStats(stats, source, { fetched: 0, parsed: 0, failed: 1 }, { state: "error", error: message.slice(0, 160) });
      console.error(`[pipeline] ${source} failed:`, r.reason);
    }
  }

  if (all.length === 0) return { articles: [], stats };

  // Dedup (URL + Jaccard title similarity)
  const unique = deduplicateArticles(all, options.existing);

  // Categorize + score, filter out irrelevant articles (score -1)
  for (const a of unique) {
    a.category = categorizeArticle(a);
    a.relevanceScore = scoreArticle(a);
  }
  const relevant = unique.filter((a) => (a.relevanceScore ?? 0) >= 0);

  // Prioritize freshness first, then relevance as tie-breaker.
  // This prevents older but high-score posts from crowding out latest match-day news.
  relevant.sort((a, b) => {
    const timeDiff = compareDatesDesc(a.pubDate, b.pubDate);
    if (timeDiff !== 0) return timeDiff;
    return (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0);
  });

  const sliced = relevant.slice(0, limit);
  // Per-source contribution after dedup + relevance + cap.
  for (const a of sliced) {
    const st = stats[a.source];
    if (st) st.kept = (st.kept ?? 0) + 1;
  }

  // Enrich articles missing thumbnails/dates with OG meta only when requested.
  // Sync uses RSS metadata only for speed; deep/manual paths can opt in.
  const metaFetches = options.metaFetches ?? 20;
  if (metaFetches > 0) {
    await enrichArticleMeta(sliced, metaFetches);
  }

  return { articles: sliced, stats };
}
