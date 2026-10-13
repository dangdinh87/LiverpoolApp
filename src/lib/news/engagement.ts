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

/** Rows younger than this are counted. Older engagement is not shown anywhere. */
const WINDOW_DAYS = 30;

/** Safety cap so one popular article cannot turn this into a full-table read. */
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
      const cutoff = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();

      const [likes, comments] = await Promise.all([
        supabase.from("article_likes").select("article_url").gte("created_at", cutoff).limit(ROW_CAP),
        supabase.from("article_comments").select("article_url").gte("created_at", cutoff).limit(ROW_CAP),
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
