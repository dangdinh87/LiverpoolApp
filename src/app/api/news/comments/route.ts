import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { isKnownNewsSourceUrl } from "@/lib/news-config";
import { articleUrlVariants, canonicalizeArticleUrl } from "@/lib/news/url";

// GET /api/news/comments?url=... — list comments for an article
export async function GET(req: NextRequest) {
  const articleUrl = req.nextUrl.searchParams.get("url");
  if (!articleUrl) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("article_comments")
    .select("id, user_id, content, author_name, author_avatar, parent_id, reply_to_name, created_at, updated_at")
    .in("article_url", articleUrlVariants(articleUrl))
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) {
    console.error("[comments]", error.message);
    return NextResponse.json({ error: "Comments are unavailable right now" }, { status: 500 });
  }

  const comments = (data ?? []).map((c) => ({
    id: c.id,
    userId: c.user_id,
    content: c.content,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    username: c.author_name || "Fan",
    avatarUrl: c.author_avatar || null,
    parentId: c.parent_id || null,
    replyToName: c.reply_to_name || null,
  }));

  return NextResponse.json({ comments });
}

// Display name is public: never fall back to the email address.
function getDisplayName(username: string | null): string {
  return username?.trim() || "Fan";
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST /api/news/comments — create a comment
export async function POST(req: NextRequest) {
  // Rate limit: 20 comments per hour per IP
  const { allowed } = checkRateLimit(`comment:${getClientIP(req)}`, 20, 3_600_000);
  if (!allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const { url, content, parentId, replyToName } = body ?? {};

  if (typeof url !== "string" || typeof content !== "string") {
    return NextResponse.json({ error: "Missing url or content" }, { status: 400 });
  }
  if (!isKnownNewsSourceUrl(url)) {
    return NextResponse.json({ error: "Unsupported article URL" }, { status: 400 });
  }
  if (parentId != null && (typeof parentId !== "string" || !UUID_RE.test(parentId))) {
    return NextResponse.json({ error: "Invalid parentId" }, { status: 400 });
  }
  if (replyToName != null && (typeof replyToName !== "string" || replyToName.length > 60)) {
    return NextResponse.json({ error: "Invalid replyToName" }, { status: 400 });
  }

  const trimmed = content.trim();
  if (trimmed.length === 0 || trimmed.length > 1000) {
    return NextResponse.json({ error: "Content must be 1-1000 characters" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("username, avatar_url")
    .eq("user_id", user.id)
    .maybeSingle();

  const authorName = getDisplayName(profile?.username ?? null);
  const authorAvatar = profile?.avatar_url ?? null;

  const { data, error } = await supabase
    .from("article_comments")
    .insert({
      user_id: user.id,
      article_url: canonicalizeArticleUrl(url),
      content: trimmed,
      author_name: authorName,
      author_avatar: authorAvatar,
      ...(parentId ? { parent_id: parentId } : {}),
      ...(replyToName ? { reply_to_name: replyToName } : {}),
    })
    .select("id, content, parent_id, reply_to_name, created_at")
    .single();

  if (error) {
    console.error("[comments]", error.message);
    return NextResponse.json({ error: "Comments are unavailable right now" }, { status: 500 });
  }

  return NextResponse.json({
    comment: {
      id: data.id,
      userId: user.id,
      content: data.content,
      createdAt: data.created_at,
      updatedAt: data.created_at,
      username: authorName,
      avatarUrl: authorAvatar,
      parentId: data.parent_id || null,
      replyToName: data.reply_to_name || null,
    },
  });
}

// DELETE /api/news/comments?id=... — delete own comment
export async function DELETE(req: NextRequest) {
  const commentId = req.nextUrl.searchParams.get("id");
  if (!commentId) {
    return NextResponse.json({ error: "Missing id param" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // RLS ensures user can only delete own comments
  const { error } = await supabase
    .from("article_comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[comments]", error.message);
    return NextResponse.json({ error: "Comments are unavailable right now" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
