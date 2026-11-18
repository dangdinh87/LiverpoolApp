# Getting Started

**Anfield Daily** — unofficial bilingual (`en` / `vi`) Liverpool FC news, AI briefing, post-match analysis, and match centre built with Next.js 16.4 (App Router), TypeScript, Tailwind CSS v4, Supabase, and Cloudflare Workers.
Live site: [anfielddaily.com](https://anfielddaily.com)

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | 20+ | Node 22 or 24 LTS recommended |
| npm | 10+ | Bundled with Node |
| Git | Any | — |
| Supabase project | — | [supabase.com](https://supabase.com) — PostgreSQL, Auth & Storage |
| Football-Data.org key | — | [football-data.org](https://www.football-data.org) — free tier (10 req/min) |
| VietAPI key | — | [vietapi.tech](https://vietapi.tech) — OpenAI-compatible LLM proxy for briefings, translations & match reviews |
| Cloudinary account | Optional | [cloudinary.com](https://cloudinary.com) — required for `/gallery` image transforms |
| YouTube Data API v3 key | Optional | Google Cloud Console — enables the official club video strip (`lfctv`) on `/news` |

---

## Clone & Install

```bash
git clone https://github.com/dangdinh87/LiverpoolApp.git
cd LiverpoolApp
npm install
```

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

| Variable | Required | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase Dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase Dashboard → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase Dashboard → Project Settings → API (`service_role`, server-only) |
| `FOOTBALL_DATA_ORG_KEY` | Yes* | [football-data.org/client/register](https://www.football-data.org/client/register) |
| `NEXT_PUBLIC_SITE_URL` | Yes | `http://localhost:3000` locally, `https://anfielddaily.com` in production |
| `VIETAPI_KEY` | Yes | [vietapi.tech](https://vietapi.tech) — powers daily briefing, VI translation & match analysis |
| `CRON_SECRET` | Yes | Random secret (e.g. `openssl rand -hex 32`) protecting cron routes |
| `YOUTUBE_API_KEY` | Optional | Google Cloud Console → YouTube Data API v3 (skipped gracefully if unset) |
| `CLOUDINARY_CLOUD_NAME` | Optional | Cloudinary Dashboard → Settings |
| `CLOUDINARY_API_KEY` | Optional | Cloudinary Dashboard → Settings → Access Keys |
| `CLOUDINARY_API_SECRET` | Optional | Cloudinary Dashboard → Settings → Access Keys |
| `NEXT_PUBLIC_ADSENSE_CLIENT_ID` | Optional | Google AdSense publisher ID (leave empty to disable ads) |
| `NEXT_PUBLIC_CF_ANALYTICS_TOKEN` | Optional | Cloudflare Web Analytics site token |

> *Without `FOOTBALL_DATA_ORG_KEY`, football data helpers log a warning and return empty arrays/`null` so pages render clean empty states (there is no mock provider).

---

## Database Setup

Apply the migrations in `supabase/migrations/` to your Supabase project using either the Supabase CLI or the SQL Editor.

### Option A — Supabase CLI (recommended)

```bash
npx supabase link --project-ref your-project-ref
npx supabase db push
```

### Option B — SQL Editor (in order)

```text
supabase/migrations/001_initial.sql                          # profiles, favourite_players + RLS
supabase/migrations/002_articles.sql                         # articles, sync_logs
supabase/migrations/003_article_interactions.sql             # article_likes, article_comments
supabase/migrations/004_saved_articles.sql                   # saved_articles bookmarks
supabase/migrations/005_gallery.sql                          # gallery metadata & site settings
supabase/migrations/006_news_digests_seo_article.sql         # news_digests + SEO article payload
supabase/migrations/007_news_tables_rls_and_comment_privacy.sql # RLS & comment privacy scrubbing
supabase/migrations/008_repair_articles_null_flags.sql       # non-null is_active / read_count repair
supabase/migrations/009_site_articles.sql                    # site_articles (/analysis reviews)
supabase/migrations/010_rls_repair_and_function_hardening.sql # RLS & SQL function hardening
supabase/migrations/011_rls_initplan_and_fk_indexes.sql      # RLS initplan & FK indexes
supabase/migrations/012_fan_predictions_and_ratings.sql      # match_predictions, player_ratings
```

### OAuth Setup (Supabase)

To enable Google or GitHub sign-in locally:

1. Open Supabase Dashboard → Authentication → Providers and enable Google and/or GitHub.
2. Add your OAuth client ID and secret from Google Cloud Console / GitHub Developer Settings.
3. Add `http://localhost:3000/auth/callback` under Authentication → URL Configuration → Redirect URLs.

---

## Running the Dev Server

```bash
npm run dev
```

- English (default): `http://localhost:3000`
- Vietnamese: `http://localhost:3000/vi`

---

## Available Commands

```bash
npm run dev          # Start Next.js 16 dev server (Turbopack)
npm run build        # Production Next.js build
npm run start        # Run local production server
npm run lint         # ESLint 9
npm test             # Vitest unit tests
npm run test:e2e     # Playwright E2E suite (builds + runs desktop & mobile projects)
npm run test:e2e:ui  # Playwright interactive UI runner
npm run seed:gallery # Seed gallery metadata from Cloudinary
npm run cf:build     # Build OpenNext bundle for Cloudflare Workers
npm run cf:preview   # Preview Worker locally via Wrangler
npm run cf:deploy    # Deploy Worker to Cloudflare
```

---

## Condensed Project Structure

```text
src/
├── app/
│   ├── [locale]/          # Localized pages (/, /vi, /news, /analysis, /fixtures, /standings, /predictions, /squad, /player/[id], /stats, /season, /history, /gallery, /profile, /auth, /about, /legal)
│   ├── actions/           # Server Actions (auth, profile, news pagination, fan predictions)
│   ├── api/               # Route handlers (news sync/digest/cleanup/translate/comments/like, site-articles, calendar .ics, gallery, live-fixture, streak)
│   ├── auth/callback/     # Supabase OAuth callback
│   ├── llms.txt/          # AI crawler guide
│   ├── robots.txt/        # Dynamic robots.txt
│   └── sitemap.xml/       # Localized XML sitemap
├── components/            # Feature UI + shadcn/ui primitives + pickClientMessages
├── data/                  # Static JSON + .vi.json localized variants
├── hooks/                 # Spoiler-free, hydration-safe clock, viewer timezone, favourites
├── i18n/                  # next-intl routing, navigation & request config
├── lib/                   # Brand, football, news, site-articles, fan-predictions, calendar, ai, seo, supabase
├── messages/              # en.json & vi.json (1,156 keys in strict parity)
├── stores/                # Zustand stores (auth, toast)
└── proxy.ts               # Next.js 16 request proxy (locale routing, scanner guard, /profile auth)
```

---

## Key Architectural Invariants

- **Brand source of truth** — `src/lib/brand.ts` and [`docs/brand.md`](../brand.md) define **Anfield Daily**'s identity, pitch-circle mark, typography, and news-first voice. Never use the Liverpool FC crest as the site's own icon.
- **Supabase client split** — `src/lib/supabase.ts` (browser) vs `src/lib/supabase-server.ts` (`server-only`) vs `src/lib/news/supabase-service.ts` (service role). Every client uses `createSupabaseFetch()` (`3s` timeout + `30s` circuit breaker) and `db: { retry: false }`.
- **Server-first football barrel** — import football queries exclusively from `@/lib/football`, where every function is `server-only` and wrapped in `React.cache()`.
- **Bilingual URL & RSC payload discipline** — English lives at `/` and Vietnamese under `/vi` via `src/i18n/routing.ts`; `<NextIntlClientProvider>` receives only client-used namespaces via `pickClientMessages()`.

---

## Further Reading

- [Architecture](./architecture.md) — system layers, Cloudflare Workers runtime, caching & resilience
- [Code Standards](./code-standards.md) — component patterns, TypeScript rules, motion & accessibility
- [Design System](./design-system.md) — Dark Stadium tokens, 4-font typography & `shadcn/ui`
- [News System](./news-system.md) — 13 English outlets, pre-scraper, VietAPI briefing, translation & `/analysis`
- [Deployment](./deployment.md) — Cloudflare Workers (`@opennextjs/cloudflare`), R2/D1/DO & GitHub Actions
