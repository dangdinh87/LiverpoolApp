import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { revalidateLocalizedPath } from "@/i18n/revalidate";
import { getEnv } from "@/lib/env";
import {
  generateDailyDigest,
  getDigestDateKey,
  getSeoArticleFromDigest,
  upsertDigestRecord,
} from "@/lib/news/digest";
import { getServiceClient } from "@/lib/news/supabase-service";
import { withCronAuth } from "@/lib/cron";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export const GET = withCronAuth(async (req) => {
  if (!getEnv("VIETAPI_KEY")) {
    return NextResponse.json(
      { error: "VIETAPI_KEY not configured" },
      { status: 503 }
    );
  }

  try {
    const supabase = getServiceClient();
    const today = getDigestDateKey();
    const force = req.nextUrl.searchParams.get("force") === "1";

    // Skip if already generated today with the SEO article payload (save Groq tokens).
    const { data: existing } = await supabase
      .from("news_digests")
      .select("*")
      .eq("digest_date", today)
      .maybeSingle();

    if (existing && getSeoArticleFromDigest(existing) && !force) {
      return NextResponse.json({ ok: true, date: today, skipped: true });
    }

    const digest = await generateDailyDigest();

    await upsertDigestRecord(existing, today, digest);
    // Bust both the shared digest data tag AND the rendered ISR pages that
    // embed today's briefing (including /news/digest/[today] if visited early).
    revalidateTag("news-digest", "max");
    revalidateLocalizedPath("/");
    revalidateLocalizedPath("/news");
    revalidateLocalizedPath("/news/digest");
    revalidateLocalizedPath(`/news/digest/${today}`);

    return NextResponse.json({
      ok: true,
      date: today,
      title: digest.title,
      sections: digest.sections.length,
      seoArticle: true,
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
