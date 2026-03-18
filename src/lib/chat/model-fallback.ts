import 'server-only';

/**
 * Groq model fallback configuration (updated 2026-03-18)
 *
 * Strategy: maximize availability by ordering models by quality → TPD → RPM.
 * When one model hits rate limit, seamlessly fall to the next.
 *
 * Free tier limits (per org):
 * ┌──────────────────────────────────────────┬─────┬──────┬──────┬───────┐
 * │ Model                                    │ RPM │ RPD  │ TPM  │ TPD   │
 * ├──────────────────────────────────────────┼─────┼──────┼──────┼───────┤
 * │ llama-3.3-70b-versatile                  │  30 │  1K  │ 12K  │ 100K  │
 * │ moonshotai/kimi-k2-instruct              │  60 │  1K  │ 10K  │ 300K  │
 * │ qwen/qwen3-32b                           │  60 │  1K  │  6K  │ 500K  │
 * │ openai/gpt-oss-120b                      │  30 │  1K  │  8K  │ 200K  │
 * │ meta-llama/llama-4-scout-17b-16e-instruct│  30 │  1K  │ 30K  │ 500K  │
 * │ llama-3.1-8b-instant                     │  30 │ 14.4K│  6K  │ 500K  │
 * └──────────────────────────────────────────┴─────┴──────┴──────┴───────┘
 */

// Ordered fallback: best quality → high RPM alternatives → fast last resort
export const MODEL_FALLBACK_ORDER = [
  'llama-3.3-70b-versatile',                  // Best quality, 70B, limited TPD (100K)
  'moonshotai/kimi-k2-instruct',              // 60 RPM (2x), 300K TPD, high quality
  'qwen/qwen3-32b',                           // 60 RPM (2x), 500K TPD, strong reasoning
  'openai/gpt-oss-120b',                      // 120B params, 200K TPD
  'meta-llama/llama-4-scout-17b-16e-instruct', // 30K TPM (highest), 500K TPD
  'llama-3.1-8b-instant',                     // Last resort: fast, 14.4K RPD, 500K TPD
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
 * Example: requested='qwen/qwen3-32b' → ['qwen/qwen3-32b', 'llama-3.3-70b', 'kimi-k2', ...]
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
