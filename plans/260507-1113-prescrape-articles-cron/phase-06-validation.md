# Phase 06 — Validation & Monitoring

## Context

- Parent plan: [plan.md](plan.md)
- Brainstorm §8 — success metrics + validation strategy
- All prior phases must be merged + deployed before starting this phase.

## Overview

- **Date:** 2026-05-07
- **Description:** Manual end-to-end verification on prod after rollout. Confirm GH Actions fires, sync writes content, article page renders fast, and no regressions in cleanup/digest. Establish baseline SQL queries for ongoing monitoring.
- **Priority:** P2
- **Implementation status:** pending
- **Review status:** pending

## Key Insights

- The whole architecture is observable through three signals: GH Actions tab (cron health), Vercel function logs (sync output), Supabase row state (content presence). All three should agree.
- Performance gain is most visible on a freshly-published article (last hour) — a pre-scraped article should serve in < 1s end-to-end.
- Random sampling across 17 sources catches per-source extractor regressions early. Don't just test the LFC official site.

## Requirements

- One manual GH Actions `workflow_dispatch` run + log verification.
- One Vercel function log inspection: confirm `[sync] Pre-scraped X/Y articles` line.
- Three SQL checks against Supabase (`articles` row state).
- TTFB sampling on five random articles (one per top source).
- Runbook note added to plan / shared with team.

## Architecture

Validation observability map:

| Layer | Signal | Where |
|-------|--------|-------|
| Trigger | "Hourly News Sync" green run | GitHub Actions tab |
| Function exec | `[sync] Pre-scraped X/Y articles` log | Vercel → Functions → /api/news/sync logs |
| Data | `content_en NOT NULL` count rising | Supabase SQL editor |
| User-facing | Article TTFB < 1s | Browser DevTools / Lighthouse |

## Related code files

- [src/lib/news/sync.ts](../../src/lib/news/sync.ts) — log lines to grep
- [.github/workflows/news-sync.yml](../../.github/workflows/news-sync.yml)
- Supabase project (no file)

## Implementation Steps

1. **Trigger first manual run**:
   - GitHub UI → Actions → "Hourly News Sync" → **Run workflow**.
   - Wait for green checkmark (~1–3 min for full sync).

2. **Inspect Vercel function log**:
   - Vercel dashboard → Project → Logs (or `vercel logs`).
   - Filter on `/api/news/sync`. Expect:
     - `[sync] Fetched N articles from adapters`
     - `[sync] Re-enriched X/Y thumbnails`
     - `[sync] Pre-scraped X/Y articles`
     - `[sync] Done in <Nms>: ... upserted`
   - Confirm total duration < 200,000 ms (< 200s).

3. **Run SQL checks** in Supabase SQL editor:
   ```sql
   -- A) Content coverage for recent articles
   SELECT COUNT(*) AS recent_with_content
   FROM articles
   WHERE content_en IS NOT NULL
     AND fetched_at > NOW() - INTERVAL '24 hours';

   -- B) Distribution of scrape staleness
   SELECT
     COUNT(*) FILTER (WHERE content_en IS NULL) AS missing,
     COUNT(*) FILTER (WHERE content_scraped_at > NOW() - INTERVAL '24 hours') AS fresh,
     COUNT(*) FILTER (WHERE content_scraped_at < NOW() - INTERVAL '7 days') AS stale,
     COUNT(*) AS total
   FROM articles
   WHERE is_active = true;

   -- C) Latest sync_logs entry incl. scraped count
   SELECT id, inserted, failed, duration_ms,
          (source_stats->>'scraped')::int AS scraped,
          created_at
   FROM sync_logs
   ORDER BY created_at DESC LIMIT 5;
   ```
   - **Expect**: A > 30, B has `missing` near zero after 2–3 syncs, C shows `scraped` non-zero.

4. **TTFB sampling** — open 5 random article URLs in browser DevTools (Network tab, disable cache):
   - One LFC official, one BBC, one Guardian, one VnExpress, one Bóng Đá+.
   - Record TTFB / Document load time. Expect all < 1.5s; ideally < 1s.
   - If any > 3s, inspect Vercel log for that URL: was content NULL? Did fallback `scrapeArticle` run?

5. **24h stability check** (passive):
   - After 24h, re-run SQL **A** and **C**. `scraped` count should be cumulative across 24 syncs. No spike in `failed`.

6. **Document outcome** in this file's "Review status" section once complete; if green, mark plan `status: completed` in `plan.md` frontmatter.

## Todo

- [ ] Manual `workflow_dispatch` run on GH Actions
- [ ] Inspect Vercel logs for new `[sync] Pre-scraped` line
- [ ] Run SQL check A (recent content coverage)
- [ ] Run SQL check B (scrape staleness distribution)
- [ ] Run SQL check C (sync_logs scraped count)
- [ ] TTFB measurement on 5 articles across 5 sources
- [ ] 24h stability re-check
- [ ] Update plan.md status to `completed` if all green
- [ ] Note any per-source extractor regression for follow-up

## Success Criteria

- GH Actions schedule fires within 30 min of `:00 UTC` for 24h consecutive (8+ runs).
- Vercel function p95 duration < 200s for `/api/news/sync`.
- SQL check A returns ≥ 80% of recent articles with `content_en IS NOT NULL`.
- All 5 sampled article TTFBs < 1.5s.
- No new errors in Vercel error logs since rollout.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Some sources extract empty content | Medium | Page falls back to original-link UI | Existing `extractor-sandbox.test.ts` regression suite + quick fix in extractor selectors |
| Sync duration creeps to 250s | Low | Approaches 300s ceiling | Reduce `SCRAPE_LIMIT` from 50 → 30; or reduce batch frequency to every 2h |
| GH Actions throttled despite public repo | Negligible | Schedule slips | Switch to cron-job.org (free) as backup |
| Supabase storage growth > expected | Low | Eats free-tier room | Phase 03 cleanup catches up after 60 days |

## Security Considerations

- All SQL checks are read-only.
- No user data exposed in logs (only article URLs and counts).
- Manual workflow_dispatch requires GitHub repo write access (controlled by repo permissions).

## Next steps

After 1 week of green metrics: archive this plan to `plans/archive/`, log learnings in `MEMORY.md` (e.g., "pre-scrape cron live, ~50 articles/hour, content_en avg 50KB"). Consider follow-ups:
- Add Slack/Discord alert on GH Actions failure (out of scope today).
- Pre-translate `content_vi` during sync if Groq quota allows.
- Per-source success rate dashboard (small Supabase view + admin page).
