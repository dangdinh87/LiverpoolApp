import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { getEnv } from "@/lib/env";
import { withFallback } from "./fallback-model";
import { getVietapiModel, vietapiViaGateway, type ChatModel } from "./vietapi";
import { PRICE_CR_PER_1M } from "./vietapi-pricing";
import { isWorkersAiModel, workersAi } from "./workers-ai";

export const GOOGLE_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai";

/**
 * Direct Google Gemini models (`gemini-*` not listed in VietAPI's catalog
 * such as `gemini-4-argon`).
 */
export function isGoogleModel(model: string): boolean {
  return model.startsWith("gemini-") && !(model in PRICE_CR_PER_1M);
}

/** Whether the runtime environment carries credentials for this model's provider. */
export function isModelConfigured(model: string): boolean {
  if (isWorkersAiModel(model)) {
    return Boolean(getEnv("CF_AIG_ACCOUNT_ID") && getEnv("CF_AIG_TOKEN"));
  }
  if (isGoogleModel(model)) {
    return Boolean(getEnv("GEMINI_API_KEY"));
  }
  return Boolean(getEnv("VIETAPI_KEY"));
}

/** True if at least one supported AI provider has credentials configured. */
export function hasAnyAiProvider(): boolean {
  return Boolean(
    getEnv("VIETAPI_KEY") ||
      getEnv("GEMINI_API_KEY") ||
      (getEnv("CF_AIG_ACCOUNT_ID") && getEnv("CF_AIG_TOKEN")),
  );
}

/** Non-secret configuration flags for internal diagnostics. */
export function getProviderStatus() {
  return {
    vietapi: Boolean(getEnv("VIETAPI_KEY")),
    workersAi: Boolean(getEnv("CF_AIG_ACCOUNT_ID") && getEnv("CF_AIG_TOKEN")),
    aiGateway: Boolean(
      getEnv("CF_AIG_ACCOUNT_ID") &&
        getEnv("CF_AIG_GATEWAY_ID") &&
        getEnv("CF_AIG_TOKEN"),
    ),
    gemini: Boolean(getEnv("GEMINI_API_KEY")),
  };
}

/**
 * Resolve a single SDK chat model across Cloudflare Workers AI (`@cf/*`),
 * Google Gemini direct (`gemini-*`), and VietAPI (direct or via AI Gateway).
 */
export function resolveChatModel(
  modelId: string,
  metadata?: Record<string, string>,
  options?: { useGateway?: boolean },
): ChatModel {
  if (isWorkersAiModel(modelId)) {
    return workersAi(metadata).chatModel(modelId);
  }
  if (isGoogleModel(modelId)) {
    const google = createOpenAICompatible({
      name: "google",
      apiKey: getEnv("GEMINI_API_KEY") ?? "",
      baseURL: GOOGLE_BASE_URL,
    });
    return google.chatModel(modelId);
  }
  if (options?.useGateway !== false) {
    const gateway = vietapiViaGateway(metadata ?? { feature: "default" });
    if (gateway) return gateway.chatModel(modelId);
  }
  return getVietapiModel(modelId);
}

export interface ModelAttempt {
  modelId: string;
  model: ChatModel;
  viaGateway: boolean;
}

/**
 * Build an ordered list of configured model attempts.
 *
 * When VietAPI calls route through Cloudflare AI Gateway, a direct-VietAPI
 * fallback for the first VietAPI model is appended at the end so a gateway
 * outage never takes the feature down.
 */
export function resolveModelAttempts(
  chain: readonly string[],
  metadata: Record<string, string>,
): ModelAttempt[] {
  const deduped = [...new Set(chain.map((id) => id.trim()).filter(Boolean))];
  const configured = deduped.filter(isModelConfigured);
  if (configured.length === 0) return [];

  const gateway = vietapiViaGateway(metadata);
  const attempts: ModelAttempt[] = configured.map((modelId) => {
    const isVietapi = !isWorkersAiModel(modelId) && !isGoogleModel(modelId);
    const viaGateway = Boolean(isVietapi && gateway);
    return {
      modelId,
      model: resolveChatModel(modelId, metadata, { useGateway: viaGateway }),
      viaGateway,
    };
  });

  if (gateway) {
    const firstDirect = configured.find(
      (id) => !isWorkersAiModel(id) && !isGoogleModel(id),
    );
    if (firstDirect) {
      attempts.push({
        modelId: firstDirect,
        model: getVietapiModel(firstDirect),
        viaGateway: false,
      });
    }
  }

  return attempts;
}

/**
 * Resolve a chain of model IDs into a single `withFallback`-wrapped `ChatModel`.
 */
export function resolveFallbackModel(
  chain: readonly string[],
  metadata: Record<string, string>,
  timeouts?: { firstResponseTimeoutMs?: number; generateTimeoutMs?: number },
): ChatModel {
  const attempts = resolveModelAttempts(chain, metadata);
  return withFallback(
    attempts.map((a) => a.model),
    timeouts,
  );
}
