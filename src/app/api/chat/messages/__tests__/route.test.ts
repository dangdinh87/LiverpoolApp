import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { resetRateLimitStore } from "@/lib/rate-limit";

const cookieJar = new Map<string, string>();
const cookieSetLog: Array<{ name: string; value: string; options?: Record<string, unknown> }> = [];
let storedPosts: Array<Record<string, unknown>> = [];
let fallbackStoredPosts: Array<Record<string, unknown>> = [];
let forumTableError: { code?: string; message?: string } | null = null;
let fallbackReadError: { message: string } | null = null;
let forumQueryCount = 0;

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    getAll: () => [...cookieJar.entries()].map(([name, value]) => ({ name, value })),
    get: (name: string) => {
      const value = cookieJar.get(name);
      return value !== undefined ? { name, value } : undefined;
    },
    set: (name: string, value: string, options?: Record<string, unknown>) => {
      cookieSetLog.push({ name, value, options });
      if (options?.maxAge === 0) {
        cookieJar.delete(name);
      } else {
        cookieJar.set(name, value);
      }
    },
  })),
}));

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  unstable_cache: (fn: unknown) => fn,
}));

const revalidateLocalizedPathMock = vi.fn();
vi.mock("@/i18n/revalidate", () => ({
  revalidateLocalizedPath: (...args: unknown[]) => revalidateLocalizedPathMock(...args),
}));

vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: async () => ({ data: { user: null } }) },
  })),
}));

vi.mock("@/lib/news/supabase-service", () => ({
  getServiceClient: () => ({
    from: (table: string) => {
      if (table === "forum_posts") {
        forumQueryCount += 1;
        if (forumTableError) {
          const err = forumTableError;
          return {
            select: () => ({
              order: () => ({
                limit: () => ({
                  eq: async () => ({ data: null, error: err }),
                  then: (resolve: (v: { data: null; error: typeof err }) => void) =>
                    resolve({ data: null, error: err }),
                }),
              }),
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: err }),
              }),
            }),
            insert: () => ({
              select: () => ({
                single: async () => ({ data: null, error: err }),
              }),
            }),
            delete: () => ({
              eq: async () => ({ error: err }),
            }),
          };
        }
        return {
          select: () => ({
            order: () => ({
              limit: () => ({
                eq: async (_col: string, val: string) => ({
                  data: storedPosts.filter((p) => p.room === val),
                  error: null,
                }),
                then: (resolve: (v: { data: unknown[]; error: null }) => void) =>
                  resolve({ data: storedPosts, error: null }),
              }),
            }),
            eq: (_col: string, val: string) => ({
              maybeSingle: async () => ({
                data: storedPosts.find((p) => p.id === val) ?? null,
                error: null,
              }),
            }),
          }),
          insert: (row: Record<string, unknown>) => ({
            select: () => ({
              single: async () => {
                const created = {
                  ...row,
                  id: `11111111-1111-4111-8111-${String(storedPosts.length + 1).padStart(12, "0")}`,
                  created_at: new Date().toISOString(),
                };
                storedPosts = [created, ...storedPosts];
                return { data: created, error: null };
              },
            }),
          }),
          delete: () => ({
            eq: async (_col: string, val: string) => {
              storedPosts = storedPosts.filter((p) => p.id !== val && p.parent_id !== val);
              return { error: null };
            },
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () =>
              fallbackReadError
                ? { data: null, error: fallbackReadError }
                : { data: { value: fallbackStoredPosts }, error: null },
          }),
        }),
        upsert: async (row: { value?: Array<Record<string, unknown>> }) => {
          fallbackStoredPosts = Array.isArray(row.value) ? row.value : [];
          return { error: null };
        },
      };
    },
  }),
}));

function makePostReq(body: Record<string, unknown>, ip = "203.0.113.10") {
  return new NextRequest("http://localhost:3000/api/chat/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      host: "localhost:3000",
      origin: "http://localhost:3000",
      "cf-connecting-ip": ip,
    },
    body: JSON.stringify(body),
  });
}

beforeEach(async () => {
  cookieJar.clear();
  cookieSetLog.length = 0;
  storedPosts = [];
  fallbackStoredPosts = [];
  forumTableError = null;
  fallbackReadError = null;
  forumQueryCount = 0;
  resetRateLimitStore();
  revalidateLocalizedPathMock.mockReset();
  const { resetChatPresence } = await import("@/lib/community/chat-db");
  resetChatPresence();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("/api/chat/messages", () => {
  it("allows guests to post, reply, list with onlineCount, and delete without ISR path revalidation", async () => {
    vi.useFakeTimers();
    const { GET, POST, DELETE } = await import("../route");

    const postRes = await POST(
      makePostReq({ displayName: "Minh Kop", content: "Liverpool 2-0 tonight" }),
    );
    expect(postRes.status).toBe(201);
    const { message } = await postRes.json();
    expect(message.room).toBe("general");
    expect(message.authorName).toBe("Minh Kop");
    expect(message.isMember).toBe(false);
    expect(message.isOwn).toBe(true);
    expect(message.canDelete).toBe(true);
    expect(cookieJar.has("ad_guest_token")).toBe(true);

    // Advance past 4s actor slowmode before replying as the same guest
    vi.advanceTimersByTime(4_100);
    const replyRes = await POST(
      makePostReq({
        room: "transfers",
        content: "Clean sheet incoming too",
        parentId: message.id,
        replyToName: "Minh Kop",
      }),
    );
    expect(replyRes.status).toBe(201);
    const { message: reply } = await replyRes.json();
    expect(reply.parentId).toBe(message.id);
    expect(reply.room).toBe("general");

    // GET defaults to room=general, hides internal authorId, resolves isOwn, and reports onlineCount >= 1
    const defaultGetRes = await GET(new NextRequest("http://localhost:3000/api/chat/messages"));
    expect(defaultGetRes.status).toBe(200);
    const defaultGetPayload = await defaultGetRes.json();
    expect(defaultGetPayload.messages).toHaveLength(2);
    expect(defaultGetPayload.onlineCount).toBeGreaterThanOrEqual(1);

    const getRes = await GET(new NextRequest("http://localhost:3000/api/chat/messages?room=all"));
    expect(getRes.status).toBe(200);
    const getPayload = await getRes.json();
    expect(getPayload.messages).toHaveLength(2);
    expect(getPayload.onlineCount).toBeGreaterThanOrEqual(1);
    expect(getPayload.messages[0]).not.toHaveProperty("authorId");

    // Another visitor without the matching cookie cannot delete Minh Kop's post
    const originalToken = cookieJar.get("ad_guest_token")!;
    cookieJar.set("ad_guest_token", "f".repeat(64));
    const forbiddenDel = await DELETE(
      new NextRequest(`http://localhost:3000/api/chat/messages?id=${message.id}`, { method: "DELETE" }),
    );
    expect(forbiddenDel.status).toBe(403);

    // Original guest can delete their own post
    cookieJar.set("ad_guest_token", originalToken);
    const okDel = await DELETE(
      new NextRequest(`http://localhost:3000/api/chat/messages?id=${message.id}`, { method: "DELETE" }),
    );
    expect(okDel.status).toBe(200);
    expect(storedPosts).toHaveLength(0);
    expect(revalidateLocalizedPathMock).not.toHaveBeenCalled();
  });

  it("clears ad_display_name and falls back to Fan XXXX when guest sends empty/whitespace displayName", async () => {
    vi.useFakeTimers();
    const { POST } = await import("../route");

    const first = await POST(
      makePostReq({ displayName: "Định Test", content: "First message with custom name" }),
    );
    expect(first.status).toBe(201);
    expect((await first.json()).message.authorName).toBe("Định Test");
    expect(cookieJar.has("ad_display_name")).toBe(true);
    const token = cookieJar.get("ad_guest_token");

    // Omitting displayName preserves saved cookie name
    vi.advanceTimersByTime(4_100);
    const second = await POST(makePostReq({ content: "Second message omitting displayName" }));
    expect(second.status).toBe(201);
    expect((await second.json()).message.authorName).toBe("Định Test");

    // Clearing displayName to "" or whitespace expires ad_display_name cookie and renders Fan XXXX
    vi.advanceTimersByTime(4_100);
    cookieSetLog.length = 0;
    const third = await POST(
      makePostReq({ displayName: "   ", content: "Third message after clearing name" }),
    );
    expect(third.status).toBe(201);
    const thirdPayload = await third.json();
    expect(thirdPayload.message.authorName).toMatch(/^Fan [0-9A-F]{4}$/);
    expect(cookieJar.get("ad_guest_token")).toBe(token);
    expect(cookieJar.has("ad_display_name")).toBe(false);
    expect(cookieSetLog).toContainEqual(
      expect.objectContaining({
        name: "ad_display_name",
        value: "",
        options: expect.objectContaining({ maxAge: 0 }),
      }),
    );
  });

  it("enforces 300-char max length, 3-line-break max, anti-spam filters, and 15m/3m duplicate checks", async () => {
    vi.useFakeTimers();
    const { POST } = await import("../route");

    const xssOrigin = await POST(
      new NextRequest("http://localhost:3000/api/chat/messages", {
        method: "POST",
        headers: { host: "localhost:3000", origin: "https://evil.example" },
        body: JSON.stringify({ content: "Hello" }),
      }),
    );
    expect(xssOrigin.status).toBe(403);

    expect((await POST(makePostReq({ content: "a" }))).status).toBe(400);

    const tooLong = await POST(makePostReq({ content: "x".repeat(301) }));
    expect(tooLong.status).toBe(400);
    expect((await tooLong.json()).error).toBe("invalid_length");

    const tooManyLines = await POST(makePostReq({ content: "a\nb\nc\nd\ne" }));
    expect(tooManyLines.status).toBe(400);
    expect((await tooManyLines.json()).error).toBe("spam");

    const spamLinks = await POST(makePostReq({ content: "Check https://a.com" }));
    expect(spamLinks.status).toBe(400);
    expect((await spamLinks.json()).error).toBe("spam");

    const profanity = await POST(makePostReq({ content: "đá ngu v.c.l vậy" }));
    expect(profanity.status).toBe(400);
    expect((await profanity.json()).error).toBe("profanity");

    const casino = await POST(makePostReq({ content: "Vào kubet nhận code nhé" }));
    expect(casino.status).toBe(400);
    expect((await casino.json()).error).toBe("spam");

    const honeypot = await POST(
      makePostReq({ content: "Nice match today", website: "https://bot.example" }),
    );
    expect(honeypot.status).toBe(400);
    expect((await honeypot.json()).error).toBe("spam");

    const badName = await POST(
      makePostReq({ displayName: "óc chó", content: "Liverpool win" }),
    );
    expect(badName.status).toBe(400);
    expect((await badName.json()).error).toBe("profanity_name");

    // Post once, wait 11m (still < 15m), verify same-actor duplicate returns 409
    expect((await POST(makePostReq({ content: "YNWA tonight lads" }))).status).toBe(201);
    vi.advanceTimersByTime(11 * 60_000);
    const sameActorDup = await POST(makePostReq({ content: "ynwa tonight lads!" }));
    expect(sameActorDup.status).toBe(409);
    expect((await sameActorDup.json()).error).toBe("duplicate");

    // Different guest within 3m repeating >= 8-char message triggers global duplicate 409
    cookieJar.clear();
    expect((await POST(makePostReq({ content: "Anfield roars tonight" }, "198.51.100.21"))).status).toBe(201);
    vi.advanceTimersByTime(2 * 60_000);
    cookieJar.clear();
    const globalDup = await POST(makePostReq({ content: "Anfield roars tonight" }, "198.51.100.22"));
    expect(globalDup.status).toBe(409);
    expect((await globalDup.json()).error).toBe("duplicate");
  });

  it("enforces 4s actor slowmode, 2/5s IP burst, 4/min guest cap, and 60/min global cap with Retry-After", async () => {
    vi.useFakeTimers();
    const { POST } = await import("../route");

    // 1st post passes; 2nd post within 4s from same actor triggers 4s slowmode
    expect((await POST(makePostReq({ content: "First rapid post" }, "198.51.100.1"))).status).toBe(
      201,
    );
    const slowmode = await POST(makePostReq({ content: "Second rapid post" }, "198.51.100.1"));
    expect(slowmode.status).toBe(429);
    expect(slowmode.headers.get("Retry-After")).toBe("4");
    expect((await slowmode.json()).error).toBe("cooldown");

    // Two different actors on the same IP pass within 5s, 3rd triggers 2/5s IP burst
    cookieJar.clear();
    expect((await POST(makePostReq({ content: "Actor B post one" }, "198.51.100.2"))).status).toBe(
      201,
    );
    cookieJar.clear();
    expect((await POST(makePostReq({ content: "Actor C post two" }, "198.51.100.2"))).status).toBe(
      201,
    );
    cookieJar.clear();
    const ipBurst = await POST(makePostReq({ content: "Actor D post three" }, "198.51.100.2"));
    expect(ipBurst.status).toBe(429);
    expect(ipBurst.headers.get("Retry-After")).toBe("5");

    // Guest per-minute cap: 4/min allowed when spacing past 4s slowmode, 5th returns 429
    cookieJar.clear();
    for (let i = 1; i <= 4; i++) {
      const ok = await POST(makePostReq({ content: `Guest min message ${i}` }, "198.51.100.3"));
      expect(ok.status).toBe(201);
      vi.advanceTimersByTime(4_100);
    }
    const minLimited = await POST(
      makePostReq({ content: "Guest min message 5" }, "198.51.100.3"),
    );
    expect(minLimited.status).toBe(429);
    expect(minLimited.headers.get("Retry-After")).toBe("60");
    expect((await minLimited.json()).error).toBe("rate_limited");

    // Global cap: 60/min across all IPs (already 7 successful posts so far, add 53 more = 60, then 61st hits 429)
    resetRateLimitStore();
    for (let i = 0; i < 60; i++) {
      cookieJar.clear();
      const ok = await POST(
        makePostReq({ content: `Global burst check ${i}` }, `198.51.101.${i}`),
      );
      expect(ok.status).toBe(201);
    }
    cookieJar.clear();
    const globalLimited = await POST(
      makePostReq({ content: "Global burst overflow" }, "198.51.102.99"),
    );
    expect(globalLimited.status).toBe(429);
    expect(globalLimited.headers.get("Retry-After")).toBe("60");
  });

  it("returns 503 on cold DB failure and serves stale cached messages when warm DB throws", async () => {
    vi.useFakeTimers();
    const { GET, POST } = await import("../route");

    forumTableError = { message: "upstream timeout" };
    const coldFail = await GET(new NextRequest("http://localhost:3000/api/chat/messages?room=general"));
    expect(coldFail.status).toBe(503);

    // Recover and warm cache via POST + GET
    forumTableError = null;
    expect((await POST(makePostReq({ content: "Up the Reds!" }, "198.51.100.55"))).status).toBe(201);

    // Move past 3s read cache TTL, then inject a DB failure: GET must serve stale cache (200) instead of []
    vi.advanceTimersByTime(3_500);
    forumTableError = { message: "transient outage" };
    const staleRes = await GET(new NextRequest("http://localhost:3000/api/chat/messages?room=general"));
    expect(staleRes.status).toBe(200);
    const staleBody = await staleRes.json();
    expect(staleBody.messages).toHaveLength(1);
    expect(staleBody.messages[0].content).toBe("Up the Reds!");
  });

  it("caches missing forum_posts (PGRST205) so subsequent GET/POST fall back to site_settings without re-querying forum_posts", async () => {
    vi.useFakeTimers();
    const { GET, POST } = await import("../route");

    forumTableError = { code: "PGRST205", message: "Could not find table forum_posts" };
    const firstPost = await POST(makePostReq({ content: "Fallback chat test" }, "198.51.100.77"));
    expect(firstPost.status).toBe(201);
    const queriesAfterFirst = forumQueryCount;
    expect(queriesAfterFirst).toBeGreaterThan(0);

    // Next GET after cache TTL and next POST after slowmode must skip forum_posts completely
    vi.advanceTimersByTime(4_200);
    const getRes = await GET(new NextRequest("http://localhost:3000/api/chat/messages?room=general"));
    expect(getRes.status).toBe(200);
    expect((await getRes.json()).messages[0].content).toBe("Fallback chat test");

    const secondPost = await POST(makePostReq({ content: "Fallback chat second" }, "198.51.100.77"));
    expect(secondPost.status).toBe(201);
    expect(forumQueryCount).toBe(queriesAfterFirst);
  });
});
