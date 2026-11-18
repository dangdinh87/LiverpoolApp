# Architecture

**Anfield Daily** is a Next.js 16.4 App Router application running on **Cloudflare Workers** (`@opennextjs/cloudflare`), backed by server-first React Server Components, a multi-provider football data layer, a 13-outlet English news & full-article scraping pipeline, Supabase Auth/PostgreSQL/Storage, and VietAPI-powered editorial & translation workflows.

---

## System Overview

```text
┌──────────────────────────────────────────────────────────────────────┐
│                              Browser                                 │
│  React 19 Client Components · Zustand · TanStack Query · Spoiler CSS │
└─────────────────────────────────┬────────────────────────────────────┘
                                  │ HTTPS / RSC Streaming
┌─────────────────────────────────▼────────────────────────────────────┐
│            Cloudflare Workers (`liverpool-app`, OpenNext)            │
│  ├── Cache Interception → Regional Cache API + R2 (`next-cache`)     │
│  ├── D1 Tag Cache (`tag-cache`) + Durable Object Queue (`DOQueue`)   │
│  ├── `src/proxy.ts` (next-intl `/vi` routing, scanner guard, auth)   │
│  ├── Server Components (SSG/ISR prerender + `pickClientMessages`)    │
│  └── Route Handlers & Server Actions (cron jobs, APIs, mutations)    │
└──────────┬──────────────────────┬───────────────────────┬────────────┘
           │                      │                       │
┌──────────▼──────────┐ ┌─────────▼───────────┐ ┌─────────▼────────────┐
│ Supabase            │ │ Football Providers  │ │ News, Media & AI     │
│ • PostgreSQL (RLS)  │ │ • Football-Data.org │ │ • 13 English outlets │
│ • Auth (OAuth/Email)│ │ • ESPN (cups/events)│ │ • YouTube Data API   │
│ • Storage (avatars) │ │ • FPL API (stats)   │ │ • VietAPI (LLM)      │
│ • 3s breaker fetch  │ │ • Broadcaster map   │ │ • Cloudinary         │
└─────────────────────┘ └─────────────────────┘ └──────────────────────┘
```

---

## Core Layers

### Layer 1: External Data & Services

| Source | Purpose | Env Variable | Rate / Runtime Protection |
|---|---|---|---|
| Football-Data.org v4 | PL & UCL standings, fixtures, archived seasons, H2H, squad, coach | `FOOTBALL_DATA_ORG_KEY` | 10 req/min; `fdo-client.ts` in-flight dedup + 429 retry/backoff |
| ESPN Soccer API | FA Cup & EFL Cup fixtures, live snapshots, events, lineups, 28 match stats | — (free) | Wrapped in `React.cache()` + ISR |
| Fantasy Premier League | Granular Premier League player stats supplement | — (free) | ISR cached |
| 13 English Press Outlets | 12 RSS feeds + LFC Official `sitemap-news.xml` adapter | — | Hourly sync + 45s pre-scrape budget |
| YouTube Data API v3 | Official LFC YouTube video strip (`lfctv`) on `/news` | `YOUTUBE_API_KEY` | 24 quota units/hour (10k/day free); skipped if unset |
| VietAPI | Daily briefing, EN→VI full-article translation, post-match reviews | `VIETAPI_KEY` | Model fallback chains + `AbortSignal.timeout` |
| Supabase | Auth, PostgreSQL tables with RLS, avatar storage | `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY` | `createSupabaseFetch()` (3s timeout + 30s circuit breaker) |
| Cloudinary | Photo gallery hosting & on-the-fly transforms | `CLOUDINARY_*` | Cookie-less `unstable_cache` reads |

### Layer 2: Request Proxy (`src/proxy.ts`)

Next.js 16 replaces `middleware.ts` with `src/proxy.ts`. On every page request it:
1. Short-circuits automated WordPress/CMS scanner probes (`/wp-*`, `*.php`, `?rest_route=`) with an immediate `404` before rendering localized layouts.
2. Runs `next-intl` routing (`en` unprefixed at `/`, `vi` under `/vi`, honouring `NEXT_LOCALE` cookie and `Accept-Language`).
3. Refreshes Supabase auth cookies on protected routes (`/profile`, `/vi/profile`) using a bounded `createSupabaseFetch()` client and redirects unauthenticated visitors to `/auth/login?redirect=...`.
4. Attaches `X-Robots-Tag: noindex, nofollow` on `/auth` and `/profile` routes.

### Layer 3: Server Components & Static/ISR Prerendering

All routes under `src/app/[locale]/` call `setRequestLocale(locale)` and fetch data on the server, passing serialisable props to focused Client Components. `src/app/[locale]/layout.tsx` filters `<NextIntlClientProvider>` messages through `pickClientMessages()`, cutting serialised client i18n JSON by ~52%.

---

## Supabase Client Split & Resilience (CRITICAL)

Three distinct client factories keep credentials and caching safe:

| File | Context | Key & Behaviour |
|---|---|---|
| `src/lib/supabase.ts` | `"use client"` browser components | Anon key, RLS enforced |
| `src/lib/supabase-server.ts` | Server Components, Server Actions, Route Handlers (`import "server-only"`) | Anon key + SSR session cookies |
| `src/lib/news/supabase-service.ts` | Cron handlers & server-validated writes (`import "server-only"`) | Service role key (bypasses RLS) |

### Circuit Breaker & Hard Timeout (`src/lib/supabase-fetch-with-timeout.ts`)

Every Supabase client uses `createSupabaseFetch()` and `db: { retry: false }`:
- **3-second Promise-race timeout (`SUPABASE_FETCH_TIMEOUT_MS`):** Races a hard `setTimeout` alongside `AbortController` because Next.js 16 strips `init.signal` when foreground-revalidating stale implicit `fetch-cache` entries.
- **Zero PostgREST retry backoff:** Errors surface as `DOMException("...", "AbortError")`, preventing `postgrest-js` from adding 1s + 2s + 4s retries.
- **30-second circuit breaker (`SUPABASE_BREAKER_COOLDOWN_MS`):** Trips on timeouts, network errors, and gateway failures (`502`, `503`, `504`, Cloudflare `520–530`) so subsequent queries fail instantaneously during an outage instead of stalling renders or builds.
- **Cookie-less public caches:** Shared public queries (gallery, player news mentions, `/analysis` listings, sitemap digests) use cookie-less clients wrapped in `unstable_cache` because `cookies()` cannot be read inside `unstable_cache`.

---

## Football Data Architecture

**Location:** `src/lib/football/` (`import "server-only"`)

- Pages import exclusively from `@/lib/football`, where every function is wrapped in `React.cache()` for per-request deduplication.
- `fdoFetch()` (`src/lib/football/fdo-client.ts`) deduplicates concurrent in-flight requests per isolate and retries `HTTP 429` responses using `X-RequestCounter-Reset` backoff so multi-worker `next build` runs never fail on Football-Data.org's 10 req/min limit.
- `requireNonEmptyArray()` prevents `unstable_cache` from pinning empty arrays returned during transient upstream failures.
- Without `FOOTBALL_DATA_ORG_KEY`, functions log a warning and return empty arrays or `null` cleanly.

---

## News, Briefing & Post-Match Analysis Pipeline

```text
GitHub Actions (`news-sync.yml` hourly, `news-daily.yml` daily)
  ├── GET /api/news/sync
  │     ├── Fetch 13 English outlets + LFC YouTube (`lfctv`) in parallel
  │     ├── Canonicalize URLs (`url.ts`) + Jaccard title dedup (`dedup.ts`)
  │     ├── Score Liverpool relevance + regex category classification
  │     ├── Batch upsert to `articles` + fill missing `og:image` thumbnails
  │     └── Pre-scrape full HTML & embedded video (`article-extractor.ts`, 45s budget)
  ├── GET /api/news/digest/generate
  │     └── Two parallel VietAPI calls → daily briefing + SEO article in `news_digests`
  ├── GET /api/news/cleanup
  │     └── Prune cached bodies (>7d), old articles (>14d) & `sync_logs` (>14d)
  └── GET/POST /api/site-articles/generate
        └── Match facts (`match-review-facts.ts`) → VietAPI (`en` + `vi`) → `validateDraft()` → `site_articles`
```

---

## Navbar & Interactive State

- **Server/Client Navbar Split:** `NavbarAuth` (Server Component) reads the user session and profile, passing props to `NavbarClient` and `NavbarMobileSheet` (Client Components).
- **Spoiler-Free Mode (`src/lib/spoiler-mode.ts`):** Blocking inline `SPOILER_BOOT_SCRIPT` sets `data-spoiler-free` on `<html>` before first paint so shared ISR HTML hides scores via CSS with zero flash.
- **Client Stores (`src/stores/`):** Lightweight Zustand stores for `auth-store.ts` (client session state without storing PII emails in `localStorage`) and `toast-store.ts` (primitive-selector toast notifications).

---

## Caching Strategy on Cloudflare Workers

| Layer | Mechanism | Purpose |
|---|---|---|
| Per-request | `React.cache()` | Deduplicates repeated calls inside a single RSC render |
| Data cache | `unstable_cache` + D1 tag cache | Cross-request cache busted via `revalidateTag` / `revalidateLocalizedPath` |
| Edge ISR | R2 (`liverpool-app-next-cache`) + `withRegionalCache` + `DOQueueHandler` | Serves cached ISR pages directly from Cloudflare data-centre Cache API before booting Next.js (`enableCacheInterception: true`) |
| Database | `articles`, `news_digests`, `site_articles` | Persistent storage refreshed by background workflows |
| Browser | `localStorage` | Read history, 7-day VI translation cache, spoiler-free toggle |

---

## Database Schema Overview

| Table | Purpose | Security |
|---|---|---|
| `profiles` | Display name, bio, avatar URL | RLS (own row write) |
| `favourite_players` | Saved squad favourites | RLS (own rows) |
| `articles` | Synced English news items, cached HTML (`content_en`) & VI translation (`content_vi`) | RLS enabled; service-role sync writes |
| `sync_logs` | Hourly sync telemetry & per-source health | RLS enabled; service-role writes |
| `article_likes` / `article_comments` | Reader likes & privacy-scrubbed comments | RLS + authenticated route checks |
| `saved_articles` | User article bookmarks | RLS (own rows) |
| `news_digests` | Daily AI briefings & companion SEO articles | Public read, service-role write |
| `site_articles` | Fact-validated bilingual match reviews (`/analysis`) + rejected draft audit log | Public read (`published`), service-role write |
| `match_predictions` / `player_ratings` | Pre-match score predictions & post-match 1–10 ratings | Read-own RLS; validated service-role Server Actions |
| `gallery` | Cloudinary photo metadata & homepage settings | Public read, admin write |
