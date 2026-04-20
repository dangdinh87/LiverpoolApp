import { type NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/news/supabase-service";
import { withCronAuth } from "@/lib/cron";

export const dynamic = "force-dynamic";

export const GET = withCronAuth(async () => {
  const supabase = getServiceClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const sixtyDaysAgo = new Date(Date.now() - 60 * 86_400_000).toISOString();

  // Soft-delete: deactivate articles >30 days old
  const { count: deactivated } = await supabase
    .from("articles")
    .update({ is_active: false }, { count: "exact" })
    .eq("is_active", true)
    .lt("published_at", thirtyDaysAgo);

  // Hard-delete: remove already-deactivated articles >60 days with no cached content
  const { count: deleted } = await supabase
    .from("articles")
    .delete({ count: "exact" })
    .eq("is_active", false)
    .is("content_en", null)
    .lt("published_at", sixtyDaysAgo);

  // Cleanup old sync_logs >30 days
  const { count: logsDeleted } = await supabase
    .from("sync_logs")
    .delete({ count: "exact" })
    .lt("created_at", thirtyDaysAgo);

  return NextResponse.json({
    ok: true,
    deactivated: deactivated ?? 0,
    deleted: deleted ?? 0,
    logsDeleted: logsDeleted ?? 0,
  });
});
