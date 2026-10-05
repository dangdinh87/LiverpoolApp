import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { isKnownNewsSourceUrl } from "@/lib/news-config";
import { articleUrlVariants, canonicalizeArticleUrl } from "@/lib/news/url";

// GET /api/news/like?url=... — get like count + whether current user liked
export async function GET(req: NextRequest) {
  const articleUrl = req.nextUrl.searchParams.get("url");
  if (!articleUrl) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }

  const urlVariants = articleUrlVariants(articleUrl);
  const supabase = await createServerSupabaseClient();

  // Get current user (optional — anon users can still see counts)
  const { data: { user } } = await supabase.auth.getUser();

  // Count likes
  const { count } = await supabase
    .from("article_likes")
    .select("*", { count: "exact", head: true })
    .in("article_url", urlVariants);

  // Check if current user liked
  let userLiked = false;
  if (user) {
    const { data } = await supabase
      .from("article_likes")
      .select("id")
      .in("article_url", urlVariants)
      .eq("user_id", user.id)
      .limit(1)
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

  const body = await req.json().catch(() => null);
  const articleUrl: unknown = body?.url;
  if (typeof articleUrl !== "string" || !articleUrl) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }
  // Same rule as comments: only real news-source articles can be liked, so a
  // client cannot create like rows for arbitrary strings (they feed "trending").
  if (!isKnownNewsSourceUrl(articleUrl)) {
    return NextResponse.json({ error: "Unsupported article URL" }, { status: 400 });
  }

  // New rows use the canonical URL; older ones may hold a legacy spelling.
  const canonicalUrl = canonicalizeArticleUrl(articleUrl);
  const urlVariants = articleUrlVariants(articleUrl);

  // Check if already liked
  const { data: existing } = await supabase
    .from("article_likes")
    .select("id")
    .in("article_url", urlVariants)
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (existing) {
    // Unlike
    await supabase.from("article_likes").delete().eq("id", existing.id);
  } else {
    // Like
    await supabase.from("article_likes").insert({
      user_id: user.id,
      article_url: canonicalUrl,
    });
  }

  // Return updated count
  const { count } = await supabase
    .from("article_likes")
    .select("*", { count: "exact", head: true })
    .in("article_url", urlVariants);

  return NextResponse.json({ count: count ?? 0, userLiked: !existing });
}
