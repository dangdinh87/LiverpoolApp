import "server-only";
import { cache } from "react";
import { syncPipeline } from "./sync";
import { getServiceClient } from "./supabase-service";
import type { NewsArticle } from "./types";

const ARTICLE_COLUMNS =
  "url, title, snippet, thumbnail, source, language, category, relevance, published_at, fetched_at, author, hero_image, word_count, tags, title_vi, snippet_vi";

// Sync thresholds
const STALE_MS = 15 * 60 * 1000;        // 15 min — background sync
const VERY_STALE_MS = 30 * 60 * 1000;   // 30 min — blocking sync
const BLOCKING_SYNC_TIMEOUT = 8000;      // 8s max wait

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
 * DB-level age check. Survives serverless cold starts (unlike in-memory lastSyncTime).
 * Returns actual age in ms so callers can decide blocking vs background sync.
 */
async function getDbAge(): Promise<{ ageMs: number | null; empty: boolean }> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("articles")
    .select("fetched_at")
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return { ageMs: null, empty: true };
  if (!data.fetched_at) return { ageMs: null, empty: false };

  const ageMs = Date.now() - new Date(data.fetched_at).getTime();
  return { ageMs, empty: false };
}

/**
 * Three-tier sync: fresh → skip, mildly stale → background, very stale/empty → blocking.
 * Blocking sync uses Promise.race with timeout to prevent hanging.
 */
async function triggerSyncIfNeeded(): Promise<void> {
  if (syncInProgress) return;

  const { ageMs, empty } = await getDbAge();

  // Fresh data — no sync needed
  if (ageMs !== null && ageMs < STALE_MS) return;

  // Empty DB or very stale (>30 min): BLOCKING sync with timeout
  if (empty || (ageMs !== null && ageMs >= VERY_STALE_MS)) {
    syncInProgress = true;
    try {
      const label = empty ? "Empty DB — bootstrap" : `Very stale (${Math.round((ageMs ?? 0) / 60000)}min)`;
      console.log(`[news/db] ${label} sync (blocking, ${BLOCKING_SYNC_TIMEOUT}ms timeout)...`);

      await Promise.race([
        syncPipeline(),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error("Sync timeout")), BLOCKING_SYNC_TIMEOUT)
        ),
      ]);
    } catch (err) {
      // Timeout or sync error — serve whatever stale data we have
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.warn(`[news/db] Blocking sync did not complete: ${msg}`);
    } finally {
      syncInProgress = false;
    }
    return;
  }

  // Mildly stale (15-30 min): fire-and-forget sync, serve stale data immediately
  syncInProgress = true;
  console.log(`[news/db] Mildly stale (${Math.round((ageMs ?? 0) / 60000)}min) — background sync...`);
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

/**
 * Fetch article title + url for a set of URLs (used by digest page to show source links).
 */
export async function getArticleTitlesByUrls(
  urls: string[]
): Promise<Record<string, string>> {
  if (!urls.length) return {};
  try {
    const supabase = getServiceClient();
    const { data } = await supabase
      .from("articles")
      .select("url, title")
      .in("url", urls);
    const map: Record<string, string> = {};
    for (const row of data ?? []) {
      map[row.url] = row.title;
    }
    return map;
  } catch {
    return {};
  }
}

/** Lightweight query for sitemap: active article URLs + publish dates (last 90 days) */
export async function getArticleSitemapData(): Promise<{ url: string; published_at: string }[]> {
  try {
    const supabase = getServiceClient();
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("articles")
      .select("url, published_at")
      .gte("published_at", cutoff)
      .eq("is_active", true)
      .order("published_at", { ascending: false })
      .limit(500);
    return (data ?? []).filter((r) => r.url && r.published_at);
  } catch {
    return [];
  }
}
