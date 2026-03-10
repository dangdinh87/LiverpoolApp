import "server-only";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { fetchAllNews } from "./pipeline";
import { RssAdapter } from "./adapters/rss-adapter";
import { LfcAdapter } from "./adapters/lfc-adapter";
import { BongdaplusAdapter } from "./adapters/bongdaplus-adapter";
import { RSS_FEEDS } from "./config";
import type { NewsArticle } from "./types";

const ARTICLE_COLUMNS =
  "url, title, snippet, thumbnail, source, language, category, relevance, published_at, author, hero_image, word_count, tags, title_vi, snippet_vi";

// Sync threshold: 15 minutes
const STALE_MS = 15 * 60 * 1000;
let lastSyncTime = 0; // in-memory guard

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
    pubDate: row.published_at ?? new Date().toISOString(),
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
 * Service role client for sync (bypasses RLS).
 */
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key);
}

/**
 * Sync articles from RSS/scrapers → DB.
 * Called directly when data is stale. No HTTP, no cron, no secret.
 */
async function syncArticles(): Promise<void> {
  const adapters = [
    new LfcAdapter(),
    ...RSS_FEEDS.map((cfg) => new RssAdapter(cfg)),
    new BongdaplusAdapter(),
  ];

  const articles = await fetchAllNews(adapters, 300);
  console.log(`[sync] Fetched ${articles.length} articles from adapters`);

  const supabase = getServiceClient();
  const batchSize = 50;

  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);
    const rows = batch.map((a) => ({
      url: a.link,
      title: a.title,
      snippet: a.contentSnippet || "",
      thumbnail: a.thumbnail || null,
      source: a.source,
      language: a.language,
      category: a.category || "general",
      relevance: a.relevanceScore ?? 0,
      published_at: a.pubDate ? new Date(a.pubDate).toISOString() : null,
      author: a.author || null,
      hero_image: a.heroImage || a.thumbnail || null,
      word_count: a.wordCount || null,
      tags: a.tags || [],
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("articles")
      .upsert(rows, { onConflict: "url", ignoreDuplicates: false });

    if (error) console.error(`[sync] Batch ${i} error:`, error.message);
  }

  lastSyncTime = Date.now();
  console.log(`[sync] Done — ${articles.length} articles upserted`);
}

/**
 * Check if DB data is stale and sync if needed.
 * Blocks until sync completes so user always sees fresh data.
 */
async function syncIfStale(): Promise<void> {
  const now = Date.now();

  // In-memory guard: don't sync more than once per STALE_MS
  if (now - lastSyncTime < STALE_MS) return;

  try {
    const supabase = getServiceClient();
    const { data } = await supabase
      .from("articles")
      .select("fetched_at")
      .order("fetched_at", { ascending: false })
      .limit(1)
      .single();

    if (data?.fetched_at) {
      const lastFetch = new Date(data.fetched_at).getTime();
      if (now - lastFetch < STALE_MS) {
        lastSyncTime = now; // DB is fresh, update guard
        return;
      }
    }

    // Data is stale or empty — sync now
    console.log("[news/db] Data stale, syncing...");
    await syncArticles();
  } catch (err) {
    console.error("[news/db] Sync check failed:", err);
  }
}

/**
 * Fetch news from DB. Syncs first if data > 15 min old.
 * Always returns fresh data.
 */
export const getNewsFromDB = cache(
  async (limit = 300, preferLang?: string): Promise<NewsArticle[]> => {
    try {
      // Sync if stale — blocks until done
      await syncIfStale();

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

      const { data, error } = await supabase
        .from("articles")
        .select(ARTICLE_COLUMNS)
        .eq("is_active", true)
        .order("relevance", { ascending: false })
        .order("published_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("[news/db] Query error:", error.message);
        return [];
      }

      return ((data ?? []) as ArticleRow[]).map(rowToArticle);
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
