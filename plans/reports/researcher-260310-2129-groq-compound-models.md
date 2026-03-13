# Groq Compound Models Research Report

**Date:** 2026-03-10
**Focus:** Compound-beta & compound-beta-mini for LiverpoolApp chat feature

---

## Executive Summary

Groq's Compound models are **agentic AI systems** combining language models with built-in tools (web search, code execution, browser automation). They've transitioned from preview to **general availability** and are production-ready. For your football fan site, compound-beta-mini is more practical (3x lower latency, single tool per request).

---

## 1. What Are Groq Compound Models?

**Definition:** Agentic systems extending beyond traditional LLMs by intelligently combining language models with external tools. Server orchestrates everything; no client-side setup needed.

**Architecture:**
- **compound-beta**: Llama 4 Scout (reasoning) + Llama 3.3 70B (tool routing) + up to 10 tool calls/request
- **compound-beta-mini**: Same models, single tool call/request, **3x lower latency**

**Key Innovation:** You send one query → API auto-decides which tools needed → executes server-side → returns polished answer. No explicit function calling required.

---

## 2. Capabilities Comparison

| Aspect | compound-beta | compound-beta-mini |
|--------|---------------|--------------------|
| **Tool Calls/Request** | 10 (simultaneous possible) | 1 |
| **Latency** | ~350 tokens/sec | ~275 tokens/sec (3x faster) |
| **Token Speed** | ~450 tokens/sec | Lower |
| **Use Case** | Complex iterative workflows | Lightweight, low-latency queries |
| **Context Window** | 131,072 tokens | 131,072 tokens |
| **Max Output** | 8,192 tokens | 8,192 tokens |

---

## 3. Built-in Tools (No Custom Tools Support)

✅ **Supported:**
- Web Search (with domain filtering)
- Visit Website
- Code Execution (Python, E2B sandboxes)
- Browser Automation
- Wolfram Alpha

❌ **Not Supported:**
- Custom user-provided tools
- Function calling in traditional sense (tools are automatic)

**For Football Chat:** Web search useful for live fixtures, stats, injury news. Code execution rarely needed.

---

## 4. Tool Use & Function Calling

**Critical Difference from Traditional Function Calling:**
- NO manual function definition required
- NO need to return tool_calls and expect client to invoke them
- Model **automatically decides** whether to use tools
- Tools execute on Groq's servers
- Response includes `executed_tools` field (for source citation, debugging)

**API Response Fields:**
```json
{
  "content": "...",
  "executed_tools": [
    {
      "type": "web_search",
      "query": "Liverpool FC injury news",
      "results": [...]
    }
  ],
  "usage_breakdown": {
    "model_1_tokens": 500,
    "model_2_tokens": 300
  }
}
```

---

## 5. Pricing & Rate Limits

### Pricing (March 2025)

**Model Tokens:**
- Variable: $0.11–$0.60 per 1M tokens (depends on underlying models used)
- Compared to llama-3.3-70b: **$0.59 input / $0.79 output per 1M**

**Tool Costs:**
- Web search: $5–$8 per 1,000 requests
- Code execution: $0.18/hour
- Browser automation: $0.08/hour
- Wolfram Alpha: Not detailed

**Bottom Line:** Compound is **NOT cheaper than llama-3.3-70b** for basic queries, but justifies cost when real-time data needed.

### Rate Limits

- Determined by underlying model composition
- Flex tier available for llama-3.3-70b & llama-3.1-8b (10x rate limits, same pricing) — **NOT available for compound yet**
- No specific published limits for compound models; contact Groq support for tier access

---

## 6. API Usage & Integration

### With Vercel AI SDK

**Basic Usage:**
```javascript
import { groq } from '@ai-sdk/groq';

const result = await streamText({
  model: groq('groq/compound-beta-mini'),  // or 'groq/compound'
  messages,
  system: "You are a football analyst...",
  maxTokens: 3000, // Recommended for tool-heavy queries
});
```

**No special config needed.** Same interface as standard Groq models.

### With Groq SDK
```javascript
const groq = new Groq();
const completion = await groq.chat.completions.create({
  model: "groq/compound-beta",
  messages: [{ role: "user", content: "Latest Liverpool injury news?" }],
  max_completion_tokens: 3000
});
```

### Key Differences from Standard Chat Completions

| Standard | Compound |
|----------|----------|
| `model: "llama-3.3-70b-versatile"` | `model: "groq/compound-beta"` or `groq/compound-beta-mini` |
| No automatic web search | Auto web search if needed |
| Standard response | `response.executed_tools` field included |
| 1 API call always | May execute multiple tool calls internally |
| Set `max_tokens` normally | Should set `max_completion_tokens: 3000-4000` |

---

## 7. Limitations & Gotchas

| Issue | Impact | Workaround |
|-------|--------|-----------|
| **Tool Token Consumption** | Web search + code execution burn tokens fast | Set `max_completion_tokens: 3000-4000` |
| **Single Tool (Mini)** | compound-mini can't do parallel operations | Use compound-beta for complex queries |
| **No Custom Tools** | Can't integrate LFC API, Supabase, etc. via function calling | Pre-fetch data, include in system prompt |
| **Not HIPAA Compliant** | Can't process health data (irrelevant for sports) | N/A |
| **No Regional Endpoints** | Sovereign cloud users blocked | Use standard Groq models instead |
| **Latency Variance** | Tool execution adds unpredictable delay | compound-mini better for chat UX |
| **Preview Status (Was)** | Now GA; but could have breaking changes | Monitor Groq changelog |

---

## 8. Suitability for Football Fan Site Chat

### ✅ Good Fit
- **Live fixtures & results:** Web search pulls latest scores
- **Injury updates:** Real-time news via web search
- **Player stats queries:** Can fetch current standings, recent matches
- **Fan engagement:** Natural conversation with auto-enriched context
- **No custom integrations needed:** Reduces backend complexity

### ⚠️ Concerns
- **Latency:** Tool execution adds 500ms–2s overhead vs. instant llama-3.3-70b response
- **Cost:** Web search @ $5-8/1K requests adds up if chat is popular
- **Accuracy:** LLM hallucination still possible; web search mitigates but not 100%
- **No function calling:** Can't directly query your Supabase user profile, favorites

### 🎯 Recommendation

**Use compound-beta-mini for:**
- Queries likely needing real-time data (fixtures, injury news, standings)
- Low-frequency chat (experimental feature)
- When you want rich, researched answers

**Keep llama-3.3-70b for:**
- Instant responses (squad info from training data)
- User profile questions (use RAG + function calling if needed)
- Cost-sensitive high-volume chat

**Hybrid Strategy:**
```typescript
const shouldUseCompound = (query: string): boolean => {
  const triggers = ['latest', 'today', 'current', 'now', 'injury', 'news'];
  return triggers.some(t => query.toLowerCase().includes(t));
};

const model = shouldUseCompound(userQuery)
  ? groq('groq/compound-beta-mini')
  : groq('llama-3.3-70b-versatile');
```

---

## 9. Implementation Roadmap

### Phase 1: Evaluate (Low Risk)
- Create test endpoint using compound-beta-mini
- Compare latency, cost, quality vs. llama-3.3-70b
- Instrument `executed_tools` response (log tool usage, cost)
- Test with 10-20 manual queries (fixture, injury, player stats)

### Phase 2: Integration (If Promising)
- Add router to chat API (`/api/chat` checks query intent)
- Implement cost tracking per model
- Set rate limiting (compound cheaper to abuse)
- Add user feedback (was this answer helpful?)

### Phase 3: Production (If Validated)
- Monitor Groq changelog for breaking changes
- Set budget alerts for web search costs
- Use compound-mini only (not compound-beta)
- Consider Flex tier if/when Groq offers it for compound

---

## Unresolved Questions

1. **Exact rate limits:** Groq docs don't specify RPS for compound models; need to contact support
2. **Cost per 1K web searches:** Range given ($5-8) but actual tiering unclear
3. **Streaming support:** Do compound models work with `streamText()` or block on tool execution?
4. **Custom domain filtering:** Docs mention domain filtering but unclear if configurable per-request
5. **Tool execution timeout:** What happens if web search takes >30s?
6. **Vercel AI SDK support:** Is compound-beta officially supported by @ai-sdk/groq or needs raw Groq SDK?

---

## Sources

- [Groq Compound Overview](https://console.groq.com/docs/compound)
- [Compound Beta Documentation](https://console.groq.com/docs/agentic-tooling/compound-beta)
- [Compound Mini Documentation](https://console.groq.com/docs/agentic-tooling/compound-beta-mini)
- [Groq Blog: Introducing Compound](https://groq.com/blog/now-in-preview-groqs-first-compound-ai-system)
- [Groq Blog: Next Generation Compound](https://groq.com/blog/introducing-the-next-generation-of-compound-on-groqcloud)
- [Groq Pricing](https://groq.com/pricing)
- [Groq Rate Limits](https://console.groq.com/docs/rate-limits)
- [Vercel AI SDK + Groq Integration](https://console.groq.com/docs/ai-sdk/)
- [E2B: Groq Compound AI Systems](https://e2b.dev/blog/groqs-compound-ai-models-are-powered-by-e2b)
