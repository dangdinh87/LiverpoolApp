import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

import { createServerSupabaseClient } from "@/lib/supabase-server";

describe("Chat Models API Route Security", () => {
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

    const res = await GET();
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json).toEqual({ error: "Unauthorized" });
  });

  it("should proceed if user is authenticated", async () => {
    (createServerSupabaseClient as Mock).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "test-user" } },
          error: null,
        }),
      },
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        object: "list",
        data: [
          {
            id: "gpt-4",
            object: "model",
            owned_by: "openai",
          },
        ],
      }),
    });

    const res = await GET();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toHaveProperty("models");
    expect(json.models.length).toBe(1);
    expect(json.models[0].id).toBe("gpt-4");
  });
});
