import "server-only";
import { cache } from "react";
import { getServiceClient } from "./supabase-service";
import { analyzeArticleRelevance } from "./relevance";
import { articleUrlVariants } from "./url";
import { looksLikeJunkContent } from "./content-quality";
import { cleanArticleContent } from "./article-clean";
import type { ArticleContent, NewsArticle } from "./types";

const ARTICLE_COLUMNS =
  "url, title, snippet, thumbnail, source, language, category, relevance, published_at, fetched_at, author, hero_image, word_count, tags, title_vi, snippet_vi";

const FRESH_CONTENT_TTL_MS = 7 * 24 * 3600 * 1000; // 7 days
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
/**
 * For `unstable_cache` wrappers: getNewsFromDB swallows database errors and
 * returns [], and caching that [] blanked the news on `/` and `/news` for the
 * whole revalidate window after any blip (seen right after the database was
 * resumed). Throwing on an empty result keeps it out of the cache; callers
 * `.catch(() => [])`. A genuinely empty feed is just re-queried, which is cheap.
 */
export async function requireNonEmptyNews(articles: Promise<NewsArticle[]>): Promise<NewsArticle[]> {
  const list = await articles;
  if (list.length === 0) throw new Error("[news/db] no articles (database error or empty) — not caching");
  return list;
}

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

        // (A "backfill" pass used to re-run these exact queries when the pool was
        // sparse. Same filters, order and limit return the same rows, so it only
        // doubled the database round-trips — removed.)
        const local = onlyRelevantArticles((localRes.data ?? []) as ArticleRow[]);
        const global = onlyRelevantArticles((globalRes.data ?? []) as ArticleRow[]);
        const combined = [...local, ...global].slice(0, limit);

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

      // No backfill pass: see the note in the preferLang branch above.
      const enArticles = onlyRelevantArticles((enRes.data ?? []) as ArticleRow[]);
      const viArticles = onlyRelevantArticles((viRes.data ?? []) as ArticleRow[]);
      const combined = [...enArticles, ...viArticles].slice(0, limit);

      return combined;
    } catch (err) {
      console.error("[news/db] Fatal:", err);
      return [];
    }
  }
);

/** One stored article (title, snippet, images) by URL, for pages whose body can't be shown. */
export const getArticleByUrl = cache(async (url: string): Promise<NewsArticle | null> => {
  try {
    const supabase = getServiceClient();
    const { data } = await supabase
      .from("articles")
      .select(ARTICLE_COLUMNS)
      .in("url", articleUrlVariants(url))
      .limit(1)
      .maybeSingle();
    return data ? rowToArticle(data as ArticleRow) : null;
  } catch {
    return null;
  }
});

export const getArticleContentFromDB = cache(
  async (url: string): Promise<ArticleContent | null> => {
    try {
      const supabase = getServiceClient();
      const { data } = await supabase
        .from("articles")
        .select("content_en, content_scraped_at")
        .in("url", articleUrlVariants(url))
        .order("content_scraped_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (!data?.content_en || !data.content_scraped_at) {
        return null;
      }

      const ageMs = Date.now() - new Date(data.content_scraped_at).getTime();
      if (ageMs > FRESH_CONTENT_TTL_MS) {
        return null;
      }

      const content = data.content_en as ArticleContent;
      return looksLikeJunkContent(content) ? null : cleanArticleContent(content);
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
      // Postgres sorts NULL first on DESC: undated rows must come LAST, not top the list.
      .order("published_at", { ascending: false, nullsFirst: false })
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
    // Rows may be stored in a legacy spelling (trailing slash, feed tracking
    // params); answer under the URL the caller asked about.
    const requestedByVariant = new Map<string, string>();
    for (const requested of urls) {
      for (const variant of articleUrlVariants(requested)) {
        if (!requestedByVariant.has(variant)) requestedByVariant.set(variant, requested);
      }
    }
    const { data } = await supabase
      .from("articles")
      .select("url, title")
      .in("url", [...requestedByVariant.keys()]);
    const map: Record<string, string> = {};
    for (const row of data ?? []) {
      map[requestedByVariant.get(row.url) ?? row.url] = row.title;
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
