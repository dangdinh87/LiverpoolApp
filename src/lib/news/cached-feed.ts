// A news feed snapshot shared across requests.
//
// `getNewsFromDB` is wrapped in `React.cache`, which only deduplicates calls
// within a single render. The article page called it directly for 100 rows, so
// every article's ISR render ran its own 100-row query — and the article pages
// are the most numerous page type on the site, one cache entry per URL. One
// shared snapshot serves all of them instead.
//
// NOT tagged "news". The sync busts that tag for the home page and /news; the
// article pages read only this snapshot (for "related articles"), and sharing
// the tag marked every one of them stale on every sync, so each page a bot
// visited was rendered again: 287k ISR writes against 97k reads a month.
// Article pages now refresh on their own 1 h ISR window; an article newer than
// the snapshot is still found by getArticleByUrl on its page.

import "server-only";
import { unstable_cache } from "next/cache";
import { getNewsFromDB } from "./db";
import type { NewsArticle } from "./types";

/** Matches the article page's ISR window (inner TTL ≥ outer ISR, see revalidate there). */
const FEED_TTL_SEC = 3600;

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
  { revalidate: FEED_TTL_SEC, tags: ["news-related"] },
);
