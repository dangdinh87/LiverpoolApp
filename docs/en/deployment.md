# Deployment

Deploy target: **Vercel (Hobby plan)** + **Hostinger custom domain** (`www.liverpoolfcvn.blog`).

---

## Vercel Project Setup

### 1. Connect Repository

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repository
3. Framework preset: **Next.js** (auto-detected)
4. Root directory: leave as `/` (default)
5. Click **Deploy** — first deploy will likely fail until env vars are set

### 2. Configure Environment Variables

In Vercel Dashboard → Project → Settings → Environment Variables, add all required variables:

| Variable | Environment | Value |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | All | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview | Supabase service role key |
| `FOOTBALL_DATA_ORG_KEY` | All | Football-Data.org API key |
| `NEXT_PUBLIC_SITE_URL` | Production | `https://www.liverpoolfcvn.blog` |
| `NEXT_PUBLIC_SITE_URL` | Preview | Your Vercel preview URL (or leave blank) |
| `GROQ_API_KEY` | All | Groq API key |
| `CRON_SECRET` | All | Random secret string |
| `CLOUDINARY_CLOUD_NAME` | All | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | All | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | All | Cloudinary API secret |

> `SUPABASE_SERVICE_ROLE_KEY` has full database access — set it only on Production/Preview, never expose it to the browser.

### 3. Redeploy

After setting env vars: Deployments → latest deployment → three-dot menu → **Redeploy**.

---

## Cron Jobs

Cron jobs are configured in `vercel.json` at the project root:

```json
{
  "crons": [
    { "path": "/api/news/sync",            "schedule": "0 6 * * *" },
    { "path": "/api/news/cleanup",         "schedule": "0 3 * * *" },
    { "path": "/api/news/digest/generate", "schedule": "0 0 * * *" }
  ]
}
```

| Route | Schedule | Purpose | Max Duration |
|---|---|---|---|
| `/api/news/sync` | 6:00 AM UTC daily | Sync RSS feeds → Supabase articles | 60s |
| `/api/news/cleanup` | 3:00 AM UTC daily | Soft-delete >30d, hard-delete >60d articles | default (10s) |
| `/api/news/digest/generate` | 00:00 UTC daily | Generate AI daily digest via Groq | 60s |

### How Cron Auth Works

Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` on all cron requests. All three routes validate this:

```typescript
// Inside each cron route handler
const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  ?? new URL(req.url).searchParams.get('key');
if (secret !== process.env.CRON_SECRET) {
  return new Response('Unauthorized', { status: 401 });
}
```

You can also trigger them manually for testing:

```bash
curl -X GET https://www.liverpoolfcvn.blog/api/news/sync \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Vercel Hobby Plan — Cron Limitations

- Maximum **2 cron jobs** per project on Hobby plan
- This project uses 3 — you need to upgrade to **Pro** ($20/mo) or consolidate
- Workaround: combine cleanup + sync into one endpoint, or trigger cleanup from sync handler
- Cron jobs only run when the deployment is active (not on preview deployments)

---

## Custom Domain — Hostinger

### Step 1: Buy Domain on Hostinger

Purchase your domain at [hostinger.com](https://www.hostinger.com). The domain `liverpoolfcvn.blog` is already registered.

### Step 2: Add Domain on Vercel

1. Vercel Dashboard → Project → Settings → Domains
2. Click **Add Domain**
3. Enter: `www.liverpoolfcvn.blog`
4. Also add the apex: `liverpoolfcvn.blog` (Vercel will suggest a redirect from apex → www)
5. Vercel shows you the DNS records to configure — keep this page open

### Step 3: Configure DNS on Hostinger

Log in to Hostinger → hPanel → Domains → your domain → **DNS / Nameservers**.

Add these records:

| Type | Name | Value | TTL |
|---|---|---|---|
| `A` | `@` | `76.76.21.21` | 3600 |
| `CNAME` | `www` | `cname.vercel-dns.com` | 3600 |

> Vercel may give you a different IP or CNAME value in their dashboard — always use the exact values Vercel shows you, as they can update them.

If Hostinger uses **nameservers** (not DNS zone editor), you may need to switch to custom nameservers or use Hostinger's DNS Zone editor instead.

### Step 4: Wait for DNS Propagation

DNS propagation takes **5–30 minutes** typically, up to 48h in rare cases.

Check propagation status:
```bash
# Check A record
dig A liverpoolfcvn.blog

# Check CNAME
dig CNAME www.liverpoolfcvn.blog

# Quick online check
# https://dnschecker.org
```

### Step 5: Verify on Vercel

Vercel Dashboard → Project → Settings → Domains. Once DNS is propagated, the domain shows **Valid Configuration** with a green checkmark.

If it shows "Invalid Configuration" after 30 minutes, double-check the DNS records are saved correctly on Hostinger.

### Step 6: Update NEXT_PUBLIC_SITE_URL

In Vercel Environment Variables, update `NEXT_PUBLIC_SITE_URL` to `https://www.liverpoolfcvn.blog`.

This variable is used for:
- `metadataBase` (OpenGraph URLs)
- Sitemap canonical URLs
- OAuth redirect URI construction

### Step 7: Redeploy

Trigger a new deployment after updating the env var so the build picks it up.

---

## Supabase — Update for Custom Domain

After your domain is live, update Supabase Auth settings so OAuth redirects work correctly.

### Update Site URL

1. Supabase Dashboard → Authentication → URL Configuration
2. Set **Site URL** to: `https://www.liverpoolfcvn.blog`

### Add Redirect URLs

Under **Redirect URLs**, add:

```
https://www.liverpoolfcvn.blog/**
https://www.liverpoolfcvn.blog/auth/callback
```

The wildcard `/**` covers all OAuth callback paths.

### Update OAuth Provider Callbacks

For each OAuth provider (Google, GitHub) configured in Supabase:

- **Google:** Google Cloud Console → OAuth 2.0 credentials → Authorized redirect URIs → add `https://www.liverpoolfcvn.blog/auth/callback`
- **GitHub:** GitHub → Settings → Developer settings → OAuth Apps → your app → Update callback URL to `https://www.liverpoolfcvn.blog/auth/callback`

---

## SSL

SSL is **automatic** — Vercel provisions a Let's Encrypt certificate as soon as DNS is correctly pointing to Vercel. No manual steps required.

HTTPS is enforced automatically; HTTP requests are redirected to HTTPS.

---

## Troubleshooting

### DNS Not Propagating

```bash
# Check what's currently resolving
nslookup www.liverpoolfcvn.blog
dig www.liverpoolfcvn.blog CNAME

# Flush local DNS cache (macOS)
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
```

If still not working after 1h: log in to Hostinger hPanel → DNS Zone and verify the records were saved. Some Hostinger plans require disabling "Auto-renew DNS" or similar option before custom records take effect.

### SSL Certificate Errors

Usually means DNS hasn't finished propagating when Vercel tried to issue the cert. Solution:

1. Wait for DNS to fully propagate
2. Vercel Dashboard → Domains → click the domain → **Refresh** / **Re-issue certificate**

If Vercel shows "SSL Certificate Pending" for more than 24h, remove and re-add the domain.

### OAuth Redirect Mismatch

Error: `redirect_uri_mismatch` or "This site can't be reached after login"

Check:
1. `NEXT_PUBLIC_SITE_URL` in Vercel env vars matches the domain exactly (including `https://www.`)
2. Supabase → Authentication → URL Configuration → Site URL and Redirect URLs are updated
3. OAuth app (Google/GitHub) has the new callback URL
4. Redeploy after changing env vars

### Build Failures

Common causes:

```bash
# TypeScript errors — run locally first
npm run build

# Missing env vars — check Vercel dashboard
# If a required env var is missing, Next.js build will throw

# Supabase types mismatch — regenerate types
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts
```

### Cron Jobs Not Running

1. Verify `vercel.json` is committed and deployed
2. Check Vercel Dashboard → Project → Settings → Crons — should list all 3 jobs
3. On Hobby plan, only 2 crons are supported — third will silently not run
4. Check function logs: Vercel Dashboard → Logs → filter by `/api/news/sync`
5. Test manually with curl using `CRON_SECRET`

### 504 Timeout on Sync/Digest Cron

The `maxDuration` in `vercel.json` should be set to 60s for sync and digest routes:

```json
{
  "crons": [
    { "path": "/api/news/sync",            "schedule": "0 6 * * *" },
    { "path": "/api/news/digest/generate", "schedule": "0 0 * * *" }
  ],
  "functions": {
    "src/app/api/news/sync/route.ts":            { "maxDuration": 60 },
    "src/app/api/news/digest/generate/route.ts": { "maxDuration": 60 }
  }
}
```

Hobby plan max: 60s. Pro plan max: 300s.

---

## Vercel Hobby Plan Limitations

| Limit | Hobby | Pro |
|---|---|---|
| Serverless function timeout | 10s (default), 60s (configured) | 300s |
| Cron jobs | 2 per project | Unlimited |
| Bandwidth | 100GB/mo | 1TB/mo |
| Deployments | Unlimited | Unlimited |
| Team members | 1 | Unlimited |
| Preview deployments | Yes | Yes |

Key constraints for this project:
- **Cron limit** — only 2 of 3 cron jobs run on Hobby. Upgrade to Pro or combine cleanup into sync.
- **Function timeout** — news sync (60s) and digest (60s) are at the Hobby limit. If feeds slow down, they may timeout.
- **No background functions** — all work must complete within the timeout window.

---

## Deployment Checklist

Before going live:

- [ ] All env vars set on Vercel (Production environment)
- [ ] `NEXT_PUBLIC_SITE_URL` set to production domain
- [ ] `npm run build` passes locally
- [ ] Supabase migrations applied to production database
- [ ] Supabase Auth → Site URL updated to production domain
- [ ] Supabase Auth → Redirect URLs includes production domain
- [ ] OAuth providers (Google/GitHub) callback URLs updated
- [ ] DNS records configured on Hostinger
- [ ] Domain shows "Valid Configuration" on Vercel
- [ ] SSL certificate issued (green padlock in browser)
- [ ] Cron jobs visible in Vercel Dashboard → Settings → Crons
- [ ] Manual cron test: `curl -H "Authorization: Bearer SECRET" https://domain/api/news/sync`
- [ ] Homepage loads, news articles appear
- [ ] Login/register flow works
- [ ] Gallery images load from Cloudinary
