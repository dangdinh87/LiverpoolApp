import "server-only";
import { fetchAllNews } from "./pipeline";
import { RssAdapter } from "./adapters/rss-adapter";
import { LfcAdapter } from "./adapters/lfc-adapter";
import { BongdaplusAdapter } from "./adapters/bongdaplus-adapter";
import { RSS_FEEDS } from "./config";
import { fetchOgMeta } from "./enrichers/og-meta";
import { getServiceClient } from "./supabase-service";
import type { NewsArticle } from "./types";
import { SupabaseClient } from "@supabase/supabase-js";

export interface SyncResult {
  total: number;
  upserted: number;
  failed: number;
  enriched: number;
  durationMs: number;
  errors: { url: string; error: string }[];
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
    published_at: a.pubDate ? new Date(a.pubDate).toISOString() : null,
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function bulkUpsertArticles(articles: NewsArticle[], supabase: SupabaseClient<any, "public", any>) {
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

      const existingMap = new Map((existingData || []).map((row) => [row.url, row]));
      const safeRows = rows.map((row) => {
        const old = existingMap.get(row.url);
        return old ? { ...old, ...row } : row;
      });

      const { data, error } = await supabase
        .from("articles")
        .upsert(safeRows, { onConflict: "url", ignoreDuplicates: false })
        .select("url");

      if (!error) {
        upserted += data?.length ?? 0;
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

  return { upserted, failed, errors };
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

  const { articles, stats: sourceStats } = await fetchAllNews(adapters, 300);
  console.log(`[sync] Fetched ${articles.length} articles from adapters`);

  const supabase = getServiceClient();

  const upsertResult = await bulkUpsertArticles(articles, supabase);
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

  const durationMs = Date.now() - start;

  // Log sync result with per-source stats
  await supabase.from("sync_logs").insert({
    inserted: upserted,
    updated: 0,
    failed,
    duration_ms: durationMs,
    errors: errors.length > 0 ? errors : null,
    source_stats: sourceStats,
  });

  console.log(`[sync] Done in ${durationMs}ms: ${upserted} upserted, ${failed} failed`);
  return { total: articles.length, upserted, failed, enriched, durationMs, errors };
}
