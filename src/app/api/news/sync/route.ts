import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { revalidateLocalizedPath } from "@/i18n/revalidate";
import { syncPipeline } from "@/lib/news/sync";
import { getArticleUrl } from "@/lib/news-config";
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
      // Every run, not just ?deep=1: the article pages render the full body
      // now, so having it already stored means the first reader does not wait
      // on an on-demand scrape. `scrapeContentForRecentArticles` carries its
      // own per-run budget and match-traffic mode, so this stays bounded.
      preScrapeContent: true,
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
      // Article pages are ISR'd for an hour; a live blog's fresh body would wait that long.
      for (const url of result.liveBlogsRefreshed ?? []) revalidateLocalizedPath(getArticleUrl(url));
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
