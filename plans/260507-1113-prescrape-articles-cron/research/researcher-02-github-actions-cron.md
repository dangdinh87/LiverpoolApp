# GitHub Actions Cron for Hourly News Sync

## 1. Cron Syntax & Reliability

**Minimum Interval:** 5 minutes ([GitHub Docs: Workflow syntax](https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions)). Hourly (`0 * * * *`) is well-supported.

**Reliability Caveat:** GitHub Actions cron jobs are NOT guaranteed to run at exact scheduled times. **Documented delays of 5–30 minutes are normal**, especially at peak hours (`:00` and `:30` UTC). There is no workaround—queuing logic is server-side. For hourly jobs, this is acceptable; for mission-critical work, use external cron services.

**Timezone:** UTC only. Convert your desired local time to UTC in cron expression.

---

## 2. Workflow Structure & HTTP Trigger Methods

### Recommended: Bare `curl` (simplest)
No third-party action needed. Built-in to ubuntu-latest runner.

```yaml
- name: Sync News
  run: |
    curl -X POST \
      -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
      -H "Content-Type: application/json" \
      "${{ secrets.SYNC_URL }}" \
      --max-time 300 \
      --retry 3 \
      --retry-delay 10 \
      --retry-connrefused
```

### Alternatives
- **`actions/github-script@v7`** — overkill for external HTTP calls; best for GitHub API interactions
- **`curl` action (Marketplace)** — adds dependencies; bare curl is lighter

**Verdict:** Use bare `curl` with `--retry` flags for timeout & retry handling.

---

## 3. Secrets Management

Store in GitHub repo settings → **Secrets and variables** → **Actions**.

```yaml
env:
  CRON_SECRET: ${{ secrets.CRON_SECRET }}
  SYNC_URL: ${{ secrets.SYNC_URL }}
```

Access in steps:
```yaml
run: curl -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" "${{ secrets.SYNC_URL }}"
```

**Security:** Secrets are masked in logs. Never echo them directly.

---

## 4. Timeout & Retry Strategy

### Curl Flags
- `--max-time 300` — Kill after 300s (Vercel function timeout); avoids hanging
- `--retry 3` — Retry up to 3 times on transient failures
- `--retry-delay 10` — Wait 10s between retries
- `--retry-connrefused` — Retry on connection refused

### Job-Level Timeout
```yaml
jobs:
  sync:
    runs-on: ubuntu-latest
    timeout-minutes: 10  # Kill job after 10min (curl max 5min, buffer for setup)
```

Curl 300s timeout allows Vercel function full run window; job-level 10min provides safety margin.

---

## 5. Cost & Free Tier Coverage

**Public repo:** ✅ **Unlimited** — 24 runs/day (hourly) = **zero cost**.

**Private repo:** 2,000 minutes/month free. 24 hourly calls × 365 days = 8,760 min/year = **<730 min/month → well under 2000/month limit**.

([GitHub Docs: Billing and usage](https://docs.github.com/en/actions/concepts/billing-and-usage))

---

## 6. Manual Trigger

Add `workflow_dispatch` for ad-hoc runs (useful for testing):

```yaml
on:
  schedule:
    - cron: '0 * * * *'  # Every hour at :00 UTC
  workflow_dispatch:      # Manual trigger via GitHub UI
```

---

## Example Workflow: `.github/workflows/news-sync.yml`

```yaml
name: Hourly News Sync

on:
  schedule:
    - cron: '0 * * * *'  # Every hour at :00 UTC
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Call Vercel News Sync
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json" \
            "${{ secrets.SYNC_URL }}" \
            --max-time 300 \
            --retry 3 \
            --retry-delay 10 \
            --retry-connrefused \
            --fail

      - name: Log Success
        if: success()
        run: echo "News sync completed successfully at $(date -u)"

      - name: Log Failure
        if: failure()
        run: |
          echo "News sync failed"
          exit 1
```

### Setup Steps
1. **Create secrets** in repo → Settings → Secrets:
   - `CRON_SECRET` = your random bearer token
   - `SYNC_URL` = `https://yourvercel.app/api/news/sync`

2. **Commit workflow** to `.github/workflows/news-sync.yml`

3. **Test manually** via GitHub UI → Actions tab → "Hourly News Sync" → "Run workflow"

4. **Monitor** via Actions tab → see logs after first scheduled run

---

## Key Takeaways

| Aspect | Recommendation |
|--------|---|
| **Cron syntax** | `0 * * * *` (hourly, UTC) — 5-min min interval |
| **Reliability** | Expect 5–30min delays at peak times; acceptable for news |
| **HTTP method** | Bare `curl` with `--retry 3 --max-time 300` |
| **Job timeout** | `timeout-minutes: 10` (buffer above function timeout) |
| **Cost** | **Free** (public) or <730 min/month (private) |
| **Secrets** | Store `CRON_SECRET` + `SYNC_URL` in repo secrets |
| **Testing** | `workflow_dispatch` for manual runs |

---

## Citations

1. [GitHub Docs: Workflow syntax for GitHub Actions](https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions)
2. [GitHub Docs: Billing and usage for GitHub Actions](https://docs.github.com/en/actions/concepts/billing-and-usage)
3. [GitHub Docs: Authenticating to the REST API](https://docs.github.com/en/rest/authentication/authenticating-to-the-rest-api)
