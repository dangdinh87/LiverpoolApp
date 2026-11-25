import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { resetRateLimitStore } from "@/lib/rate-limit";

const generateTextMock = vi.fn();
const hasAnyAiProviderMock = vi.fn();
const getModelChainMock = vi.fn();
const resolveModelAttemptsMock = vi.fn();

let mockArticleRow: {
  title_vi: string | null;
  snippet_vi: string | null;
  content_vi: { description?: string | null; paragraphs?: string[] } | null;
  content_en: { title: string; description?: string | null; paragraphs: string[] } | null;
} | null = null;

vi.mock("ai", () => ({
  generateText: (...args: unknown[]) => generateTextMock(...args),
}));

vi.mock("@/lib/ai/model-settings", () => ({
  getModelChain: (...args: unknown[]) => getModelChainMock(...args),
}));

vi.mock("@/lib/ai/providers", () => ({
  hasAnyAiProvider: () => hasAnyAiProviderMock(),
  resolveModelAttempts: (...args: unknown[]) => resolveModelAttemptsMock(...args),
}));

vi.mock("@/lib/news", () => ({
  scrapeArticle: vi.fn(async () => null),
}));

vi.mock("@/lib/news/supabase-service", () => ({
  getServiceClient: () => ({
    from: () => ({
      select: () => ({
        in: () => ({
          order: () => ({
            limit: () => ({
              maybeSingle: async () => ({ data: mockArticleRow, error: null }),
            }),
          }),
        }),
      }),
      update: () => ({
        in: async () => ({ error: null }),
      }),
    }),
  }),
}));

function makeTranslateReq(
  url: string,
  opts: { origin?: string; referer?: string; ip?: string } = {},
) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    host: "localhost:3000",
    "cf-connecting-ip": opts.ip ?? "203.0.113.10",
  };
  if (opts.origin) headers.origin = opts.origin;
  if (opts.referer) headers.referer = opts.referer;
  return new NextRequest("http://localhost:3000/api/news/translate", {
    method: "POST",
    headers,
    body: JSON.stringify({ url }),
  });
}

beforeEach(() => {
  resetRateLimitStore();
  generateTextMock.mockReset();
  hasAnyAiProviderMock.mockReset();
  getModelChainMock.mockReset();
  resolveModelAttemptsMock.mockReset();

  hasAnyAiProviderMock.mockReturnValue(true);
  getModelChainMock.mockResolvedValue(["gemini-2.5-flash"]);
  resolveModelAttemptsMock.mockReturnValue([
    { model: { modelId: "gemini-2.5-flash" }, modelId: "gemini-2.5-flash", viaGateway: false },
  ]);
  generateTextMock.mockResolvedValue({
    text: "Tiêu đề dịch\n|||\nĐoạn dịch đầu tiên.",
  });
  mockArticleRow = {
    title_vi: null,
    snippet_vi: null,
    content_vi: null,
    content_en: {
      title: "Liverpool prepare for Anfield night",
      paragraphs: ["Liverpool trained at Kirkby ahead of the midweek tie."],
    },
  };
});

describe("POST /api/news/translate", () => {
  it("blocks cross-origin and cross-referer requests with 403 while allowing same-origin", async () => {
    const { POST } = await import("../route");
    const articleUrl = "https://www.bbc.com/sport/football/articles/c1";

    expect(
      (await POST(makeTranslateReq(articleUrl, { origin: "https://evil.example" }))).status,
    ).toBe(403);
    expect(
      (await POST(makeTranslateReq(articleUrl, { referer: "https://evil.example/read" }))).status,
    ).toBe(403);

    const ok = await POST(makeTranslateReq(articleUrl, { origin: "http://localhost:3000" }));
    expect(ok.status).toBe(200);
  });

  it("serves cached DB translations without consuming rate limit quota", async () => {
    const { POST } = await import("../route");
    mockArticleRow = {
      title_vi: "Tiêu đề sẵn có",
      snippet_vi: "Đoạn sẵn có",
      content_vi: { paragraphs: ["Nội dung đã dịch sẵn."] },
      content_en: null,
    };

    for (let i = 0; i < 6; i++) {
      const res = await POST(
        makeTranslateReq(`https://www.bbc.com/sport/football/articles/cached-${i}`),
      );
      expect(res.status).toBe(200);
      expect((await res.json()).cached).toBe(true);
    }
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("enforces 3/min per-IP burst and 30/min global cap with Retry-After", async () => {
    const { POST } = await import("../route");

    for (let i = 1; i <= 3; i++) {
      const ok = await POST(
        makeTranslateReq(`https://www.bbc.com/sport/football/articles/ip-${i}`, {
          ip: "198.51.100.8",
        }),
      );
      expect(ok.status).toBe(200);
    }

    const ipLimited = await POST(
      makeTranslateReq("https://www.bbc.com/sport/football/articles/ip-4", {
        ip: "198.51.100.8",
      }),
    );
    expect(ipLimited.status).toBe(429);
    expect(ipLimited.headers.get("Retry-After")).toBe("60");

    // Global cap 30/min across distinct IPs
    resetRateLimitStore();
    for (let i = 0; i < 30; i++) {
      const ok = await POST(
        makeTranslateReq(`https://www.bbc.com/sport/football/articles/global-${i}`, {
          ip: `198.51.102.${i}`,
        }),
      );
      expect(ok.status).toBe(200);
    }
    const globalLimited = await POST(
      makeTranslateReq("https://www.bbc.com/sport/football/articles/global-overflow", {
        ip: "198.51.103.1",
      }),
    );
    expect(globalLimited.status).toBe(429);
    expect(globalLimited.headers.get("Retry-After")).toBe("60");
  });
});
