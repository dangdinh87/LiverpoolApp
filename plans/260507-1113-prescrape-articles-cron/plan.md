---
title: "Pre-scrape Article Content via GitHub Actions Hourly Cron"
description: "Eliminate 5–15s article load by pre-scraping content during sync; trigger hourly via GitHub Actions to bypass Vercel Hobby cron quota."
status: pending
priority: P2
effort: 4h
branch: master
tags: [perf, scraping, infra]
created: 2026-05-07
---

## Overview

Article pages currently call `scrapeArticle(url)` on every render — first-visit latency 5–15s. Pre-scrape full HTML during the existing RSS sync pipeline, store in `articles.content_en` (already exists), and read DB-first on the article page. Hourly trigger via GitHub Actions (free, public repo) since Vercel Hobby cron quota is exhausted (cleanup + digest = 2/2).

**Result:** Article TTFB < 1s, $0 additional cost, fallback path preserved.

## Inputs

- Brainstorm: [brainstorm-260507-1113-prescrape-articles-from-cron.md](../reports/brainstorm-260507-1113-prescrape-articles-from-cron.md)
- Research 01 (concurrency): [research/researcher-01-concurrency-patterns.md](research/researcher-01-concurrency-patterns.md)
- Research 02 (GH Actions): [research/researcher-02-github-actions-cron.md](research/researcher-02-github-actions-cron.md)
- Scout: [scout/scout-01-relevant-files.md](scout/scout-01-relevant-files.md)

## Verified Facts

- `articles` table CONFIRMED has `content_en jsonb`, `content_vi jsonb`, `content_scraped_at timestamptz` (Supabase MCP) — no migration needed (overrides scout).
- `scrapeArticle()` in [article-extractor.ts](../../src/lib/news/enrichers/article-extractor.ts) already does DB cache check + write internally (24h TTL).
- `withCronAuth()` ready in [cron.ts](../../src/lib/cron.ts).
- Existing sync uses `Promise.allSettled` batches of 10 for og:image — model new scrape phase after [sync.ts](../../src/lib/news/sync.ts) lines 146–180.
- Repo public → unlimited free GH Actions minutes.

## Phases

| # | Phase | Status | Effort | File |
|---|-------|--------|--------|------|
| 01 | Sync pipeline scrape phase | [ ] pending | 90m | [phase-01-sync-scrape-phase.md](phase-01-sync-scrape-phase.md) |
| 02 | Article page DB-first read | [ ] pending | 30m | [phase-02-article-page-db-first.md](phase-02-article-page-db-first.md) |
| 03 | Cleanup cron extension | [ ] pending | 20m | [phase-03-cleanup-content-ttl.md](phase-03-cleanup-content-ttl.md) |
| 04 | GitHub Actions hourly trigger | [ ] pending | 30m | [phase-04-github-actions-cron.md](phase-04-github-actions-cron.md) |
| 05 | Vercel cron + maxDuration | [ ] pending | 10m | [phase-05-vercel-config.md](phase-05-vercel-config.md) |
| 06 | Validation & monitoring | [ ] pending | 30m | [phase-06-validation.md](phase-06-validation.md) |

## Success Criteria

- Article TTFB (P95) < 1s on prod after first GH Actions run.
- DB cache hit rate > 95% for articles published in last 24h.
- Sync cron duration stable < 200s.
- No regression in og:image enrichment or sync_logs.

## Validation Summary

**Validated:** 2026-05-07
**Questions asked:** 4 (concurrency, fresh TTL, cleanup TTL, deploy strategy)

### Confirmed Decisions

- **Concurrency pool** = **5** (Phase 01) — polite to 17 sources, ~80s peak.
- **Fresh-content TTL** = **7 days** (Phase 02) — DB read skips scrape if `content_scraped_at` < 7d ago.
- **Cleanup TTL** = **60 days** (Phase 03) — NULL `content_en` matches hard-delete window. Storage cap ~150MB.
- **Deploy** = **single PR with all 6 phases**, but commit Phase 04 first → verify GH Actions on prod runs successfully → THEN merge Phase 05 (remove Vercel cron). Strict order avoids 24h sync gap.

### Prerequisites (manual setup, before running)

- [ ] Add **GitHub repo secret** `CRON_SECRET` at https://github.com/dangdinh87/LiverpoolApp/settings/secrets/actions (value = same as Vercel `CRON_SECRET` env var; copy from Vercel dashboard).
- [ ] Add **GitHub repo secret** `SYNC_URL` = `https://www.liverpoolfcvn.blog/api/news/sync`.
- [ ] Confirm Vercel `CRON_SECRET` env var still exists (already verified ✅).
- [ ] After Phase 04 merges, manual `workflow_dispatch` once to verify HTTP 200 + `scraped: N` in body.

### Action Items

- No phase-file revisions needed — plan defaults match all decisions.

## Resolved Notes

- **GH Actions schedule jitter** (5–30 min): accepted as-is for news cadence. If precision becomes critical later, switch to Vercel Pro or external cron service.
