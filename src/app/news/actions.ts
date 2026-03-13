"use server";

import { revalidatePath } from "next/cache";
import { getNewsPaginated } from "@/lib/news/db";
import { syncPipeline } from "@/lib/news/sync";
import { generateDailyDigest } from "@/lib/news/digest";
import { getServiceClient } from "@/lib/news/supabase-service";
import type { NewsArticle } from "@/lib/news/types";

export async function loadMoreNews(
  offset: number,
  limit: number,
  language?: "en" | "vi"
): Promise<{ articles: NewsArticle[]; hasMore: boolean }> {
  return getNewsPaginated(offset, limit, language);
}

/** Regenerate AI digest only (no news sync). Returns new data for inline update. */
export async function refreshDigest(): Promise<{
  ok: boolean;
  error?: string;
  title?: string;
  summary?: string;
  generatedAt?: string;
}> {
  if (!process.env.GROQ_API_KEY) {
    return { ok: false, error: "GROQ_API_KEY not set" };
  }
  try {
    console.log("[refreshDigest] Starting digest generation...");
    const digest = await generateDailyDigest();
    console.log("[refreshDigest] Generated:", digest.title, "sections:", digest.sections.length);
    const supabase = getServiceClient();
    const today = new Date().toISOString().split("T")[0];
    const generatedAt = new Date().toISOString();
    const { error: dbError } = await supabase.from("news_digests").upsert(
      {
        digest_date: today,
        title: digest.title,
        summary: digest.summary,
        sections: digest.sections,
        article_ids: digest.sections.flatMap((s) => s.articleUrls),
        article_count: digest.articleCount,
        model: digest.model,
        tokens_used: digest.tokensUsed,
        generated_at: generatedAt,
      },
      { onConflict: "digest_date" }
    );
    if (dbError) {
      console.error("[refreshDigest] DB upsert error:", dbError);
      return { ok: false, error: "Database error" };
    }
    revalidatePath("/");
    revalidatePath("/news");
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
    revalidatePath("/");
    revalidatePath("/news");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sync failed";
    console.error("[syncNews]", msg);
    return { ok: false, error: msg };
  }
}
