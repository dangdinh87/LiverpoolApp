"use server";

import { revalidateLocalizedPath } from "@/i18n/revalidate";
import { getEnv } from "@/lib/env";
import { getNewsPaginated } from "@/lib/news/db";
import { syncPipeline } from "@/lib/news/sync";
import { generateDailyDigest, getDigestDateKey, upsertDigestRecord } from "@/lib/news/digest";
import { getServiceClient } from "@/lib/news/supabase-service";
import type { NewsArticle } from "@/lib/news/types";

// Server actions are public endpoints: arguments come straight from the client.
const MAX_PAGE_SIZE = 50;

export async function loadMoreNews(
  offset: number,
  limit: number,
  language?: "en" | "vi"
): Promise<{ articles: NewsArticle[]; hasMore: boolean }> {
  const safeOffset = Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0;
  const safeLimit = Number.isFinite(limit)
    ? Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(limit)))
    : 20;
  const safeLanguage = language === "en" || language === "vi" ? language : undefined;
  return getNewsPaginated(safeOffset, safeLimit, safeLanguage);
}

/** Regenerate AI digest only (no news sync). Returns new data for inline update. */
export async function refreshDigest(): Promise<{
  ok: boolean;
  error?: string;
  title?: string;
  summary?: string;
  generatedAt?: string;
}> {
  if (!getEnv("VIETAPI_KEY")) {
    return { ok: false, error: "VIETAPI_KEY not set" };
  }
  try {
    console.log("[refreshDigest] Starting digest generation...");
    const digest = await generateDailyDigest();
    console.log("[refreshDigest] Generated:", digest.title, "sections:", digest.sections.length);
    const supabase = getServiceClient();
    const today = getDigestDateKey();
    const generatedAt = new Date().toISOString();
    const { data: existing } = await supabase
      .from("news_digests")
      .select("*")
      .eq("digest_date", today)
      .maybeSingle();
    await upsertDigestRecord(existing, today, digest, generatedAt);
    revalidateLocalizedPath("/");
    revalidateLocalizedPath("/news");
    console.log("[refreshDigest] Done — model:", digest.model);
    return {
      ok: true,
      title: digest.title,
      summary: digest.summary,
      generatedAt,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Digest failed";
    console.error("[refreshDigest]", msg);
    // Show user-friendly error, not raw API errors
    const isRateLimit = msg.includes("Rate limit") || msg.includes("429");
    return { ok: false, error: isRateLimit ? "AI models busy, try again later" : "Digest generation failed" };
  }
}

/** Sync articles from all sources (no digest regeneration). */
export async function syncNews(): Promise<{ ok: boolean; error?: string }> {
  try {
    await syncPipeline();
    revalidateLocalizedPath("/");
    revalidateLocalizedPath("/news");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sync failed";
    console.error("[syncNews]", msg);
    return { ok: false, error: msg };
  }
}
