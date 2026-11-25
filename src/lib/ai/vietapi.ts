import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { getEnv } from "@/lib/env";

export const VIETAPI_BASE_URL = "https://api.vietapi.tech/v1";

/**
 * Create the primary VietAPI OpenAI-compatible provider at call time so
 * Cloudflare Worker per-request secrets and test env stubs are always picked up.
 */
function createVietapiProvider() {
  return createOpenAICompatible({
    name: "vietapi",
    apiKey: getEnv("VIETAPI_KEY") ?? "",
    baseURL: VIETAPI_BASE_URL,
  });
}

/** Resolve a chat model backed directly by VietAPI. */
export function getVietapiModel(modelId: string) {
  return createVietapiProvider().chatModel(modelId);
}

/** Backwards-compatible callable wrapper around {@link getVietapiModel}. */
export function vietapi(modelId: string) {
  return getVietapiModel(modelId);
}

/**
 * VietAPI routed through Cloudflare AI Gateway for request logs and per-feature
 * token analytics. Returns null unless CF_AIG_ACCOUNT_ID, CF_AIG_GATEWAY_ID,
 * and CF_AIG_TOKEN are all configured (authenticated gateways reject missing tokens).
 */
export function vietapiViaGateway(metadata: Record<string, string>) {
  const account = getEnv("CF_AIG_ACCOUNT_ID");
  const gateway = getEnv("CF_AIG_GATEWAY_ID");
  const token = getEnv("CF_AIG_TOKEN");
  if (!account || !gateway || !token) return null;

  return createOpenAICompatible({
    name: "vietapi-via-cf",
    apiKey: getEnv("VIETAPI_KEY") ?? "",
    baseURL: `https://gateway.ai.cloudflare.com/v1/${account}/${gateway}/custom-vietapi/v1`,
    headers: {
      "cf-aig-authorization": `Bearer ${token}`,
      "cf-aig-metadata": JSON.stringify(metadata),
    },
  });
}

export type ChatModel = ReturnType<
  ReturnType<typeof createOpenAICompatible>["chatModel"]
>;
export type VietapiModel = ChatModel;
