// Chat runs on qwen3-32b (500K TPD, small per-message requests fit its 6K TPM
// fine) so interactive traffic does NOT drain llama-3.3-70b's tight 100K TPD —
// that budget is reserved for the large daily digest job (see digest.ts).
export const DEFAULT_CHAT_AI_MODEL = 'qwen/qwen3-32b';

// Groq chat model whitelist — verified live 2026-05-13 (scripts/diag_chat.mjs).
// Removed: moonshotai/kimi-k2-instruct (returns 404 — removed by Groq).
export const ALLOWED_CHAT_MODELS: string[] = [
  'llama-3.3-70b-versatile',
  'qwen/qwen3-32b',
  'openai/gpt-oss-120b',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'openai/gpt-oss-20b',
  'llama-3.1-8b-instant',
];
