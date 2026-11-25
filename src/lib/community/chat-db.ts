import "server-only";

import { unstable_cache } from "next/cache";
import { getServiceClient } from "@/lib/news/supabase-service";

export const CHAT_ROOMS = ["matchday", "transfers", "tactics", "general"] as const;
export type ChatRoom = (typeof CHAT_ROOMS)[number];
export type ChatRoomFilter = ChatRoom | "all";

export const CHAT_CACHE_TAG = "community-forum";
const FALLBACK_KEY = "community_forum_v1";
const MAX_FALLBACK_POSTS = 250;

const PRESENCE_TTL_MS = 45_000;
const MAX_PRESENCE_ENTRIES = 1_000;
// Bounded Map with lazy pruning only (no module-scope setInterval for Cloudflare Workers workerd).
const presenceMap = new Map<string, number>();

export interface StoredChatPost {
  id: string;
  room: ChatRoom;
  authorId: string;
  isMember: boolean;
  authorName: string;
  authorAvatar: string | null;
  content: string;
  parentId: string | null;
  replyToName: string | null;
  createdAt: string;
}

export interface ChatMessageDTO {
  id: string;
  room: ChatRoom;
  authorName: string;
  authorAvatar: string | null;
  isMember: boolean;
  content: string;
  parentId: string | null;
  replyToName: string | null;
  createdAt: string;
  isOwn: boolean;
  canDelete: boolean;
}

function prunePresence(now: number): void {
  for (const [key, lastSeen] of presenceMap) {
    if (now - lastSeen > PRESENCE_TTL_MS) {
      presenceMap.delete(key);
    }
  }
  while (presenceMap.size > MAX_PRESENCE_ENTRIES) {
    const oldestKey = presenceMap.keys().next().value;
    if (oldestKey === undefined) break;
    presenceMap.delete(oldestKey);
  }
}

export function recordChatPresence(viewerKey: string): void {
  if (!viewerKey) return;
  const now = Date.now();
  presenceMap.delete(viewerKey);
  presenceMap.set(viewerKey, now);
  if (presenceMap.size > MAX_PRESENCE_ENTRIES) {
    prunePresence(now);
  }
}

export function getOnlineChatCount(): number {
  prunePresence(Date.now());
  return presenceMap.size;
}

/** Test-only helper to clear in-memory presence entries between specs. */
export function resetChatPresence(): void {
  presenceMap.clear();
}

export function isChatRoom(value: unknown): value is ChatRoom {
  return typeof value === "string" && (CHAT_ROOMS as readonly string[]).includes(value);
}

function isMissingForumTableError(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  return (
    err.code === "PGRST205" ||
    err.code === "42P01" ||
    (typeof err.message === "string" && err.message.includes("forum_posts"))
  );
}

function mapRow(row: Record<string, unknown>): StoredChatPost | null {
  const id = typeof row.id === "string" ? row.id : null;
  const authorId =
    typeof row.author_id === "string"
      ? row.author_id
      : typeof row.authorId === "string"
        ? row.authorId
        : null;
  const authorName =
    typeof row.author_name === "string"
      ? row.author_name
      : typeof row.authorName === "string"
        ? row.authorName
        : null;
  const content = typeof row.content === "string" ? row.content : null;
  const createdAt =
    typeof row.created_at === "string"
      ? row.created_at
      : typeof row.createdAt === "string"
        ? row.createdAt
        : null;
  if (!id || !authorId || !authorName || !content || !createdAt) return null;

  const rawRoom = row.room;
  const room: ChatRoom = isChatRoom(rawRoom) ? rawRoom : "general";
  const parentId =
    typeof row.parent_id === "string"
      ? row.parent_id
      : typeof row.parentId === "string"
        ? row.parentId
        : null;
  const replyToName =
    typeof row.reply_to_name === "string"
      ? row.reply_to_name
      : typeof row.replyToName === "string"
        ? row.replyToName
        : null;
  const authorAvatar =
    typeof row.author_avatar === "string"
      ? row.author_avatar
      : typeof row.authorAvatar === "string"
        ? row.authorAvatar
        : null;

  return {
    id,
    room,
    authorId,
    isMember: Boolean(row.is_member ?? row.isMember),
    authorName,
    authorAvatar,
    content,
    parentId,
    replyToName,
    createdAt,
  };
}

export function toChatMessageDTO(
  post: StoredChatPost,
  viewer?: { actorId: string; isAdmin: boolean } | null,
): ChatMessageDTO {
  const isOwn = Boolean(viewer && post.authorId === viewer.actorId);
  const canDelete = Boolean(isOwn || viewer?.isAdmin);
  return {
    id: post.id,
    room: post.room,
    authorName: post.authorName,
    authorAvatar: post.authorAvatar,
    isMember: post.isMember,
    content: post.content,
    parentId: post.parentId,
    replyToName: post.replyToName,
    createdAt: post.createdAt,
    isOwn,
    canDelete,
  };
}

async function readFallbackPosts(): Promise<StoredChatPost[]> {
  try {
    const { data, error } = await getServiceClient()
      .from("site_settings")
      .select("value")
      .eq("key", FALLBACK_KEY)
      .maybeSingle();
    if (error || !data || !Array.isArray(data.value)) return [];
    const out: StoredChatPost[] = [];
    for (const item of data.value) {
      if (item && typeof item === "object") {
        const mapped = mapRow(item as Record<string, unknown>);
        if (mapped) out.push(mapped);
      }
    }
    return out;
  } catch {
    return [];
  }
}

async function writeFallbackPosts(posts: StoredChatPost[]): Promise<{ ok: boolean }> {
  try {
    const trimmed = [...posts]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, MAX_FALLBACK_POSTS);

    const { error } = await getServiceClient()
      .from("site_settings")
      .upsert(
        {
          key: FALLBACK_KEY,
          value: trimmed,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      );
    if (error) {
      console.error("[chat] fallback write failed:", error.message);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error("[chat] fallback write threw:", err);
    return { ok: false };
  }
}

export async function listStoredChatMessages(options?: {
  room?: ChatRoomFilter;
  limit?: number;
}): Promise<StoredChatPost[]> {
  const limit = Math.min(Math.max(options?.limit ?? 80, 1), 150);
  const room = options?.room && options.room !== "all" ? options.room : null;

  try {
    const db = getServiceClient();
    let query = db
      .from("forum_posts")
      .select("id, room, author_id, is_member, author_name, author_avatar, content, parent_id, reply_to_name, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (room) {
      query = query.eq("room", room);
    }

    const { data, error } = await query;
    if (error) {
      if (isMissingForumTableError(error)) {
        const fallback = await readFallbackPosts();
        const filtered = room ? fallback.filter((p) => p.room === room) : fallback;
        return filtered
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, limit);
      }
      console.error("[chat] list failed:", error.message);
      return [];
    }

    return (data ?? [])
      .map((row) => mapRow(row as Record<string, unknown>))
      .filter((p): p is StoredChatPost => p !== null);
  } catch (err) {
    console.error("[chat] list threw:", err);
    return [];
  }
}

export async function createChatPost(input: {
  room: ChatRoom;
  authorId: string;
  isMember: boolean;
  authorName: string;
  authorAvatar: string | null;
  content: string;
  parentId?: string | null;
  replyToName?: string | null;
}): Promise<{ ok: true; post: StoredChatPost } | { ok: false; error: "parent_not_found" | "unavailable" }> {
  const db = getServiceClient();

  try {
    let resolvedRoom: ChatRoom = input.room;
    let resolvedParentId: string | null = input.parentId ?? null;
    let resolvedReplyTo: string | null = input.replyToName ?? null;

    const insertRow = {
      room: resolvedRoom,
      author_id: input.authorId,
      is_member: input.isMember,
      author_name: input.authorName,
      author_avatar: input.authorAvatar,
      content: input.content,
      parent_id: resolvedParentId,
      reply_to_name: resolvedReplyTo,
    };

    if (resolvedParentId) {
      const { data: parent, error: parentErr } = await db
        .from("forum_posts")
        .select("id, room, author_name, parent_id")
        .eq("id", resolvedParentId)
        .maybeSingle();

      if (parentErr && isMissingForumTableError(parentErr)) {
        return createFallbackPost(input);
      }
      if (parentErr) {
        console.error("[chat] parent check failed:", parentErr.message);
        return { ok: false, error: "unavailable" };
      }
      if (!parent) {
        return { ok: false, error: "parent_not_found" };
      }
      resolvedRoom = isChatRoom(parent.room) ? parent.room : resolvedRoom;
      // Flatten deeper replies under the top-level root while preserving @replyToName.
      resolvedParentId = typeof parent.parent_id === "string" && parent.parent_id ? parent.parent_id : parent.id;
      resolvedReplyTo = resolvedReplyTo || (typeof parent.author_name === "string" ? parent.author_name : null);
      insertRow.room = resolvedRoom;
      insertRow.parent_id = resolvedParentId;
      insertRow.reply_to_name = resolvedReplyTo;
    }

    const { data, error } = await db
      .from("forum_posts")
      .insert(insertRow)
      .select("id, room, author_id, is_member, author_name, author_avatar, content, parent_id, reply_to_name, created_at")
      .single();

    if (error) {
      if (isMissingForumTableError(error)) {
        return createFallbackPost(input);
      }
      console.error("[chat] insert failed:", error.message);
      return { ok: false, error: "unavailable" };
    }

    const mapped = mapRow(data as Record<string, unknown>);
    if (!mapped) return { ok: false, error: "unavailable" };
    return { ok: true, post: mapped };
  } catch (err) {
    console.error("[chat] create threw:", err);
    return { ok: false, error: "unavailable" };
  }
}

async function createFallbackPost(input: {
  room: ChatRoom;
  authorId: string;
  isMember: boolean;
  authorName: string;
  authorAvatar: string | null;
  content: string;
  parentId?: string | null;
  replyToName?: string | null;
}): Promise<{ ok: true; post: StoredChatPost } | { ok: false; error: "parent_not_found" | "unavailable" }> {
  const posts = await readFallbackPosts();
  let resolvedRoom = input.room;
  let resolvedParentId = input.parentId ?? null;
  let resolvedReplyTo = input.replyToName ?? null;

  if (resolvedParentId) {
    const parent = posts.find((p) => p.id === resolvedParentId);
    if (!parent) return { ok: false, error: "parent_not_found" };
    resolvedRoom = parent.room;
    resolvedParentId = parent.parentId ?? parent.id;
    resolvedReplyTo = resolvedReplyTo || parent.authorName;
  }

  const post: StoredChatPost = {
    id: globalThis.crypto.randomUUID(),
    room: resolvedRoom,
    authorId: input.authorId,
    isMember: input.isMember,
    authorName: input.authorName,
    authorAvatar: input.authorAvatar,
    content: input.content,
    parentId: resolvedParentId,
    replyToName: resolvedReplyTo,
    createdAt: new Date().toISOString(),
  };

  const saved = await writeFallbackPosts([post, ...posts]);
  if (!saved.ok) return { ok: false, error: "unavailable" };
  return { ok: true, post };
}

export async function deleteChatPost(input: {
  id: string;
  actorId: string;
  isAdmin: boolean;
}): Promise<{ ok: true } | { ok: false; error: "not_found" | "forbidden" | "unavailable" }> {
  const db = getServiceClient();

  try {
    const { data: existing, error: readErr } = await db
      .from("forum_posts")
      .select("id, author_id")
      .eq("id", input.id)
      .maybeSingle();

    if (readErr) {
      if (isMissingForumTableError(readErr)) {
        return deleteFallbackPost(input);
      }
      console.error("[chat] delete read failed:", readErr.message);
      return { ok: false, error: "unavailable" };
    }

    if (!existing) return { ok: false, error: "not_found" };
    if (existing.author_id !== input.actorId && !input.isAdmin) {
      return { ok: false, error: "forbidden" };
    }

    const { error: delErr } = await db.from("forum_posts").delete().eq("id", input.id);
    if (delErr) {
      console.error("[chat] delete failed:", delErr.message);
      return { ok: false, error: "unavailable" };
    }
    return { ok: true };
  } catch (err) {
    console.error("[chat] delete threw:", err);
    return { ok: false, error: "unavailable" };
  }
}

async function deleteFallbackPost(input: {
  id: string;
  actorId: string;
  isAdmin: boolean;
}): Promise<{ ok: true } | { ok: false; error: "not_found" | "forbidden" | "unavailable" }> {
  const posts = await readFallbackPosts();
  const target = posts.find((p) => p.id === input.id);
  if (!target) return { ok: false, error: "not_found" };
  if (target.authorId !== input.actorId && !input.isAdmin) {
    return { ok: false, error: "forbidden" };
  }

  const next = posts.filter((p) => p.id !== input.id && p.parentId !== input.id);
  const saved = await writeFallbackPosts(next);
  if (!saved.ok) return { ok: false, error: "unavailable" };
  return { ok: true };
}

/**
 * Cached public snapshot of recent chat messages for ISR pages (/chat and /).
 * Returns anonymised DTOs (`isOwn: false, canDelete: false`) without reading cookies.
 */
export const getCachedRecentChatMessages = unstable_cache(
  async (limit: number = 80): Promise<ChatMessageDTO[]> => {
    const posts = await listStoredChatMessages({ room: "all", limit });
    return posts.map((post) => toChatMessageDTO(post, null));
  },
  ["community-chat-initial-v1"],
  { revalidate: 1800, tags: [CHAT_CACHE_TAG] },
);
