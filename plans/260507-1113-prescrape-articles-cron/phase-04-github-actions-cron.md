# Phase 04 — GitHub Actions Hourly Trigger

## Context

- Parent plan: [plan.md](plan.md)
- Research (cron + curl flags): [research/researcher-02-github-actions-cron.md](research/researcher-02-github-actions-cron.md)
- Brainstorm 5.2 — why GH Actions over Vercel Pro

## Overview

- **Date:** 2026-05-07
- **Description:** Add `.github/workflows/news-sync.yml` that POSTs to `/api/news/sync` every hour with `CRON_SECRET` bearer auth. Includes `workflow_dispatch` for manual test runs. Public repo → free unlimited minutes; replaces the soon-to-be-removed Vercel cron entry for `/api/news/sync`.
- **Priority:** P2
- **Implementation status:** pending
- **Review status:** pending

## Key Insights

- Bare `curl` is the lightest option (no Marketplace action dependency); built into `ubuntu-latest`.
- `--retry 3 --retry-delay 10` survives transient 502/503 from Vercel cold starts.
- `--max-time 300` matches the function's max budget — kills curl before GH job timeout.
- `--fail` makes curl exit non-zero on HTTP 4xx/5xx so the GH step turns red (visible in Actions tab).
- `timeout-minutes: 10` is the job-level safety net — well above curl's 5min budget.
- GH cron jitter is 5–30 min at peak times. For news this is fine; if precision ever becomes critical, switch to Vercel Pro or external cron (e.g., cron-job.org).
- **Repo is public** → unlimited minutes. Even if it ever goes private, 24 runs/day × 30 days = 720 minutes/month → fits 2,000-min free tier.

## Requirements

- File: `.github/workflows/news-sync.yml`
- Triggers: `schedule: 0 * * * *` (hourly UTC) + `workflow_dispatch` (manual UI button).
- Single job, single step (`curl`).
- Secrets used: `CRON_SECRET`, `SYNC_URL`.
- No npm install, no checkout — pure curl on stock runner.

## Architecture

```
GitHub schedule cron (every :00 UTC, ±15min jitter)
       │
       ▼
ubuntu-latest runner (free)
       │ curl -X POST $SYNC_URL -H "Authorization: Bearer $CRON_SECRET"
       │      --max-time 300 --retry 3 --retry-delay 10 --fail
       ▼
https://www.liverpoolfcvn.blog/api/news/sync
       │
       ▼
syncPipeline() → adapters → upsert → og:image → NEW: pre-scrape (Phase 01)
```

## Related code files

- New: [.github/workflows/news-sync.yml](../../.github/workflows/news-sync.yml)
- Existing target: [src/app/api/news/sync/route.ts](../../src/app/api/news/sync/route.ts)

## Implementation Steps

1. **Create file** `.github/workflows/news-sync.yml` with this content:
   ```yaml
   name: Hourly News Sync

   on:
     schedule:
       - cron: '0 * * * *'   # Every hour at :00 UTC (subject to GH cron jitter)
     workflow_dispatch: {}    # Manual trigger via Actions tab

   jobs:
     sync:
       runs-on: ubuntu-latest
       timeout-minutes: 10
       steps:
         - name: Trigger /api/news/sync
           run: |
             curl -X GET \
               -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
               -H "Content-Type: application/json" \
               "${{ secrets.SYNC_URL }}" \
               --max-time 300 \
               --retry 3 \
               --retry-delay 10 \
               --retry-connrefused \
               --fail \
               --show-error \
               --silent

         - name: Log success
           if: success()
           run: echo "News sync completed at $(date -u)"
   ```
   **Note**: Using `GET` (not `POST`) because `route.ts` exports `GET` only (line 9).

2. **Add GitHub repo secrets** (manual, one-time):
   - Go to: `https://github.com/dangdinh87/LiverpoolApp/settings/secrets/actions`
   - Click **New repository secret** twice:
     - Name: `CRON_SECRET` → Value: same string already set in Vercel env (copy from Vercel dashboard)
     - Name: `SYNC_URL` → Value: `https://www.liverpoolfcvn.blog/api/news/sync`
   - Document this in `docs/development-rules.md` or a setup runbook (out of scope; mention in PR description).

3. **Commit & push** the workflow file. GitHub auto-detects on `master` push and registers the schedule (next run at next `:00` UTC, ±jitter).

4. **Manual smoke test**:
   - GitHub UI → Actions tab → "Hourly News Sync" → Run workflow (workflow_dispatch).
   - Watch the run, verify HTTP 200 + JSON response includes `scraped: N`.
   - Check Vercel function logs to confirm sync ran end-to-end.

## Todo

- [ ] Create `.github/workflows/news-sync.yml`
- [ ] Add `CRON_SECRET` to GitHub repo secrets (verify matches Vercel value)
- [ ] Add `SYNC_URL` to GitHub repo secrets
- [ ] Commit + push workflow file
- [ ] Trigger first manual run via `workflow_dispatch`
- [ ] Confirm Vercel logs show successful sync
- [ ] Wait for one scheduled run (next `:00 UTC` after merge) to confirm cron fires

## Success Criteria

- Workflow visible in Actions tab.
- Manual `workflow_dispatch` returns HTTP 200 with `ok: true, scraped: N` in body.
- Scheduled run fires within 30 min of `:00 UTC` (per GH cron jitter docs).
- Vercel function logs show one sync per hour aligned with GH runs.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `SYNC_URL` typo / wrong domain | Medium | Cron silent fail | `--fail` + `--show-error` ensures non-zero exit + log; manual dispatch verifies before merging |
| `CRON_SECRET` mismatch | Medium | 401 on every run | Compare GH secret value with Vercel env value during setup |
| GH cron miss / outage | Low | One sync skipped | Hourly cadence is forgiving; next run catches up |
| Vercel function cold start > 30s | Low | Curl retries (3×) | `--retry 3 --retry-delay 10` covers it |
| Public repo exposes secret in YAML | None | N/A | Secrets are referenced only by name, never echoed |
| GH Actions workflow permissions | Low | Schedule disabled if repo inactive >60d | Repo is active; risk negligible |

## Security Considerations

- Secrets stored in GitHub encrypted secrets, masked in logs.
- `CRON_SECRET` shared with Vercel env — rotate together if compromised.
- `--silent --show-error` keeps log noise low while still surfacing errors.
- No third-party action used → no supply-chain risk from Marketplace.
- Workflow file readable in public repo, but contains no secrets (only `${{ secrets.* }}` references).

## Next steps

→ Phase 05: remove the now-redundant Vercel cron entry for `/api/news/sync` and bump its `maxDuration` to 300.
