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
  const { count: contentCleared } = await supabase
    .from("articles")
    .update({ content_en: null, content_scraped_at: null }, { count: "exact" })
    .lt("published_at", sevenDaysAgo)
    .not("content_en", "is", null);

  // News is intentionally short-lived: keep only the last 14 days in DB.
  const { count: deleted } = await supabase
    .from("articles")
    .delete({ count: "exact" })
    .lt("published_at", fourteenDaysAgo);

  // Cleanup old sync logs. Column is `ran_at` in the migration.
  const { count: logsDeleted } = await supabase
    .from("sync_logs")
    .delete({ count: "exact" })
    .lt("ran_at", fourteenDaysAgo);

  revalidateTag("news", "max");
  revalidatePath("/");
  revalidatePath("/news");

  return NextResponse.json({
    ok: true,
    contentCleared: contentCleared ?? 0,
    deleted: deleted ?? 0,
    logsDeleted: logsDeleted ?? 0,
    retentionDays: 14,
    contentRetentionDays: 7,
  });
});
