import 'server-only';

// Ordered fallback: best quality → fastest (last resort)
export const MODEL_FALLBACK_ORDER = [
  'llama-3.3-70b-versatile',
  'qwen/qwen3-32b',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'llama-3.1-8b-instant',
] as const;

/** Check if an error is a rate limit (HTTP 429) */
export function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('429') || msg.includes('rate_limit') || msg.includes('rate limit');
  }
  return false;
}

/**
 * Build ordered model list: requested model first, then remaining fallbacks.
 * Example: requested='qwen/qwen3-32b' → ['qwen/qwen3-32b', 'llama-3.3-70b', 'llama-4-scout', '8b-instant']
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
