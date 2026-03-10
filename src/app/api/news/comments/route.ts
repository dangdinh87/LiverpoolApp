import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

// GET /api/news/comments?url=... — list comments for an article
export async function GET(req: NextRequest) {
  const articleUrl = req.nextUrl.searchParams.get("url");
  if (!articleUrl) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("article_comments")
    .select("id, user_id, content, author_name, author_avatar, created_at, updated_at")
    .eq("article_url", articleUrl)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const comments = (data ?? []).map((c) => ({
    id: c.id,
    userId: c.user_id,
    content: c.content,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    username: c.author_name || "Fan",
    avatarUrl: c.author_avatar || null,
  }));

  return NextResponse.json({ comments });
}

// Derive display name: username > full email > "Fan"
function getDisplayName(username: string | null, email: string | null): string {
  if (username) return username;
  if (email) return email;
  return "Fan";
}

// POST /api/news/comments — create a comment
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { url, content } = body;

  if (!url || !content) {
    return NextResponse.json({ error: "Missing url or content" }, { status: 400 });
  }

  const trimmed = content.trim();
  if (trimmed.length === 0 || trimmed.length > 1000) {
    return NextResponse.json({ error: "Content must be 1-1000 characters" }, { status: 400 });
  }

  // Get profile for author info (fallback to email)
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("username, avatar_url")
    .eq("user_id", user.id)
    .maybeSingle();

  const authorName = getDisplayName(profile?.username ?? null, user.email ?? null);
  const authorAvatar = profile?.avatar_url ?? null;

  const { data, error } = await supabase
    .from("article_comments")
    .insert({
      user_id: user.id,
      article_url: url,
      content: trimmed,
      author_name: authorName,
      author_avatar: authorAvatar,
    })
    .select("id, content, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
