import "server-only";
import { fetchAllNews } from "./pipeline";
import { RssAdapter } from "./adapters/rss-adapter";
import { LfcAdapter } from "./adapters/lfc-adapter";
import { BongdaplusAdapter } from "./adapters/bongdaplus-adapter";
import { RSS_FEEDS } from "./config";
import { fetchOgMeta } from "./enrichers/og-meta";
import { getServiceClient } from "./supabase-service";
import type { NewsArticle } from "./types";

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
  let upserted = 0;
  let failed = 0;
  const errors: { url: string; error: string }[] = [];

  // Upsert in batches of 50
  const batchSize = 50;
  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);
    const rows = batch.map(articleToRow);

    const retries = 1;
    for (let attempt = 0; attempt <= retries; attempt++) {
      const { data, error } = await supabase
        .from("articles")
        .upsert(rows, { onConflict: "url", ignoreDuplicates: false })
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

  // Re-enrich: fetch og:image for articles missing thumbnails
  let enriched = 0;
  const { data: noThumbData } = await supabase
    .from("articles")
    .select("url")
    .is("thumbnail", null)
    .eq("is_active", true)
    .order("fetched_at", { ascending: false })
    .limit(30);

  const noThumb: { url: string }[] = noThumbData || [];

  if (noThumb.length) {
    const BATCH = 10;
    for (let i = 0; i < noThumb.length; i += BATCH) {
      const batch = noThumb.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        batch.map((r) => fetchOgMeta(r.url))
      );
      for (let j = 0; j < results.length; j++) {
        const r = results[j];
        if (r.status === "fulfilled" && r.value.image) {
          await supabase
            .from("articles")
            .update({ thumbnail: r.value.image, hero_image: r.value.image })
            .eq("url", batch[j].url);
          enriched++;
        }
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
