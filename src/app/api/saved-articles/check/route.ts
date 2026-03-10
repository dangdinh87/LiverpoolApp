import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ saved: false });

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ saved: false });

  const { data } = await supabase
    .from("saved_articles")
    .select("id")
    .eq("user_id", user.id)
    .eq("article_url", url)
    .single();

  return NextResponse.json({ saved: !!data });
}
