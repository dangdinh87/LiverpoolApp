import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";

// GET /api/news/like?url=... — get like count + whether current user liked
export async function GET(req: NextRequest) {
  const articleUrl = req.nextUrl.searchParams.get("url");
  if (!articleUrl) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  // Get current user (optional — anon users can still see counts)
  const { data: { user } } = await supabase.auth.getUser();

  // Count likes
  const { count } = await supabase
    .from("article_likes")
    .select("*", { count: "exact", head: true })
    .eq("article_url", articleUrl);

  // Check if current user liked
  let userLiked = false;
  if (user) {
    const { data } = await supabase
      .from("article_likes")
      .select("id")
      .eq("article_url", articleUrl)
      .eq("user_id", user.id)
      .maybeSingle();
    userLiked = !!data;
  }

  return NextResponse.json({ count: count ?? 0, userLiked });
}

// POST /api/news/like — toggle like
export async function POST(req: NextRequest) {
  // Rate limit: 30 likes per hour per IP
  const { allowed } = checkRateLimit(`like:${getClientIP(req)}`, 30, 3_600_000);
  if (!allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const articleUrl = body.url;
  if (!articleUrl) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  // Check if already liked
  const { data: existing } = await supabase
    .from("article_likes")
    .select("id")
    .eq("article_url", articleUrl)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    // Unlike
    await supabase.from("article_likes").delete().eq("id", existing.id);
  } else {
    // Like
    await supabase.from("article_likes").insert({
      user_id: user.id,
      article_url: articleUrl,
    });
  }

  // Return updated count
  const { count } = await supabase
    .from("article_likes")
    .select("*", { count: "exact", head: true })
    .eq("article_url", articleUrl);

  return NextResponse.json({ count: count ?? 0, userLiked: !existing });
}
