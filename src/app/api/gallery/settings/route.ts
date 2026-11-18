import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/constants";
import { getSiteSetting, setSiteSetting } from "@/lib/gallery/queries";

const SETTING_KEY = "gallery_hero_bg";
const MAX_URL_LEN = 2048;

function isValidSettingBgUrl(raw: string): boolean {
  if (!raw || raw.length > MAX_URL_LEN) return false;
  if (raw.startsWith("/assets/") && !raw.includes("..")) return true;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** GET /api/gallery/settings — get gallery hero background URL */
export async function GET() {
  try {
    const bg = await getSiteSetting<string>(SETTING_KEY);
    return NextResponse.json(
      { bg },
      { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
    );
  } catch {
    return NextResponse.json({ bg: null }, { headers: { "Cache-Control": "no-store" } });
  }
}

/** POST /api/gallery/settings — set gallery hero background (admin only) */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const bg = body && typeof body === "object" && typeof (body as { bg?: unknown }).bg === "string"
      ? (body as { bg: string }).bg.trim()
      : "";

    if (!isValidSettingBgUrl(bg)) {
      return NextResponse.json({ error: "Invalid bg URL" }, { status: 400 });
    }
    await setSiteSetting(SETTING_KEY, bg);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[gallery/settings] error:", error);
    return NextResponse.json({ error: "Failed to save setting" }, { status: 500 });
  }
}
