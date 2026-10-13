// A news feed snapshot shared across requests.
//
// `getNewsFromDB` is wrapped in `React.cache`, which only deduplicates calls
// within a single render. The article page called it directly for 100 rows, so
// every article's ISR render ran its own 100-row query — and the article pages
// are the most numerous page type on the site, one cache entry per URL. One
// shared snapshot serves all of them instead.
//
// Tagged "news" so the hourly sync busts it (see api/news/sync); the TTL below
// is only the fallback for a sync that inserted nothing.

import "server-only";
import { unstable_cache } from "next/cache";
import { getNewsFromDB } from "./db";
import type { NewsArticle } from "./types";

/** Fallback window. Freshness comes from the "news" tag, not from this. */
const FEED_TTL_SEC = 1800;

/**
 * Cached feed read. `limit` and `preferLang` are function arguments, so each
 * combination gets its own cache entry — callers should stick to a small set
 * of values rather than passing a computed limit.
 *
 * `getNewsFromDB` swallows its own database errors and returns `[]`, so no
 * rejection reaches the cache here. An empty list is therefore cacheable for
 * one window, which is the documented trade-off for every reader in this file.
 */
export const getCachedNewsFeed = unstable_cache(
  async (limit: number, preferLang?: string): Promise<NewsArticle[]> =>
    getNewsFromDB(limit, preferLang, { skipSync: true }),
  ["news-feed-v1"],
  { revalidate: FEED_TTL_SEC, tags: ["news"] },
);
