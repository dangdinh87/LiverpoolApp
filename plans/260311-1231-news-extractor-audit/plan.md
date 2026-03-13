---
title: "News Extractor Audit & Fix"
description: "Audit and fix article content extraction for all 16+ news sources"
status: pending
priority: P2
effort: 3h
branch: master
tags: [news, scraping, extractors, bug-fix]
created: 2026-03-11
---

# News Extractor Audit & Fix

## Problem
Multiple news sources have broken, partial, or missing extractors. thisisanfield.com has a redirect loop. BBC is CSR-heavy. 4 Vietnamese sources (tuoitre, thanhnien, dantri, vietnamnet) lack dedicated extractors and rely on Readability fallback (~80% success). No `webthethao.vn` extractor exists. Fetch timeout is 10s -- too tight for slow CMS sites.

## Current State (post-prior implementation)
Code already has: dedicated extractors for znews.vn, vnexpress.net, dantri, vietnamnet, tuoitre, thanhnien; `extractVietnameseGeneric` DRY helper; `extractLiverpoolEcho` for Reach CMS; thisisanfield feed commented out; extraction logging.

**Still needed:**
- webthethao.vn has RSS feed but no extractor (falls to generic)
- Timeout still hardcoded 10s for all sources (slow sites need 15s)
- No htmlContent on Vietnamese extractors besides bongda/znews
- BBC extractor untested on real articles (CSR concern)
- No automated test script for regression detection

## Architecture
`scrapeArticle()` -> Readability first (>300 chars) -> per-site cheerio fallback via `extractors` Record. Rich content uses `htmlContent` rendered via `.article-html-content` CSS class.

## Phases

| Phase | Focus | Effort | File |
|-------|-------|--------|------|
| 1 | Fix broken: timeout, webthethao, BBC hardening | 45min | [phase-01](./phase-01-fix-broken-sources.md) |
| 2 | Add Vietnamese extractor gaps + htmlContent | 1.5h | [phase-02-add-vietnamese-extractors.md](./phase-02-add-vietnamese-extractors.md) |
| 3 | Verify & test all sources via MCP DevTools | 45min | [phase-03-verify-and-test.md](./phase-03-verify-and-test.md) |

## Key Files
- `src/lib/news/enrichers/article-extractor.ts` -- all extractors + `scrapeArticle()`
- `src/lib/news/enrichers/readability.ts` -- Readability fallback
- `src/lib/news/config.ts` -- RSS feeds + SOURCE_CONFIG
- `src/lib/news/types.ts` -- `ArticleContent` type
- `src/app/news/[...slug]/page.tsx` -- article render page
- `src/app/globals.css` -- `.article-html-content` styles

## Success Criteria
- All 16 active sources have dedicated extractors
- Slow sources (BBC, Echo) use 15s timeout
- webthethao.vn articles extract correctly
- MCP DevTools verification passes on 3+ articles per source
