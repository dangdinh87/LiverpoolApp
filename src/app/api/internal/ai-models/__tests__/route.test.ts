import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const checkModelMock = vi.fn();
const getModelChainMock = vi.fn();
const saveModelChainMock = vi.fn();

vi.mock("@/lib/cron", () => ({
  withCronAuth: (fn: unknown) => fn,
}));
vi.mock("@/lib/ai/check-model", () => ({
  checkModel: (...args: unknown[]) => checkModelMock(...args),
}));
vi.mock("@/lib/ai/model-settings", () => ({
  getModelChain: (...args: unknown[]) => getModelChainMock(...args),
  saveModelChain: (...args: unknown[]) => saveModelChainMock(...args),
}));

beforeEach(() => {
  checkModelMock.mockReset();
  getModelChainMock.mockReset();
  saveModelChainMock.mockReset();
  getModelChainMock.mockImplementation(async (_slot: string, defaults: string[]) => defaults);
});

describe("/api/internal/ai-models", () => {
  it("GET returns slot metadata, active chains, provider status, and pricing", async () => {
    const { GET } = await import("../route");
    const res = await (GET as unknown as (req: NextRequest) => Promise<Response>)(
      new NextRequest("http://localhost/api/internal/ai-models"),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const json = (await res.json()) as {
      ok: boolean;
      slots: { slot: string; active: string[]; checks: string[] }[];
      providers: Record<string, boolean>;
      models: { id: string; priceCrPer1M: number }[];
    };
    expect(json.ok).toBe(true);
    expect(json.slots.map((s) => s.slot)).toEqual([
      "digest",
      "translate",
      "site_articles",
      "assistant",
    ]);
    expect(json.models.length).toBeGreaterThan(0);
    expect(json.providers).toHaveProperty("vietapi");
  });

  it("POST validates slot and model IDs and runs checks without saving by default", async () => {
    const { POST } = await import("../route");

    const badSlot = await (POST as unknown as (req: NextRequest) => Promise<Response>)(
      new NextRequest("http://localhost/api/internal/ai-models", {
        method: "POST",
        body: JSON.stringify({ slot: "unknown", models: ["deepseek-v4-flash"] }),
      }),
    );
    expect(badSlot.status).toBe(400);

    const badModels = await (POST as unknown as (req: NextRequest) => Promise<Response>)(
      new NextRequest("http://localhost/api/internal/ai-models", {
        method: "POST",
        body: JSON.stringify({ slot: "translate", models: ["../bad"] }),
      }),
    );
    expect(badModels.status).toBe(400);

    checkModelMock.mockResolvedValue({ model: "deepseek-v4-flash", ok: true, outcomes: [] });
    const dryRun = await (POST as unknown as (req: NextRequest) => Promise<Response>)(
      new NextRequest("http://localhost/api/internal/ai-models", {
        method: "POST",
        body: JSON.stringify({ slot: "translate", models: ["deepseek-v4-flash"] }),
      }),
    );
    expect(dryRun.status).toBe(200);
    expect(await dryRun.json()).toMatchObject({ ok: true, saved: false });
    expect(saveModelChainMock).not.toHaveBeenCalled();
  });

  it("POST with save=true persists passing chains and rejects failing checks with 422", async () => {
    const { POST } = await import("../route");

    checkModelMock.mockResolvedValueOnce({ model: "bad-model", ok: false, outcomes: [] });
    const failedSave = await (POST as unknown as (req: NextRequest) => Promise<Response>)(
      new NextRequest("http://localhost/api/internal/ai-models", {
        method: "POST",
        body: JSON.stringify({ slot: "digest", models: ["bad-model"], save: true }),
      }),
    );
    expect(failedSave.status).toBe(422);
    expect(saveModelChainMock).not.toHaveBeenCalled();

    checkModelMock.mockResolvedValueOnce({ model: "@cf/google/gemma-4-26b-a4b-it", ok: true, outcomes: [] });
    saveModelChainMock.mockResolvedValueOnce(undefined);
    const saved = await (POST as unknown as (req: NextRequest) => Promise<Response>)(
      new NextRequest("http://localhost/api/internal/ai-models", {
        method: "POST",
        body: JSON.stringify({
          slot: "digest",
          models: ["@cf/google/gemma-4-26b-a4b-it"],
          save: true,
        }),
      }),
    );
    expect(saved.status).toBe(200);
    expect(await saved.json()).toMatchObject({ ok: true, saved: true });
    expect(saveModelChainMock).toHaveBeenCalledWith(
      "digest",
      ["@cf/google/gemma-4-26b-a4b-it"],
      "internal-api",
    );
  });
});
