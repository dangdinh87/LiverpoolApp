// Article engagement (likes + comments) for every article at once.
//
// Why one query for the whole site instead of one per article: the like count
// shown under an article is the same for every visitor, but it used to be
// fetched client-side on each page view (`GET /api/news/like`), which cost two
// Supabase round-trips per view — an auth lookup and a count — for a number
// that does not depend on who is asking. Two queries now cover every article
// and are shared across requests for the whole TTL, so the cost no longer
// scales with traffic.
//
// Uses the service client to bypass RLS — server-only.

import "server-only";
import { unstable_cache } from "next/cache";
import { getServiceClient } from "./supabase-service";
import { articleUrlVariants } from "./url";

/** Busted by the like route so a new like is not hidden for a whole TTL. */
export const ARTICLE_ENGAGEMENT_TAG = "article-engagement";

/** How long the shared snapshot lives. A like counter may lag; it must not cost a query per view. */
const ENGAGEMENT_TTL_SEC = 600;

/**
 * Safety cap so this cannot become a full-table read.
 *
 * There is deliberately no date cutoff. An earlier version counted only the
 * last 30 days, which is fine for a number on a page but not for the use the
 * article page makes of it: it skips loading the comment list when the count is
 * zero, so a cutoff would have hidden older comments completely. The counts
 * are totals, and this cap — newest first — is the only bound. It is sized for
 * a small site; if engagement ever approaches it, the oldest articles lose
 * their counts first and this is the number to revisit.
 */
const ROW_CAP = 500;

export interface ArticleEngagement {
  likes: number;
  comments: number;
}

/**
 * Counts keyed by the article URL exactly as stored. Plain object, not a Map:
 * `unstable_cache` serialises what it stores and a Map does not survive that.
 *
 * Errors resolve to an empty snapshot *inside* the cache. A thrown error is
 * never cached, so a dead database would otherwise be re-queried on every
 * article view; caching "nobody has liked anything" for one TTL is the
 * acceptable fallback here because the counter is cosmetic.
 */
const loadEngagement = unstable_cache(
  async (): Promise<Record<string, ArticleEngagement>> => {
    const out: Record<string, ArticleEngagement> = {};
    const bump = (url: string, key: keyof ArticleEngagement) => {
      const row = (out[url] ??= { likes: 0, comments: 0 });
      row[key] += 1;
    };

    try {
      const supabase = getServiceClient();
      const newestFirst = { ascending: false } as const;

      const [likes, comments] = await Promise.all([
        supabase.from("article_likes").select("article_url").order("created_at", newestFirst).limit(ROW_CAP),
        supabase.from("article_comments").select("article_url").order("created_at", newestFirst).limit(ROW_CAP),
      ]);

      for (const row of likes.data ?? []) bump(row.article_url, "likes");
      for (const row of comments.data ?? []) bump(row.article_url, "comments");
    } catch (err) {
      console.error("[engagement] Failed to fetch:", err);
    }

    return out;
  },
  ["article-engagement-v1"],
  { revalidate: ENGAGEMENT_TTL_SEC, tags: [ARTICLE_ENGAGEMENT_TAG] },
);

/**
 * Engagement for one article, or zeroes.
 *
 * Tries every spelling of the URL: rows were written before ingest settled on
 * a canonical form, so a stored `article_url` may still carry a tracking
 * parameter or a trailing slash that the page's own URL no longer has.
 */
export async function getArticleEngagement(url: string): Promise<ArticleEngagement> {
  const snapshot = await loadEngagement();
  for (const variant of articleUrlVariants(url)) {
    const found = snapshot[variant];
    if (found) return found;
  }
  return { likes: 0, comments: 0 };
}
