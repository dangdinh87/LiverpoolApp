import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { getEnv } from "@/lib/env";

/** Cloudflare Workers AI model IDs start with `@cf/`. */
export const isWorkersAiModel = (id: string): boolean => id.startsWith("@cf/");

/**
 * Gemma 4 on Workers AI thinks by default, spending output tokens on hidden
 * reasoning before replying. Setting `enable_thinking: false` keeps latency
 * and token usage predictable; models without the switch ignore it.
 */
const noThinking: typeof fetch = async (input, init) => {
  if (typeof init?.body !== "string") return fetch(input, init);
  try {
    const body = JSON.parse(init.body) as Record<string, unknown>;
    return fetch(input, {
      ...init,
      body: JSON.stringify({
        ...body,
        chat_template_kwargs: { enable_thinking: false },
      }),
    });
  } catch {
    return fetch(input, init);
  }
};

/** OpenAI-compatible base URL for Cloudflare Workers AI for the configured account. */
export const workersAiBaseUrl = (): string =>
  `https://api.cloudflare.com/client/v4/accounts/${getEnv("CF_AIG_ACCOUNT_ID") ?? ""}/ai/v1`;

/**
 * Cloudflare Workers AI OpenAI-compatible provider, optionally routed through
 * Cloudflare AI Gateway when `CF_AIG_GATEWAY_ID` is configured.
 */
export function workersAi(metadata?: Record<string, string>) {
  const gateway = getEnv("CF_AIG_GATEWAY_ID");
  return createOpenAICompatible({
    name: "workers-ai",
    apiKey: getEnv("CF_AIG_TOKEN") ?? "",
    baseURL: workersAiBaseUrl(),
    headers: gateway
      ? {
          "cf-aig-gateway-id": gateway,
          ...(metadata ? { "cf-aig-metadata": JSON.stringify(metadata) } : {}),
        }
      : undefined,
    fetch: noThinking,
  });
}
