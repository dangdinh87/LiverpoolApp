import "server-only";
import { cache } from "react";
import { syncPipeline } from "./sync";
import { getServiceClient } from "./supabase-service";
import type { NewsArticle } from "./types";

const ARTICLE_COLUMNS =
  "url, title, snippet, thumbnail, source, language, category, relevance, published_at, fetched_at, author, hero_image, word_count, tags, title_vi, snippet_vi";

// Sync threshold: 15 minutes
const STALE_MS = 15 * 60 * 1000;

// Per-instance sync lock (prevents duplicate syncs within same serverless instance)
let syncInProgress = false;

// DB row → NewsArticle mapping
interface ArticleRow {
  url: string;
  title: string;
  snippet: string;
  thumbnail: string | null;
  source: string;
  language: string;
  category: string;
  relevance: number;
  published_at: string | null;
  fetched_at: string | null;
  author: string | null;
  hero_image: string | null;
  word_count: number | null;
  tags: string[] | null;
  title_vi: string | null;
  snippet_vi: string | null;
}

function rowToArticle(row: ArticleRow): NewsArticle {
  return {
    title: row.title,
    link: row.url,
    pubDate: row.published_at ?? row.fetched_at ?? "",
    contentSnippet: row.snippet,
    thumbnail: row.thumbnail ?? undefined,
    source: row.source as NewsArticle["source"],
    language: row.language as NewsArticle["language"],
    category: (row.category as NewsArticle["category"]) ?? "general",
    relevanceScore: row.relevance,
    author: row.author ?? undefined,
    heroImage: row.hero_image ?? undefined,
    wordCount: row.word_count ?? undefined,
    tags: row.tags ?? undefined,
  };
}

/**
 * DB-level stale check. Survives serverless cold starts (unlike in-memory lastSyncTime).
 * Returns { fresh, empty } based on newest fetched_at in articles table.
 */
async function isDbFresh(): Promise<{ fresh: boolean; empty: boolean }> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("articles")
    .select("fetched_at")
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return { fresh: false, empty: true };
  if (!data.fetched_at) return { fresh: false, empty: false };

  const age = Date.now() - new Date(data.fetched_at).getTime();
  return { fresh: age < STALE_MS, empty: false };
}

/**
 * Non-blocking sync: check DB freshness, trigger background sync if stale.
 * Only blocks on truly empty DB (first-ever visit).
 */
async function triggerSyncIfNeeded(): Promise<void> {
  if (syncInProgress) return;

  const { fresh, empty } = await isDbFresh();

  if (fresh) return;

  if (empty) {
    // Empty DB: block once to bootstrap
    syncInProgress = true;
    try {
      console.log("[news/db] Empty DB — bootstrap sync (blocking)...");
      await syncPipeline();
    } finally {
      syncInProgress = false;
    }
    return;
  }

  // Stale DB: fire-and-forget sync, serve stale data immediately
  syncInProgress = true;
  syncPipeline()
    .catch((err) => console.error("[news/db] Background sync failed:", err))
    .finally(() => { syncInProgress = false; });
}

/**
 * Fetch news from DB. Syncs first if data > 15 min old.
 * Always returns fresh data.
 */
export const getNewsFromDB = cache(
  async (limit = 30, preferLang?: string): Promise<NewsArticle[]> => {
    try {
      // Trigger sync in background if stale (only blocks on empty DB)
      await triggerSyncIfNeeded();

      // Use service client for public article reads (no auth needed, avoids cookie issues in ISR)
      const supabase = getServiceClient();

      if (preferLang) {
        const [localRes, globalRes] = await Promise.all([
          supabase
            .from("articles")
            .select(ARTICLE_COLUMNS)
            .eq("is_active", true)
            .eq("language", preferLang)
            .order("relevance", { ascending: false })
            .order("published_at", { ascending: false })
            .limit(limit),
          supabase
            .from("articles")
            .select(ARTICLE_COLUMNS)
            .eq("is_active", true)
            .neq("language", preferLang)
            .order("relevance", { ascending: false })
            .order("published_at", { ascending: false })
            .limit(limit),
        ]);

        if (localRes.error) console.error("[news/db] Local error:", localRes.error.message);
        if (globalRes.error) console.error("[news/db] Global error:", globalRes.error.message);

        const local = ((localRes.data ?? []) as ArticleRow[]).map(rowToArticle);
        const global = ((globalRes.data ?? []) as ArticleRow[]).map(rowToArticle);
        return [...local, ...global].slice(0, limit);
      }

      // Balanced fetch: get top articles per language so both EN & VI are represented
      // (relevance scores differ across languages, pure relevance sort excludes VI)
      const perLang = Math.ceil(limit / 2);
      const [enRes, viRes] = await Promise.all([
        supabase
          .from("articles")
          .select(ARTICLE_COLUMNS)
          .eq("is_active", true)
          .eq("language", "en")
          .order("published_at", { ascending: false })
          .limit(perLang),
        supabase
          .from("articles")
          .select(ARTICLE_COLUMNS)
          .eq("is_active", true)
          .eq("language", "vi")
          .order("published_at", { ascending: false })
          .limit(perLang),
      ]);

      if (enRes.error) console.error("[news/db] EN error:", enRes.error.message);
      if (viRes.error) console.error("[news/db] VI error:", viRes.error.message);

      const enArticles = ((enRes.data ?? []) as ArticleRow[]).map(rowToArticle);
      const viArticles = ((viRes.data ?? []) as ArticleRow[]).map(rowToArticle);
      return [...enArticles, ...viArticles].slice(0, limit);
    } catch (err) {
      console.error("[news/db] Fatal:", err);
      return [];
    }
  }
);

/**
 * Search articles using full-text search.
 */
export const searchArticles = cache(
  async (query: string, limit = 20): Promise<NewsArticle[]> => {
    try {
      const supabase = getServiceClient();
      const tsQuery = query.trim().split(/\s+/).join(" & ");

      const { data, error } = await supabase
        .from("articles")
        .select(ARTICLE_COLUMNS)
        .eq("is_active", true)
        .textSearch("fts", tsQuery)
        .order("relevance", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("[news/db] Search error:", error.message);
        return [];
      }

      return ((data ?? []) as ArticleRow[]).map(rowToArticle);
    } catch (err) {
      console.error("[news/db] Search fatal:", err);
      return [];
    }
  }
);

/**
 * Paginated article query for load-more. No sync trigger.
 */
export async function getNewsPaginated(
  offset: number,
  limit: number,
  language?: "en" | "vi"
): Promise<{ articles: NewsArticle[]; hasMore: boolean }> {
  try {
    const supabase = getServiceClient();

    let query = supabase
      .from("articles")
      .select(ARTICLE_COLUMNS)
      .eq("is_active", true)
      .order("published_at", { ascending: false })
      .range(offset, offset + limit); // fetch limit+1 to check hasMore

    if (language) query = query.eq("language", language);

    const { data, error } = await query;
    if (error) {
      console.error("[news/db] Paginate error:", error.message);
      return { articles: [], hasMore: false };
    }

    const rows = (data ?? []) as ArticleRow[];
    const hasMore = rows.length > limit;
    const articles = (hasMore ? rows.slice(0, limit) : rows).map(rowToArticle);
    return { articles, hasMore };
  } catch (err) {
    console.error("[news/db] Paginate fatal:", err);
    return { articles: [], hasMore: false };
  }
}
