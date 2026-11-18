import { NextRequest, NextResponse } from "next/server";
import { articleUrlVariants } from "@/lib/news/url";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const NO_STORE = { headers: { "Cache-Control": "private, no-store" } };

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url || url.length > 2048) {
    return NextResponse.json({ saved: false }, NO_STORE);
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ saved: false }, NO_STORE);

    const { data } = await supabase
      .from("saved_articles")
      .select("id")
      .eq("user_id", user.id)
      .in("article_url", articleUrlVariants(url))
      .limit(1)
      .maybeSingle();

    return NextResponse.json({ saved: !!data }, NO_STORE);
  } catch (err) {
    console.error("[saved-articles/check] failed:", err);
    return NextResponse.json({ saved: false }, NO_STORE);
  }
}
