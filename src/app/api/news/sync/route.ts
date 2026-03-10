import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchAllNews } from "@/lib/news/pipeline";
import { RssAdapter } from "@/lib/news/adapters/rss-adapter";
import { LfcAdapter } from "@/lib/news/adapters/lfc-adapter";
import { BongdaplusAdapter } from "@/lib/news/adapters/bongdaplus-adapter";
import { RSS_FEEDS } from "@/lib/news/config";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Service role client — bypasses RLS, no cookies needed
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key);
}

// Build adapters (same as getNews pipeline)
const adapters = [
  new LfcAdapter(),
  ...RSS_FEEDS.map((cfg) => new RssAdapter(cfg)),
  new BongdaplusAdapter(),
];

export async function GET(req: NextRequest) {
  const start = Date.now();

  // Auth: validate cron secret
  const secret = req.nextUrl.searchParams.get("key");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getServiceClient();

    // Fetch all news from adapters
    const articles = await fetchAllNews(adapters, 300);
    console.log(`[sync] Fetched ${articles.length} articles from adapters`);

    let inserted = 0;
    let updated = 0;
    let failed = 0;
    const errors: { url: string; error: string }[] = [];

    // Upsert in batches of 50
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

      const { data, error } = await supabase
        .from("articles")
        .upsert(rows, {
          onConflict: "url",
          ignoreDuplicates: false,
        })
        .select("url");

      if (error) {
        failed += batch.length;
        errors.push({ url: `batch-${i}`, error: error.message });
        console.error(`[sync] Batch ${i} error:`, error.message);
      } else {
        // Count: upsert doesn't distinguish insert vs update easily,
        // so we count all as "upserted"
        inserted += data?.length ?? 0;
      }
    }

    // Re-enrich: fetch og:image for DB articles still missing thumbnails
    const { data: noThumb } = await supabase
      .from("articles")
      .select("url")
      .is("thumbnail", null)
      .eq("is_active", true)
      .order("fetched_at", { ascending: false })
      .limit(30);

    if (noThumb && noThumb.length > 0) {
      const { fetchOgMeta } = await import("@/lib/news/enrichers/og-meta");
      const BATCH = 10;
      let enriched = 0;
      for (let i = 0; i < noThumb.length; i += BATCH) {
        const batch = noThumb.slice(i, i + BATCH);
        const results = await Promise.allSettled(
          batch.map((row) => fetchOgMeta(row.url))
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

    // Log sync result
    await supabase.from("sync_logs").insert({
      inserted,
      updated,
      failed,
      duration_ms: durationMs,
      errors: errors.length > 0 ? errors : null,
    });

    console.log(
      `[sync] Done in ${durationMs}ms: ${inserted} upserted, ${failed} failed`
    );

    return NextResponse.json({
      ok: true,
      inserted,
      updated,
      failed,
      total: articles.length,
      duration_ms: durationMs,
    });
  } catch (err) {
    const durationMs = Date.now() - start;
    console.error("[sync] Fatal:", err);

    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Internal error",
        duration_ms: durationMs,
      },
      { status: 500 }
    );
  }
}
