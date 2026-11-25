import { NextRequest, NextResponse } from "next/server";
import { moderateMessageContent } from "@/lib/community/moderation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { isKnownNewsSourceUrl } from "@/lib/news-config";
import { articleUrlVariants, canonicalizeArticleUrl } from "@/lib/news/url";
import { revalidateTag } from "next/cache";
import { encodeArticleSlug } from "@/lib/news-config";
import { revalidateLocalizedPath } from "@/i18n/revalidate";
import { ARTICLE_ENGAGEMENT_TAG } from "@/lib/news/engagement";

const MAX_URL_LEN = 2048;

// GET /api/news/comments?url=... — list comments for an article
export async function GET(req: NextRequest) {
  const articleUrl = req.nextUrl.searchParams.get("url");
  if (!articleUrl || articleUrl.length > MAX_URL_LEN) {
    return NextResponse.json({ error: "Missing or invalid url param" }, { status: 400 });
  }
  if (!isKnownNewsSourceUrl(articleUrl)) {
    return NextResponse.json({ error: "Unsupported article URL" }, { status: 400 });
  }

  try {
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

    return NextResponse.json({ comments }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    console.error("[comments] GET failed:", err);
    return NextResponse.json(
      { error: "Comments are unavailable right now" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
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

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const { url, content, parentId, replyToName } = body ?? {};

    if (typeof url !== "string" || url.length > MAX_URL_LEN || typeof content !== "string") {
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
    const cleanReplyTo = typeof replyToName === "string" ? replyToName.trim() : "";

    const mod = moderateMessageContent(content, { allowLinks: false, minLen: 1, maxLen: 1000 });
    if (!mod.ok) {
      if (mod.reason === "invalid_length") {
        return NextResponse.json({ error: "Content must be 1-1000 characters" }, { status: 400 });
      }
      return NextResponse.json({ error: mod.reason }, { status: 400 });
    }
    const trimmed = mod.text;

    if (!checkRateLimit(`comment:cd:${user.id}`, 2, 6_000).allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    if (parentId) {
      const { data: parentRow } = await supabase
        .from("article_comments")
        .select("id")
        .eq("id", parentId)
        .in("article_url", articleUrlVariants(url))
        .maybeSingle();
      if (!parentRow) {
        return NextResponse.json({ error: "Parent comment not found on this article" }, { status: 400 });
      }
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
        ...(cleanReplyTo ? { reply_to_name: cleanReplyTo } : {}),
      })
      .select("id, content, parent_id, reply_to_name, created_at")
      .single();

    if (error) {
      console.error("[comments]", error.message);
      return NextResponse.json({ error: "Comments are unavailable right now" }, { status: 500 });
    }

    // The article page renders the comment count and skips loading the list when
    // it is zero, so a first comment has to reach that HTML or it stays hidden
    // from everyone but its author until the page's ISR window expires.
    revalidateTag(ARTICLE_ENGAGEMENT_TAG, "max");
    revalidateLocalizedPath(`/news/${encodeArticleSlug(url)}`);

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
  } catch (err) {
    console.error("[comments] POST failed:", err);
    return NextResponse.json({ error: "Comments are unavailable right now" }, { status: 500 });
  }
}

// DELETE /api/news/comments?id=... — delete own comment
export async function DELETE(req: NextRequest) {
  const commentId = req.nextUrl.searchParams.get("id");
  if (!commentId || !UUID_RE.test(commentId)) {
    return NextResponse.json({ error: "Invalid id param" }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // RLS ensures user can only delete own comments
    const { data: deleted, error } = await supabase
      .from("article_comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", user.id)
      .select("article_url")
      .maybeSingle();

    if (error) {
      console.error("[comments]", error.message);
      return NextResponse.json({ error: "Comments are unavailable right now" }, { status: 500 });
    }

    // The count is cached for an hour; a deleted comment must leave it now.
    revalidateTag(ARTICLE_ENGAGEMENT_TAG, "max");
    if (deleted?.article_url) {
      revalidateLocalizedPath(`/news/${encodeArticleSlug(deleted.article_url)}`);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[comments] DELETE failed:", err);
    return NextResponse.json({ error: "Comments are unavailable right now" }, { status: 500 });
  }
}
