import "server-only";
import { fetchAllNews } from "./pipeline";
import { RssAdapter } from "./adapters/rss-adapter";
import { LfcAdapter } from "./adapters/lfc-adapter";
import { BongdaplusAdapter } from "./adapters/bongdaplus-adapter";
import { RSS_FEEDS } from "./config";
import { fetchOgMeta } from "./enrichers/og-meta";
import { articleUrlVariants, canonicalizeArticleUrl } from "./url";
import type { SourceStats } from "./pipeline";
import { scrapeArticle } from "./enrichers/article-extractor";
import { getFixtures } from "@/lib/football";
import { getServiceClient } from "./supabase-service";
import { clampToNowMs, getValidDateMs, nowIso, toIsoDateOrFallback } from "./date";
import { sanitizeImageUrl } from "./image";
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
  /** Per-source fetch outcome (status ok / http_error / timeout / parse_error / error). */
  sources: Record<string, SourceStats>;
  /** Sources whose last fetch was not "ok" — adapters swallow errors, so this is the alert signal. */
  sourceFailures: { source: string; status: string; httpStatus?: number; error?: string }[];
  /** Consecutive most-recent runs (this one included) that inserted nothing. */
  consecutiveZeroInsertRuns: number;
  thumbnailsFilled: number;
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
const FETCH_LIMIT_BASE = 120;
const FAST_ENRICH_LIMIT = 10;
const ENRICH_TIMEOUT_MS = 3_500;
const ENRICH_CANDIDATE_POOL = 40;
const ENRICH_MAX_AGE_MS = 72 * 3600 * 1000;
/** Titles of rows stored in this window are the "already have it" set for cross-source dedup. */
const RECENT_TITLES_WINDOW_MS = 48 * 3600 * 1000;
const ZERO_INSERT_LOOKBACK = 6;

type MatchTrafficMode = "low" | "normal" | "peak";

const STRIPPED_COLS = ["fts", "id"] as const;

const stripDbManaged = (row: Record<string, unknown>) => {
  const clean = { ...row };
  for (const col of STRIPPED_COLS) delete clean[col];
  return clean;
};

function firstNonEmptyString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

export function mergeArticleRowForUpsert(
  row: Record<string, unknown>,
  existing?: Record<string, unknown>,
  fetchedAt = nowIso(),
  /** Incoming article had no usable pubDate, so row.published_at is just "now". */
  undated = false
): Record<string, unknown> {
  if (!existing) {
    return {
      ...row,
      fetched_at: fetchedAt,
      is_active: true,
      read_count: 0,
    };
  }

  const old = stripDbManaged(existing);
  const thumbnail = firstNonEmptyString(
    row.thumbnail,
    old.thumbnail,
    row.hero_image,
    old.hero_image
  );
  const heroImage = firstNonEmptyString(
    row.hero_image,
    old.hero_image,
    row.thumbnail,
    old.thumbnail
  );

  // Undated items get published_at = fetch time on insert; on every later sync keep that
  // value, otherwise they are re-stamped "now" and stay pinned to the top forever.
  const publishedAt = undated && old.published_at ? old.published_at : row.published_at;

  return {
    ...old,
    ...row,
    published_at: publishedAt,
    fetched_at: old.fetched_at || fetchedAt,
    thumbnail,
    hero_image: heroImage,
    // Every row in a bulk upsert must carry the same keys: PostgREST sends the
    // union of keys and writes NULL where a row lacks one. New rows set these two,
    // so existing rows must too — otherwise each batch with a new article wrote
    // is_active = NULL over the existing ones and hid them from every
    // `is_active = true` read (244 of 400 rows, Oct 2026). A soft-deleted row
    // (false) stays deleted; NULL left by that bug is repaired to visible.
    is_active: old.is_active === false ? false : true,
    read_count: typeof old.read_count === "number" ? old.read_count : 0,
  };
}

export interface SyncOptions {
  fetchLimit?: number;
  /** Fill missing thumbnails from og:image / cached hero. Default true (small, capped budget). */
  enrichThumbnails?: boolean;
  /** Max rows fetched over the network for thumbnails per run (default 10). */
  enrichLimit?: number;
  metaFetches?: number;
  preScrapeContent?: boolean;
}

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

function clampPubDate(pubDate: string, fetchedAtIso: string): unknown {
  const ms = getValidDateMs(pubDate);
  if (ms === null) return pubDate;
  return clampToNowMs(ms, getValidDateMs(fetchedAtIso) ?? Date.now());
}

/**
 * Whether the item's own date can be stored as-is: present, parseable and not
 * in the future. Items failing this get a fallback date (fetch time) — and an
 * existing row keeps the date it already has, otherwise a future-dated item
 * would be re-stamped "now" on every hourly sync and stay pinned to the top.
 */
function hasUsablePubDate(a: NewsArticle): boolean {
  const ms = getValidDateMs(a.pubDate);
  if (ms === null) return false;
  const fetchedMs = getValidDateMs(a.fetchedAt ?? "") ?? Date.now();
  return ms <= fetchedMs;
}

function articleToRow(a: NewsArticle) {
  const updatedAt = nowIso();
  const fetchedAt = toIsoDateOrFallback(a.fetchedAt, updatedAt);
  const thumbnail = a.thumbnail || a.heroImage || null;

  return {
    url: canonicalizeArticleUrl(a.link),
    title: a.title,
    snippet: a.contentSnippet || "",
    thumbnail,
    source: a.source,
    language: a.language,
    category: a.category || "general",
    relevance: a.relevanceScore ?? 0,
    // Future dates (zone mix-ups, scheduled posts) are clamped to the fetch time.
    published_at: toIsoDateOrFallback(clampPubDate(a.pubDate, fetchedAt), fetchedAt),
    author: a.author || null,
    hero_image: a.heroImage || thumbnail,
    word_count: a.wordCount || null,
    tags: a.tags || [],
    updated_at: updatedAt,
  };
}

/**
 * Shared sync pipeline: fetch from all adapters → upsert → re-enrich → log.
 * Called by both db.ts (background sync) and api/news/sync/route.ts (manual).
 */
const EXISTING_COLUMNS = "url,thumbnail,hero_image,fetched_at,published_at,is_active,read_count";
// Each row is looked up under every URL spelling (~3) and PostgREST puts the list in
// the query string, so keep chunks small (≈5 KB of URLs).
const EXISTING_LOOKUP_CHUNK = 15;

async function fetchExistingRows(supabase: NewsServiceClient, urls: string[]) {
  const data: Record<string, unknown>[] = [];
  for (let i = 0; i < urls.length; i += EXISTING_LOOKUP_CHUNK) {
    const variants = [...new Set(urls.slice(i, i + EXISTING_LOOKUP_CHUNK).flatMap((u) => articleUrlVariants(u)))];
    const { data: chunk, error } = await supabase.from("articles").select(EXISTING_COLUMNS).in("url", variants);
    if (error) return { data: null, error };
    data.push(...((chunk as Record<string, unknown>[] | null) ?? []));
  }
  return { data, error: null };
}

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
    const undatedCanonical = new Set(
      batch.filter((a) => !hasUsablePubDate(a)).map((a) => canonicalizeArticleUrl(a.link))
    );

    const retries = 1;
    for (let attempt = 0; attempt <= retries; attempt++) {
      // Select exactly the columns mergeArticleRowForUpsert reads. Selecting "*"
      // pulled the cached full-article JSON for every update and made sync much
      // slower as the table grew; selecting only "url" would silently break
      // thumbnail/hero_image retention, since the merge needs the old values.
      const { data: existingData, error: fetchError } = await fetchExistingRows(supabase, rows.map((r) => r.url));

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

      // A row stored before the canonical-URL rule (trailing slash, BBC tracking
      // params) keeps its stored spelling: updating it in place avoids a duplicate
      // row and keeps its comments / likes / cached translation attached.
      const storedByCanonical = new Map(
        (existingData || []).map((row) => [canonicalizeArticleUrl(String(row.url)), String(row.url)] as const)
      );
      for (const row of rows) {
        const stored = storedByCanonical.get(canonicalizeArticleUrl(row.url));
        if (stored) row.url = stored;
      }
      const undatedUrls = new Set(
        rows.filter((r) => undatedCanonical.has(canonicalizeArticleUrl(r.url))).map((r) => r.url)
      );
      const existingMap = new Map(
        (existingData || []).map((row) => [row.url, stripDbManaged(row)])
      );
      // Bulk upsert in PostgREST takes the UNION of keys across all rows;
      // any column missing on a given row is serialized as NULL, bypassing
      // the column DEFAULT. To preserve schema defaults for NEW rows mixed
      // in the same batch as updates of EXISTING rows, explicitly seed the
      // columns that have meaningful defaults (chiefly `is_active`).
      const fetchedAt = nowIso();
      const safeRows = rows.map((row) =>
        mergeArticleRowForUpsert(row, existingMap.get(row.url), fetchedAt, undatedUrls.has(row.url))
      );

      const { data, error } = await supabase
        .from("articles")
        .upsert(safeRows, { onConflict: "url", ignoreDuplicates: false })
        .select("url");

      if (!error) {
        const affected = data?.length ?? 0;
        const existingCount = rows.filter((row) => existingMap.has(row.url)).length;
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

/**
 * Small per-run thumbnail repair for rows that have none (bongda, anfield-watch,
 * anfieldindex, espn ship no image in RSS). Free first: a scraped `content_en.heroImage`
 * is copied back onto the row. Then at most `limit` og:image fetches with a short
 * timeout, chosen at random from the recent candidates so rows whose page has no
 * image cannot starve the others.
 */
async function enrichMissingThumbnails(
  supabase: NewsServiceClient,
  limit = FAST_ENRICH_LIMIT
) {
  let filled = 0;
  const since = toIsoDateOrFallback(Date.now() - ENRICH_MAX_AGE_MS);
  const { data: noThumbData } = await supabase
    .from("articles")
    .select("url,thumbnail,hero_image,content_hero:content_en->>heroImage")
    .eq("is_active", true)
    .is("thumbnail", null)
    // This Is Anfield 403s every client; its RSS carries images anyway.
    .not("source", "in", "(tia,anfieldindex)")
    .gte("fetched_at", since)
    .order("fetched_at", { ascending: false })
    .limit(ENRICH_CANDIDATE_POOL);

  type Candidate = { url: string; thumbnail: string | null; hero_image: string | null; content_hero?: string | null };
  const candidates = (noThumbData || []) as Candidate[];
  if (!candidates.length) return filled;

  const needFetch: Candidate[] = [];
  const updates: PromiseLike<unknown>[] = [];
  for (const row of candidates) {
    const known = sanitizeImageUrl(row.hero_image ?? undefined) ?? sanitizeImageUrl(row.content_hero ?? undefined, row.url);
    if (known) {
      filled++;
      updates.push(
        supabase
          .from("articles")
          .update({ thumbnail: known, hero_image: row.hero_image || known, updated_at: nowIso() })
          .eq("url", row.url)
          .then((r) => r)
      );
    } else {
      needFetch.push(row);
    }
  }
  await Promise.allSettled(updates);

  // Random pick (Fisher-Yates) of the rows that need a network fetch.
  for (let i = needFetch.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [needFetch[i], needFetch[j]] = [needFetch[j], needFetch[i]];
  }
  const picked = needFetch.slice(0, limit);

  const BATCH = 5;
  for (let i = 0; i < picked.length; i += BATCH) {
    const batch = picked.slice(i, i + BATCH);
    const results = await Promise.allSettled(batch.map((r) => fetchOgMeta(r.url, ENRICH_TIMEOUT_MS)));
    await Promise.allSettled(
      results.map((result, j) => {
        if (result.status !== "fulfilled" || !result.value.image) return Promise.resolve();
        const row = batch[j];
        filled++;
        return supabase
          .from("articles")
          .update({
            thumbnail: result.value.image,
            hero_image: row.hero_image || result.value.image,
            updated_at: nowIso(),
          })
          .eq("url", row.url)
          .then((r) => r);
      })
    );
  }

  console.log(`[sync] Thumbnails filled ${filled} (${candidates.length} candidates, ${picked.length} fetched)`);
  return filled;
}

function getLatestFetchedPublishedAt(articles: NewsArticle[]): string | null {
  let latestMs = 0;

  for (const article of articles) {
    const rawDate = article.pubDate || article.fetchedAt;
    if (!rawDate) continue;

    const ms = getValidDateMs(rawDate);
    if (ms !== null && ms > latestMs) {
      latestMs = ms;
    }
  }

  return latestMs > 0 ? toIsoDateOrFallback(latestMs) : null;
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
  const staleCutoff = toIsoDateOrFallback(Date.now() - STALE_CONTENT_MS);
  const { data, error } = await supabase
    .from("articles")
    .select("url")
    .eq("is_active", true)
    // This Is Anfield 403s every client: link-out only, never scrape.
    .not("source", "in", "(tia,anfieldindex)")
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

/** Rows stored in the last 48h (url + title) for cross-run duplicate detection; [] on error. */
async function getRecentArticleRefs(supabase: NewsServiceClient) {
  const since = toIsoDateOrFallback(Date.now() - RECENT_TITLES_WINDOW_MS);
  const { data, error } = await supabase
    .from("articles")
    .select("url,title")
    .gte("fetched_at", since)
    .order("fetched_at", { ascending: false })
    .limit(600);
  if (error) {
    console.warn(`[sync] recent-titles lookup failed (dedup limited to this batch): ${error.message}`);
    return [];
  }
  return (data ?? []).map((r) => ({ url: String(r.url), title: String(r.title ?? "") }));
}

export function listSourceFailures(stats: Record<string, SourceStats>) {
  return Object.entries(stats)
    .filter(([, st]) => st.status && st.status !== "ok")
    .map(([source, st]) => ({
      source,
      status: st.status as string,
      ...(st.httpStatus !== undefined ? { httpStatus: st.httpStatus } : {}),
      ...(st.error ? { error: st.error } : {}),
    }));
}

/** This run's insert count joined with the last runs from sync_logs: how long has the whole pipeline been silent? */
async function countConsecutiveZeroInsertRuns(supabase: NewsServiceClient, insertedNow: number) {
  if (insertedNow > 0) return 0;
  const { data, error } = await supabase
    .from("sync_logs")
    .select("inserted")
    .order("ran_at", { ascending: false })
    .limit(ZERO_INSERT_LOOKBACK);
  if (error || !data) return 1;
  let runs = 1;
  for (const row of data) {
    if ((row.inserted ?? 0) > 0) break;
    runs++;
  }
  return runs;
}

/**
 * Shared sync pipeline: fetch from all adapters → upsert → re-enrich → log.
 * Called by both db.ts (background sync) and api/news/sync/route.ts (manual).
 */
export async function syncPipeline(options: SyncOptions = {}): Promise<SyncResult> {
  const start = Date.now();
  const fetchLimit = options.fetchLimit ?? FETCH_LIMIT_BASE;
  const enrichThumbnails = options.enrichThumbnails ?? true;
  const metaFetches = options.metaFetches ?? 0;
  const preScrapeContent = options.preScrapeContent ?? false;
  const adapters = [
    new LfcAdapter(),
    ...RSS_FEEDS.map((cfg) => new RssAdapter(cfg)),
    new BongdaplusAdapter(),
  ];

  const supabase = getServiceClient();
  const existing = await getRecentArticleRefs(supabase);

  const { articles, stats: sourceStats } = await fetchAllNews(adapters, fetchLimit, {
    metaFetches,
    existing,
  });
  console.log(`[sync] Fetched ${articles.length} articles from adapters`);

  const upsertResult = await bulkUpsertArticles(articles, supabase);
  const inserted = upsertResult.inserted;
  const updated = upsertResult.updated;
  const upserted = upsertResult.upserted;
  const failed = upsertResult.failed;
  const errors = upsertResult.errors;

  const enriched = enrichThumbnails
    ? await enrichMissingThumbnails(supabase, options.enrichLimit ?? FAST_ENRICH_LIMIT)
    : 0;

  const traffic = preScrapeContent
    ? await getMatchTrafficMode()
    : { mode: "low" as MatchTrafficMode, hoursToNext: null, hoursSinceLast: null };
  const { attempted, scraped, scrapeFailed, stoppedByBudget } = preScrapeContent
    ? await scrapeContentForRecentArticles(supabase, {
      upserted,
      fetchedTotal: articles.length,
      mode: traffic.mode,
    })
    : { attempted: 0, scraped: 0, scrapeFailed: 0, stoppedByBudget: false };
  const durationMs = Date.now() - start;
  const latestFetchedPublishedAt = getLatestFetchedPublishedAt(articles);
  const latestStoredArticle = await getLatestStoredArticle(supabase);

  const sourceFailures = listSourceFailures(sourceStats);
  const consecutiveZeroInsertRuns = await countConsecutiveZeroInsertRuns(supabase, inserted);
  if (sourceFailures.length) {
    console.warn(
      `[sync] ${sourceFailures.length} source(s) not ok: ` +
        sourceFailures.map((f) => `${f.source}=${f.status}${f.httpStatus ? `(${f.httpStatus})` : ""}`).join(", ")
    );
  }

  // Log sync result with per-source stats (each carries its fetch status)
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
      thumbnailsFilled: enriched,
      sourceFailures: sourceFailures.length ? sourceFailures : undefined,
      consecutiveZeroInsertRuns,
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
    sources: sourceStats,
    sourceFailures,
    consecutiveZeroInsertRuns,
    thumbnailsFilled: enriched,
  };
}
