---
title: "News Extractor Audit & Fix"
description: "Audit and fix all 16 news source extractors for complete article content"
status: complete
priority: P1
effort: 6h
branch: master
tags: [news, scraping, extractors, audit]
created: 2026-03-11
---

# News Extractor Audit & Fix

## Problem
6 Vietnamese sources have NO dedicated cheerio extractors (rely on Readability fallback at 60-85% success). 3 English sources have broken/partial extraction. znews.vn is CSR-heavy with ~35% Readability success.

## Final State (All Phases Complete)
- **Working (15):** liverpoolfc.com, theguardian.com (htmlContent), empireofthekop.com, bongda.com.vn (htmlContent), 24h.com.vn, bongdaplus.vn, webthethao, vnexpress.net, tuoitre.vn, thanhnien.vn, dantri.com.vn, vietnamnet.vn, znews.vn, anfieldwatch.co.uk, liverpoolecho.co.uk
- **CSR-limited (1):** bbc (client-side rendered, shows "Content Unavailable" fallback)
- **Disabled (1):** thisisanfield.com (persistent redirect loop, feed commented out)

## Architecture
`scrapeArticle()` -> Readability first (>300 chars) -> per-site cheerio fallback. New extractors register in the `extractors` Record in `article-extractor.ts`. Rich content uses `htmlContent` field rendered via `.article-html-content` CSS.

## Phases

| Phase | Focus | Effort | File | Status |
|-------|-------|--------|------|--------|
| 1 | Critical fixes: znews, vnexpress, thisisanfield | 1.5h | [phase-01](./phase-01-critical-fixes.md) | DONE |
| 2 | Vietnamese extractor coverage: dantri, vietnamnet, tuoitre, thanhnien | 2h | [phase-02](./phase-02-vi-extractors.md) | DONE |
| 3 | English source hardening: BBC, liverpoolecho, anfieldwatch, Guardian htmlContent | 1.5h | [phase-03](./phase-03-en-hardening.md) | DONE |
| 4 | Testing script + extraction logging | 1h | [phase-04](./phase-04-testing.md) | DONE |

## Key Files
- `src/lib/news/enrichers/article-extractor.ts` -- all extractors + `scrapeArticle()`
- `src/lib/news/enrichers/readability.ts` -- Readability fallback
- `src/lib/news/config.ts` -- RSS feeds + SOURCE_CONFIG
- `src/lib/news/types.ts` -- `ArticleContent` type
- `src/app/news/[...slug]/page.tsx` -- article render page
- `src/app/globals.css` -- `.article-html-content` styles

## Success Criteria
- All 16 sources have dedicated extractors (no Readability-only sources)
- znews.vn extraction succeeds on >80% of articles
- thisisanfield.com gracefully disabled or fixed
- Test script validates extraction on sample URLs per source
