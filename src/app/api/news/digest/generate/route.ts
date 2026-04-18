import { type NextRequest, NextResponse } from "next/server";
import { generateDailyDigest } from "@/lib/news/digest";
import { getServiceClient } from "@/lib/news/supabase-service";
import { withCronAuth } from "@/lib/cron";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export const GET = withCronAuth(async (req: NextRequest) => {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: "GROQ_API_KEY not configured" },
      { status: 503 }
    );
  }

  try {
    const supabase = getServiceClient();
    const today = new Date().toISOString().split("T")[0];

    // Skip if already generated today (save Groq tokens)
    const { data: existing } = await supabase
      .from("news_digests")
      .select("digest_date")
      .eq("digest_date", today)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ ok: true, date: today, skipped: true });
    }

    const digest = await generateDailyDigest();

    const { error } = await supabase.from("news_digests").upsert(
      {
        digest_date: today,
        title: digest.title,
        summary: digest.summary,
        sections: digest.sections,
        article_ids: digest.sections.flatMap((s) => s.articleUrls),
        article_count: digest.articleCount,
        model: digest.model,
        tokens_used: digest.tokensUsed,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "digest_date" }
    );

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      date: today,
      title: digest.title,
      sections: digest.sections.length,
      articleCount: digest.articleCount,
      tokensUsed: digest.tokensUsed,
      model: digest.model,
    });
  } catch (err) {
    console.error("[digest] Generation failed:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Digest generation failed",
      },
      { status: 500 }
    );
  }
});
