/**
 * VietAPI credit pricing table (1 credit = 1,000 VND, flat input/output rate).
 *
 * Kept for cost estimation and to distinguish VietAPI-hosted models (such as
 * `gemini-4-argon`) from models routed directly to Google Gemini.
 */
export const PRICE_CR_PER_1M: Record<string, number> = {
  "deepseek-v4-flash": 0.3,
  "deepseek-v4.1-flash": 0.8,
  "kimi-k2.6": 0.1,
  hy3: 0.2,
  "glm-5.1": 0.25,
  "glm-5.2": 0.3,
  "gpt-5.6-luna": 0.4,
  "claude-sonnet-5": 0.5,
  "claude-sonnet-5.5": 0.7,
  "deepseek-v4-pro": 0.5,
  "ox-alpha": 0.5,
  "qwen-3.8-max": 0.8,
  "gpt-5.5": 1,
  "gpt-5.5-high": 1,
  "gpt-5.5-xhigh": 1,
  "kimi-k3": 1,
  "glm-5.3": 1,
  "claude-opus-4.6": 1,
  "claude-opus-4.7": 1,
  "claude-opus-4.8": 1,
  "claude-opus-4.6-thinking": 1,
  "claude-opus-4.7-thinking": 1,
  "claude-opus-4.8-thinking": 1,
  "gpt-5.6-terra": 1.3,
  "claude-opus-5": 1.5,
  "claude-opus-5-thinking": 1.5,
  "gemini-4-argon": 1.5,
  "gpt-5.6-sol": 2,
  "gpt-6-astra": 2.5,
  "gpt-6-sol": 2,
  "gpt-6.1-sol": 2.5,
  "claude-opus-5.5": 4.5,
  "bedrock-claude-fable-5": 3,
  "cc-max-claude-sonnet-5": 15,
  "cc-max-claude-opus-4-7": 20,
  "cc-max-claude-opus-4-8": 20,
  "cc-max-claude-opus-5": 20,
  "claude-fable-5": 35,
};

/** Estimated VND cost per call for a measured token count, or -1 if unpriced. */
export function vndPerCall(
  model: string,
  totalTok: number,
  calls: number,
): number {
  const cr = PRICE_CR_PER_1M[model];
  if (cr === undefined || calls === 0) return -1;
  return ((totalTok / calls) * cr) / 1_000_000 * 1000;
}
