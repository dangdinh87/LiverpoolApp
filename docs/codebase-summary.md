# Anfield Daily — Codebase Summary

Last Updated: 2026-11-18

## Overview

**Anfield Daily** (`https://anfielddaily.com`) is an unofficial bilingual (`en` / `vi`) Liverpool FC news and match data application. It gathers reporting from 13 English outlets plus official club video (`lfctv`), removes duplicates, publishes a daily AI briefing and fact-validated post-match editorial reviews, and pairs news with live fixtures, standings, squad profiles, player statistics, fan score predictions, post-match player ratings, a spoiler-free mode, and an `.ics` fixture calendar.

**Core Stack:** Next.js 16.4 (App Router, Turbopack) · React 19 · TypeScript 5 (`strict`) · Tailwind CSS v4 · `shadcn/ui` (`radix-ui`) · `next-intl` · Supabase (Auth, PostgreSQL, Storage) · VietAPI (`@ai-sdk/openai-compatible` + `ai`) · Cloudflare Workers (`@opennextjs/cloudflare` + R2 + D1 + Durable Objects) · Vitest & Playwright.

---

## Architecture Highlights

### 1. News Aggregation, Full-Article Extraction & Video (`src/lib/news/`)

- **13 English Press Outlets (`NEWS_OUTLET_COUNT = 13`):**
  - `LfcAdapter` (`liverpoolfc.com` via `sitemap-news.xml`, filtered to Men's & Club stories)
  - 12 RSS feeds (`src/lib/news/config.ts`): BBC Sport (`bbc`), The Guardian (`guardian`), This Is Anfield (`tia`, link-out only), Anfield Watch (`anfield-watch`), Empire of the Kop (`eotk`), Sky Sports (`sky`), Mirror (`mirror`), The Independent (`independent`), Anfield Index (`anfieldindex`), Liverpool.com (`liverpoolcom`), Liverpool Echo (`echo`), and ESPN (`espn`).
- **Club Video (`lfctv`):** `YouTubeChannelAdapter` (`src/lib/news/youtube-data-api.ts`) pulls official Liverpool FC YouTube uploads via YouTube Data API v3 (`YOUTUBE_API_KEY`) for the `/news` video strip while excluding video items from text scraping, digests, and text search.
- **Hourly Sync Pipeline (`src/lib/news/sync.ts`):**
  1. Parallel feed fetch (`cache: "no-store"`, 14-day freshness cutoff, per-source status telemetry).
  2. Canonical URL normalisation (`src/lib/news/url.ts`, stripping tracking query params and trailing slashes, plus `articleUrlVariants()` lookup compatibility) and Jaccard title similarity deduplication (`dedup.ts`).
  3. Weighted Liverpool keyword scoring (`LFC_KEYWORDS_WEIGHTED`, aligned with the 2026/27 squad, head coach Andoni Iraola, and sporting director Julian Ward) and regex category classification (`match-report`, `transfer`, `injury`, `team-news`, `opinion`, `analysis`, `general`).
  4. Batch upsert to Supabase `articles` (`mergeArticleRowForUpsert` preserving `is_active` and `read_count`).
  5. `og:image` thumbnail enrichment (`og-meta.ts`) and adaptive pre-scraping (`article-extractor.ts`, 45s time budget safely inside Cloudflare's 100s timeout).
- **Content Extraction & Reader (`/news/[...slug]`):**
  - `article-extractor.ts` combines `linkedom`, `@mozilla/readability`, per-source Cheerio selectors, boilerplate stripping (`text.ts`, `junk.ts`), inline HLS/MP4 video detection, and `sanitize-html` (cached 24h in `articles.content_en`).
  - `TranslatableExcerpt` renders full extracted HTML (`ArticleHtmlBody` + `ArticleVideoPlayer` via `hls.js`) with publisher credit and original link above the body (`noindex, follow`, no ads) and toggles smoothly to Vietnamese translation.

### 2. AI Editorial & Translation (`src/lib/ai/vietapi.ts`, `src/lib/site-articles/`)

All LLM workloads call **VietAPI** (`VIETAPI_KEY`) lazily per request via `@ai-sdk/openai-compatible` and `ai`, anchored by `buildCurrentFactsBlock()` (`src/lib/prompts/current-facts.ts`):

- **On-Demand Article Translation (`POST /api/news/translate`):** Translates verified `articles` rows (`<= 18,000` chars) into idiomatic Vietnamese sports journalism (`deepseek-v4-flash` → `deepseek-v4-pro` → `claude-sonnet-5`), deduplicated in-flight per canonical URL, rate-limited per IP, and cached in `articles.content_vi` + browser `localStorage` (7-day TTL).
- **AI Daily Briefing (`src/lib/news/digest.ts`, `/news/digest/[date]`):** Generated daily at `00:07 UTC` (with hourly idempotent retry `01:00–16:59 UTC`) in two parallel LLM calls (structured briefing + SEO article, `Europe/London` date key) and stored in `news_digests`.
- **Fact-Validated Post-Match Analysis (`src/lib/site-articles/`, `/analysis/[slug]`):** `/api/site-articles/generate` turns verified fixture facts (`match-review-facts.ts`) into bilingual (`en` + `vi`) editorial reviews. Every draft must pass `validateDraft()` (`validate-draft.ts`: scoreline/player accuracy, brand positioning rules, anti-cliché & entity hygiene) and `tooSimilar()` before publishing to `site_articles` (rejected drafts are stored with `reject_reason` for auditability).

### 3. Football Data & Community Features (`src/lib/football/`, `src/lib/fan-predictions/`, `src/lib/calendar/`)

- **Football Data Barrel (`src/lib/football/index.ts`, `server-only`, `React.cache()`):**
  - **Football-Data.org v4 (`fdo-client.ts`):** PL & UCL standings, fixtures, multi-season archive (`current-season.ts`), H2H (`fdo-h2h.ts`), top scorers/assists, and coach. Features per-isolate in-flight deduplication, `HTTP 429` retry/backoff (`X-RequestCounter-Reset`), and `requireNonEmptyArray()` cache protection.
  - **ESPN (`espn-events.ts`):** FA Cup & EFL Cup fixtures, live match polling (`/api/live-fixture`), minute-accurate match events, lineups, and 28 team stats (free, no key).
  - **FPL API (`fpl-stats.ts`):** Granular Premier League player stats supplement.
  - **Broadcaster Lookup (`premier-league-broadcasters.ts`):** Maps viewer IANA time zone to local Premier League TV/streaming broadcaster.
- **Predictions & Player Ratings (`/predictions`, `/fixtures/[id]`):** Pre-match score predictions (3 pts exact, 1 pt outcome), largest-remainder community split, season leaderboard, and post-match 1–10 player ratings (`match_predictions`, `player_ratings` via service-role Server Actions in `src/app/actions/predictions.ts`).
- **Spoiler-Free Mode (`src/lib/spoiler-mode.ts`):** Inline blocking `SPOILER_BOOT_SCRIPT` sets `data-spoiler-free` on `<html>` before first paint so shared ISR pages mask scores purely in CSS without flicker.
- **iCalendar Feed (`/api/calendar/liverpool.ics`):** RFC 5545 UTC fixture subscription with localised competition names, 30-minute VALARM reminders, and spoiler-free summaries.

### 4. Supabase Client Split & Resilience

| Module | Context | Key & Protection |
|---|---|---|
| `src/lib/supabase.ts` | `"use client"` components | Anon key, RLS enforced, `createSupabaseFetch()` |
| `src/lib/supabase-server.ts` | Server Components, Actions, Route Handlers (`server-only`) | Anon key + session cookies, `createSupabaseFetch()` |
| `src/lib/news/supabase-service.ts` | Cron/admin routes & validated server writes (`server-only`) | Service role key, `createSupabaseFetch()` |

- **Timeout & Circuit Breaker (`src/lib/supabase-fetch-with-timeout.ts`):** Every client enforces a 3s Promise-race timeout (impervious to Next.js 16 stripping `AbortSignal` during stale `fetch-cache` foreground revalidation), `db: { retry: false }`, and a 30s circuit breaker on transport timeouts or `502`/`503`/`504`/`52x` gateway errors.
- **Database Schema (`supabase/migrations/001`–`012`):** `profiles`, `favourite_players`, `articles`, `sync_logs`, `article_likes`, `article_comments`, `saved_articles`, `gallery`, `news_digests`, `site_articles`, `match_predictions`, `player_ratings` (plus unused legacy `conversations`/`messages` in `chat_schema.sql`).

### 5. Bilingual Routing & RSC Payload Optimisation (`src/i18n/`, `src/proxy.ts`)

- **URL Strategy:** `en` is the default locale at `/` (unprefixed); `vi` lives at `/vi` (`localePrefix: "as-needed"` in `src/i18n/routing.ts`). All pages live under `src/app/[locale]/` and call `setRequestLocale(locale)` for full static/ISR prerendering.
- **Request Proxy (`src/proxy.ts`):** Handles `next-intl` locale negotiation (`NEXT_LOCALE` cookie → `Accept-Language`), short-circuits CMS scanner probes (`404`), protects `/profile`, and sets `X-Robots-Tag: noindex, nofollow` on `/auth` and `/profile`.
- **Client Message Trimming (`src/components/providers/client-messages.ts`):** `pickClientMessages()` strips heavy server-only namespaces (`Legal`, `History`, `About` prose, `Stats`, `Season`, `Analysis`, etc.) from `<NextIntlClientProvider>`, reducing serialised client i18n payloads by ~52% while `client-messages.test.ts` AST-verifies every client `useTranslations` namespace.

### 6. Design System — "Dark Stadium" & Brand (`docs/brand.md`, `src/lib/brand.ts`)

- **Brand Identity:** `BRAND`, `MARK` (aerial pitch centre circle on `#C8102E` rounded tile), and `WORDMARK` (`ANFIELD DAILY` in League Gothic caps) live solely in `src/lib/brand.ts`.
- **Tokens (`src/app/globals.css`):** `#0D0D0D` background, `#1A1A1A` / `#252525` surfaces, `#2A2A2A` borders, `#A0A0A0` muted text, `#C8102E` red fills, `#FF3347` accessible AA red text (`text-lfc-red-text` / `text-brand`), `#F6EB61` sparse gold accents.
- **Typography:** League Gothic (`font-bebas`), Newsreader (`font-serif`), Inter (`font-inter`), Barlow Condensed (`font-barlow`).

---

## API Routes & Server Actions

| Endpoint / Module | Method | Auth / Protection | Purpose |
|---|---|---|---|
| `/api/news/sync` | `GET` | `Bearer CRON_SECRET` | Hourly RSS + LFC + YouTube sync, OG enrich & 45s pre-scrape |
| `/api/news/digest/generate` | `GET` | `Bearer CRON_SECRET` | Daily AI briefing + SEO article generation (idempotent) |
| `/api/news/cleanup` | `GET` | `Bearer CRON_SECRET` | Daily retention cleanup for cached bodies, old articles & logs |
| `/api/site-articles/generate` | `GET`/`POST` | `Bearer CRON_SECRET` | Fact-validated AI post-match review generator |
| `/api/news/translate` | `POST` | IP rate limit + DB URL check | On-demand EN→VI full-article translation via VietAPI |
| `/api/news/comments` | `GET`/`POST`/`DELETE` | Public read / Supabase auth write | Article comments CRUD with privacy scrubbing |
| `/api/news/like` | `GET`/`POST` | Supabase session | Toggle/read article likes |
| `/api/saved-articles/check` | `GET` | Supabase session | Bookmark status check across URL variants |
| `/api/calendar/liverpool.ics` | `GET` | Public (`max-age=3600`) | RFC 5545 spoiler-free UTC fixture subscription |
| `/api/live-fixture` | `GET` | Public | Live match polling snapshot |
| `/api/gallery`, `/homepage`, `/settings` | `GET`/`POST` | Public read / admin write | Cloudinary gallery items & hero settings |
| `/api/streak` | `GET`/`POST` | Supabase session | Reader daily visit streak |
| `src/app/actions/predictions.ts` | Action | Supabase session + kickoff/lineup check | Submit score predictions & post-match player ratings |
| `src/app/actions/profile.ts` & `auth.ts` | Action | Supabase session | Profile updates, avatar validation & auth actions |

---

## Testing & Deployment

- **Unit Tests (`npm test`):** Vitest 4 (`vitest.config.mts`) — `76` test suites, `774` tests covering news sync/dedup/text cleaning, draft validation, SEO/ICS builders, API hardening, Supabase circuit breaker, EN/VI message & data parity (`1,156` keys, 31 squad bios), and client namespace AST coverage.
- **E2E Tests (`npm run test:e2e`):** Playwright (`playwright.config.ts`, `e2e/*.spec.ts`) — `126` passed desktop + mobile tests (`142` total definitions) against `next build && next start` with strict zero-console-error / zero-5xx assertions (`page-diagnostics.ts`).
- **Cloudflare Workers Deployment:** Built with `@opennextjs/cloudflare` (`npm run cf:build`), backed by R2 (`liverpool-app-next-cache`), D1 (`liverpool-app-tag-cache`), and Durable Objects (`DOQueueHandler`), deployed automatically from `master` via `.github/workflows/deploy-cloudflare.yml`.

---

## References

- [CLAUDE.md](../CLAUDE.md) — Engineering instructions & invariants
- [Brand Guide](./brand.md) — Identity, positioning, logo, colour & typography rules
- [English Docs](./en/architecture.md) · [Vietnamese Docs](./vi/architecture.md)
