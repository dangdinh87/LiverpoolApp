import 'server-only';

/**
 * Groq model fallback configuration (verified live 2026-05-13)
 *
 * Strategy: maximize availability by ordering models by quality → TPD headroom.
 * When one model hits rate limit (esp. the 70B's tight 100K TPD), seamlessly
 * fall to a higher-TPD model.
 *
 * Verified against GET /v1/models + live completion test (scripts/diag_chat.mjs).
 * Removed: moonshotai/kimi-k2-instruct → returns 404 (deprecated/removed by Groq).
 *
 * Free tier limits (per org):
 * ┌──────────────────────────────────────────┬─────┬──────┬──────┬───────┐
 * │ Model                                    │ RPM │ RPD  │ TPM  │ TPD   │
 * ├──────────────────────────────────────────┼─────┼──────┼──────┼───────┤
 * │ llama-3.3-70b-versatile                  │  30 │  1K  │ 12K  │ 100K  │
 * │ qwen/qwen3-32b                           │  60 │  1K  │  6K  │ 500K  │
 * │ openai/gpt-oss-120b                      │  30 │  1K  │  8K  │ 200K  │
 * │ meta-llama/llama-4-scout-17b-16e-instruct│  30 │  1K  │ 30K  │ 500K  │
 * │ openai/gpt-oss-20b                       │  30 │  1K  │  8K  │ 500K  │
 * │ llama-3.1-8b-instant                     │  30 │ 14.4K│  6K  │ 500K  │
 * └──────────────────────────────────────────┴─────┴──────┴──────┴───────┘
 */

// Ordered fallback: best quality first, then high-TPD models so the 70B's
// 100K daily cap can't take the whole chat down.
export const MODEL_FALLBACK_ORDER = [
  'llama-3.3-70b-versatile',                  // Best quality, 70B, tight 100K TPD
  'qwen/qwen3-32b',                           // 500K TPD, strong reasoning + Vietnamese
  'openai/gpt-oss-120b',                      // 120B params, 200K TPD
  'meta-llama/llama-4-scout-17b-16e-instruct', // 30K TPM (highest), 500K TPD
  'openai/gpt-oss-20b',                       // 500K TPD, lighter OSS reasoning
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
