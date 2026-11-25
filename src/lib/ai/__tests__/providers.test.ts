import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getProviderStatus,
  hasAnyAiProvider,
  isGoogleModel,
  isModelConfigured,
  resolveModelAttempts,
} from "../providers";
import { isWorkersAiModel, workersAi } from "../workers-ai";
import { vndPerCall } from "../vietapi-pricing";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("AI providers & routing", () => {
  it("distinguishes Google direct models from VietAPI-hosted gemini models and Workers AI models", () => {
    expect(isGoogleModel("gemini-2.5-flash")).toBe(true);
    expect(isGoogleModel("gemini-4-argon")).toBe(false);
    expect(isGoogleModel("deepseek-v4-flash")).toBe(false);

    expect(isWorkersAiModel("@cf/google/gemma-4-26b-a4b-it")).toBe(true);
    expect(isWorkersAiModel("deepseek-v4-flash")).toBe(false);
  });

  it("reports provider configuration accurately from runtime env", () => {
    vi.stubEnv("VIETAPI_KEY", "");
    vi.stubEnv("CF_AIG_ACCOUNT_ID", "");
    vi.stubEnv("CF_AIG_GATEWAY_ID", "");
    vi.stubEnv("CF_AIG_TOKEN", "");
    vi.stubEnv("GEMINI_API_KEY", "");

    expect(hasAnyAiProvider()).toBe(false);
    expect(isModelConfigured("deepseek-v4-flash")).toBe(false);

    vi.stubEnv("VIETAPI_KEY", "vk");
    expect(hasAnyAiProvider()).toBe(true);
    expect(isModelConfigured("deepseek-v4-flash")).toBe(true);
    expect(isModelConfigured("gemini-2.5-flash")).toBe(false);
    expect(isModelConfigured("@cf/google/gemma-4-26b-a4b-it")).toBe(false);

    vi.stubEnv("GEMINI_API_KEY", "gk");
    expect(isModelConfigured("gemini-2.5-flash")).toBe(true);

    vi.stubEnv("CF_AIG_ACCOUNT_ID", "acc");
    vi.stubEnv("CF_AIG_TOKEN", "tok");
    expect(isModelConfigured("@cf/google/gemma-4-26b-a4b-it")).toBe(true);
    expect(getProviderStatus()).toEqual({
      vietapi: true,
      workersAi: true,
      aiGateway: false,
      gemini: true,
    });
  });

  it("routes VietAPI through Cloudflare AI Gateway when configured and appends direct fallback", async () => {
    vi.stubEnv("VIETAPI_KEY", "vk");
    vi.stubEnv("CF_AIG_ACCOUNT_ID", "acc");
    vi.stubEnv("CF_AIG_GATEWAY_ID", "gw");
    vi.stubEnv("CF_AIG_TOKEN", "tok");

    const attempts = resolveModelAttempts(
      ["deepseek-v4-flash", "deepseek-v4-pro", "deepseek-v4-flash"],
      { feature: "digest" },
    );

    expect(attempts.map((a) => [a.modelId, a.viaGateway])).toEqual([
      ["deepseek-v4-flash", true],
      ["deepseek-v4-pro", true],
      ["deepseek-v4-flash", false],
    ]);

    const calls: { url: string; headers: Record<string, string> }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({
          url: String(url),
          headers: Object.fromEntries(new Headers(init?.headers).entries()),
        });
        return new Response(JSON.stringify({ error: { message: "down" } }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      }),
    );

    for (const attempt of attempts) {
      await Promise.resolve(
        attempt.model.doGenerate({
          prompt: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
        }),
      ).catch(() => {});
    }

    expect(calls[0].url).toBe(
      "https://gateway.ai.cloudflare.com/v1/acc/gw/custom-vietapi/v1/chat/completions",
    );
    expect(calls[0].headers["cf-aig-authorization"]).toBe("Bearer tok");
    expect(JSON.parse(calls[0].headers["cf-aig-metadata"])).toEqual({ feature: "digest" });
    expect(calls[2].url).toBe("https://api.vietapi.tech/v1/chat/completions");
  });

  it("skips gateway when CF_AIG_TOKEN is missing", () => {
    vi.stubEnv("VIETAPI_KEY", "vk");
    vi.stubEnv("CF_AIG_ACCOUNT_ID", "acc");
    vi.stubEnv("CF_AIG_GATEWAY_ID", "gw");
    vi.stubEnv("CF_AIG_TOKEN", "");

    const attempts = resolveModelAttempts(["deepseek-v4-flash"], { feature: "translate" });
    expect(attempts.map((a) => [a.modelId, a.viaGateway])).toEqual([["deepseek-v4-flash", false]]);
  });

  it("injects enable_thinking: false and gateway headers for Workers AI", async () => {
    vi.stubEnv("CF_AIG_ACCOUNT_ID", "acc");
    vi.stubEnv("CF_AIG_GATEWAY_ID", "gw");
    vi.stubEnv("CF_AIG_TOKEN", "tok");

    const seen: { url: string; headers: Record<string, string>; body: Record<string, unknown> }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        seen.push({
          url: String(url),
          headers: Object.fromEntries(new Headers(init?.headers).entries()),
          body: JSON.parse(String(init?.body)),
        });
        return new Response("{}", { status: 500, headers: { "content-type": "application/json" } });
      }),
    );

    const model = workersAi({ feature: "translate" }).chatModel("@cf/google/gemma-4-26b-a4b-it");
    await Promise.resolve(
      model.doGenerate({
        prompt: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
      }),
    ).catch(() => {});

    expect(seen[0].url).toBe(
      "https://api.cloudflare.com/client/v4/accounts/acc/ai/v1/chat/completions",
    );
    expect(seen[0].headers.authorization).toBe("Bearer tok");
    expect(seen[0].headers["cf-aig-gateway-id"]).toBe("gw");
    expect(JSON.parse(seen[0].headers["cf-aig-metadata"])).toEqual({ feature: "translate" });
    expect(seen[0].body.chat_template_kwargs).toEqual({ enable_thinking: false });
  });

  it("computes VND per call from VietAPI pricing", () => {
    expect(vndPerCall("deepseek-v4-flash", 10_000, 1)).toBeCloseTo(3);
    expect(vndPerCall("unknown-model", 10_000, 1)).toBe(-1);
    expect(vndPerCall("deepseek-v4-flash", 10_000, 0)).toBe(-1);
  });
});
