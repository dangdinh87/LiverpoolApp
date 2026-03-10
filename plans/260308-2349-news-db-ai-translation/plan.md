---
title: "News DB Persistence + AI Translation"
description: "Luu tin tuc vao Supabase DB voi cron sync 30p + dich EN->VI bang Groq AI"
status: pending
priority: P1
effort: 6h
branch: master
tags: [news, supabase, groq, translation, cron]
created: 2026-03-08
---

# News DB Persistence + AI Translation (EN->VI)

## Problem Statement

Current news system fetches all 13 sources on every page load via ISR. This means:
1. Cold starts are slow (13 parallel fetches, OG enrichment, dedup, scoring)
2. No persistent history — articles disappear when sources rotate them out
3. EN articles not accessible to Vietnamese users without external translation
4. Redundant work — same pipeline runs on every ISR revalidation

## Solution

Store articles in Supabase `articles` table. External cron (cron-job.org) hits `/api/news/sync` every 30 min. News pages read from DB instead of live pipeline. On-demand Groq AI translation for EN articles (title + paragraphs -> Vietnamese).

## Architecture Overview

```
                    SYNC (every 30 min)
                    ┌──────────────────────────────┐
 cron-job.org ──GET─► /api/news/sync               │
                    │  ├── reuse existing pipeline   │
                    │  ├── fetchAllNews(adapters)     │
                    │  └── UPSERT into articles table │
                    └──────────────────────────────┘

                    READ (page load)
                    ┌──────────────────────────────┐
 /news page ────────► getNewsFromDB(limit)          │
 homepage widgets ──► SELECT * FROM articles        │
                    │  ORDER BY language='vi' DESC,  │
                    │         relevance DESC          │
                    │  FALLBACK → getNews() realtime  │
                    └──────────────────────────────┘

                    TRANSLATE (on-demand)
                    ┌──────────────────────────────┐
 TranslateButton ──► /api/news/translate            │
 (client click)    │  ├── Check DB cache (title_vi)  │
                   │  ├── Groq llama-3.3-70b         │
                   │  │   translate title+paragraphs  │
                   │  ├── Save title_vi/snippet_vi    │
                   │  └── Return translated content   │
                   └──────────────────────────────┘
```

## Phases

| Phase | Description | Effort | Files |
|-------|-------------|--------|-------|
| [Phase 01](./phase-01-db-sync.md) | DB Schema + Sync Pipeline | ~2h | 4 new, 4 modify |
| [Phase 02](./phase-02-ai-translation.md) | AI Translation (Groq) | ~3h | 3 new, 2 modify |
| [Phase 03](./phase-03-cron-polish.md) | Cron Setup + Polish | ~1h | 0 new, 2 modify |

## Files Overview

### New Files
1. `supabase/migrations/002_articles.sql` — articles table + indexes
2. `src/app/api/news/sync/route.ts` — cron sync endpoint
3. `src/app/api/news/translate/route.ts` — AI translation endpoint
4. `src/lib/news/db.ts` — DB read helpers (getNewsFromDB)
5. `src/lib/news/translation-cache.ts` — localStorage translated content cache
6. `src/components/news/translate-button.tsx` — translate toggle UI

### Modified Files
1. `src/app/news/page.tsx` — read from DB (with realtime fallback)
2. `src/app/news/[...slug]/page.tsx` — add TranslateButton
3. `src/lib/news/index.ts` — export getNewsFromDB
4. `.env.example` — add CRON_SECRET
5. `src/components/home/news-section.tsx` — accept DB data
6. `src/components/home/latest-news-widget.tsx` — accept DB data
7. `docs/news-feature.md` — document new architecture

## Key Design Decisions

1. **External cron, not pg_cron or Edge Functions** — KISS. cron-job.org is free, reliable, no Supabase plan dependency
2. **UPSERT by URL** — idempotent, cron miss = next run catches up
3. **Groq llama-3.3-70b-versatile** — already used by chat feature, fast, free tier 30 req/min, good Vietnamese
4. **On-demand translation** — no batch pre-translation, user clicks "Translate" button on EN articles
5. **localStorage for full paragraph cache** — DB stores only title_vi/snippet_vi (lightweight). Full translated paragraphs cached in browser
6. **Graceful fallback** — if DB empty, fall back to existing `getNews()` realtime fetch

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Groq rate limit (30 req/min free) | Translation fails | On-demand only, not batch. User sees "try again" |
| cron-job.org downtime | Stale articles | UPSERT is idempotent; fallback to realtime fetch |
| Supabase 500MB limit | DB full | ~1KB/article x 10K = 10MB. Tiny |
| CRON_SECRET leak | Unauthorized sync | Only in server env, never NEXT_PUBLIC |

## Unresolved Questions

- Should we add a `content_vi` JSONB column for full paragraph translations, or keep localStorage-only? (localStorage chosen for now — simpler, no DB bloat)
- Should sync run more frequently during match days? (Not needed for MVP)
