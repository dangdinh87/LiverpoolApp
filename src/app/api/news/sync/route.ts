import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { syncPipeline } from "@/lib/news/sync";
import { withCronAuth } from "@/lib/cron";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export const GET = withCronAuth(async () => {
  try {
    const result = await syncPipeline();

    // Invalidate ISR cache so next visitor gets fresh data
    if (result.upserted > 0) {
      revalidatePath("/");
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
