import "server-only";
import { fetchAllNews } from "./pipeline";
import { RssAdapter } from "./adapters/rss-adapter";
import { LfcAdapter } from "./adapters/lfc-adapter";
import { BongdaplusAdapter } from "./adapters/bongdaplus-adapter";
import { RSS_FEEDS } from "./config";
import { fetchOgMeta } from "./enrichers/og-meta";
import { scrapeArticle } from "./enrichers/article-extractor";
import { getFixtures } from "@/lib/football";
import { getServiceClient } from "./supabase-service";
import type { NewsArticle } from "./types";

type NewsServiceClient = ReturnType<typeof getServiceClient>;

export interface SyncResult {
  total: number;
  inserted: number;
  updated: number;
  upserted: number;
  failed: number;
  enriched: number;
  scraped: number;
  scrapeAttempted: number;
  scrapeFailed: number;
  scrapeMode: MatchTrafficMode;
  scrapeBudgetStop: boolean;
  durationMs: number;
  latestFetchedPublishedAt: string | null;
  latestStoredPublishedAt: string | null;
  latestStoredTitle: string | null;
  latestStoredSource: string | null;
  latestStoredUrl: string | null;
  errors: { url: string; error: string }[];
}

const SCRAPE_BATCH = 5;
const SCRAPE_MIN_LIMIT = 10;
const SCRAPE_BASE_LIMIT = 16;
const SCRAPE_MAX_LIMIT = 28;
const SCRAPE_PEAK_MAX_LIMIT = 36;
const SCRAPE_TIME_BUDGET_MS = 90_000;
const STALE_CONTENT_MS = 24 * 3600 * 1000;
const MATCH_PEAK_BEFORE_HOURS = 36;
const MATCH_PEAK_AFTER_HOURS = 18;
const MATCH_NORMAL_BEFORE_HOURS = 120;
const FETCH_LIMIT_BASE = 380;

type MatchTrafficMode = "low" | "normal" | "peak";

function getAdaptiveScrapeLimit(
  upserted: number,
  fetchedTotal: number,
  mode: MatchTrafficMode
): number {
  // Keep default scrape lower, then bump only when volume or match window justifies it.
  let limit = SCRAPE_MIN_LIMIT;
  if (upserted >= 25 || fetchedTotal >= 120) limit = SCRAPE_BASE_LIMIT;
  if (upserted >= 60 || fetchedTotal >= 180) limit = 22;
  if (upserted >= 120 || fetchedTotal >= 260) limit = SCRAPE_MAX_LIMIT;

  if (mode === "normal") {
    limit += 4;
  } else if (mode === "peak") {
    limit += 8;
  }

  const maxLimit = mode === "peak" ? SCRAPE_PEAK_MAX_LIMIT : SCRAPE_MAX_LIMIT;
  return Math.max(SCRAPE_MIN_LIMIT, Math.min(maxLimit, limit));
}

async function getMatchTrafficMode(): Promise<{
  mode: MatchTrafficMode;
  hoursToNext: number | null;
  hoursSinceLast: number | null;
}> {
  try {
    const fixtures = await getFixtures();
    if (!fixtures.length) {
      return { mode: "low", hoursToNext: null, hoursSinceLast: null };
    }

    const now = Date.now();
    let nextMs: number | null = null;
    let lastMs: number | null = null;
    for (const fixture of fixtures) {
      const fixtureMs = new Date(fixture.fixture.date).getTime();
      if (!Number.isFinite(fixtureMs)) continue;
      if (fixtureMs >= now) {
        if (nextMs === null || fixtureMs < nextMs) nextMs = fixtureMs;
      } else if (lastMs === null || fixtureMs > lastMs) {
        lastMs = fixtureMs;
      }
    }

    const hoursToNext = nextMs === null ? null : (nextMs - now) / 3_600_000;
    const hoursSinceLast = lastMs === null ? null : (now - lastMs) / 3_600_000;

    if (
      (hoursToNext !== null && hoursToNext <= MATCH_PEAK_BEFORE_HOURS) ||
      (hoursSinceLast !== null && hoursSinceLast <= MATCH_PEAK_AFTER_HOURS)
    ) {
      return { mode: "peak", hoursToNext, hoursSinceLast };
    }

    if (hoursToNext !== null && hoursToNext <= MATCH_NORMAL_BEFORE_HOURS) {
      return { mode: "normal", hoursToNext, hoursSinceLast };
    }

    return { mode: "low", hoursToNext, hoursSinceLast };
  } catch (err) {
    console.warn("[sync] Could not resolve fixture window, fallback to low mode", err);
    return { mode: "low", hoursToNext: null, hoursSinceLast: null };
  }
}

function articleToRow(a: NewsArticle) {
  return {
    url: a.link,
    title: a.title,
    snippet: a.contentSnippet || "",
    thumbnail: a.thumbnail || null,
    source: a.source,
    language: a.language,
    category: a.category || "general",
    relevance: a.relevanceScore ?? 0,
    published_at: a.pubDate 
      ? new Date(a.pubDate).toISOString() 
      : (a.fetchedAt ? new Date(a.fetchedAt).toISOString() : new Date().toISOString()),
    author: a.author || null,
    hero_image: a.heroImage || a.thumbnail || null,
    word_count: a.wordCount || null,
    tags: a.tags || [],
    updated_at: new Date().toISOString(),
  };
}

/**
 * Shared sync pipeline: fetch from all adapters → upsert → re-enrich → log.
 * Called by both db.ts (background sync) and api/news/sync/route.ts (manual).
 */
async function bulkUpsertArticles(articles: NewsArticle[], supabase: NewsServiceClient) {
  let inserted = 0;
  let updated = 0;
  let upserted = 0;
  let failed = 0;
  const errors: { url: string; error: string }[] = [];

  // Upsert in batches of 50
  const batchSize = 50;
  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);
    const rows = batch.map(articleToRow);
    const urls = rows.map((r) => r.url);

    const retries = 1;
    for (let attempt = 0; attempt <= retries; attempt++) {
      // Fetch existing rows first to prevent omitted columns from being overwritten with NULL
      const { data: existingData, error: fetchError } = await supabase
        .from("articles")
        .select("*")
        .in("url", urls);

      if (fetchError) {
        if (attempt < retries) {
          console.warn(`[sync] Batch ${i} fetch failed (${fetchError.message}), retrying...`);
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        } else {
          failed += batch.length;
          errors.push({ url: `batch-${i}-fetch`, error: fetchError.message });
          console.error(`[sync] Batch ${i} fetch error: ${fetchError.message}`);
          break;
        }
      }

      // Strip columns Postgres manages itself before merging:
      // - `fts` is GENERATED ALWAYS (rejects any value)
      // - `id` (uuid default gen_random_uuid()) — bulk upsert with mixed
      //   present/absent `id` fields gets serialized with null, breaking
      //   the NOT NULL constraint. Drop it so onConflict=url handles routing.
      const STRIPPED_COLS = ["fts", "id"] as const;
      const stripDbManaged = (row: Record<string, unknown>) => {
        const clean = { ...row };
        for (const col of STRIPPED_COLS) delete clean[col];
        return clean;
      };

      const existingMap = new Map(
        (existingData || []).map((row) => [row.url, stripDbManaged(row)])
      );
      // Bulk upsert in PostgREST takes the UNION of keys across all rows;
      // any column missing on a given row is serialized as NULL, bypassing
      // the column DEFAULT. To preserve schema defaults for NEW rows mixed
      // in the same batch as updates of EXISTING rows, explicitly seed the
      // columns that have meaningful defaults (chiefly `is_active`).
      const safeRows = rows.map((row) => {
        const old = existingMap.get(row.url);
        if (old) {
          return { ...old, ...row, fetched_at: old.fetched_at || new Date().toISOString() };
        }
        return {
          ...row,
          fetched_at: new Date().toISOString(),
          is_active: true,
          read_count: 0,
        };
      });

      const { data, error } = await supabase
        .from("articles")
        .upsert(safeRows, { onConflict: "url", ignoreDuplicates: false })
        .select("url");

      if (!error) {
        const affected = data?.length ?? 0;
        const existingCount = rows.reduce((count, row) => count + (existingMap.has(row.url) ? 1 : 0), 0);
        const insertedCount = rows.length - existingCount;
        inserted += insertedCount;
        updated += existingCount;
        upserted += affected;
        break;
      }

      const msg = error.message?.includes("<!DOCTYPE")
        ? "HTTP error (likely 502/503)"
        : error.message;

      if (attempt < retries) {
        console.warn(`[sync] Batch ${i} failed (${msg}), retrying...`);
        await new Promise((r) => setTimeout(r, 2000));
      } else {
        failed += batch.length;
        errors.push({ url: `batch-${i}`, error: msg });
        console.error(`[sync] Batch ${i} error: ${msg}`);
      }
    }
  }

  return { inserted, updated, upserted, failed, errors };
}

function getLatestFetchedPublishedAt(articles: NewsArticle[]): string | null {
  let latestMs = 0;

  for (const article of articles) {
    const rawDate = article.pubDate || article.fetchedAt;
    if (!rawDate) continue;

    const ms = new Date(rawDate).getTime();
    if (Number.isFinite(ms) && ms > latestMs) {
      latestMs = ms;
    }
  }

  return latestMs > 0 ? new Date(latestMs).toISOString() : null;
}

async function getLatestStoredArticle(supabase: NewsServiceClient) {
  const { data, error } = await supabase
    .from("articles")
    .select("title, source, url, published_at")
    .eq("is_active", true)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn(`[sync] Could not fetch latest stored article: ${error.message}`);
    return null;
  }

  return data;
}

async function scrapeContentForRecentArticles(
  supabase: NewsServiceClient,
  options: { upserted: number; fetchedTotal: number; mode: MatchTrafficMode }
) {
  const scrapeLimit = getAdaptiveScrapeLimit(
    options.upserted,
    options.fetchedTotal,
    options.mode
  );
  const staleCutoff = new Date(Date.now() - STALE_CONTENT_MS).toISOString();
  const { data, error } = await supabase
    .from("articles")
    .select("url")
    .eq("is_active", true)
    .or(`content_en.is.null,content_scraped_at.lt.${staleCutoff}`)
    .order("relevance", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(scrapeLimit);

  if (error) {
    console.error(`[sync] scrape query failed: ${error.message}`);
    return { attempted: 0, scraped: 0, scrapeFailed: 0, stoppedByBudget: false };
  }

  if (!data?.length) {
    return { attempted: 0, scraped: 0, scrapeFailed: 0, stoppedByBudget: false };
  }

  const startMs = Date.now();
  const scrapeBatch = options.mode === "peak" ? SCRAPE_BATCH : 4;
  let attempted = 0;
  let scraped = 0;
  let scrapeFailed = 0;
  let stoppedByBudget = false;
  for (let i = 0; i < data.length; i += scrapeBatch) {
    if (Date.now() - startMs > SCRAPE_TIME_BUDGET_MS) {
      stoppedByBudget = true;
      break;
    }
    const batch = data.slice(i, i + scrapeBatch);
    attempted += batch.length;
    const results = await Promise.allSettled(batch.map((row) => scrapeArticle(row.url)));
    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result.status === "fulfilled" && result.value) {
        scraped++;
      } else {
        scrapeFailed++;
      }
    }
  }

  console.log(
    `[sync] Pre-scraped ${scraped}/${attempted} attempted (mode=${options.mode}, limit=${scrapeLimit}, batch=${scrapeBatch}, failed=${scrapeFailed}, budgetStop=${stoppedByBudget})`
  );
  return { attempted, scraped, scrapeFailed, stoppedByBudget };
}

/**
 * Shared sync pipeline: fetch from all adapters → upsert → re-enrich → log.
 * Called by both db.ts (background sync) and api/news/sync/route.ts (manual).
 */
export async function syncPipeline(): Promise<SyncResult> {
  const start = Date.now();
  const adapters = [
    new LfcAdapter(),
    ...RSS_FEEDS.map((cfg) => new RssAdapter(cfg)),
    new BongdaplusAdapter(),
  ];

  const { articles, stats: sourceStats } = await fetchAllNews(adapters, FETCH_LIMIT_BASE);
  console.log(`[sync] Fetched ${articles.length} articles from adapters`);

  const supabase = getServiceClient();

  const upsertResult = await bulkUpsertArticles(articles, supabase);
  const inserted = upsertResult.inserted;
  const updated = upsertResult.updated;
  const upserted = upsertResult.upserted;
  const failed = upsertResult.failed;
  const errors = upsertResult.errors;

  // Re-enrich: fetch og:image for articles missing thumbnails
  let enriched = 0;
  const { data: noThumbData } = await supabase
    .from("articles")
    .select("*")
    .is("thumbnail", null)
    .eq("is_active", true)
    .order("fetched_at", { ascending: false })
    .limit(30);

  const noThumb = noThumbData || [];

  if (noThumb.length) {
    const BATCH = 10;
    const upsertPayload: Record<string, unknown>[] = [];

    for (let i = 0; i < noThumb.length; i += BATCH) {
      const batch = noThumb.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        batch.map((r) => fetchOgMeta(r.url))
      );
      for (let j = 0; j < results.length; j++) {
        const r = results[j];
        if (r.status === "fulfilled" && r.value.image) {
          upsertPayload.push({
            ...batch[j],
            thumbnail: r.value.image,
            hero_image: r.value.image,
            updated_at: new Date().toISOString(),
          });
          enriched++;
        }
      }
    }

    if (upsertPayload.length > 0) {
      const { error } = await supabase
        .from("articles")
        .upsert(upsertPayload, { onConflict: "url", ignoreDuplicates: false });

      if (error) {
        console.error(`[sync] Re-enrich batch upsert failed: ${error.message}`);
      }
    }

    console.log(`[sync] Re-enriched ${enriched}/${noThumb.length} thumbnails`);
  }

  const traffic = await getMatchTrafficMode();
  const { attempted, scraped, scrapeFailed, stoppedByBudget } = await scrapeContentForRecentArticles(supabase, {
    upserted,
    fetchedTotal: articles.length,
    mode: traffic.mode,
  });
  const durationMs = Date.now() - start;
  const latestFetchedPublishedAt = getLatestFetchedPublishedAt(articles);
  const latestStoredArticle = await getLatestStoredArticle(supabase);

  // Log sync result with per-source stats
  await supabase.from("sync_logs").insert({
    inserted,
    updated,
    failed,
    duration_ms: durationMs,
    errors: errors.length > 0 ? errors : null,
    source_stats: {
      ...sourceStats,
      scrapeMode: traffic.mode,
      scrapeHoursToNextMatch: traffic.hoursToNext,
      scrapeHoursSinceLastMatch: traffic.hoursSinceLast,
      scrapeAttempted: attempted,
      scraped,
      scrapeFailed,
      scrapeBudgetStop: stoppedByBudget,
      latestFetchedPublishedAt,
      latestStoredPublishedAt: latestStoredArticle?.published_at ?? null,
      latestStoredTitle: latestStoredArticle?.title ?? null,
      latestStoredSource: latestStoredArticle?.source ?? null,
    },
  });

  console.log(
    `[sync] Done in ${durationMs}ms: ${inserted} inserted, ${updated} updated, ${failed} failed`
  );
  return {
    total: articles.length,
    inserted,
    updated,
    upserted,
    failed,
    enriched,
    scraped,
    scrapeAttempted: attempted,
    scrapeFailed,
    scrapeMode: traffic.mode,
    scrapeBudgetStop: stoppedByBudget,
    durationMs,
    latestFetchedPublishedAt,
    latestStoredPublishedAt: latestStoredArticle?.published_at ?? null,
    latestStoredTitle: latestStoredArticle?.title ?? null,
    latestStoredSource: latestStoredArticle?.source ?? null,
    latestStoredUrl: latestStoredArticle?.url ?? null,
    errors,
  };
}
