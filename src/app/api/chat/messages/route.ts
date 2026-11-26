import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  CHAT_ROOMS,
  createChatPost,
  deleteChatPost,
  getOnlineChatCount,
  isChatRoom,
  listStoredChatMessages,
  recordChatPresence,
  toChatMessageDTO,
  type ChatRoomFilter,
} from "@/lib/community/chat-db";
import { ensureWritableActor, readCurrentActor, sanitizeDisplayName } from "@/lib/community/guest-identity";
import {
  moderateDisplayName,
  moderateMessageContent,
  normalizeSpamFingerprint,
} from "@/lib/community/moderation";
import { isSameOriginRequest } from "@/lib/http-origin";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CHAT_MAX_LEN = 300;
const CHAT_MAX_LINE_BREAKS = 3;

const postSchema = z.object({
  room: z.enum(CHAT_ROOMS).optional(),
  content: z.string().max(1_500),
  displayName: z.string().max(40).optional(),
  parentId: z.string().uuid().optional().nullable(),
  replyToName: z.string().max(40).optional().nullable(),
  // Hidden honeypot field: automated bots often fill every text field.
  website: z.string().max(200).optional(),
});

function rateLimitResponse(error: "cooldown" | "rate_limited", retryAfterSec: number) {
  return NextResponse.json(
    { error },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec),
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function GET(req: NextRequest) {
  const rawRoom = req.nextUrl.searchParams.get("room") ?? "general";
  const room: ChatRoomFilter =
    rawRoom === "all" || isChatRoom(rawRoom) ? rawRoom : "general";
  const rawLimit = Number(req.nextUrl.searchParams.get("limit") ?? "80");
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), 150) : 80;

  try {
    const [actor, posts] = await Promise.all([
      readCurrentActor(),
      listStoredChatMessages({ room, limit, throwOnError: true }),
    ]);

    recordChatPresence(actor?.actorId ?? getClientIP(req));

    const viewerRef = actor ? { actorId: actor.actorId, isAdmin: actor.isAdmin } : null;
    const messages = posts.map((post) => toChatMessageDTO(post, viewerRef));

    return NextResponse.json(
      {
        messages,
        onlineCount: getOnlineChatCount(),
        viewer: {
          signedIn: Boolean(actor?.isMember),
          username: actor?.username ?? null,
          avatarUrl: actor?.avatarUrl ?? null,
        },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (err) {
    console.error("[chat] GET failed:", err);
    return NextResponse.json(
      { error: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parsed = postSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  if (parsed.data.website && parsed.data.website.trim().length > 0) {
    return NextResponse.json({ error: "spam" }, { status: 400 });
  }

  const nameCheck = moderateDisplayName(parsed.data.displayName);
  if (!nameCheck.ok) {
    return NextResponse.json(
      { error: nameCheck.reason === "profanity" ? "profanity_name" : "spam" },
      { status: 400 },
    );
  }

  const ip = getClientIP(req);
  // Broad IP ceiling prevents abusive bots even when submitting rejected payloads.
  if (!checkRateLimit(`chat:abuse-ip:${ip}`, 40, 60_000).allowed) {
    return rateLimitResponse("rate_limited", 60);
  }
  if (!checkRateLimit("chat:global:min", 60, 60_000).allowed) {
    return rateLimitResponse("rate_limited", 60);
  }

  try {
    const existingActor = await readCurrentActor();

    // Validate & filter message content before mutating guest cookies or burst quota.
    const mod = moderateMessageContent(parsed.data.content, {
      allowLinks: Boolean(existingActor?.isMember),
      maxLen: CHAT_MAX_LEN,
      maxLineBreaks: CHAT_MAX_LINE_BREAKS,
    });
    if (!mod.ok) {
      return NextResponse.json({ error: mod.reason }, { status: 400 });
    }

    const clearedDisplayName =
      typeof parsed.data.displayName === "string" && parsed.data.displayName.trim() === "";
    const actor = await ensureWritableActor(
      clearedDisplayName ? "" : (nameCheck.name ?? undefined),
      existingActor,
    );

    // Multi-layer rate limits on both IP and actor UUID:
    // 1) 4s per-actor slowmode and 2/5s IP burst
    if (!checkRateLimit(`chat:slow-actor:${actor.actorId}`, 1, 4_000).allowed) {
      return rateLimitResponse("cooldown", 4);
    }
    if (!checkRateLimit(`chat:cd-ip:${ip}`, 2, 5_000).allowed) {
      return rateLimitResponse("cooldown", 5);
    }

    // 2) Sustained rate limits (tighter for guests than signed-in members)
    const minLimit = actor.isMember ? 6 : 4;
    const hrLimit = actor.isMember ? 35 : 20;
    const dayLimit = actor.isMember ? 120 : 60;
    const minOk =
      checkRateLimit(`chat:min-ip:${ip}`, minLimit, 60_000).allowed &&
      checkRateLimit(`chat:min-actor:${actor.actorId}`, minLimit, 60_000).allowed;
    if (!minOk) {
      return rateLimitResponse("rate_limited", 60);
    }
    const hrOk =
      checkRateLimit(`chat:hr-ip:${ip}`, hrLimit, 3_600_000).allowed &&
      checkRateLimit(`chat:hr-actor:${actor.actorId}`, hrLimit, 3_600_000).allowed;
    if (!hrOk) {
      return rateLimitResponse("rate_limited", 300);
    }
    const dayOk =
      checkRateLimit(`chat:day-ip:${ip}`, dayLimit, 86_400_000).allowed &&
      checkRateLimit(`chat:day-actor:${actor.actorId}`, dayLimit, 86_400_000).allowed;
    if (!dayOk) {
      return rateLimitResponse("rate_limited", 3_600);
    }

    // Near-duplicate check: own last 15m OR cross-actor copy-paste flood (>=8 chars) in last 3m.
    const recent = await listStoredChatMessages({ room: "all", limit: 50 });
    const nowMs = Date.now();
    for (const post of recent) {
      const fp = normalizeSpamFingerprint(post.content);
      if (!fp || fp !== mod.fingerprint) continue;
      const ageMs = nowMs - new Date(post.createdAt).getTime();
      if (post.authorId === actor.actorId && ageMs < 15 * 60_000) {
        return NextResponse.json({ error: "duplicate" }, { status: 409 });
      }
      if (mod.fingerprint.length >= 8 && ageMs < 3 * 60_000) {
        return NextResponse.json({ error: "duplicate" }, { status: 409 });
      }
    }

    const cleanReplyTo = sanitizeDisplayName(parsed.data.replyToName);
    const created = await createChatPost({
      room: parsed.data.room ?? "general",
      authorId: actor.actorId,
      isMember: actor.isMember,
      authorName: actor.username ?? "Fan",
      authorAvatar: actor.avatarUrl,
      content: mod.text,
      parentId: parsed.data.parentId ?? null,
      replyToName: cleanReplyTo,
    });

    if (!created.ok) {
      return NextResponse.json(
        { error: created.error },
        { status: created.error === "parent_not_found" ? 404 : 500 },
      );
    }

    const dto = toChatMessageDTO(created.post, {
      actorId: actor.actorId,
      isAdmin: actor.isAdmin,
    });

    return NextResponse.json(
      { message: dto },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[chat] POST failed:", err);
    return NextResponse.json({ error: "unavailable" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const ip = getClientIP(req);
  if (!checkRateLimit(`chat:del:${ip}`, 20, 60_000).allowed) {
    return rateLimitResponse("rate_limited", 60);
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  try {
    const actor = await readCurrentActor();
    if (!actor) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const res = await deleteChatPost({
      id,
      actorId: actor.actorId,
      isAdmin: actor.isAdmin,
    });

    if (!res.ok) {
      const status =
        res.error === "not_found" ? 404 : res.error === "forbidden" ? 403 : 500;
      return NextResponse.json({ error: res.error }, { status });
    }

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[chat] DELETE failed:", err);
    return NextResponse.json({ error: "unavailable" }, { status: 500 });
  }
}
