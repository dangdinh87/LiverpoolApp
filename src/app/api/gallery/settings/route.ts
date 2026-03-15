import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/constants";
import { getSiteSetting, setSiteSetting } from "@/lib/gallery/queries";

const SETTING_KEY = "gallery_hero_bg";

/** GET /api/gallery/settings — get gallery hero background URL */
export async function GET() {
  try {
    const bg = await getSiteSetting<string>(SETTING_KEY);
    return NextResponse.json({ bg });
  } catch {
    return NextResponse.json({ bg: null });
  }
}

/** POST /api/gallery/settings — set gallery hero background (admin only) */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { bg } = await req.json();
    if (!bg || typeof bg !== "string") {
      return NextResponse.json({ error: "Invalid bg URL" }, { status: 400 });
    }
    await setSiteSetting(SETTING_KEY, bg);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[gallery/settings] error:", error);
    return NextResponse.json({ error: "Failed to save setting" }, { status: 500 });
  }
}
