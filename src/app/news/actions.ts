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
    const { error: dbError } = await supabase.from("news_digests").upsert(
      {
        digest_date: today,
        title: digest.title,
        summary: digest.summary,
        sections: digest.sections,
        article_ids: digest.sections.flatMap((s) => s.articleUrls),
        article_count: digest.articleCount,
        model: "llama-3.3-70b-versatile",
        tokens_used: digest.tokensUsed,
      },
      { onConflict: "digest_date" }
    );
    if (dbError) {
      console.error("[refreshDigest] DB upsert error:", dbError);
      return { ok: false, error: dbError.message };
    }
    revalidatePath("/");
    revalidatePath("/news");
    console.log("[refreshDigest] Done — revalidated");
    return {
      ok: true,
      title: digest.title,
      summary: digest.summary,
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Digest failed";
    console.error("[refreshDigest]", msg);
    return { ok: false, error: msg };
  }
}

/** Manual refresh: sync news + regenerate AI digest + revalidate pages. */
export async function refreshNews(): Promise<{ ok: boolean; upserted: number; error?: string }> {
  try {
    // 1. Sync articles from all sources
    const result = await syncPipeline();

    // 2. Regenerate today's AI digest with fresh articles
    if (process.env.GROQ_API_KEY) {
      try {
        const digest = await generateDailyDigest();
        const supabase = getServiceClient();
        const today = new Date().toISOString().split("T")[0];
        await supabase.from("news_digests").upsert(
          {
            digest_date: today,
            title: digest.title,
            summary: digest.summary,
            sections: digest.sections,
            article_ids: digest.sections.flatMap((s) => s.articleUrls),
            article_count: digest.articleCount,
            model: "llama-3.3-70b-versatile",
            tokens_used: digest.tokensUsed,
          },
          { onConflict: "digest_date" }
        );
        console.log("[refreshNews] Digest regenerated");
      } catch (err) {
        console.error("[refreshNews] Digest failed:", err);
      }
    }

    // 3. Revalidate cached pages
    revalidatePath("/");
    revalidatePath("/news");

    return { ok: true, upserted: result.upserted };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sync failed";
    console.error("[refreshNews]", msg);
    return { ok: false, upserted: 0, error: msg };
  }
}
