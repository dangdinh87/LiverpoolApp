import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { syncPipeline } from "@/lib/news/sync";
import { withCronAuth } from "@/lib/cron";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

export const GET = withCronAuth(async (req) => {
  try {
    const deep = req.nextUrl.searchParams.get("deep") === "1";
    const result = await syncPipeline({
      fetchLimit: deep ? 300 : undefined,
      enrichThumbnails: deep,
      metaFetches: deep ? 30 : 0,
      preScrapeContent: deep,
    });

    // Invalidate ISR cache so next visitor gets fresh data. The unstable_cache
    // data layer (tag "news") refreshes on its own 5-min revalidate window.
    if (result.upserted > 0) {
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
