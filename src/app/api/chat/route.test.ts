import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { POST } from "./route";
import { DEFAULT_CHAT_AI_MODEL } from "@/config/constants";

vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("@/lib/prompts/bro-ai-system", () => ({
  BRO_AI_SYSTEM_PROMPT: "You are a test assistant.",
}));

vi.mock("ai", () => ({
  createUIMessageStream: vi.fn((config: any) => {
    if (config && config.execute) {
      config.execute({
        writer: { write: vi.fn() },
      });
    }
    return {};
  }),
  createUIMessageStreamResponse: vi.fn(
    () => new Response("Stream started", { status: 200 })
  ),
}));

import { createServerSupabaseClient } from "@/lib/supabase-server";

// Mock global fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: vi.fn().mockResolvedValue({
      choices: [{ message: { content: "Test Title" } }],
    }),
    body: {
      getReader: () => ({
        read: vi.fn().mockResolvedValue({ done: true, value: new Uint8Array() }),
      }),
    },
  })
) as Mock;

describe("Chat API Route Security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MEGALLM_API_KEY = "test-key";
  });

  it("should return 401 if user is not authenticated", async () => {
    (createServerSupabaseClient as Mock).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new Error("No session"),
        }),
      },
    });

    const req = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should return 400 if messages is not an array", async () => {
    (createServerSupabaseClient as Mock).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "test-user" } },
          error: null,
        }),
      },
    });

    const req = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: "invalid" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  describe("Model Validation", () => {
    beforeEach(() => {
      (createServerSupabaseClient as Mock).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "test-user" } },
            error: null,
          }),
        },
        from: vi.fn(() => ({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: "conv-id" },
                error: null,
              }),
            }),
          }),
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: "conv-id" },
              error: null,
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        })),
      });
    });

    it("should use default model when invalid model is provided", async () => {
      const req = new Request("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hello" }],
          model: "invalid-model-v1",
        }),
      });

      await POST(req);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("megallm.io"),
        expect.objectContaining({
          body: expect.stringContaining(DEFAULT_CHAT_AI_MODEL),
        })
      );
    });

    it("should accept valid model", async () => {
      const req = new Request("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hello" }],
          model: DEFAULT_CHAT_AI_MODEL,
        }),
      });

      await POST(req);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("megallm.io"),
        expect.objectContaining({
          body: expect.stringContaining(DEFAULT_CHAT_AI_MODEL),
        })
      );
    });
  });
});
