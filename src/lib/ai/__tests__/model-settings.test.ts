import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const selectMock = vi.fn();
const upsertMock = vi.fn();

vi.mock("@/lib/news/supabase-service", () => ({
  getServiceClient: () => ({
    from: () => ({
      select: () => selectMock(),
      upsert: (payload: unknown, opts: unknown) => upsertMock(payload, opts),
    }),
  }),
}));

import { getModelChain, resetModelSettingsCache, saveModelChain } from "../model-settings";
import { getDefaultSlotModels } from "../ai-model-slots";

const DEFAULTS = ["model-a", "model-b"];

describe("model-settings & slot defaults", () => {
  beforeEach(() => {
    resetModelSettingsCache();
    selectMock.mockReset();
    upsertMock.mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns code defaults when DB has no row for slot", async () => {
    selectMock.mockResolvedValue({ data: [], error: null });
    expect(await getModelChain("digest", DEFAULTS)).toEqual(DEFAULTS);
  });

  it("returns deduplicated DB override when configured", async () => {
    selectMock.mockResolvedValue({
      data: [{ slot: "digest", models: ["x", " x ", "y"] }],
      error: null,
    });
    expect(await getModelChain("digest", DEFAULTS)).toEqual(["x", "y"]);
  });

  it("falls back to defaults when row is empty/whitespace or DB errors", async () => {
    selectMock.mockResolvedValue({
      data: [{ slot: "digest", models: ["   "] }],
      error: null,
    });
    expect(await getModelChain("digest", DEFAULTS)).toEqual(DEFAULTS);

    resetModelSettingsCache();
    selectMock.mockResolvedValue({
      data: null,
      error: new Error('relation "ai_model_settings" does not exist'),
    });
    expect(await getModelChain("digest", DEFAULTS)).toEqual(DEFAULTS);
  });

  it("caches settings for 60s and preserves stale cache on subsequent DB failure", async () => {
    vi.useFakeTimers();
    selectMock.mockResolvedValueOnce({
      data: [{ slot: "translate", models: ["custom-1"] }],
      error: null,
    });
    expect(await getModelChain("translate", DEFAULTS)).toEqual(["custom-1"]);
    expect(await getModelChain("digest", DEFAULTS)).toEqual(DEFAULTS);
    expect(selectMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(61_000);
    selectMock.mockRejectedValueOnce(new Error("timeout"));
    expect(await getModelChain("translate", DEFAULTS)).toEqual(["custom-1"]);
  });

  it("saves clean deduplicated models and invalidates cache", async () => {
    selectMock.mockResolvedValue({ data: [], error: null });
    upsertMock.mockResolvedValue({ error: null });

    await getModelChain("site_articles", DEFAULTS);
    await saveModelChain("site_articles", [" deepseek-v4-pro ", "deepseek-v4-pro", "claude-sonnet-5"], "admin");

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        slot: "site_articles",
        models: ["deepseek-v4-pro", "claude-sonnet-5"],
        updated_by: "admin",
      }),
      { onConflict: "slot" },
    );

    selectMock.mockResolvedValue({
      data: [{ slot: "site_articles", models: ["deepseek-v4-pro", "claude-sonnet-5"] }],
      error: null,
    });
    expect(await getModelChain("site_articles", DEFAULTS)).toEqual([
      "deepseek-v4-pro",
      "claude-sonnet-5",
    ]);
  });

  it("prepends optional env overrides to built-in slot defaults", () => {
    vi.stubEnv("AI_MODEL_TRANSLATE", "@cf/google/gemma-4-26b-a4b-it, deepseek-v4-flash");
    expect(getDefaultSlotModels("translate")).toEqual([
      "@cf/google/gemma-4-26b-a4b-it",
      "deepseek-v4-flash",
      "deepseek-v4-pro",
      "claude-sonnet-5",
    ]);
  });
});
