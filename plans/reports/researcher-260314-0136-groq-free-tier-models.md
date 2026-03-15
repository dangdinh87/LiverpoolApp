# Groq Free Tier Models & Rate Limits Research
**Date:** 2026-03-14 | **Source:** console.groq.com/docs

## Executive Summary
All requested models are **ACTIVE and available** on Groq's free tier. No deprecations detected. The llama-3.1-8b-instant offers best token allowance (500K TPD), while openai/gpt-oss-20b provides fastest throughput (1,000 tokens/sec). All have 30 RPM limit except noted exceptions.

---

## Status of Requested Models

| Model | Status | TPD | RPM | Speed | Notes |
|-------|--------|-----|-----|-------|-------|
| `llama-3.3-70b-versatile` | ✅ Active | 100K | 30 | 280 tok/s | Smallest TPD of requested models |
| `llama-3.1-8b-instant` | ✅ Active | 500K | 30 | ~560 tok/s | **Best TPD allowance** |
| `gemma2-9b-it` | ⚠️ Not Listed | — | — | — | NOT found in current docs |
| `openai/gpt-oss-120b` | ✅ Active | 200K | 30 | — | Fallback option |
| `openai/gpt-oss-20b` | ✅ Active | 200K | 30 | 1,000 tok/s | **Fastest throughput** |

**Key Finding:** `gemma2-9b-it` does not appear in the official free tier model list. It may be deprecated or moved to paid tiers.

---

## All Available Text Generation Models

### Tier 1: High Token Allowance (500K TPD)
- `llama-3.1-8b-instant` — 30 RPM, 131K context
- `allam-2-7b` — 30 RPM
- `meta-llama/llama-4-scout-17b-16e-instruct` — 30 RPM (NEW)
- `qwen/qwen3-32b` — 60 RPM (NEW), 500K TPD

### Tier 2: Medium Token Allowance (200-300K TPD)
- `openai/gpt-oss-120b` — 30 RPM, 131K context
- `openai/gpt-oss-20b` — 30 RPM, 131K context, 1,000 tok/s
- `openai/gpt-oss-safeguard-20b` — 30 RPM
- `moonshotai/kimi-k2-instruct` — 60 RPM, 300K TPD
- `moonshotai/kimi-k2-instruct-0905` — 60 RPM, 300K TPD

### Tier 3: Low Token Allowance (<100K TPD)
- `llama-3.3-70b-versatile` — 100K TPD, 30 RPM, 131K context
- Arabic models (Canopy) — 3.6K TPD

### Tier 4: Special Purpose
- `groq/compound` — 30 RPM, **built-in web search + code execution** (TPD not specified)
- `groq/compound-mini` — 30 RPM
- `meta-llama/llama-prompt-guard-2-*` — Safety models (500K TPD)

---

## Rate Limit Details

**Free Tier Rules:**
- **RPM (Requests Per Minute):** Hard limit on request frequency
- **TPD (Tokens Per Day):** Cumulative daily token usage across all requests
- **Organization-level enforcement:** Limits apply across all users in an account
- **First-hit-wins:** You hit whichever limit comes first (RPM OR TPD)

**Model Groupings:**
1. **30 RPM Standard** (most models): llama-3.1-8b-instant, llama-3.3-70b-versatile, openai/gpt-oss-*, etc.
2. **60 RPM Premium** (newer models): qwen/qwen3-32b, moonshotai/kimi-k2-*

---

## Recommended Fallback Chain

For text generation fallback when TPD limit is hit:

```
Priority 1: llama-3.1-8b-instant (500K TPD, fastest overall value)
Priority 2: qwen/qwen3-32b (500K TPD, 60 RPM, newer alternative)
Priority 3: openai/gpt-oss-20b (200K TPD, 1,000 tok/s fastest speed)
Priority 4: openai/gpt-oss-120b (200K TPD, larger model)
Priority 5: llama-3.3-70b-versatile (100K TPD, powerful but limited)
```

**Fallback Logic:**
- Check TPD before each request
- If current model will exceed TPD with request size, switch to next in chain
- Track TPD usage per model separately if possible
- Consider using `llama-3.1-8b-instant` as default (most tokens available)

---

## Key Insights

1. **Best Token Budget:** `llama-3.1-8b-instant` with 500K TPD offers 5x more daily tokens than `llama-3.3-70b-versatile` (100K TPD)

2. **Speed Leader:** `openai/gpt-oss-20b` at 1,000 tokens/second (3.6x faster than llama-3.1-8b)

3. **Newer Options:** `qwen/qwen3-32b` is newer and matches llama-3.1-8b's 500K TPD with bonus 60 RPM

4. **Missing Model:** `gemma2-9b-it` no longer available on free tier—likely deprecated or moved to paid

5. **Compound Models:** `groq/compound` offers built-in web search and code execution (useful for enriched digests), but TPD not specified in docs

---

## Implementation Notes

For your AI digest fallback chain:
- Smaller models (8B) have larger TPD budgets → use for high-volume summarization
- Larger models (70B+) have smaller TPD → reserve for quality-critical tasks
- Implement request size estimation before model selection
- Consider hourly quota resets for daily TPD limits
- Monitor actual token usage vs. advertised limits (Groq may adjust without notice)

---

## Unresolved Questions

1. Is `groq/compound` TPD limit documented elsewhere? (Found in model list but no rate limit specified)
2. Why is `gemma2-9b-it` removed? (Was it a temporary model or permanent deprecation?)
3. Do the newer models (llama-4-scout, qwen3) have different deprecation timelines?
4. Is there a rate-limit API endpoint to check real-time usage before requests?
