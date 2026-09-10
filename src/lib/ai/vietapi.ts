import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * The app's LLM provider: chat, article translation, and the daily digest.
 *
 * VietAPI is an OpenAI-compatible proxy (`https://api.vietapi.tech/v1`) keyed by
 * `VIETAPI_KEY`. It replaced Groq, whose model line-up had been retired out from
 * under this codebase — the configured default and most of the fallback chain
 * returned `model_not_found`, which took chat, translation and the digest down
 * together.
 *
 * Use the `openai-compatible` provider specifically, not another vendor's
 * provider pointed at this baseURL: that combination streams text correctly but
 * silently drops tool calls.
 */
export const vietapi = createOpenAICompatible({
  name: "vietapi",
  apiKey: process.env.VIETAPI_KEY ?? "",
  baseURL: "https://api.vietapi.tech/v1",
});

/** Whether the provider is configured; callers degrade instead of throwing. */
export function hasVietapiKey(): boolean {
  return Boolean(process.env.VIETAPI_KEY);
}
