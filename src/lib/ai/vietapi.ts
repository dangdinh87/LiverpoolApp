import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { getEnv } from "@/lib/env";

/**
 * The app's LLM provider: article translation, daily digest, and match reviews.
 *
 * Instantiated at call time rather than frozen at module import so Cloudflare
 * Worker secrets populated per-request (and rotated env vars in tests) are
 * always picked up cleanly.
 */
export function getVietapiModel(modelId: string) {
  const provider = createOpenAICompatible({
    name: "vietapi",
    apiKey: getEnv("VIETAPI_KEY") ?? "",
    baseURL: "https://api.vietapi.tech/v1",
  });
  return provider(modelId);
}

/** Backwards-compatible callable wrapper around {@link getVietapiModel}. */
export function vietapi(modelId: string) {
  return getVietapiModel(modelId);
}
