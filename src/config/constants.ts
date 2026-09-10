// LLM provider is VietAPI (see src/lib/ai/vietapi.ts). The previous Groq
// line-up was retired upstream — the default model and most of the fallback
// chain answered `model_not_found`, which broke chat, translation and digest.
//
// deepseek-v4-flash is the cheapest tier (0.1 cr/1M) and returns Vietnamese with
// correct diacritics; deepseek-v4-pro is the faster paid step up if it stumbles.
export const DEFAULT_CHAT_AI_MODEL = 'deepseek-v4-flash';

// VietAPI chat model whitelist — verified live against the provider 2026-09-09.
// Excludes gpt-5.6-luna: it emits Vietnamese without diacritics.
export const ALLOWED_CHAT_MODELS: string[] = [
  'deepseek-v4-flash',
  'deepseek-v4-pro',
  'claude-sonnet-5',
];
