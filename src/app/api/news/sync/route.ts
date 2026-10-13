import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { revalidateLocalizedPath } from "@/i18n/revalidate";
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

    if (result.upserted > 0) {
      // Order matters. revalidatePath only drops the rendered HTML; the
      // unstable_cache entries behind it keep their own TTL. Without busting
      // the tag first, the re-render this triggers reads the *previous* entry
      // and caches last hour's articles for another full window — the fresh
      // sync showed up 5-15 minutes late, and the most expensive thing we do
      // (a full render) was spent on stale data.
      revalidateTag("news", "max");
      revalidateLocalizedPath("/");
      revalidateLocalizedPath("/news");
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
