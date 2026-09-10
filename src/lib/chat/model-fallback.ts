import 'server-only';


// Ordered fallback: fastest verified model first, then a cheaper tier, then a
// different vendor so one provider-side outage cannot take chat down.
// Verified live against VietAPI 2026-09-09.
export const MODEL_FALLBACK_ORDER = [
  'deepseek-v4-flash', // cheapest tier (0.1 cr/1M), clean Vietnamese
  'deepseek-v4-pro',   // faster (~1.1s) paid step up, same family
  'claude-sonnet-5',   // different vendor, strongest prose
] as const;

/** Check if an error is a rate limit (HTTP 429) */
export function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('429') || msg.includes('rate_limit') || msg.includes('rate limit')
      || msg.includes('tokens per day') || msg.includes('tokens per minute');
  }
  return false;
}

/**
 * Build ordered model list: requested model first, then remaining fallbacks.
 * Example: requested='deepseek-v4-flash' → ['deepseek-v4-flash', 'deepseek-v4-pro', ...]
 */
export function buildFallbackChain(requestedModel: string): string[] {
  const chain = [requestedModel];
  for (const model of MODEL_FALLBACK_ORDER) {
    if (model !== requestedModel) {
      chain.push(model);
    }
  }
  return chain;
}
