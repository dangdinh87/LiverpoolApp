# LiverpoolApp (LFCVN)

Liverpool FC fan site for the Vietnamese community, built with Next.js + Supabase.  
Live site:

- Production: `https://www.liverpoolfcvn.blog`
- Vercel URL: `https://liverpool-app-five.vercel.app`

Repository: [dangdinh87/LiverpoolApp](https://github.com/dangdinh87/LiverpoolApp)

## Demo and quick links

- Demo (production): [www.liverpoolfcvn.blog](https://www.liverpoolfcvn.blog)
- Demo (vercel): [liverpool-app-five.vercel.app](https://liverpool-app-five.vercel.app)
- Repository: [dangdinh87/LiverpoolApp](https://github.com/dangdinh87/LiverpoolApp)
- Actions: [GitHub Actions Dashboard](https://github.com/dangdinh87/LiverpoolApp/actions)
- Hourly sync workflow: [`news-sync.yml`](https://github.com/dangdinh87/LiverpoolApp/blob/master/.github/workflows/news-sync.yml)
- Developer docs: [`docs/`](./docs)

## What this app includes

- Liverpool news aggregation from multiple EN/VI RSS sources
- Article extraction, pre-scrape pipeline, and translation support
- Fixtures, standings, squad, stats, and club history pages
- AI chat assistant (Groq via Vercel AI SDK)
- Gallery management and homepage hero image control
- Authenticated user profile with favorites and saved articles
- Hourly automated news sync via GitHub Actions + Telegram reporting

## Tech stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS v4 + shadcn/ui + Framer Motion
- Supabase (Auth, Postgres, Storage)
- next-intl (EN/VI), Zustand, TanStack Query
- Vercel deployment + GitHub Actions scheduler

## Project structure

```text
src/
  app/                 # routes + API endpoints
  components/          # UI + feature components
  lib/                 # business logic (news, football, db, utils)
  messages/            # i18n translation JSON (en/vi)
  i18n/                # locale request config
supabase/migrations/   # SQL migrations
.github/workflows/     # CI/scheduled automation
```

## Requirements

- Node.js 20+
- npm 10+
- Supabase project
- Vercel project (for deployment + cron-protected API endpoints)

## Environment variables

Copy `.env.example` to `.env.local` and fill values:

```bash
cp .env.example .env.local
```

Core variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FOOTBALL_DATA_ORG_KEY`
- `GROQ_API_KEY`
- `CRON_SECRET`
- `NEXT_PUBLIC_SITE_URL`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Reference values and guidance are documented in `.env.example`.

## Install and run locally

```bash
npm install
npm run dev
```

App runs at `http://localhost:3000`.

## Scripts

```bash
npm run dev          # start dev server
npm run build        # production build
npm run start        # run production server
npm run lint         # lint code
npm run test         # run vitest tests
npm run seed:gallery # seed gallery data
```

## News sync automation (GitHub Actions)

Workflow file: `.github/workflows/news-sync.yml`

Triggers:

- `schedule`: hourly (`0 * * * *`)
- `workflow_dispatch`: manual run

Flow:

1. Calls `${{ secrets.SYNC_URL }}` (`/api/news/sync`) with `CRON_SECRET`
2. Validates HTTP status and response JSON
3. Publishes sync metrics to workflow summary
4. Sends Telegram success/failure notification when Telegram secrets exist

Required repository secrets:

- `SYNC_URL` (example: `https://<your-domain>/api/news/sync`)
- `CRON_SECRET` (must match server env)
- `TELEGRAM_BOT_TOKEN` (optional but recommended)
- `TELEGRAM_CHAT_ID` (optional but recommended)

## Build and deployment

- Primary deployment target: Vercel
- Suggested production domain: `https://www.liverpoolfcvn.blog`
- Local production build:

```bash
npm run build
```

If your machine has a Turbopack/SWC runtime issue, use:

```bash
npm run build -- --webpack
```

## Localization

- Supported locales: `en`, `vi`
- Locale preference stored in cookie `NEXT_LOCALE`
- Language switcher triggers a full page reload to ensure reliable locale updates

## Notes for contributors

- Keep server/client Supabase separation intact:
  - `src/lib/supabase.ts` for browser
  - `src/lib/supabase-server.ts` for server-only usage
- Avoid committing secrets or `.env*` values
- Run `npm run lint` before pushing

## License

This repository currently has no explicit license file. Add one if you plan to open-source usage terms.
