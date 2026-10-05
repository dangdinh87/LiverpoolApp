import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { syncPipeline } from "@/lib/news/sync";
import { withCronAuth } from "@/lib/cron";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

export const GET = withCronAuth(async (req) => {
  try {
    const deep = req.nextUrl.searchParams.get("deep") === "1";
    const result = await syncPipeline({
      fetchLimit: deep ? 300 : undefined,
      // Every run (not just ?deep=1): a small og:image / cached-hero repair for rows without a thumbnail.
      enrichThumbnails: true,
      enrichLimit: deep ? 30 : 10,
      metaFetches: deep ? 30 : 0,
      preScrapeContent: deep,
    });

    // Invalidate the cached news lists (tag "news") and both pages, so fresh
    // articles show on the next visit instead of after the 5-min window.
    if (result.upserted > 0) {
      revalidateTag("news", "max");
      revalidatePath("/");
      revalidatePath("/news");
    }

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (err) {
    console.error("[sync] Fatal:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
});
