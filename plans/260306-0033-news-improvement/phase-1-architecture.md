# Phase 1: Architecture — Module Split

## Context
- [plan.md](./plan.md)
- Current: `src/lib/rss-parser.ts` (598 lines), `src/lib/article-scraper.ts` (374 lines), `src/lib/news-config.ts` (47 lines)
- Reference pattern: `src/lib/football/` (provider interface + barrel `index.ts`)

## Overview
Extract the God Object into a modular `src/lib/news/` directory using an adapter pattern. Zero behavior change, zero UI change. All existing tests (if any) and build must pass after this phase.

## Key Insights
- `rss-parser.ts` mixes 7 concerns: types, config, RSS parsing, LFC scraping, Bongdaplus scraping, dedup, enrichment, public API
- `article-scraper.ts` has 6 per-site extractors + generic fallback — these become enrichers
- `news-config.ts` is already client-safe — keep it but expand it
- The football module pattern (`provider.ts` interface + `index.ts` barrel with `React.cache()`) maps well to news adapters

## Requirements
1. Split `rss-parser.ts` into discrete files under `src/lib/news/`
2. Define `FeedAdapter` interface for all source fetchers
3. Move per-site article extractors from `article-scraper.ts` into `src/lib/news/enrichers/`
4. Barrel export via `src/lib/news/index.ts` with `import "server-only"` and `React.cache()`
5. Update all imports in: `news/page.tsx`, `news/[slug]/page.tsx`, `news-feed.tsx`, `news-config.ts`
6. Delete old `rss-parser.ts` and `article-scraper.ts` after migration
7. `news-config.ts` stays as client-safe config (or merges into `src/lib/news/config.ts` with `"use client"` guard)

## Architecture

### File Structure
```
src/lib/news/
  index.ts              — barrel: getNews(), scrapeArticle() with React.cache()
  types.ts              — NewsArticle, NewsSource, NewsLanguage, ArticleContent, RawFeedItem, FeedConfig
  config.ts             — RSS_FEEDS array, SOURCE_CONFIG, BONGDAPLUS config, LFC_KEYWORDS
  adapters/
    base.ts             — FeedAdapter interface { fetch(): Promise<NewsArticle[]> }
    rss-adapter.ts      — generic RSS feed adapter (wraps rss-parser lib)
    lfc-adapter.ts      — liverpoolfc.com __NEXT_DATA__ scraper
    bongdaplus-adapter.ts — cheerio HTML scraper with LFC keyword filter
  enrichers/
    og-meta.ts          — fetchOgMeta(), enrichArticleMeta()
    article-extractor.ts — scrapeArticle() + per-site extractors (from article-scraper.ts)
  dedup.ts              — deduplicateArticles() (URL normalization)
  pipeline.ts           — orchestrator: calls adapters → dedup → enrich → sort → return
  mock.ts               — getMockNews()
src/lib/news-config.ts  — client-safe re-exports (NewsSource, SOURCE_CONFIG, encodeArticleSlug, etc.)
```

### FeedAdapter Interface
```typescript
// src/lib/news/adapters/base.ts
import type { NewsArticle } from "../types";

export interface FeedAdapter {
  readonly name: string;
  fetch(): Promise<NewsArticle[]>;
}
```

### Pipeline (simplified)
```typescript
// src/lib/news/pipeline.ts
import type { NewsArticle } from "./types";
import type { FeedAdapter } from "./adapters/base";
import { deduplicateArticles } from "./dedup";
import { enrichArticleMeta } from "./enrichers/og-meta";

export async function fetchAllNews(
  adapters: FeedAdapter[],
  limit: number
): Promise<NewsArticle[]> {
  const results = await Promise.allSettled(
    adapters.map((a) => a.fetch())
  );

  const all: NewsArticle[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") all.push(...r.value);
  }

  if (all.length === 0) return []; // caller handles mock fallback

  const unique = deduplicateArticles(all);
  unique.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

  const sliced = unique.slice(0, limit);
  await enrichArticleMeta(sliced, 7);
  return sliced;
}
```

### Barrel (index.ts)
```typescript
// src/lib/news/index.ts
import "server-only";
import { cache } from "react";
import { fetchAllNews } from "./pipeline";
import { RssAdapter } from "./adapters/rss-adapter";
import { LfcAdapter } from "./adapters/lfc-adapter";
import { BongdaplusAdapter } from "./adapters/bongdaplus-adapter";
import { RSS_FEEDS } from "./config";
import { getMockNews } from "./mock";
import type { NewsArticle } from "./types";

// Re-export types for server consumers
export type { NewsArticle, ArticleContent } from "./types";
export type { NewsSource, NewsLanguage } from "./types";

const adapters = [
  new LfcAdapter(),
  ...RSS_FEEDS.map((cfg) => new RssAdapter(cfg)),
  new BongdaplusAdapter(),
];

export const getNews = cache(async (limit = 20): Promise<NewsArticle[]> => {
  try {
    const articles = await fetchAllNews(adapters, limit);
    return articles.length > 0 ? articles : getMockNews().slice(0, limit);
  } catch (err) {
    console.error("[news] Fatal error:", err);
    return getMockNews().slice(0, limit);
  }
});

export { scrapeArticle } from "./enrichers/article-extractor";
```

## Related Code Files
- `src/lib/rss-parser.ts` — source (to be deleted)
- `src/lib/article-scraper.ts` — source (to be deleted)
- `src/lib/news-config.ts` — keep, update imports
- `src/app/news/page.tsx` — update import: `@/lib/rss-parser` → `@/lib/news`
- `src/app/news/[slug]/page.tsx` — update import: `@/lib/article-scraper` → `@/lib/news`
- `src/components/news/news-feed.tsx` — update import: `@/lib/rss-parser` → `@/lib/news`
- `src/components/home/news-section.tsx` — update import if exists

## Implementation Steps

### Step 1: Create `src/lib/news/types.ts`
- Move `NewsSource`, `NewsLanguage`, `NewsArticle` from `rss-parser.ts`
- Move `ArticleContent` from `article-scraper.ts`
- Add `RawFeedItem` interface for rss-parser output
- Add `FeedConfig` interface (was `RssFeedConfig`)

### Step 2: Create `src/lib/news/config.ts`
- Move `RSS_FEEDS`, `SOURCE_CONFIG`, `BONGDAPLUS_URLS`, `LFC_KEYWORDS` from `rss-parser.ts`
- Server-only (contains feed URLs)

### Step 3: Create `src/lib/news/adapters/`
- `base.ts` — `FeedAdapter` interface
- `rss-adapter.ts` — extract `fetchRssFeed()` + parser setup + image extraction helpers from `rss-parser.ts` lines 95-204
- `lfc-adapter.ts` — extract `scrapeLfcOfficial()` from `rss-parser.ts` lines 209-275
- `bongdaplus-adapter.ts` — extract `scrapeBongdaplus()` + `isLfcRelated()` from `rss-parser.ts` lines 278-374

### Step 4: Create `src/lib/news/dedup.ts`
- Move `deduplicateArticles()` from `rss-parser.ts` lines 380-393

### Step 5: Create `src/lib/news/enrichers/`
- `og-meta.ts` — move `fetchOgMeta()`, `isFakeDate()`, `enrichArticleMeta()`, `sanitizeUrl()` from `rss-parser.ts`
- `article-extractor.ts` — move entire `article-scraper.ts` content, keep `scrapeArticle()` and `getOgImage()` exports

### Step 6: Create `src/lib/news/pipeline.ts`
- Move `getNews()` orchestration logic (without cache wrapper)
- Accept adapters as param for testability

### Step 7: Create `src/lib/news/mock.ts`
- Move `getMockNews()` from `rss-parser.ts`

### Step 8: Create `src/lib/news/index.ts`
- Barrel with `import "server-only"`, `React.cache()` wrappers
- Instantiate adapters, export `getNews()`, `scrapeArticle()`

### Step 9: Update consumers
- `src/app/news/page.tsx`: `import { getNews } from "@/lib/news"`
- `src/app/news/[slug]/page.tsx`: `import { scrapeArticle } from "@/lib/news"` + `import { getNews } from "@/lib/news"`
- `src/components/news/news-feed.tsx`: `import type { NewsArticle } from "@/lib/news"` → but this is a client component! Import type only from `@/lib/news/types` or keep using `news-config.ts`
- `src/lib/news-config.ts`: update to re-export from `@/lib/news/types` or keep independent

### Step 10: Delete old files + verify build
- Delete `src/lib/rss-parser.ts`
- Delete `src/lib/article-scraper.ts`
- Run `npm run build` — must succeed with zero regressions

## Todo List
- [ ] Create `src/lib/news/` directory
- [ ] Create `types.ts` with all type definitions
- [ ] Create `config.ts` with feed configs + source configs
- [ ] Create `adapters/base.ts` with FeedAdapter interface
- [ ] Create `adapters/rss-adapter.ts`
- [ ] Create `adapters/lfc-adapter.ts`
- [ ] Create `adapters/bongdaplus-adapter.ts`
- [ ] Create `dedup.ts`
- [ ] Create `enrichers/og-meta.ts`
- [ ] Create `enrichers/article-extractor.ts`
- [ ] Create `pipeline.ts`
- [ ] Create `mock.ts`
- [ ] Create `index.ts` barrel
- [ ] Update `news-config.ts` imports
- [ ] Update `news/page.tsx` imports
- [ ] Update `news/[slug]/page.tsx` imports
- [ ] Update `news-feed.tsx` type imports
- [ ] Update `news-section.tsx` imports (if applicable)
- [ ] Delete `rss-parser.ts` and `article-scraper.ts`
- [ ] Run `npm run build` — verify zero errors
- [ ] Manual smoke test: `/news` page loads, article detail pages work

## Success Criteria
- Build passes with zero errors
- `/news` and `/news/[slug]` render identically to pre-refactor
- No `import` of deleted files anywhere in codebase
- Each new file < 150 lines
- `FeedAdapter` interface enables adding new sources in Phase 2 with just a new adapter file

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Broken imports after split | Medium | High | Grep all imports before deleting old files |
| Client component imports server-only module | Low | High | `news-feed.tsx` imports type-only; `news-config.ts` stays client-safe |
| Circular dependency in new module structure | Low | Medium | Types in separate file, no cross-adapter imports |

## Security Considerations
- `sanitizeUrl()` must be preserved in new location (og-meta.ts)
- No user input reaches RSS URLs — all hardcoded in config
- `article-extractor.ts` fetches arbitrary URLs from base64-decoded slugs — keep existing AbortController + timeout

## Next Steps
Phase 2 builds on this structure by adding new adapter files and enhancing `pipeline.ts` with Zod validation, relevance scoring, and Jaccard dedup.
