import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getServiceClient } from "@/lib/news/supabase-service";
import { withCronAuth } from "@/lib/cron";

export const dynamic = "force-dynamic";

export const GET = withCronAuth(async () => {
  const supabase = getServiceClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86_400_000).toISOString();

  // Free heavy cached content first; the list page only needs metadata.
  const { count: contentCleared, error: contentError } = await supabase
    .from("articles")
    .update({ content_en: null, content_scraped_at: null }, { count: "exact" })
    .lt("published_at", sevenDaysAgo)
    .not("content_en", "is", null);

  // News is intentionally short-lived: keep only the last 14 days in DB.
  const { count: deleted, error: deleteError } = await supabase
    .from("articles")
    .delete({ count: "exact" })
    .lt("published_at", fourteenDaysAgo);

  // `lt("published_at", …)` never matches NULL, so undated rows (bad scrape dates,
  // 9 stale March bongdaplus rows still on screen) lived forever. Age them out by fetch time.
  const { count: undatedDeleted, error: undatedError } = await supabase
    .from("articles")
    .delete({ count: "exact" })
    .is("published_at", null)
    .lt("fetched_at", fourteenDaysAgo);

  // Cleanup old sync logs. Column is `ran_at` in the migration.
  const { count: logsDeleted, error: logsError } = await supabase
    .from("sync_logs")
    .delete({ count: "exact" })
    .lt("ran_at", fourteenDaysAgo);

  // A down/failing DB must not look like a clean run ("ok, deleted 0"): answer 503 so
  // the scheduler records the failure and retries.
  const failures: { step: string; error: string }[] = [];
  if (contentError) failures.push({ step: "content", error: contentError.message });
  if (deleteError) failures.push({ step: "articles", error: deleteError.message });
  if (undatedError) failures.push({ step: "articles-undated", error: undatedError.message });
  if (logsError) failures.push({ step: "sync_logs", error: logsError.message });
  if (failures.length > 0) {
    console.error("[news-cleanup] failed:", failures);
    return NextResponse.json(
      {
        ok: false,
        failures,
        contentCleared: contentError ? null : contentCleared ?? 0,
        deleted: deleteError ? null : deleted ?? 0,
        undatedDeleted: undatedError ? null : undatedDeleted ?? 0,
        logsDeleted: logsError ? null : logsDeleted ?? 0,
      },
      { status: 503 }
    );
  }

  revalidateTag("news", "max");
  revalidatePath("/");
  revalidatePath("/news");

  return NextResponse.json({
    ok: true,
    contentCleared: contentCleared ?? 0,
    deleted: deleted ?? 0,
    undatedDeleted: undatedDeleted ?? 0,
    logsDeleted: logsDeleted ?? 0,
    retentionDays: 14,
    contentRetentionDays: 7,
  });
});
