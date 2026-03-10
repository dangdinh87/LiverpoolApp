# Phase 03: Cron Setup + Polish

## Context
- [Plan overview](./plan.md)
- [Phase 01: DB Sync](./phase-01-db-sync.md) (prerequisite)
- [Phase 02: AI Translation](./phase-02-ai-translation.md) (prerequisite)

## Overview

Configure external cron service to hit sync endpoint every 30 min. Add initial data seed. Ensure graceful fallback. Update documentation.

## Key Insights

- cron-job.org free tier: unlimited jobs, 1-min minimum interval, HTTP GET with custom headers
- Sync route is idempotent (UPSERT) — safe to run multiple times, missed runs just mean slightly stale data
- Initial deployment needs a manual sync run to populate DB before first user visit
- Vercel serverless timeout: 10s (hobby) / 60s (pro). Pipeline typically completes in 5-8s. Should be OK.

## Requirements

1. Document cron-job.org setup steps
2. Manual seed: run sync once after deployment
3. Fallback verified: DB empty -> realtime fetch works
4. Updated docs/news-feature.md with new architecture

## Implementation Steps

### Step 1: cron-job.org configuration

Document in plan (not code):

1. Go to https://cron-job.org, create free account
2. Create new cron job:
   - Title: "LFC News Sync"
   - URL: `https://<your-domain>/api/news/sync`
   - Schedule: Every 30 minutes (`*/30 * * * *`)
   - HTTP Method: GET
   - Headers: `Authorization: Bearer <CRON_SECRET value>`
   - Timeout: 30 seconds
   - Notifications: Email on failure (optional)
3. Save and enable

Alternative: Vercel Cron (if on Pro plan)
```json
// vercel.json
{
  "crons": [{
    "path": "/api/news/sync",
    "schedule": "*/30 * * * *"
  }]
}
```
For Vercel Cron, auth via `CRON_SECRET` env var is automatic.

### Step 2: Initial data seed

After deployment:
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain/api/news/sync
```

Verify: check Supabase Dashboard > Table Editor > articles — should have 50-150 rows.

### Step 3: Verify fallback behavior

Test scenario:
1. Truncate articles table (or use fresh Supabase project)
2. Visit `/news` page
3. Should fall back to realtime `getNews()` and render normally
4. Run sync
5. Visit `/news` again — now reads from DB

### Step 4: Update docs/news-feature.md

Add new section "14. DB Persistence & Sync" covering:
- Architecture diagram (cron -> sync -> UPSERT)
- articles table schema
- Sync frequency and behavior
- Fallback mechanism
- Translation feature overview

### Step 5: Add sync status logging

In sync route, log to console:
```
[news-sync] Started at <timestamp>
[news-sync] Fetched <n> articles from pipeline
[news-sync] Upserted <n> rows into DB
[news-sync] Completed in <ms>ms
```

Visible in Vercel logs for monitoring.

## Todo

- [ ] Document cron-job.org setup in this file (done above)
- [ ] Run initial seed after deployment
- [ ] Verify fallback: empty DB -> realtime fetch works
- [ ] Update `docs/news-feature.md` with DB architecture section
- [ ] Add timing logs to sync route
- [ ] Test cron fires correctly (check Vercel logs)

## Success Criteria

1. cron-job.org fires every 30 min, sync completes successfully
2. Articles table stays fresh (newest article < 1 hour old)
3. Empty DB gracefully falls back to realtime fetch
4. docs/news-feature.md updated with complete new architecture
5. Vercel logs show sync timing info

## Risk Assessment

- **Vercel timeout on hobby plan (10s)**: Pipeline typically 5-8s, but OG enrichment can push to 10-15s. Mitigation: reduce enrichment batch to 20 articles, or skip enrichment in sync (articles already have thumbnails from adapters).
- **cron-job.org free tier reliability**: Generally good. Mitigation: if concerned, add Uptime Robot as backup pinger.

## Security Considerations

- CRON_SECRET must be set in Vercel environment variables (not in code)
- cron-job.org stores the Authorization header — ensure account has strong password + 2FA
- Sync route returns article count, not article content (minimal info disclosure)

## Next Steps

All phases complete. Monitor:
- Vercel logs for sync errors
- Supabase Dashboard for articles table growth
- Groq usage dashboard for translation quota
