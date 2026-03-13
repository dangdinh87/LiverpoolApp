# Groq Compound Models Deep Dive

**Date:** 2026-03-10
**Status:** Production Ready (GA as of Oct 2025)
**Current Implementation:** `groq/compound-mini` in Liverpool FC fan site

## Executive Summary

Groq's Compound AI systems are production-ready agentic tools with integrated web search & code execution. The Liverpool FC app currently uses `groq/compound-mini` (NOT deprecated—this is the current production model). Key findings:

- **Free tier confirmed** for compound models; pricing is token-based (underlying models + web search)
- **`compound-mini` is NOT deprecated**—it's the production-ready lightweight variant
- **`compound-beta-mini` is a preview naming** (earlier terminology); current models use `groq/compound` and `groq/compound-mini`
- **Streaming fully supported** for chat UX
- **@ai-sdk/groq compatible** with compound models
- **Compound-mini superior for single-search football news** vs. paying for Perplexity/Tavily

---

## 1. Free Tier Details

### Availability
✅ **`groq/compound-mini` is available on free tier** (no credit card required)

### Rate Limits (Free Tier)
Per [Groq Rate Limits docs](https://console.groq.com/docs/rate-limits) and community FAQ:
- **Llama 3.3 70B** (underlying model in compound-mini): ~6,000 TPM (tokens per minute), ~500,000 TPD (tokens per day)
- **Requests Per Minute (RPM):** Rate limits apply at organization level; exact RPM varies by model
- **Daily limits reset** automatically

**Critical Detail:** Rate limits are **model-dependent** — they reflect the composition of the compound system (underlying model tokens consumed, not just API calls).

### Web Search Cost on Free Tier
⚠️ **Web search is NOT free** — it's charged based on token usage:
- Pricing "passed through to the underlying models and server side tools"
- No explicit separate charge per query (cost embedded in token usage)
- **Exact breakdown unavailable** in public docs (only visible in response `usage_breakdown` field)

**Practical implication:** Free tier with compound-mini is sustainable for moderate use (~500k tokens/day is substantial), but heavy web search queries can consume tokens rapidly.

---

## 2. `compound-mini` vs `compound-beta-mini`

### Key Finding: These Are NOT The Same Model

| Aspect | `groq/compound-mini` (Production) | `compound-beta-mini` (Preview Naming) |
|--------|----------------------------------|--------------------------------------|
| **Status** | ✅ Production GA (since Oct 2025) | 🔶 Legacy/Preview naming convention |
| **Model ID** | `groq/compound-mini` | N/A — this term deprecated in favor of `groq/compound-mini` |
| **Underlying Models** | Llama 3.3 70B + GPT-OSS 120B | Same (beta naming only) |
| **Tool Calls** | Single tool call per request | Single tool call per request |
| **Latency** | ~275 tokens/sec | ~275 tokens/sec |
| **Use Case** | Single web search or code execution | Single web search or code execution |

### Timeline
- **Initial preview:** Groq released `compound-beta` and `compound-beta-mini` in March 2025
- **Production GA:** October 2025 — renamed to `groq/compound` and `groq/compound-mini`
- **Current (2026):** Only `groq/compound` and `groq/compound-mini` are current; "beta" naming is legacy

**Your app is using the correct, current model ID.** No migration needed.

---

## 3. Rate Limits (Free vs Paid)

### Free Tier
From [Groq community FAQ](https://community.groq.com/t/what-are-the-rate-limits-for-the-groq-api-for-the-free-and-dev-tier-plans/42):
- **TPM (Tokens Per Minute):** ~6,000 (Llama 3.3 70B underlying)
- **TPD (Tokens Per Day):** ~500,000
- **RPM (Requests Per Minute):** Model-dependent; not explicitly published
- **Daily quota reset:** Automatic

### Developer Tier (Paid)
No explicit developer tier published, but community reports ~200 RPM, 200K TPM on developer plans.

### Enterprise
Custom limits; contact Groq sales.

**⚠️ Clarification Needed:** Exact RPM/RPD numbers for free tier not publicly documented. Dashboard at [console.groq.com/settings/limits](https://console.groq.com/settings/limits) shows your account's specific limits.

---

## 4. Pricing Breakdown for Web Search

### Compound System Pricing Model
Per [Groq pricing page](https://groq.com/pricing) and [docs](https://console.groq.com/docs/compound/systems/compound):

**Builders are charged per token consumed**, NOT per query:
- Cost is sum of all tokens used by:
  1. Underlying reasoning models (GPT-OSS 120B, Llama 3.3 70B, Llama 4 Scout)
  2. Web search tool execution
  3. Code execution tool (if used)

### Token Cost Examples
Base model pricing (for reference):
- **GPT-OSS 120B:** $0.15/M input tokens, $0.75/M output tokens
- **Llama 3.3 70B:** Typically cheaper (~$0.05/M input, $0.25/M output, varies)

### Web Search Cost
**Not separately itemized.** Web search results are tokenized and processed through the reasoning model, so cost = tokens_used × model_rate.

**Estimate for football news query:**
- Input tokens (query + search context): ~500–2,000
- Output tokens (response): ~300–1,000
- **Rough cost per query:** $0.0002–0.0010 (0.2–1 cent/query on free tier)

### Comparison to Paid Alternatives
From search results on [Perplexity API](https://www.eesel.ai/blog/groq-pricing), [Tavily](https://community.groq.com/t/groq-compound-vs-serper-type-search-queries/1177), [Serper](https://www.eesel.ai/blog/groq-pricing):

| Service | Free Tier | Cost Model | Web Search Only |
|---------|-----------|-----------|-----------------|
| **Groq Compound** | Yes (token-limited) | $0.15–0.75/M tokens | Integrated (no separate cost) |
| **Perplexity API** | No | $5.00 per 1,000 queries | Yes, API only |
| **Tavily** | Yes (1,000 credits/mo) | Credit-based (~$0.10/search) | Yes, with structured JSON |
| **Serper** | Limited | Per-query pricing | Yes, raw SERPs only |

**Winner for LFC app:** Groq Compound on free tier > Perplexity ($5/1k) or Tavily (credit limits).

---

## 5. Streaming Support

✅ **Compound models fully support streaming**

Per [Groq API Reference](https://console.groq.com/docs/api-reference) and [Compound docs](https://console.groq.com/docs/compound):

- **Text streaming:** Partial message deltas sent as server-sent events (SSE)
- **Tool use streaming:** Tool results streamed as generated
- **Stream termination:** `data: [DONE]` message

**For chat UX:** You can stream compound-mini responses in real-time, improving perceived latency. Ideal for showing intermediate tool results (e.g., "Searching for latest Liverpool stats...").

---

## 6. Vercel AI SDK (@ai-sdk/groq) Compatibility

✅ **Compound models supported** with official integration

From [Vercel AI SDK x Groq docs](https://console.groq.com/docs/ai-sdk/):

- **Official integration:** `@ai-sdk/groq` explicitly supports Groq models
- **Compound support:** Model parameter accepts `groq/compound` and `groq/compound-mini`
- **Streaming:** `streamText()` and tool use streaming both fully supported
- **Structured outputs:** Enabled by default
- **Parallel function calling:** Default behavior during tool use

**Code example usage:**
```typescript
import { generateText } from 'ai';
import { groq } from '@ai-sdk/groq';

const { text, toolResults } = await generateText({
  model: groq('groq/compound-mini'),
  messages: [{ role: 'user', content: 'Latest Liverpool goals' }],
  system: 'Provide current Liverpool FC stats',
});
```

**No known issues** reported with compound models in @ai-sdk/groq.

---

## 7. Model Naming & Deprecation Status

### Current Valid Model IDs (2026)

| Model ID | Status | Purpose | Tool Calls |
|----------|--------|---------|-----------|
| `groq/compound` | ✅ Production GA | Complex multi-step workflows | Multiple |
| `groq/compound-mini` | ✅ Production GA | Single search/execution | One |
| `groq/compound-beta` | ⚠️ Legacy (archived) | N/A — use `groq/compound` | Multiple |
| `groq/compound-beta-mini` | ⚠️ Legacy (archived) | N/A — use `groq/compound-mini` | One |

**Action for Liverpool app:** Your `groq/compound-mini` is **current and correct**. No migration required. Beta naming was only used during preview phase (March–October 2025).

### Changelog
Per [Groq Compound Changelog](https://console.groq.com/docs/changelog/compound):
- **Oct 2025:** Beta models promoted to GA, renamed to `groq/compound` / `groq/compound-mini`
- **March 2025:** Initial compound-beta release
- No deprecation timeline announced for current models

---

## 8. Best Practices: Hybrid Architecture

### Should You Use Compound for Everything?

**Recommendation: NO — use hybrid approach**

#### Compound-Mini Use Cases (Your Chat Feature)
✅ **Best for:**
- Single web search queries ("Latest Liverpool news")
- Real-time stats lookups
- One-off code executions
- **Cost:** Lower (single tool call, fewer tokens)
- **Latency:** ~275 tokens/sec (fast)

#### General LLM (e.g., Llama 3.3 70B) Use Cases
✅ **Better for:**
- Conversational chat without web search
- Analysis of historical data
- Player comparisons (using cached knowledge)
- System messages, role-playing
- **Cost:** Cheaper (no tool overhead)
- **Latency:** Faster (direct inference)

### Recommended Architecture for LFC App

```
User Input
    ↓
[Router Logic]
    ├─→ If query needs LIVE data → groq/compound-mini
    │   (e.g., "Latest goals", "Who played last game")
    │
    └─→ If query is ANALYTICAL → llama-3.3-70b
        (e.g., "Compare player careers", "Analyze formation")
```

**Rationale:**
- Compound-mini's overhead (web search + reasoning) isn't needed for historical questions
- Free tier token budget better utilized
- Faster response times for non-search queries
- Cleaner architecture (separation of concerns)

---

## 9. Comparison with Alternatives (News/Stats Use Case)

### LFC News/Stats Context
Your app needs:
1. Real-time match updates & goals
2. Player injury/form changes
3. Latest transfer news
4. Historical stat comparisons

### API Comparison

| Feature | Groq Compound | Perplexity API | Tavily | Serper |
|---------|--------------|----------------|--------|--------|
| **Free Tier** | Yes (token-limited) | No | Yes (1k credits/mo) | Limited |
| **Cost per Query** | ~$0.0002–0.001 | $5/1k queries | ~$0.10/search | Varies |
| **Response Format** | Natural language + context | Natural language | Structured JSON | Raw SERPs |
| **Speed** | ~275 tokens/sec | ~400ms median | ~2s | ~2s |
| **Tool Integration** | Native (web + code) | Web only | Web + scraping | Web only |
| **Streaming** | Yes | Limited | No | No |
| **Agentic** | Yes (multi-call capable) | No | No | No |

### Verdict for LFC Use Case
**Groq Compound-mini is best fit:**
- ✅ Free tier covers development phase
- ✅ Integrated web search (no separate API)
- ✅ Streaming for real-time UX
- ✅ Token-based pricing (predictable, scalable)
- ✅ Agentic capabilities if you need future multi-search workflows
- ⚠️ Tavily good alternative if you need structured JSON extraction from articles

**When to switch:** Only if you exceed free tier limits (~500k tokens/day) AND compound pricing becomes prohibitive at scale.

---

## 10. Latest Developments (2025–2026)

### Recent Updates

**October 2025 — Production GA**
- Compound-beta promoted to `groq/compound`
- Compound-beta-mini promoted to `groq/compound-mini`
- Marked as production-ready for enterprise use

**Reported Improvements (vs. Preview)**
- ~25% higher accuracy on SimpleQA & RealtimeEval benchmarks
- ~50% fewer mistakes vs. OpenAI GPT-4o-search-preview
- Outperforms Perplexity Sonar on knowledge retrieval

**Adoption Metrics**
- 100k+ developers using compound (as of late 2025)
- 5M+ requests generated since launch
- Thousands of active production customers

### Planned Expansions
Per [Groq blog](https://groq.com/blog/introducing-the-next-generation-of-compound-on-groqcloud):
- Additional built-in tools (browser automation expanded)
- Improved orchestration logic
- Better tool selection heuristics
- No new model variants announced

### No Deprecation Notices
✅ `groq/compound-mini` is **actively maintained** and recommended for production.

---

## Implementation Notes for Liverpool FC App

### Current State (✅ Good)
- Using `groq/compound-mini` correctly
- Free tier suitable for development & moderate traffic
- Streaming-capable for chat feature

### Recommendations
1. **Monitor token usage** via [Groq console limits page](https://console.groq.com/settings/limits)
2. **Implement hybrid router** (compound for news queries, llama for analysis)
3. **Cache web search results** for recent news (reduce redundant queries)
4. **Set up cost alerts** when approaching free tier limits
5. **Test streaming UX** to improve perceived performance

### Cost Projection (Example)
Assuming:
- 100 daily active users
- 5 queries/user/day (500 total queries)
- Avg 1,500 tokens/query (with web search overhead)

**Daily token usage:** 750,000 tokens
**Free tier limit:** 500,000 TPD
**Result:** Will exceed free tier; consider paid tier upgrade or query optimization

---

## Unresolved Questions

1. **Exact RPM limits for free tier** — not published; check dashboard
2. **Web search cost breakdown** — only visible in `usage_breakdown` field of responses; no public examples
3. **Compound-mini deprecation timeline** — none announced; appears stable long-term
4. **Browser automation pricing** — included in compound but no separate cost docs
5. **SLA/uptime guarantees** — not mentioned in developer docs (likely in enterprise T&Cs only)

---

## Sources

- [Groq Rate Limits Documentation](https://console.groq.com/docs/rate-limits)
- [Groq Compound Systems](https://console.groq.com/docs/compound/systems/compound)
- [Groq Compound Mini](https://console.groq.com/docs/compound/systems/compound-mini)
- [Groq Pricing](https://groq.com/pricing)
- [Groq Community FAQ — Free Tier](https://community.groq.com/t/is-there-a-free-tier-and-what-are-its-limits/790)
- [Groq Community FAQ — Rate Limits](https://community.groq.com/t/what-are-the-rate-limits-for-the-groq-api-for-the-free-and-dev-tier-plans/42)
- [Groq Blog — Next Generation Compound](https://groq.com/blog/introducing-the-next-generation-of-compound-on-groqcloud)
- [Vercel AI SDK x Groq Integration](https://console.groq.com/docs/ai-sdk/)
- [AI SDK by Vercel](https://ai-sdk.dev/providers/ai-sdk-providers/groq)
- [Perplexity API Comparison](https://alphacorp.ai/perplexity-search-api-vs-tavily-the-better-choice-for-rag-and-agents-in-2025/)
- [Groq Compound Changelog](https://console.groq.com/docs/changelog/compound)
- [Supported Models](https://console.groq.com/docs/models)
