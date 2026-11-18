# Deployment

**Anfield Daily** runs in production on **Cloudflare Workers** (`@opennextjs/cloudflare`) at **[anfielddaily.com](https://anfielddaily.com)**, with scheduled jobs driven by **GitHub Actions**.

---

## 1. Production Architecture (`wrangler.jsonc` & `open-next.config.ts`)

| Component | Resource / Binding | Purpose |
|---|---|---|
| **Cloudflare Worker** | `liverpool-app` (Workers Paid, `nodejs_compat`) | Serves SSR, RSC, Server Actions & API routes (`cpu_ms: 60000`, placement `aws:ap-southeast-1` beside Supabase) |
| **Custom Domains** | `anfielddaily.com`, `www.anfielddaily.com` | Proxied Worker custom domains with automatic Cloudflare TLS |
| **R2 Incremental Cache** | `NEXT_INC_CACHE_R2_BUCKET` → `liverpool-app-next-cache` | Stores ISR/SSG payloads behind `withRegionalCache(..., { mode: "long-lived" })` |
| **D1 Tag Cache** | `NEXT_TAG_CACHE_D1` → `liverpool-app-tag-cache` | Tracks `revalidateTag` and `revalidatePath` invalidations |
| **Durable Object Queue** | `NEXT_CACHE_DO_QUEUE` → `DOQueueHandler` | Deduplicates background time-based ISR revalidations |
| **Cache Interception** | `enableCacheInterception: true` | Serves warm ISR hits directly from the edge cache without booting the Next.js server bundle |

### Worker Compatibility Notes

- `open-next.config.ts` runs `npx next build && node scripts/cf-patch-middleware-trace.mjs` so `@opentelemetry/api/build/esm` is included when bundling `src/proxy.ts`.
- HTML extraction uses `linkedom` rather than `jsdom` (`workerd`-compatible).
- Next.js image optimisation is disabled on Worker builds (`images.unoptimized` when `DEPLOY_TARGET=cloudflare`); gallery assets use Cloudinary URL transforms.
- `wrangler.jsonc` sets `assets.html_handling = "none"` so static verification `.html` files are served without `307` slash redirects.

---

## 2. Automated CI/CD (`.github/workflows/deploy-cloudflare.yml`)

Every push to `master` (ignoring `docs/**`, `plans/**`, and `**/*.md`) runs:

1. `npm ci` on Node 24
2. `npx tsc --noEmit && npm run lint && npm test`
3. `npm run cf:build` (`DEPLOY_TARGET=cloudflare opennextjs-cloudflare build`) with build-time `NEXT_PUBLIC_*` variables and prerender read keys from GitHub Actions secrets
4. `npm run cf:deploy` (`opennextjs-cloudflare deploy`) using `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`
5. `npx tsx scripts/cf-prune-r2-cache.ts --bucket liverpool-app-next-cache --apply` to clean up superseded build prefixes in R2
6. Production HTTP `200` smoke test across `/`, `/news`, `/vi`, `/fixtures`, and `/sitemap.xml`
7. Optional Telegram deployment notification (`scripts/deploy-notify.sh`)

### Manual Build & Deploy

```bash
npm run cf:build     # Build .open-next/ worker bundle (run from a clean tree without local .env.local overrides)
npm run cf:preview   # Preview locally in workerd via Wrangler
npm run cf:deploy    # Deploy to Cloudflare Workers
```

---

## 3. Environment Variables & Secrets

### Runtime Worker Secrets (`wrangler secret put <NAME>`)

Runtime secrets live in the Cloudflare Worker (never committed to git) and are read lazily per request via `getEnv()` (`src/lib/env.ts`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FOOTBALL_DATA_ORG_KEY`
- `VIETAPI_KEY`
- `YOUTUBE_API_KEY` (optional)
- `CRON_SECRET`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `NEXT_PUBLIC_SITE_URL` (`https://anfielddaily.com`)
- `NEXT_PUBLIC_ADSENSE_CLIENT_ID`, `NEXT_PUBLIC_CF_ANALYTICS_TOKEN` (optional)

### GitHub Repository Secrets

| Secret | Used By |
|---|---|
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | `deploy-cloudflare.yml` |
| `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_CF_ANALYTICS_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `FOOTBALL_DATA_ORG_KEY` | `deploy-cloudflare.yml` (`cf:build` prerendering) |
| `CRON_SECRET` | `news-sync.yml`, `news-daily.yml` |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | `news-sync.yml` telemetry & alerts (optional) |
| `DEPLOY_BOT_TOKEN`, `DEPLOY_CHAT_ID` | `deploy-cloudflare.yml` deploy ping (optional) |

---

## 4. Scheduled Jobs (GitHub Actions)

All cron endpoints require `Authorization: Bearer <CRON_SECRET>`:

| Workflow | Cron (UTC) | Endpoint | Purpose |
|---|---|---|---|
| `news-sync.yml` | `0 * * * *` | `GET /api/news/sync` | Sync 13 English outlets + YouTube, enrich thumbnails, pre-scrape bodies (45s budget), send Telegram report |
| `news-sync.yml` | `01:00–16:59` | `GET /api/news/digest/generate` | Idempotent hourly fallback check for today's briefing |
| `news-daily.yml` | `7 0 * * *` | `GET /api/news/digest/generate` | Generate daily AI briefing + SEO article |
| `news-daily.yml` | `17 3 * * *` | `GET /api/news/cleanup` | Prune cached bodies (>7d), old articles (>14d) & `sync_logs` (>14d) |

Manual trigger examples:

```bash
gh workflow run news-sync.yml
gh workflow run news-daily.yml -f job=digest
curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://anfielddaily.com/api/news/sync
```

---

## 5. Supabase Auth & OAuth Configuration

In Supabase Dashboard → Authentication → URL Configuration:
- **Site URL:** `https://anfielddaily.com`
- **Redirect URLs:**
  - `https://anfielddaily.com/**`
  - `https://anfielddaily.com/auth/callback`
  - `http://localhost:3000/auth/callback` (local development)

Ensure Google Cloud Console and GitHub OAuth Apps list your Supabase project callback URL (`https://<project-ref>.supabase.co/auth/v1/callback`).

---

## 6. Post-Deploy Verification Checklist

- [ ] `deploy-cloudflare.yml` green (typecheck, lint, Vitest, OpenNext build, deploy, smoke check)
- [ ] `https://anfielddaily.com` and `https://anfielddaily.com/vi` return `200` with clean Dark Stadium styles
- [ ] `/news` renders recent English press articles and `/vi/news` renders full feed under Vietnamese UI
- [ ] `/news/digest` and `/analysis` serve cached ISR responses rapidly
- [ ] `/api/calendar/liverpool.ics` downloads a valid RFC 5545 calendar file
- [ ] `/sitemap.xml`, `/robots.txt`, and `/llms.txt` resolve with `https://anfielddaily.com` URLs
- [ ] Supabase login/OAuth callback redirects cleanly to `/profile`
