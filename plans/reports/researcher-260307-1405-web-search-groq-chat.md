# Web Search Integration for Next.js Chat with Groq + Vercel AI SDK v6

**Date:** March 7, 2026
**Researcher:** Agent
**Status:** COMPLETE

---

## Executive Summary

**YES** — Groq fully supports tool calling via Vercel AI SDK v6, including `llama-3.3-70b-versatile`. Three implementation paths exist:

1. **Direct tool calling** (RECOMMENDED) — LLM decides when to search, you define the search tool
2. **Two-step pattern** — Ask model if search needed, then execute conditionally
3. **Always-search pattern** — Implicit web context injection without explicit tool calls

**Best search API:** Tavily for RAG/agents (AI-optimized), Serper for budget (traditional SERP), Brave for privacy.

---

## 1. Groq Tool Calling Support

### Does Groq Support Tool/Function Calling?

**✅ YES** — Full support via Vercel AI SDK v6.

- **Tools available:** Both server-side (execute) and client-side tools
- **Streaming:** Tool calls + results stream in real-time
- **Parallel tools:** Model can invoke multiple tools in single generation
- **Automatic roundtrips:** `maxToolRoundtrips` parameter handles multi-step tool chains

**Key sources:**
- [Groq + Vercel AI SDK Integration](https://console.groq.com/docs/ai-sdk/)
- [Tool Use Reference](https://vercel.com/academy/ai-sdk/tool-use)

### Which Groq Models Support Tool Calling?

| Model | Type | Tool Support | Status |
|-------|------|--------------|--------|
| `llama-3.3-70b-versatile` | General purpose | ✅ YES | **RECOMMENDED** — Best balance of quality + speed |
| `llama-3.1-70b-instruct` | Specialized | ✅ YES | Stable, widely tested |
| `llama-3-groq-70b-tool-use` | Purpose-built | ✅ YES (90.76% BFCL) | Legacy, still available |
| `llama-3.3-70b-specdec` | Fast variant | ✅ YES | Ultra-fast, trade-off quality |
| `llama-3.2-3b-preview` | Small | ⚠️ Limited | Lightweight option |

**llama-3.3-70b-versatile specs:**
- **Context:** 128K tokens
- **Tool use:** Full support, improved parameter handling vs 3.1
- **JSON mode:** Structured output capability
- **Code:** Better instruction following, error handling
- **Speed:** Fast inference on Groq hardware

**Source:** [Llama-3.3-70B-Versatile Docs](https://console.groq.com/docs/model/llama-3.3-70b-versatile), [Llama 3.3 Blog](https://groq.com/blog/a-new-scaling-paradigm-metas-llama-3-3-70b-challenges-death-of-scaling-law)

---

## 2. Web Search API Comparison (2026)

### Tavily Search API

**Best for:** RAG applications, LLM-optimized results, AI agents
**Architecture:** AI-native, semantic ranking, result aggregation

| Metric | Details |
|--------|---------|
| **Free tier** | 1,000 credits/month (no rollover) |
| **Cost per query** | Basic search: 1 credit (~$0.008 PAYG) |
| **URL extraction** | 0.2 credits per URL (1 credit = 5 URLs) |
| **Paid plans** | $50–$500/month (1k–100k credits) |
| **Integration** | Native LangChain, LlamaIndex, Vercel AI SDK |
| **Response format** | AI-optimized snippets, relevance scores, citations |
| **Web indexing** | Real-time semantic search |

**Pros:**
- Results returned as LLM-ready snippets, not raw SERP rows
- Re-ranking based on query context
- Single API call vs multiple sources
- Excellent for agent workflows

**Cons:**
- Free tier credits don't roll over (strict monthly reset)
- Higher cost at scale ($0.008/credit vs Serper's $0.0003/credit)

**Source:** [Tavily Pricing Docs](https://docs.tavily.com/documentation/api-credits), [Firecrawl comparison](https://www.firecrawl.dev/blog/tavily-pricing)

---

### Serper API

**Best for:** Budget-conscious teams, traditional SERP scraping, Google Search results

| Metric | Details |
|--------|---------|
| **Free tier** | 2,500 queries upon signup |
| **Cost per query** | $0.30 per 1,000 queries (~$0.0003/query) |
| **Paid plans** | Pay-as-you-go, no monthly commitments |
| **Integration** | LangChain tool, direct API calls |
| **Response format** | Traditional SERP: titles, URLs, 150–300 char snippets |
| **Rate limits** | Strict QPS limits on lower tiers |

**Pros:**
- **Cheapest option** — 27x cheaper than Tavily per query
- Traditional Google SERP format familiar to many
- No monthly minimums
- Enough free queries for prototyping

**Cons:**
- Raw results require post-processing for LLM context
- Rate limiting on free tier
- Not optimized for AI/RAG workflows
- Returns metadata only, no content extraction

**Source:** [Serper Pricing](https://serper.dev/), [SERP API Pricing Index](https://www.searchcans.com/blog/serp-api-pricing-index-2026)

---

### Brave Search API

**Best for:** Privacy-sensitive applications, independent index, no tracking

| Metric | Details |
|--------|---------|
| **Free tier** | $5 in monthly credits (~1,000 queries) |
| **Previous free** | ⚠️ Removed Feb 2026 (was 2,000–5,000/month) |
| **Cost per query** | $5 per 1,000 queries ($0.005/query) |
| **Paid plans** | All at $5 per 1k requests |
| **Integration** | Direct API, no native LLM frameworks yet |
| **Response format** | Web results, news, answer boxes |
| **Index** | Independent, no Big Tech dependency |

**Pros:**
- **Privacy-first** — No query logging, independent index
- 16x cheaper than Tavily per query
- No tracking/analytics collection
- Ideal for healthcare, legal, financial domains

**Cons:**
- Recent pricing change (removed free tier)
- Less optimized for AI agent workflows
- Fewer framework integrations

**Source:** [Brave Search API Pricing](https://api-dashboard.search.brave.com/documentation/pricing), [Brave Free Tier Change](https://www.implicator.ai/brave-drops-free-search-api-tier-puts-all-developers-on-metered-billing/)

---

### Cost Comparison (per 1,000 queries)

| API | Cost/1k | Free Tier | Best Use |
|-----|---------|-----------|----------|
| Serper | $0.30 | 2,500 queries | Budget; traditional SERP |
| Brave | $5.00 | $5 credit (~1k) | Privacy; compliance |
| Tavily | $8.00 | 1,000 credits | AI agents; RAG; real-time |

---

## 3. Implementing Tool Calling with Vercel AI SDK v6 + Groq

### Architecture Overview

```
User Query
  ↓
streamText() with tools
  ↓
Model decides: call tool(s)?
  ↓
If YES → Tool execution → Result streaming
  ↓
Final response to client
  ↓
createUIMessageStream() wraps stream
  ↓
assistant-ui Thread handles display
```

### Step 1: Define the Web Search Tool

```typescript
// src/lib/tools/web-search.ts
import { tool } from 'ai';
import { z } from 'zod';

export const webSearchTool = tool({
  description: 'Search the web for current information. Use when you need real-time data, current events, or information beyond your knowledge cutoff.',
  parameters: z.object({
    query: z.string().describe('The search query'),
    maxResults: z.number().optional().describe('Max results to return (1-10)'),
  }),
  execute: async ({ query, maxResults = 5 }) => {
    // Call Tavily API
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        max_results: maxResults,
        include_answer: true,
        include_raw_content: false, // Already processed by Tavily
      }),
    });

    const data = await response.json();

    if (data.answer) {
      return {
        success: true,
        answer: data.answer,
        sources: data.results.map(r => ({
          title: r.title,
          url: r.url,
          snippet: r.content,
        })),
      };
    }

    return {
      success: false,
      error: 'No results found',
    };
  },
});
```

### Step 2: Use streamText with Tools

```typescript
// src/app/api/chat/route.ts
import { streamText } from 'ai';
import { groq } from '@ai-sdk/groq';
import { webSearchTool } from '@/lib/tools/web-search';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: groq('llama-3.3-70b-versatile'),
    messages,
    tools: {
      webSearch: webSearchTool,
    },
    toolChoice: 'auto', // Model decides when to search
    maxToolRoundtrips: 2, // Allow multi-step searches if needed
    system: `You are a helpful assistant. Search the web when the user asks about current events,
    real-time data, or information beyond October 2024. Be concise and cite your sources.`,
  });

  return result.toDataStreamResponse();
}
```

### Step 3: Stream Handling with createUIMessageStream

```typescript
// Alternative: Using createUIMessageStreamResponse for better UI control
import { createUIMessageStreamResponse } from 'ai/rsc';

export async function POST(req: Request) {
  const { messages } = await req.json();

  return createUIMessageStreamResponse({
    execute: async (forceUpdate) => {
      const result = await streamText({
        model: groq('llama-3.3-70b-versatile'),
        messages,
        tools: {
          webSearch: webSearchTool,
        },
        toolChoice: 'auto',
        maxToolRoundtrips: 2,
      });

      // Automatically handles tool calls + results
      return result.fullStream;
    },
  });
}
```

### Step 4: Client-Side with assistant-ui

```typescript
// src/components/chat/chat-thread.tsx
import { useAssistant } from '@assistant-ui/react';
import { Thread } from '@assistant-ui/react';

export function ChatThread() {
  const { status, messages } = useAssistant({
    api: '/api/chat',
  });

  return (
    <Thread
      assistantMessage={{
        // Thread auto-detects tool calls in streamed data
        actions: ({ message }) => {
          // Custom rendering for tool results
          if (message.role === 'assistant') {
            return message.content.map((part) => {
              if (part.type === 'tool-call') {
                return (
                  <div key={part.toolCallId} className="p-4 bg-blue-100 rounded">
                    Searching: {part.toolName}
                  </div>
                );
              }
              if (part.type === 'tool-result') {
                return (
                  <div key={part.toolCallId} className="p-4 bg-green-100 rounded">
                    Results: {part.result.answer}
                  </div>
                );
              }
            });
          }
        },
      }}
    />
  );
}
```

**Key points:**
- `toolChoice: 'auto'` lets Groq decide whether to search
- `maxToolRoundtrips: 2` prevents infinite loops
- `toDataStreamResponse()` works with `streamText`
- `createUIMessageStream` wraps for better error handling
- Thread component auto-detects tool calls from the stream

**Sources:**
- [streamText Documentation](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text)
- [createUIMessageStream Docs](https://ai-sdk.dev/docs/reference/ai-sdk-ui/create-ui-message-stream)
- [Tool Calling Guide](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling)
- [assistant-ui Thread](https://www.assistant-ui.com/docs/ui/Thread)

---

## 4. Alternative: Two-Step Pattern (Without Direct Tool Calling)

**When to use:** If tool calling feels too heavy or you want explicit control over when searches happen.

### Pattern: Check-First Approach

```typescript
// Step 1: Ask if search needed
const needsSearch = await generateText({
  model: groq('llama-3.3-70b-versatile'),
  messages,
  system: `Analyze the user's question. Reply ONLY with "YES" or "NO".
  Answer "YES" if the query asks about:
  - Current events or news
  - Real-time data (sports scores, stock prices)
  - Information beyond October 2024
  Otherwise reply "NO".`,
});

// Step 2: Conditionally search
let searchResults = null;
if (needsSearch.text.includes('YES')) {
  // Extract query and search
  const { query } = await generateObject({
    model: groq('llama-3.3-70b-versatile'),
    schema: z.object({ query: z.string() }),
    messages: [{ role: 'user', content: userMessage }],
  });

  searchResults = await tavily.search(query);
}

// Step 3: Final response with context
const finalResult = await streamText({
  model: groq('llama-3.3-70b-versatile'),
  messages: [
    ...messages,
    {
      role: 'user',
      content: searchResults
        ? `Search results:\n${JSON.stringify(searchResults)}\n\n${userMessage}`
        : userMessage,
    },
  ],
  system: `You have access to current web search results. Provide accurate, cited answers.`,
});
```

**Pros:**
- Explicit control over search invocation
- Lower latency (no streaming roundtrips)
- Simpler error handling
- Clear cost tracking

**Cons:**
- 2–3 extra API calls minimum
- More complex orchestration
- No streaming benefit of tool results

**Use case:** LLM fine-tuning workflows, strict cost control, non-chat interfaces.

---

## 5. Does assistant-ui Handle Tool Display Automatically?

**✅ YES** — With conditions.

### Auto-Handling

Thread component auto-renders tool calls when:
1. Data stream includes `tool-call` and `tool-result` parts
2. Using `streamText` with `toDataStreamResponse()`
3. Tool results are included in stream

**Example auto-display:**
```
User: What's happening in Liverpool FC news today?
---
[searching: webSearch]
---
[Results from Web Search]
---
Liverpool FC has won 3-1 against Arsenal...
```

### Custom Tool UI

For custom rendering (e.g., displaying search sources):

```typescript
const ToolUI = {
  webSearch: ({ args, result }) => (
    <div className="border-l-4 border-blue-500 p-4">
      <h3>Search: {args.query}</h3>
      {result?.sources?.map((src) => (
        <a key={src.url} href={src.url} className="block text-blue-600">
          {src.title}
        </a>
      ))}
    </div>
  ),
};
```

**Sources:**
- [Generative UI / ToolUI](https://www.assistant-ui.com/docs/guides/ToolUI)
- [Data Stream Protocol](https://www.assistant-ui.com/docs/runtimes/data-stream)

---

## 6. Recommended Implementation Path

### For Your LiverpoolApp Chat Feature

**Stack:** Next.js 16 App Router + Groq + Vercel AI SDK v6 + assistant-ui

**Step-by-step:**

1. **Choose search API:** Tavily (RAG-optimized) for best quality
   - Free tier: 1,000 credits/month
   - ~$0.008 per search (manageable for prototyping)

2. **Set up tool calling:**
   ```typescript
   // routes/api/chat/route.ts
   export async function POST(req: Request) {
     const result = streamText({
       model: groq('llama-3.3-70b-versatile'),
       messages: await req.json(),
       tools: { webSearch: tavilySearchTool },
       toolChoice: 'auto',
       maxToolRoundtrips: 2,
     });
     return result.toDataStreamResponse();
   }
   ```

3. **Wire up frontend:**
   - Use `useAssistant` hook from assistant-ui
   - Thread component handles streaming + tool display automatically
   - No extra UI code needed for basic tool calls

4. **Cost estimate (monthly):**
   - 100 searches/month = $0.80
   - Tavily free tier covers 1,000 searches
   - **Safe for MVP**

### Fallback: Two-Step Pattern

If tool calling complexity is too high initially:
- Use check-first approach for explicit control
- Only call Tavily when model decides it's necessary
- Same API, different orchestration

---

## 7. Unresolved Questions

1. **Groq rate limits:** No official docs on Groq API rate limits for free tier (assume Vercel's limits apply)
2. **assistant-ui with Groq:** No specific integration examples; assumes standard Vercel AI SDK compatibility
3. **Tool result streaming latency:** Unknown if Groq streams tool results or returns final text only
4. **Brave Search integration:** Would need custom implementation (no LangChain wrapper yet)

---

## Key Decisions Summary

| Decision | Recommendation | Rationale |
|----------|----------------|-----------|
| **Tool calling?** | YES, direct tool calling | Native Groq + Vercel AI SDK support, simplest pattern |
| **Model** | `llama-3.3-70b-versatile` | Improved tool use vs 3.1, fast on Groq, 128K context |
| **Search API** | Tavily | AI-optimized, 1,000 free/month, native integrations |
| **Fallback** | Two-step check pattern | If tool calling adds too much complexity |
| **UI framework** | assistant-ui Thread | Auto-handles streaming + tool display |
| **Streaming** | `toDataStreamResponse()` | Native Vercel AI SDK, real-time tool results |

---

## References

### Groq & LLM
- [Groq + Vercel AI SDK](https://console.groq.com/docs/ai-sdk/)
- [Llama-3.3-70B-Versatile](https://console.groq.com/docs/model/llama-3.3-70b-versatile)
- [Tool Calling Capabilities](https://groq.com/blog/introducing-llama-3-groq-tool-use-models)

### Vercel AI SDK
- [streamText Documentation](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text)
- [Tool Calling Guide](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling)
- [createUIMessageStream](https://ai-sdk.dev/docs/reference/ai-sdk-ui/create-ui-message-stream)

### Web Search APIs
- [Tavily Docs](https://docs.tavily.com/)
- [Serper API](https://serper.dev/)
- [Brave Search API](https://api-dashboard.search.brave.com/documentation/)

### UI Components
- [assistant-ui Thread](https://www.assistant-ui.com/docs/ui/Thread)
- [assistant-ui Tool UI](https://www.assistant-ui.com/docs/guides/ToolUI)

---

**Next steps:** Create implementation plan with file structure, environment setup, and complete working example.
