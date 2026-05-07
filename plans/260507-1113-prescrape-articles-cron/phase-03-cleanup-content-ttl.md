# Phase 03 — Cleanup Cron Extension (Content TTL)

## Context

- Parent plan: [plan.md](plan.md)
- Brainstorm 5.3: storage cap = 50/day × 50KB × 60 days = 150MB
- Scout: [scout/scout-01-relevant-files.md](scout/scout-01-relevant-files.md) — current cleanup logic

## Overview

- **Date:** 2026-05-07
- **Description:** Add a third step to the daily cleanup cron: NULL `content_en` and `content_scraped_at` for articles where `published_at < NOW() - INTERVAL '60 days'`. Keeps Supabase storage growth bounded while preserving the row metadata for analytics and SEO sitemap.
- **Priority:** P3
- **Implementation status:** pending
- **Review status:** pending

## Key Insights

- Existing hard-delete (line 20) only removes rows where `content_en IS NULL`. With pre-scrape on, almost no rows will be NULL → hard-delete becomes a no-op. **Without this phase, the table grows unbounded.**
- Choosing 60 days (matches existing hard-delete window) is the simplest mental model: "after 60 days, content is wiped; row is hard-deleted on the next pass once it's also `is_active: false`."
- NULL-ing instead of dropping the row: keeps `articles.url`, `title`, `published_at` intact for sitemap, search, and analytics. Only the heavy `content_en jsonb` (~50KB) is freed.
- Order of ops matters: NULL content **before** hard-delete in same handler so the next run's hard-delete catches newly-NULL'd, deactivated rows.

## Requirements

- New step: `UPDATE articles SET content_en = NULL, content_scraped_at = NULL WHERE published_at < NOW() - INTERVAL '60 days' AND content_en IS NOT NULL`.
- Return count in response JSON: `contentCleared`.
- Existing soft-delete + hard-delete + sync_logs cleanup unchanged.
- Same handler, same auth, same schedule (no vercel.json change).

## Architecture

```
GET /api/news/cleanup (cron 0 3 * * *)
├─ soft-delete: is_active=false WHERE published_at < now-30d         (existing)
├─ NEW: NULL content_en WHERE published_at < now-60d AND content_en NOT NULL
├─ hard-delete: DELETE WHERE is_active=false AND content_en IS NULL
│                AND published_at < now-60d                          (existing — now operates on freshly-NULL'd rows)
└─ delete sync_logs > 30d                                            (existing)
```

## Related code files

- [src/app/api/news/cleanup/route.ts](../../src/app/api/news/cleanup/route.ts) — full file is 39 lines; insertion point is between line 17 and line 20

## Implementation Steps

1. **Edit** [route.ts](../../src/app/api/news/cleanup/route.ts) — insert new block after the soft-delete (after line 17) and before the hard-delete:
   ```ts
   // Free heavy content for old articles (keep metadata for sitemap/search)
   const { count: contentCleared } = await supabase
     .from("articles")
     .update(
       { content_en: null, content_scraped_at: null },
       { count: "exact" }
     )
     .lt("published_at", sixtyDaysAgo)
     .not("content_en", "is", null);
   ```
2. **Update response** at line 33–38:
   ```ts
   return NextResponse.json({
     ok: true,
     deactivated: deactivated ?? 0,
     contentCleared: contentCleared ?? 0,
     deleted: deleted ?? 0,
     logsDeleted: logsDeleted ?? 0,
   });
   ```
3. **Verify Supabase filter syntax**: `.not("content_en", "is", null)` is correct PostgREST for `IS NOT NULL`. Sanity-check via Supabase dashboard SQL editor first if uncertain:
   ```sql
   SELECT count(*) FROM articles
   WHERE published_at < NOW() - INTERVAL '60 days'
     AND content_en IS NOT NULL;
   ```
4. **Local test**: trigger cleanup endpoint with fixture data (or skip — low-risk write).

## Todo

- [ ] Insert NULL-content step in cleanup route
- [ ] Add `contentCleared` to response payload
- [ ] Verify PostgREST `.not(... "is", null)` syntax
- [ ] Spot-check on staging via cURL after deploy

## Success Criteria

- After first run on prod (24h+ post-rollout), Supabase row count for `content_en IS NOT NULL` is bounded by ~ (sync rate) × 60 days.
- Storage usage flat-line trend visible in Supabase dashboard within 90 days.
- No regressions in soft-delete / hard-delete counts.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| NULL-ing content for active articles | None | N/A | Filter is `published_at < 60d ago`, so only old |
| Hard-delete races with NULL update | Low | One-cron-cycle delay before delete | Re-runs daily; eventually consistent |
| User clicks 61-day-old archived article post-cleanup | Low | Falls back to on-demand `scrapeArticle()` (slow) | Acceptable: rare, original source URL still valid |
| PostgREST `.not("content_en", "is", null)` syntax | Low | Update fails | Verified syntax against Supabase docs (`/api/news/cleanup` already uses `.is(... null)` pattern at line 24) |

## Security Considerations

- Service-role client (existing pattern, no change).
- `withCronAuth` already wraps handler.
- No PII or auth tokens in `content_en` — it's public article HTML, safe to drop.

## Next steps

→ Phase 04: stand up the GH Actions hourly trigger so phase 01 runs at scale.
