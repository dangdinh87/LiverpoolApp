---
title: "News Feature Rebuild"
description: "Comprehensive rebuild of news aggregation: module split, new sources, better extraction, UX enhancements"
status: pending
priority: P1
effort: 12h
branch: master
tags: [news, rss, scraping, architecture, ux]
created: 2026-03-06
---

# News Feature Rebuild

## Problem
`rss-parser.ts` (598 lines) is a God Object mixing types, config, feed fetching, scraping, dedup, enrichment, and public API. `article-scraper.ts` (374 lines) has 6 per-site extractors that are brittle. Only 4 RSS sources + 2 scrapers; no relevance scoring, no category tagging, basic URL-only dedup.

## Architecture Target
```
src/lib/news/
  types.ts          — NewsArticle, RawFeedItem, ArticleContent, Category, Zod schemas
  config.ts         — source configs, feed URLs, keywords, colors (client-safe subset re-exported)
  adapters/
    base.ts         — FeedAdapter interface
    rss.ts          — generic RSS adapter (rss-parser lib)
    lfc-scraper.ts  — liverpoolfc.com __NEXT_DATA__ adapter
    html-scraper.ts — cheerio HTML scraper (Bongdaplus)
  enrichers/
    og-meta.ts      — OG image + date extraction
    readability.ts  — @mozilla/readability + sanitize-html
    cheerio.ts      — per-site cheerio extractors (fallback)
  pipeline.ts       — orchestrator: fetch → validate → enrich → dedup → score → sort
  dedup.ts          — URL dedup + Jaccard title similarity
  relevance.ts      — Liverpool keyword scoring + freshness decay
  categories.ts     — rule-based article tagging
  mock.ts           — fallback mock data
```

## Phases

| # | Phase | Effort | Risk | Details |
|---|-------|--------|------|---------|
| 1 | Architecture — Module Split | 3h | Low | Split files, adapter pattern, zero behavior change |
| 2 | Content Pipeline — Sources, Relevance, Dedup | 3h | Med | New RSS sources, Jaccard dedup, categories, Zod |
| 3 | Article Reading — Readability + Sanitization | 2h | Med | @mozilla/readability primary, cheerio fallback |
| 4 | UX Enhancements | 3h | Low | Load More, category filter, bookmarks, share |
| 5 | Testing & Quality | 1h | Low | Unit tests for pipeline components |

## New Dependencies
- `zod` — RSS item validation
- `@mozilla/readability` + `jsdom` — content extraction
- `sanitize-html` — XSS prevention
- No paid services. All free-tier compatible.

## Key Constraints
- Vercel hobby plan (serverless, no headless browser)
- Supabase free tier (bookmarks table only)
- ISR caching (no Vercel KV — keep `revalidate` pattern)
- `import "server-only"` on all server modules
- `React.cache()` on all public fetchers
- Client components import only from `config.ts` (no server-only leaks)

## Phase Details
- [Phase 1: Architecture](./phase-1-architecture.md)
- [Phase 2: Content Pipeline](./phase-2-pipeline.md)
- [Phase 3: Article Reading](./phase-3-readability.md)
- [Phase 4: UX Enhancements](./phase-4-ux.md)
- [Phase 5: Testing & Quality](./phase-5-testing.md)
