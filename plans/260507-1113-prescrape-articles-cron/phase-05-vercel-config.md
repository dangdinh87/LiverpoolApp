# Phase 05 — Vercel Cron Config + maxDuration

## Context

- Parent plan: [plan.md](plan.md)
- Brainstorm 5.4 — config drift table
- Scout: [scout/scout-01-relevant-files.md](scout/scout-01-relevant-files.md)

## Overview

- **Date:** 2026-05-07
- **Description:** Remove `/api/news/sync` from `vercel.json` crons (GH Actions takes over). Bump the route's `maxDuration` from 60 → 300 seconds so the new pre-scrape phase can finish. Keep `/api/news/cleanup` and `/api/news/digest/generate` unchanged.
- **Priority:** P2
- **Implementation status:** pending
- **Review status:** pending

## Key Insights

- Vercel Hobby tier allows up to 300s `maxDuration` for serverless functions — we use it.
- Removing the cron entry means Vercel no longer auto-invokes `/api/news/sync` at 06:00 UTC. Sync is now driven exclusively by GH Actions hourly. **Order of deploys matters**: the GH Actions workflow (Phase 04) should be active before this change, otherwise sync simply stops happening for the gap window.
- `vercel.json` cron quota (Hobby = 2/day) is freed up by removing `news/sync`, leaving room for future additions if needed (e.g., a separate weekly job).
- Other routes' `maxDuration` (defined inline in route files, e.g., `cleanup/route.ts` doesn't set one) inherit Vercel's 10s default for Hobby — fine for those workloads.

## Requirements

- Edit [vercel.json](../../vercel.json) — remove the first crons entry only.
- Edit [src/app/api/news/sync/route.ts](../../src/app/api/news/sync/route.ts) line 6: change `export const maxDuration = 60` → `300`.
- Verify cleanup + digest schedules untouched.

## Architecture

```
Before:
  vercel.json crons: [news/sync 0 6 * * *, news/cleanup 0 3 * * *, digest 0 0 * * *]
  sync route maxDuration: 60s

After:
  vercel.json crons: [news/cleanup 0 3 * * *, digest 0 0 * * *]
  sync route maxDuration: 300s
  GH Actions cron: news-sync.yml (0 * * * * UTC)
```

## Related code files

- [vercel.json](../../vercel.json)
- [src/app/api/news/sync/route.ts](../../src/app/api/news/sync/route.ts) — line 6

## Implementation Steps

1. **Edit** [vercel.json](../../vercel.json):
   ```json
   {
     "crons": [
       { "path": "/api/news/cleanup", "schedule": "0 3 * * *" },
       { "path": "/api/news/digest/generate", "schedule": "0 0 * * *" }
     ]
   }
   ```
2. **Edit** [src/app/api/news/sync/route.ts](../../src/app/api/news/sync/route.ts) line 6:
   ```ts
   export const maxDuration = 300;
   ```
3. **Coordination with Phase 04**: only merge this change AFTER `.github/workflows/news-sync.yml` is committed and a manual `workflow_dispatch` run has succeeded against prod. Otherwise sync goes silent for up to a day.
4. **Local sanity**: `npm run build` should still succeed. No runtime test needed for Vercel cron config (only validates on deploy).

## Todo

- [ ] Update `vercel.json` (remove sync entry)
- [ ] Bump `maxDuration` to 300 in sync route
- [ ] Sequence: deploy ONLY after Phase 04 is live + manually verified
- [ ] On Vercel dashboard post-deploy, confirm cron list shows only 2 jobs

## Success Criteria

- Vercel project page → Cron Jobs tab shows exactly 2 entries (cleanup, digest).
- New deploy summary shows `maxDuration: 300` for `/api/news/sync`.
- `npm run build` passes.
- After merge, GH Actions sync at next `:00 UTC` succeeds (no overlap, no gap).

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Merge before GH Actions is live | High if not sequenced | News sync stops until GH Actions deployed | Strict sequence: P04 deploys + verifies → then P05 merges |
| `maxDuration: 300` exceeds Hobby limit | None | Hobby supports up to 300s | Verified against Vercel pricing docs |
| Removed cron entry breaks deploy | None | `vercel.json` is just config | JSON validation on Vercel deploy catches malformed |
| Other routes inadvertently affected | None | Only sync route modified | Inline edit, scoped to one file |

## Security Considerations

- No env var or secret changes.
- Function still wrapped by `withCronAuth`, which validates `CRON_SECRET` regardless of trigger source (Vercel cron, GH Actions, or manual cURL).
- Removing the Vercel cron entry does NOT remove the route — it's still publicly reachable but auth-gated.

## Next steps

→ Phase 06: validate end-to-end on prod and document monitoring SQL.
