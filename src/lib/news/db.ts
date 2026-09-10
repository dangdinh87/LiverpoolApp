import "server-only";
import { cache } from "react";
import { getServiceClient } from "./supabase-service";
import { analyzeArticleRelevance } from "./relevance";
import type { ArticleContent, NewsArticle } from "./types";

const ARTICLE_COLUMNS =
  "url, title, snippet, thumbnail, source, language, category, relevance, published_at, fetched_at, author, hero_image, word_count, tags, title_vi, snippet_vi";

const FRESH_CONTENT_TTL_MS = 7 * 24 * 3600 * 1000; // 7 days
const MIN_NEWS_RESULTS = 16; // Backfill to avoid sparse feeds when fresh pool is limited
const PREFERRED_LANGUAGE_SHARE = 0.8; // Vietnamese locale should read VI-first, not 50/50.

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
    thumbnail: row.thumbnail ?? row.hero_image ?? undefined,
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

function onlyRelevantArticles(rows: ArticleRow[]): NewsArticle[] {
  return rows
    .map(rowToArticle)
    .filter((article) => analyzeArticleRelevance(article).isRelevant);
}

/**
 * Fetch news from DB only.
 *
 * Important: this function must never crawl or sync. News ingestion is owned by
 * the external crawler / explicit cron, so user-facing pages stay side-effect free.
 */
export const getNewsFromDB = cache(
  async (
    limit = 30,
    preferLang?: string,
    _options?: { skipSync?: boolean }
  ): Promise<NewsArticle[]> => {
    void _options;
    try {
      // Use service client for public article reads (no auth needed, avoids cookie issues in ISR)
      const supabase = getServiceClient();

      if (preferLang) {
        const localLimit = Math.max(1, Math.ceil(limit * PREFERRED_LANGUAGE_SHARE));
        const globalLimit = Math.max(1, limit - localLimit);
        const [localRes, globalRes] = await Promise.all([
          supabase
            .from("articles")
            .select(ARTICLE_COLUMNS)
            .eq("is_active", true)
            .not("published_at", "is", null)
            .eq("language", preferLang)
            .order("published_at", { ascending: false, nullsFirst: false })
            .order("relevance", { ascending: false, nullsFirst: false })
            .limit(localLimit),
          supabase
            .from("articles")
            .select(ARTICLE_COLUMNS)
            .eq("is_active", true)
            .not("published_at", "is", null)
            .neq("language", preferLang)
            .order("published_at", { ascending: false, nullsFirst: false })
            .order("relevance", { ascending: false, nullsFirst: false })
            .limit(globalLimit),
        ]);

        if (localRes.error) console.error("[news/db] Local error:", localRes.error.message);
        if (globalRes.error) console.error("[news/db] Global error:", globalRes.error.message);

        let local = onlyRelevantArticles((localRes.data ?? []) as ArticleRow[]);
        let global = onlyRelevantArticles((globalRes.data ?? []) as ArticleRow[]);
        let combined = [...local, ...global].slice(0, limit);

        // Backfill older posts when fresh pool is sparse.
        if (combined.length < Math.min(limit, MIN_NEWS_RESULTS)) {
          const [localFallback, globalFallback] = await Promise.all([
            supabase
              .from("articles")
              .select(ARTICLE_COLUMNS)
              .eq("is_active", true)
              .not("published_at", "is", null)
              .eq("language", preferLang)
              .order("published_at", { ascending: false, nullsFirst: false })
              .order("relevance", { ascending: false, nullsFirst: false })
              .limit(localLimit),
            supabase
              .from("articles")
              .select(ARTICLE_COLUMNS)
              .eq("is_active", true)
              .not("published_at", "is", null)
              .neq("language", preferLang)
              .order("published_at", { ascending: false, nullsFirst: false })
              .order("relevance", { ascending: false, nullsFirst: false })
              .limit(globalLimit),
          ]);

          local = onlyRelevantArticles((localFallback.data ?? []) as ArticleRow[]);
          global = onlyRelevantArticles((globalFallback.data ?? []) as ArticleRow[]);
          const byUrl = new Map<string, NewsArticle>();
          for (const article of [...combined, ...local, ...global]) {
            if (!byUrl.has(article.link)) byUrl.set(article.link, article);
          }
          combined = Array.from(byUrl.values()).slice(0, limit);
        }

        return combined;
      }

      // Balanced fetch: get top articles per language so both EN & VI are represented
      // (relevance scores differ across languages, pure relevance sort excludes VI)
      const perLang = Math.ceil(limit / 2);
      const [enRes, viRes] = await Promise.all([
        supabase
          .from("articles")
          .select(ARTICLE_COLUMNS)
          .eq("is_active", true)
          .not("published_at", "is", null)
          .eq("language", "en")
          .order("published_at", { ascending: false, nullsFirst: false })
          .order("relevance", { ascending: false, nullsFirst: false })
          .limit(perLang),
        supabase
          .from("articles")
          .select(ARTICLE_COLUMNS)
          .eq("is_active", true)
          .not("published_at", "is", null)
          .eq("language", "vi")
          .order("published_at", { ascending: false, nullsFirst: false })
          .order("relevance", { ascending: false, nullsFirst: false })
          .limit(perLang),
      ]);

      if (enRes.error) console.error("[news/db] EN error:", enRes.error.message);
      if (viRes.error) console.error("[news/db] VI error:", viRes.error.message);

      let enArticles = onlyRelevantArticles((enRes.data ?? []) as ArticleRow[]);
      let viArticles = onlyRelevantArticles((viRes.data ?? []) as ArticleRow[]);
      let combined = [...enArticles, ...viArticles].slice(0, limit);

      // Backfill from older posts when fresh pool is sparse.
      if (combined.length < Math.min(limit, MIN_NEWS_RESULTS)) {
        const [enFallback, viFallback] = await Promise.all([
          supabase
            .from("articles")
            .select(ARTICLE_COLUMNS)
            .eq("is_active", true)
            .not("published_at", "is", null)
            .eq("language", "en")
            .order("published_at", { ascending: false, nullsFirst: false })
            .limit(perLang),
          supabase
            .from("articles")
            .select(ARTICLE_COLUMNS)
            .eq("is_active", true)
            .not("published_at", "is", null)
            .eq("language", "vi")
            .order("published_at", { ascending: false, nullsFirst: false })
            .limit(perLang),
        ]);

        enArticles = onlyRelevantArticles((enFallback.data ?? []) as ArticleRow[]);
        viArticles = onlyRelevantArticles((viFallback.data ?? []) as ArticleRow[]);
        const byUrl = new Map<string, NewsArticle>();
        for (const article of [...combined, ...enArticles, ...viArticles]) {
          if (!byUrl.has(article.link)) byUrl.set(article.link, article);
        }
        combined = Array.from(byUrl.values()).slice(0, limit);
      }

      return combined;
    } catch (err) {
      console.error("[news/db] Fatal:", err);
      return [];
    }
  }
);

export const getArticleContentFromDB = cache(
  async (url: string): Promise<ArticleContent | null> => {
    try {
      const supabase = getServiceClient();
      const { data } = await supabase
        .from("articles")
        .select("content_en, content_scraped_at")
        .eq("url", url)
        .maybeSingle();

      if (!data?.content_en || !data.content_scraped_at) {
        return null;
      }

      const ageMs = Date.now() - new Date(data.content_scraped_at).getTime();
      if (ageMs > FRESH_CONTENT_TTL_MS) {
        return null;
      }

      return data.content_en as ArticleContent;
    } catch {
      return null;
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

      return onlyRelevantArticles((data ?? []) as ArticleRow[]);
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
    const articles = onlyRelevantArticles(hasMore ? rows.slice(0, limit) : rows);
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
