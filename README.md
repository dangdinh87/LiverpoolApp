# Anfield Daily

Unofficial Liverpool FC news and match hub — fast, de-duplicated coverage from across the English press, summed up in a daily AI briefing alongside post-match analysis, live fixtures, standings, stats, squad profiles, and fan predictions.

- **Production:** [anfielddaily.com](https://anfielddaily.com)
- **Repository:** [dangdinh87/LiverpoolApp](https://github.com/dangdinh87/LiverpoolApp)
- **Documentation:** [`docs/`](./docs/README.md) · **Brand Guide:** [`docs/brand.md`](./docs/brand.md)

---

## Features

- **De-duplicated English Press Feed (`/news`)** — Aggregates 13 English outlets (Liverpool FC Official, BBC Sport, The Guardian, Liverpool Echo, This Is Anfield, Anfield Watch, Empire of the Kop, Sky Sports, Mirror, The Independent, Anfield Index, Liverpool.com, ESPN) plus official club videos (`lfctv` via YouTube Data API v3), with URL normalisation, Jaccard title deduplication, story clustering, and pre-scraped full-article reader views (`ArticleHtmlBody` + `ArticleVideoPlayer` HLS/MP4 playback).
- **AI Daily Briefing & Full-Article Vietnamese Translation** — Automated daily news digest (`/news/digest`) and on-demand journalistic EN→VI full-article translation powered by VietAPI (`@ai-sdk/openai-compatible` + `ai`), grounded in live 2026/27 squad and coaching context.
- **Original Post-Match Analysis (`/analysis`)** — Bilingual (`en` / `vi`) editorial match reviews generated strictly from verified fixture lineups, events, and statistics, guarded by automated fact and style validation (`validateDraft`).
- **Match Centre, Stats & Archive (`/fixtures`, `/standings`, `/stats`, `/season`)** — Premier League, Champions League, FA Cup, and EFL Cup fixtures, live match polling, minute-by-minute events, starting XIs, 28-metric match stats, FPL player stats, local TV broadcaster lookup by viewer time zone, and multi-season archives.
- **Fan Predictions & Player Ratings (`/predictions`, `/fixtures/[id]`)** — Pre-match scoreline predictions (3 pts exact score, 1 pt right outcome), community split, season leaderboard, and post-match 1–10 player ratings.
- **Spoiler-Free Mode & `.ics` Fixture Calendar** — Zero-flash pre-paint CSS spoiler shield (`data-spoiler-free`) for replay viewers, plus an RFC 5545 iCalendar subscription feed (`/api/calendar/liverpool.ics`) in UTC with 30-minute kick-off reminders.
- **Bilingual Interface (`en` / `vi`)** — English at `/` and Vietnamese under `/vi` via `next-intl`, statically prerendered per locale with `pickClientMessages` trimming serialised client i18n payloads by ~52%.
- **Photo Gallery, Club History & Reader Profiles (`/gallery`, `/history`, `/profile`)** — Cloudinary lightbox gallery, static club honours/timeline/legends, and Supabase-authenticated profiles with favourite players, saved articles, likes, comments, and reading streaks.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16.4 (App Router, Turbopack), React 19, TypeScript 5 (`strict`) |
| **Styling & UI** | Tailwind CSS v4 (`@theme inline`), `shadcn/ui` (`radix-ui`, `lucide-react`), Framer Motion, Recharts |
| **Localisation** | `next-intl` (`en` default at `/`, `vi` at `/vi`, `pickClientMessages` RSC payload filter) |
| **Database & Auth** | Supabase (Auth, PostgreSQL with RLS, Storage) + `createSupabaseFetch` 3s timeout & 30s circuit breaker |
| **AI Provider** | VietAPI (`@ai-sdk/openai-compatible` + `ai`) — daily briefing, VI translation, match reviews |
| **Football Data** | Football-Data.org v4 (`fdo-client` dedup + 429 backoff), ESPN API, Fantasy Premier League API |
| **Media** | Cloudinary (gallery transforms), `hls.js` (embedded article video streams) |
| **Deployment** | Cloudflare Workers (`@opennextjs/cloudflare`), R2 incremental cache, D1 tag cache, Durable Objects |
| **Testing** | Vitest (`npm test` — 764+ unit tests) & Playwright (`npm run test:e2e` — desktop + mobile E2E) |

---

## Project Structure

```text
src/
├── app/
│   ├── [locale]/          # Localized pages (/, /vi, /news, /analysis, /fixtures, /standings, /predictions, /squad, /player/[id], /stats, /season, /history, /gallery, /profile, /auth, /about, /legal)
│   ├── actions/           # Server Actions (auth, profile, news pagination, fan predictions & ratings)
│   ├── api/               # Route handlers (news sync/digest/cleanup/translate/comments/like, site-articles, calendar .ics, gallery, live-fixture, streak)
│   ├── auth/callback/     # Supabase OAuth callback
│   ├── llms.txt/          # AI crawler guide distinguishing original journalism vs attributed mirrors
│   ├── robots.txt/        # Dynamic crawl rules & SEO-tool bot blocks
│   └── sitemap.xml/       # Localized XML sitemap with hreflang alternates
├── components/            # Feature UI + shadcn/ui primitives + NextIntl client message filter
├── data/                  # Bilingual static JSON (squad, player-bios.vi, trophies, history, legends, club-info, gallery)
├── hooks/                 # Client hooks (spoiler-free, hydration-safe clock, viewer timezone, favourites)
├── i18n/                  # next-intl routing, navigation, and request config
├── lib/                   # Domain modules (brand, football, news, site-articles, fan-predictions, calendar, ai, seo, supabase)
├── messages/              # UI translations (en.json, vi.json — 1,156 keys in strict parity)
├── stores/                # Zustand client stores (auth, toast)
└── proxy.ts               # Next.js 16 request proxy (locale routing, scanner guard, /profile auth)
supabase/migrations/       # PostgreSQL schema & RLS migrations (001–012)
e2e/                       # Playwright end-to-end test suite
docs/                      # Bilingual English & Vietnamese developer documentation
```

---

## Quick Start

### Prerequisites

- Node.js 20+ (Node 22/24 LTS recommended) & npm 10+
- Supabase project (PostgreSQL + Auth + Storage)
- API keys for Football-Data.org and VietAPI (plus optional Cloudinary & YouTube Data API v3)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Populate `.env.local` (see `.env.example` for inline guidance):

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase public anon key (RLS-enforced) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only Supabase admin key |
| `FOOTBALL_DATA_ORG_KEY` | Yes | Football-Data.org v4 key (PL/UCL fixtures, standings, squad) |
| `VIETAPI_KEY` | Yes | VietAPI key (daily briefing, article translation, match reviews) |
| `NEXT_PUBLIC_SITE_URL` | Yes | Canonical site origin (`http://localhost:3000` locally, `https://anfielddaily.com` in prod) |
| `CRON_SECRET` | Yes | Bearer token protecting scheduled `/api/news/*` and `/api/site-articles/*` endpoints |
| `YOUTUBE_API_KEY` | Optional | YouTube Data API v3 key for the `lfctv` video strip on `/news` |
| `CLOUDINARY_CLOUD_NAME` | Optional | Cloudinary cloud name for `/gallery` |
| `CLOUDINARY_API_KEY` | Optional | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Optional | Cloudinary API secret |
| `NEXT_PUBLIC_ADSENSE_CLIENT_ID` | Optional | Google AdSense publisher ID (rendered only on non-mirror pages) |
| `NEXT_PUBLIC_CF_ANALYTICS_TOKEN` | Optional | Cloudflare Web Analytics beacon token |

### 3. Apply database migrations & run locally

Push `supabase/migrations/*.sql` via `supabase db push` (or the Supabase SQL Editor), then start the dev server:

```bash
npm run dev
```

Open `http://localhost:3000` (English) or `http://localhost:3000/vi` (Vietnamese).

---

## Scripts

```bash
npm run dev          # Start Next.js 16 dev server (Turbopack)
npm run build        # Production Next.js build
npm run start        # Start local production server
npm run lint         # Run ESLint 9
npm test             # Run Vitest unit test suite
npm run test:e2e     # Run Playwright E2E suite (desktop + mobile)
npm run test:e2e:ui  # Open Playwright interactive UI runner
npm run seed:gallery # Seed gallery metadata from Cloudinary
npm run cf:build     # Build OpenNext bundle for Cloudflare Workers
npm run cf:preview   # Preview Worker bundle locally via Wrangler
npm run cf:deploy    # Deploy Worker bundle to Cloudflare
```

---

## Automation & Deployment

- **Cloudflare Workers CI/CD (`.github/workflows/deploy-cloudflare.yml`):** Every code push to `master` runs `tsc --noEmit`, `npm run lint`, `npm test`, builds via `@opennextjs/cloudflare`, deploys to Cloudflare Workers (`anfielddaily.com`), prunes stale R2 cache prefixes, smoke-tests core routes, and sends a deployment notification.
- **Hourly News Sync (`.github/workflows/news-sync.yml`):** Triggers `GET /api/news/sync` at `0 * * * *` UTC with `Authorization: Bearer $CRON_SECRET`, logs per-source telemetry and freshness alerts to Telegram, and runs an idempotent retry for `/api/news/digest/generate` during `01:00–16:59 UTC`.
- **Daily Briefing & Cleanup (`.github/workflows/news-daily.yml`):** Triggers `GET /api/news/digest/generate` (`00:07 UTC`) and `GET /api/news/cleanup` (`03:17 UTC`).

---

## Contributor Rules

- **Brand & positioning:** Follow [`docs/brand.md`](./docs/brand.md) strictly (`src/lib/brand.ts` is the single source of truth for site identity and marks; never use the club crest as the site's own icon).
- **Supabase client boundary:** Use `src/lib/supabase.ts` in `"use client"` components, `src/lib/supabase-server.ts` (`server-only`) in Server Components/Actions/Route Handlers, and `src/lib/news/supabase-service.ts` for privileged writes. Every Supabase client must use `createSupabaseFetch()` and `db: { retry: false }`.
- **i18n parity:** Keep `src/messages/en.json` and `src/messages/vi.json` in 100% key and ICU placeholder parity (`messages-parity.test.ts`), and keep `CLIENT_MESSAGE_NAMESPACES` (`src/components/providers/client-messages.ts`) aligned with client `useTranslations` calls (`client-messages.test.ts`).
- **Verification before commit:** Run `npx tsc --noEmit && npm run lint && npm test`.
