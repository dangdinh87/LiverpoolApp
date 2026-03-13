---
title: "News Pipeline Full Audit + AI Digest"
description: "Fix 17 pipeline issues (perf, DRY, monitoring) + add AI daily digest"
status: completed
priority: P1
effort: 18h
branch: master
tags: [news, performance, audit, ai-digest, groq]
created: 2026-03-11
---

# News Pipeline Full Audit + AI Daily Digest

## Scope

18 issues across 4 phases: critical performance (7h), code quality (3h), reliability (4h), AI digest (5h).

## Phase Summary

| Phase | File | Issues | Effort | Priority | Status |
|-------|------|--------|--------|----------|--------|
| 01 | `phase-01-critical-performance.md` | C1, C3, C4 | 7h | CRITICAL | DONE (2026-03-11) |
| 02 | `phase-02-code-quality-dry.md` | C2, C5, H2, H4, M1, M2, M6 | 3h | HIGH | DONE (2026-03-11) |
| 03 | `phase-03-reliability-monitoring.md` | H1, H3, H5, H6, M4, M5 | 4h | HIGH | DONE (2026-03-11) |
| 04 | `phase-04-ai-daily-digest.md` | New feature | 5h | MEDIUM | DONE (2026-03-11) |

## Issue Index

### Critical (5)
- **C1** Non-blocking sync — `syncIfStale()` blocks page 10-30s
- **C2** Duplicate sync logic — `db.ts` vs `sync/route.ts`
- **C3** Article content not cached — `scrapeArticle()` hits source every visit
- **C4** 300 articles shipped to client — ~150KB JSON in page props
- **C5** `paragraphs.includes()` O(n) — should use `Set<string>`

### High (6)
- **H1** No health monitoring — no per-source stats
- **H2** `LFC_KEYWORDS` duplicated in `config.ts` + `relevance.ts`
- **H3** `webthethao` has no extractor — falls back to Readability only
- **H4** `detectSource()` duplicated in 2 files
- **H5** `fetchOgMeta` downloads full body then truncates
- **H6** No DB cleanup / article TTL

### Medium (6)
- **M1** `validation.ts` dead code
- **M2** Disabled sources (`tia`, `sky`) in SOURCE_CONFIG
- **M3** Cross-lang dupes — accept as feature
- **M4** Related articles pool too small (20)
- **M5** No rate limiting on API endpoints
- **M6** `znews.vn` URL detection bug in `detectSource()`

### New Feature
- **F1** AI Daily Digest — cron + Groq + `news_digests` table + UI

## Success Metrics

- News page load: <2s (from 10-30s cold start)
- Article detail load: <1s (from 3-10s per scrape)
- Client payload: <50KB (from ~150KB)
- Extraction success rate: >90% (currently unknown)
- Digest: generated daily by 7:00 AM VN

## Dependencies

- Supabase: schema migrations for `content_en`, `news_digests`, `extraction_stats`
- Groq API: already integrated for translate + chat; reuse for digest
- Vercel Cron: for daily digest generation + DB cleanup
