# Phase 02: AI Translation (EN->VI via Groq)

## Context
- [Plan overview](./plan.md)
- [Phase 01: DB Sync](./phase-01-db-sync.md) (prerequisite)
- Groq usage reference: `src/app/api/chat-groq/route.ts`
- Model: `llama-3.3-70b-versatile` (from `src/config/constants.ts`)
- Existing env: `GROQ_API_KEY` already configured

## Overview

Add on-demand translation for EN articles. User clicks "Translate" button on article page. API route calls Groq to translate title + paragraphs to Vietnamese. DB caches `title_vi`/`snippet_vi`. localStorage caches full translated paragraphs client-side.

## Key Insights

- Groq free tier: 30 req/min, 14,400 req/day — sufficient for on-demand translation
- `llama-3.3-70b-versatile` handles Vietnamese well, already proven by chat feature
- Full article paragraphs can be 2-5KB text. Groq context window = 128K tokens. No truncation needed.
- Translation is idempotent — re-translating same article returns same result (cached)
- Article page currently renders paragraphs as `content.paragraphs[]` from scrapeArticle(). TranslateButton swaps displayed paragraphs client-side.

## Requirements

1. `/api/news/translate` POST endpoint (no auth, public — it's a read-only translation)
2. TranslateButton component toggles EN/VI display on article page
3. DB cache: store `title_vi`, `snippet_vi` on articles table (already has columns from Phase 01 schema)
4. localStorage cache: store full translated paragraphs keyed by article URL
5. Groq prompt optimized for football/sports Vietnamese translation

## Architecture

### Translation Flow

```
User clicks "Translate" on EN article
  │
  ├── 1. Check localStorage cache (key: `lfc-translated-{urlHash}`)
  │    ├── HIT → display cached translation instantly
  │    └── MISS → continue to API
  │
  ├── 2. POST /api/news/translate
  │    Body: { url, title, paragraphs: string[] }
  │
  │    API Route:
  │    ├── Check DB: SELECT title_vi FROM articles WHERE url = ?
  │    │    ├── HAS title_vi → skip title translation
  │    │    └── NO title_vi → include title in Groq prompt
  │    │
  │    ├── Groq translate:
  │    │    System: "You are a football/soccer translator EN→VI..."
  │    │    User: JSON { title, paragraphs }
  │    │    Response: JSON { title_vi, paragraphs_vi }
  │    │
  │    ├── Save title_vi/snippet_vi to DB (UPDATE articles SET ...)
  │    └── Return { title_vi, paragraphs_vi }
  │
  └── 3. Client saves to localStorage + swaps displayed content
```

### Groq Prompt Design

```
System: You are a professional EN→VI translator specializing in football/soccer news.
Translate accurately. Use Vietnamese football terminology:
- "Premier League" → "Ngoai hang Anh"
- "Champions League" → "Cup C1 chau Au"
- "manager/head coach" → "HLV truong"
- "clean sheet" → "giu sach luoi"
- "hat-trick" → keep as "hat-trick"
- Player/team names: keep original (do not transliterate)

Respond with valid JSON only: { "title_vi": "...", "paragraphs_vi": ["...", "..."] }
Do not add explanations outside the JSON.
```

### TranslateButton Component

```
┌─────────────────────────┐
│ 🌐 Dich sang Tieng Viet │  (for EN articles)
│     Translate to VI     │
└─────────────────────────┘
         │ click
         ▼
┌─────────────────────────┐
│ ⏳ Dang dich...          │  (loading state)
└─────────────────────────┘
         │ done
         ▼
┌─────────────────────────┐
│ ✓ Xem ban goc (EN)     │  (toggle back)
└─────────────────────────┘
```

Position: Below article title, above article body. Only shown for `language === "en"` articles.

## Related Code Files

| File | Role | Change |
|------|------|--------|
| `src/app/api/news/translate/route.ts` | New API route | Create |
| `src/lib/news/translation-cache.ts` | localStorage helpers | Create |
| `src/components/news/translate-button.tsx` | Toggle UI component | Create |
| `src/app/news/[...slug]/page.tsx` | Article reader | Add TranslateButton |
| `src/lib/news/db.ts` | DB helpers | Add updateTranslation() |
| `src/config/constants.ts` | Model config | Reference only |

## Implementation Steps

### Step 1: Create translation API route
- File: `src/app/api/news/translate/route.ts`
- POST handler, accepts `{ url, title, paragraphs: string[] }`
- Validate input (url required, paragraphs array required)
- Check DB for existing `title_vi` (skip re-translation of title if cached)
- Build Groq prompt with football terminology context
- Call Groq via `@ai-sdk/groq` + `generateText` (not streaming — need full JSON response)
- Parse JSON response, validate structure
- UPDATE articles SET title_vi, snippet_vi WHERE url = ?
- Return `{ title_vi, paragraphs_vi }`
- Error handling: Groq rate limit → 429, parse error → 500

```typescript
import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

const result = await generateText({
  model: groq("llama-3.3-70b-versatile"),
  system: TRANSLATION_SYSTEM_PROMPT,
  prompt: JSON.stringify({ title, paragraphs }),
  temperature: 0.3, // low temp for faithful translation
});

const parsed = JSON.parse(result.text);
```

### Step 2: Create translation cache helpers
- File: `src/lib/news/translation-cache.ts`
- No `server-only` guard (client-side localStorage)
- `getTranslationCache(url): TranslatedContent | null`
- `setTranslationCache(url, content): void`
- Key format: `lfc-translated-{md5hash(url)}` or just `lfc-tl-{base64url}`
- Actually simpler: `lfc-translated` as a single JSON object `{ [url]: content }`
- Max 100 entries (LRU eviction by oldest)
- Type: `TranslatedContent = { title_vi: string; paragraphs_vi: string[] }`

### Step 3: Create TranslateButton component
- File: `src/components/news/translate-button.tsx`
- Client component (`"use client"`)
- Props: `{ articleUrl, originalTitle, originalParagraphs, language }`
- States: `isTranslated`, `isLoading`, `translatedContent`
- On mount: check localStorage cache
- On click: fetch `/api/news/translate`, save to localStorage
- Renders toggle button + swaps `<div id="article-body">` content
- Challenge: article body is rendered by server component in `[...slug]/page.tsx`
  - Solution: TranslateButton wraps article body and conditionally renders original or translated paragraphs

### Step 4: Modify article page
- File: `src/app/news/[...slug]/page.tsx`
- Detect article language from source: `VI_SOURCES.has(source) ? "vi" : "en"`
- If language is "en", wrap article body in TranslateButton:
  ```tsx
  <TranslateButton
    articleUrl={url}
    originalTitle={content.title}
    originalParagraphs={content.paragraphs}
    language={articleLang}
  >
    {/* existing paragraph rendering */}
  </TranslateButton>
  ```
- TranslateButton renders children (original) or translated content based on state
- For VI articles: no TranslateButton shown

### Step 5: Add DB helper for translation cache
- File: `src/lib/news/db.ts` (modify)
- Add `updateArticleTranslation(url, title_vi, snippet_vi)` function
- Uses service role client (same pattern as sync route)
- Called by translate API route after Groq completes

## Todo

- [ ] Create `src/app/api/news/translate/route.ts`
- [ ] Create `src/lib/news/translation-cache.ts`
- [ ] Create `src/components/news/translate-button.tsx`
- [ ] Add `updateArticleTranslation()` to `src/lib/news/db.ts`
- [ ] Modify `src/app/news/[...slug]/page.tsx` to include TranslateButton
- [ ] Test: translate an EN article, verify Groq response parses correctly
- [ ] Test: reload article page, verify localStorage cache hit
- [ ] Test: verify title_vi saved in DB articles table
- [ ] Test: VI articles do NOT show translate button

## Success Criteria

1. EN articles show "Translate" button below title
2. Clicking translate calls Groq and shows Vietnamese translation within 3-5s
3. Subsequent visits to same article show cached translation instantly
4. `title_vi` and `snippet_vi` persisted in DB articles table
5. VI articles do not show translate button
6. Groq errors show user-friendly error message (not crash)
7. Translation quality: proper Vietnamese football terminology

## Risk Assessment

- **Groq JSON parsing**: LLM may return invalid JSON. Mitigation: wrap in try-catch, retry once, fallback error message.
- **Large articles**: 50+ paragraphs = large prompt. Mitigation: truncate to first 30 paragraphs if > 30.
- **Groq rate limit hit**: 30 req/min. Mitigation: on-demand only (user-initiated), unlikely to hit.
- **localStorage quota**: ~5MB per domain. 100 articles x 5KB = 500KB. Well within limit.

## Security Considerations

- No auth on translate endpoint: acceptable — it's a read-only translation, no user data
- GROQ_API_KEY server-side only, never exposed
- User-supplied `paragraphs` sent to Groq: no injection risk (Groq is a generation model, not executing code)
- Rate limiting: consider adding basic rate limit (e.g., 10 req/min per IP) if abuse is a concern. Skip for MVP.

## Next Steps

After Phase 02 is complete, proceed to [Phase 03: Cron Setup + Polish](./phase-03-cron-polish.md).
