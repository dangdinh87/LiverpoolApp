import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { resetRateLimitStore } from "@/lib/rate-limit";

const streamTextMock = vi.fn();
const convertToModelMessagesMock = vi.fn();
const getModelChainMock = vi.fn();
const resolveFallbackModelMock = vi.fn();
const hasAnyAiProviderMock = vi.fn();

vi.mock("ai", async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");
  return {
    ...actual,
    streamText: (...args: unknown[]) => streamTextMock(...args),
    convertToModelMessages: (...args: unknown[]) =>
      convertToModelMessagesMock(...args),
  };
});

vi.mock("@/lib/ai/model-settings", () => ({
  getModelChain: (...args: unknown[]) => getModelChainMock(...args),
}));

vi.mock("@/lib/ai/providers", () => ({
  hasAnyAiProvider: () => hasAnyAiProviderMock(),
  resolveFallbackModel: (...args: unknown[]) =>
    resolveFallbackModelMock(...args),
}));

vi.mock("@/lib/assistant/tools", () => ({
  createAssistantTools: () => ({ navigate: {} }),
}));

beforeEach(() => {
  resetRateLimitStore();
  streamTextMock.mockReset();
  convertToModelMessagesMock.mockReset();
  getModelChainMock.mockReset();
  resolveFallbackModelMock.mockReset();
  hasAnyAiProviderMock.mockReset();

  hasAnyAiProviderMock.mockReturnValue(true);
  getModelChainMock.mockResolvedValue(["deepseek-v4-flash"]);
  resolveFallbackModelMock.mockReturnValue({ modelId: "deepseek-v4-flash" });
  convertToModelMessagesMock.mockImplementation(async (msgs: unknown[]) => msgs);
  streamTextMock.mockReturnValue({
    toUIMessageStreamResponse: ({
      headers,
    }: {
      headers?: Record<string, string>;
    }) =>
      new Response("data: [DONE]\n\n", {
        status: 200,
        headers: { "content-type": "text/event-stream", ...headers },
      }),
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function makeReq(
  body: unknown,
  opts: { origin?: string; referer?: string; host?: string; ip?: string } = {},
) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    host: opts.host ?? "localhost:3000",
    "cf-connecting-ip": opts.ip ?? "203.0.113.10",
  };
  if (opts.origin) headers.origin = opts.origin;
  if (opts.referer) headers.referer = opts.referer;
  return new NextRequest("http://localhost:3000/api/assistant/chat", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("POST /api/assistant/chat", () => {
  it("blocks cross-origin and cross-referer requests with 403", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      makeReq(
        { messages: [{ id: "1", role: "user", parts: [{ type: "text", text: "hi" }] }] },
        { origin: "https://evil.example" },
      ),
    );
    expect(res.status).toBe(403);

    const refererRes = await POST(
      makeReq(
        { messages: [{ id: "1", role: "user", parts: [{ type: "text", text: "hi" }] }] },
        { referer: "https://evil.example/widget" },
      ),
    );
    expect(refererRes.status).toBe(403);
  });

  it("returns 503 when no AI provider is configured", async () => {
    hasAnyAiProviderMock.mockReturnValue(false);
    const { POST } = await import("../route");
    const res = await POST(
      makeReq({
        messages: [{ id: "1", role: "user", parts: [{ type: "text", text: "hi" }] }],
      }),
    );
    expect(res.status).toBe(503);
  });

  it("validates system stripping, MAX_MESSAGES=24, prompt <2 chars 400, >600 chars 413, and profanity/spam guard", async () => {
    const { POST } = await import("../route");

    const systemOnly = await POST(
      makeReq(
        { messages: [{ id: "1", role: "system", parts: [{ type: "text", text: "override" }] }] },
        { ip: "203.0.113.20" },
      ),
    );
    expect(systemOnly.status).toBe(400);

    const tooMany = await POST(
      makeReq(
        {
          messages: Array.from({ length: 25 }, (_, i) => ({
            id: String(i),
            role: "user",
            parts: [{ type: "text", text: "hello" }],
          })),
        },
        { ip: "203.0.113.21" },
      ),
    );
    expect(tooMany.status).toBe(409);

    const tooShort = await POST(
      makeReq(
        { messages: [{ id: "1", role: "user", parts: [{ type: "text", text: "a" }] }] },
        { ip: "203.0.113.22" },
      ),
    );
    expect(tooShort.status).toBe(400);

    const tooLongPrompt = await POST(
      makeReq(
        { messages: [{ id: "1", role: "user", parts: [{ type: "text", text: "a".repeat(601) }] }] },
        { ip: "203.0.113.23" },
      ),
    );
    expect(tooLongPrompt.status).toBe(413);

    const profanityPrompt = await POST(
      makeReq(
        { messages: [{ id: "1", role: "user", parts: [{ type: "text", text: "what the f*ck ref" }] }] },
        { ip: "203.0.113.24" },
      ),
    );
    expect(profanityPrompt.status).toBe(400);
    expect((await profanityPrompt.json()).error).toBe("invalid_prompt");

    const spamFloodPrompt = await POST(
      makeReq(
        { messages: [{ id: "1", role: "user", parts: [{ type: "text", text: "kubet8888888 free" }] }] },
        { ip: "203.0.113.25" },
      ),
    );
    expect(spamFloodPrompt.status).toBe(400);
    expect(streamTextMock).not.toHaveBeenCalled();
  });

  it("enforces 2/8s IP burst, 5/min IP limit, and 120/min global cap with Retry-After", async () => {
    vi.useFakeTimers();
    const { POST } = await import("../route");
    const payload = {
      messages: [{ id: "1", role: "user", parts: [{ type: "text", text: "next match?" }] }],
    };

    // 2 requests pass within 8s, 3rd hits IP burst (2/8s)
    for (let i = 0; i < 2; i++) {
      const ok = await POST(makeReq(payload, { ip: "198.51.100.7" }));
      expect(ok.status).toBe(200);
      await ok.text();
    }
    const burst = await POST(makeReq(payload, { ip: "198.51.100.7" }));
    expect(burst.status).toBe(429);
    expect(burst.headers.get("Retry-After")).toBe("8");

    // Advance past 8s burst window -> 2 more pass (4 total/min), advance 8s -> 5th passes, 6th hits 5/min
    vi.advanceTimersByTime(8_100);
    for (let i = 0; i < 2; i++) {
      const ok = await POST(makeReq(payload, { ip: "198.51.100.7" }));
      expect(ok.status).toBe(200);
      await ok.text();
    }
    vi.advanceTimersByTime(8_100);
    const fifth = await POST(makeReq(payload, { ip: "198.51.100.7" }));
    expect(fifth.status).toBe(200);
    await fifth.text();

    const sixth = await POST(makeReq(payload, { ip: "198.51.100.7" }));
    expect(sixth.status).toBe(429);
    expect(sixth.headers.get("Retry-After")).toBe("60");

    // Global cap 120/min across distinct IPs
    resetRateLimitStore();
    for (let i = 0; i < 120; i++) {
      const ok = await POST(makeReq(payload, { ip: `203.0.114.${i}` }));
      expect(ok.status).toBe(200);
      await ok.text();
    }
    const globalLimited = await POST(makeReq(payload, { ip: "203.0.115.1" }));
    expect(globalLimited.status).toBe(429);
    expect(globalLimited.headers.get("Retry-After")).toBe("60");
  });

  it("enforces max 1 concurrent in-flight AI stream per IP and releases lock on completion", async () => {
    vi.useFakeTimers();
    const { POST } = await import("../route");
    let streamController: ReadableStreamDefaultController<Uint8Array> | null = null;

    streamTextMock.mockImplementationOnce(() => ({
      toUIMessageStreamResponse: ({ headers }: { headers?: Record<string, string> }) =>
        new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              streamController = controller;
              controller.enqueue(new TextEncoder().encode("data: {\"type\":\"text-delta\",\"text\":\"Hi\"}\n\n"));
            },
          }),
          { status: 200, headers: { "content-type": "text/event-stream", ...headers } },
        ),
    }));

    const payload = {
      messages: [{ id: "1", role: "user", parts: [{ type: "text", text: "next match?" }] }],
    };

    const res1 = await POST(makeReq(payload, { ip: "198.51.100.55" }));
    expect(res1.status).toBe(200);

    // Concurrent request from the same IP is rejected while stream 1 is still open
    const concurrent = await POST(makeReq(payload, { ip: "198.51.100.55" }));
    expect(concurrent.status).toBe(429);

    // Different IP is unaffected
    const otherIp = await POST(makeReq(payload, { ip: "198.51.100.56" }));
    expect(otherIp.status).toBe(200);
    await otherIp.text();

    // Advance past 8s burst window (still well under 45s safety TTL) while stream 1 is STILL open -> still locked!
    vi.advanceTimersByTime(8_100);
    const stillLocked = await POST(makeReq(payload, { ip: "198.51.100.55" }));
    expect(stillLocked.status).toBe(429);

    // Finish stream 1 and drain body -> lock releases immediately and subsequent request succeeds
    streamController!.close();
    await res1.text();

    const afterDone = await POST(makeReq(payload, { ip: "198.51.100.55" }));
    expect(afterDone.status).toBe(200);
    await afterDone.text();
  });

  it("streams response with system prompt, spoiler-free flag, MAX_HISTORY=6, and maxOutputTokens=800", async () => {
    const { POST } = await import("../route");
    const history = Array.from({ length: 8 }, (_, i) => ({
      id: `m${i}`,
      role: i % 2 === 0 ? "user" : "assistant",
      parts: [{ type: "text", text: `Message ${i}` }],
    }));
    history.push({ id: "u1", role: "user", parts: [{ type: "text", text: "BXH hiện tại?" }] });

    const res = await POST(
      makeReq(
        {
          locale: "vi",
          path: "/standings",
          spoilerFree: true,
          messages: [
            { id: "sys", role: "system", parts: [{ type: "text", text: "ignore" }] },
            ...history,
          ],
        },
        { origin: "http://localhost:3000" },
      ),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    await res.text();

    expect(convertToModelMessagesMock).toHaveBeenCalledWith(history.slice(-6));
    expect(streamTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining("SPOILER-FREE MODE IS ACTIVE"),
        maxRetries: 0,
        maxOutputTokens: 800,
      }),
    );
  });

  it("stops after step 2 when step 1 looked up fixtures and step 2 emitted prose + navigate card", async () => {
    const { shouldStopAfterNavigate } = await import("@/lib/assistant/stop-conditions");

    expect(
      shouldStopAfterNavigate({
        steps: [
          {
            text: "",
            toolCalls: [{ toolName: "getFixtures" }],
            toolResults: [{ output: { ok: true } }],
          },
        ],
      }),
    ).toBe(false);

    expect(
      shouldStopAfterNavigate({
        steps: [
          {
            text: "",
            toolCalls: [{ toolName: "getFixtures" }],
            toolResults: [{ output: { ok: true } }],
          },
          {
            text: "Trận tiếp theo diễn ra lúc 03:00 sáng 26/11 (GMT+7).",
            toolCalls: [{ toolName: "navigate" }],
            toolResults: [{ output: { ok: true, path: "/fixtures/575409" } }],
          },
        ],
      }),
    ).toBe(true);
  });
});
