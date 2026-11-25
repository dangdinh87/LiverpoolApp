import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withFallback } from "../fallback-model";
import type { ChatModel } from "../vietapi";

function fakeModel(
  modelId: string,
  behaviour: { stream?: () => Promise<unknown>; generate?: () => Promise<unknown> } = {},
) {
  const calls: { abortSignal?: AbortSignal }[] = [];
  const model = {
    specificationVersion: "v3",
    provider: "vietapi",
    modelId,
    supportedUrls: {},
    doStream: async (opts: { abortSignal?: AbortSignal }) => {
      calls.push(opts);
      return behaviour.stream ? behaviour.stream() : { ok: modelId };
    },
    doGenerate: async (opts: { abortSignal?: AbortSignal }) => {
      calls.push(opts);
      return behaviour.generate ? behaviour.generate() : { ok: modelId };
    },
  };
  return { model: model as unknown as ChatModel, calls };
}

function hangingModel(modelId: string) {
  return fakeModel(modelId, { stream: () => new Promise(() => {}) });
}

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("withFallback", () => {
  it("throws immediately when given an empty model list", () => {
    expect(() => withFallback([])).toThrow(/at least one model/);
  });

  it("does not invoke fallback models when primary succeeds", async () => {
    const primary = fakeModel("primary");
    const backup = fakeModel("backup");

    await expect(withFallback([primary.model, backup.model]).doStream({} as never)).resolves.toEqual({
      ok: "primary",
    });
    expect(backup.calls).toHaveLength(0);
  });

  it("advances through fallback chain on stream and generate failures", async () => {
    const a = fakeModel("a", {
      stream: () => Promise.reject(new Error("502")),
      generate: () => Promise.reject(new Error("503")),
    });
    const b = fakeModel("b", {
      stream: () => Promise.reject(new Error("429")),
    });
    const c = fakeModel("c");

    await expect(withFallback([a.model, b.model, c.model]).doStream({} as never)).resolves.toEqual({
      ok: "c",
    });
    await expect(withFallback([a.model, c.model]).doGenerate({} as never)).resolves.toEqual({
      ok: "c",
    });
  });

  it("throws the last error when all models fail", async () => {
    const a = fakeModel("a", { stream: () => Promise.reject(new Error("first failure")) });
    const b = fakeModel("b", { stream: () => Promise.reject(new Error("final failure")) });

    await expect(withFallback([a.model, b.model]).doStream({} as never)).rejects.toThrow("final failure");
  });

  it("stops immediately when upstream abortSignal is aborted", async () => {
    const controller = new AbortController();
    controller.abort(new Error("client aborted"));
    const a = fakeModel("a");
    const b = fakeModel("b");

    await expect(
      withFallback([a.model, b.model]).doStream({ abortSignal: controller.signal } as never),
    ).rejects.toThrow("client aborted");
    expect(a.calls).toHaveLength(0);
    expect(b.calls).toHaveLength(0);
  });

  it("stops chain when aborted mid-chain", async () => {
    const controller = new AbortController();
    const a = fakeModel("a", {
      stream: () => {
        controller.abort(new Error("tab closed"));
        return Promise.reject(new Error("stream error"));
      },
    });
    const b = fakeModel("b");

    await expect(
      withFallback([a.model, b.model]).doStream({ abortSignal: controller.signal } as never),
    ).rejects.toThrow("tab closed");
    expect(b.calls).toHaveLength(0);
  });

  it("moves past a hanging model after timeout", async () => {
    vi.useFakeTimers();
    const a = hangingModel("hang-a");
    const b = fakeModel("ok-b");

    const promise = withFallback([a.model, b.model]).doStream({} as never);
    await vi.advanceTimersByTimeAsync(15_000);
    await expect(promise).resolves.toEqual({ ok: "ok-b" });
  });

  it("exposes primary identity and passes isolated abortSignal to underlying calls", async () => {
    const a = fakeModel("deepseek-v4-flash");
    const b = fakeModel("deepseek-v4-pro");
    const upstream = new AbortController();
    const wrapped = withFallback([a.model, b.model]);

    expect(wrapped.modelId).toBe("deepseek-v4-flash");
    expect(wrapped.provider).toBe("vietapi");

    await wrapped.doStream({ abortSignal: upstream.signal } as never);
    expect(a.calls[0].abortSignal).toBeDefined();
    expect(a.calls[0].abortSignal).not.toBe(upstream.signal);
  });
});
