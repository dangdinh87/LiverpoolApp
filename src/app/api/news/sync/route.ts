import { type NextRequest, NextResponse } from "next/server";
import { syncPipeline } from "@/lib/news/sync";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Auth: validate cron secret (query param or Vercel Cron header)
  const secret = req.nextUrl.searchParams.get("key")
    || req.headers.get("authorization")?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncPipeline();

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
}
