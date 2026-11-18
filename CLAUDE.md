# Anfield Daily — Liverpool news site

Trang tin Liverpool để đọc nhanh: tổng hợp bài viết từ báo chí Anh, lọc trùng và tóm tắt mỗi ngày (bản tin AI), đi kèm bài phân tích sau trận, lịch thi đấu, kết quả, bảng xếp hạng, dự đoán tỷ số, thống kê, đội hình và lịch sử CLB. Thiết kế "Dark Stadium", song ngữ Anh–Việt. Chuyên trang độc lập, không chính thức và không liên kết với Liverpool FC hay Premier League.

**Định vị (do chủ dự án chốt, 10/2026):** trọng tâm của trang là đọc tin Liverpool nhanh, lọc trùng và theo dõi bản tin tóm tắt hằng ngày. Không định vị theo khoảng cách địa lý hay cộng đồng vùng miền; toàn bộ nội dung xoay quanh tin tức, dữ liệu trận đấu và phân tích chuyên môn (xem `docs/brand.md`).

## Tech Stack

- **Framework:** Next.js 16.4 (App Router, Turbopack) + TypeScript 5 + React 19
- **Styling:** Tailwind CSS v4 (`@theme inline`) + `shadcn/ui` (`radix-ui` primitives, `lucide-react` icons)
- **Backend:** Supabase (Auth + PostgreSQL + Storage, bọc `createSupabaseFetch` timeout 3s & circuit breaker 30s)
- **Football Data:** Football-Data.org v4 (primary, 10 req/min free tier, `fdo-client` dedup + 429 backoff) + ESPN (cup fixtures, live events, lineups, 28 match stats — free) + FPL API (player stats)
- **News & Video:** 12 English RSS feeds + LFC Official sitemap adapter (`NEWS_OUTLET_COUNT = 13`) + LFC YouTube (`lfctv` via YouTube Data API v3), synced to Supabase
- **AI (VietAPI):** `@ai-sdk/openai-compatible` + `ai` (`src/lib/ai/vietapi.ts`) — daily briefing (`/news/digest`), on-demand full-article EN→VI translation (`/api/news/translate`), and fact-validated post-match editorial reviews (`/analysis`)
- **Gallery:** Cloudinary image hosting + `yet-another-react-lightbox`
- **i18n:** `next-intl` (`en` default at `/`, `vi` at `/vi`), `pickClientMessages` RSC payload filter (~52% smaller client i18n payload)
- **State:** Zustand (`auth-store`, `toast-store`), TanStack Query (`QueryProvider`)
- **Animation & Charts:** Framer Motion (`<MotionConfig reducedMotion="user">`), Recharts
- **Deploy:** Cloudflare Workers via `@opennextjs/cloudflare` (R2 incremental cache + regional Cache API, D1 tag cache, Durable Object queue). See "Cloudflare Workers" below.

## Commands

```bash
npm run dev          # Start dev server (next dev / Turbopack)
npm run build        # Production build
npm run start        # Start local production server
npm run lint         # ESLint 9
npm test             # Vitest unit tests (774 tests across 76 files)
npm run test:e2e     # Playwright E2E suite (desktop + mobile against production build)
npm run seed:gallery # Seed gallery data (tsx scripts/seed-gallery.ts)
npm run cf:build     # Build OpenNext bundle for Cloudflare Workers
npm run cf:preview   # Preview Worker locally
npm run cf:deploy    # Deploy Worker to Cloudflare
```

## UI Components — shadcn/ui

**Ưu tiên dùng shadcn/ui cho mọi component UI.** Style: `new-york`, icon: `lucide`, base color: `neutral`, unified `radix-ui` package.

Installed primitives (`src/components/ui/`):
`accordion`, `alert-dialog`, `badge`, `button`, `dialog`, `dropdown-menu`, `popover`, `sheet`, `skeleton`, `slider`, `switch`, `table`, `tooltip`

Custom UI helpers (`src/components/ui/`):
`empty-state`, `error-boundary`, `form-badge`, `local-time`, `page-hero`, `scroll-to-top`, `section-header`, `team-crest`, `toast-notification`

Install thêm component:
```bash
npx shadcn@latest add <component-name>
```

Quy tắc:
- Luôn check shadcn/ui registry trước khi tự viết component (button, dialog, select, tabs, etc.)
- Component shadcn nằm ở `src/components/ui/`, import qua `@/components/ui/<name>`
- Utility `cn()` ở `src/lib/utils.ts` — dùng cho merge Tailwind classes
- Config: `components.json` (style: `new-york`, `rsc: true`, `cssVariables: true`)

## Project Structure

```text
src/
├── app/
│   ├── layout.tsx              # Root shell
│   ├── globals.css             # Tailwind v4 @theme inline tokens & reduced-motion rules
│   ├── [locale]/               # Localised routes (en at /, vi at /vi)
│   │   ├── layout.tsx          # Fonts, ThemeProvider, pickClientMessages, NavbarAuth, Footer
│   │   ├── (home)/page.tsx     # Homepage — Hero, DigestFeature, BentoGrid widgets
│   │   ├── news/               # /news feed, /news/[...slug] reader, /news/digest/[date]
│   │   ├── analysis/           # /analysis listing + /analysis/[slug] AI post-match reviews
│   │   ├── fixtures/           # /fixtures timeline + /fixtures/[id] match centre, predictions, ratings
│   │   ├── standings/          # Premier League & Champions League tables (revalidate 6h)
│   │   ├── predictions/        # Fan score predictions & community leaderboard
│   │   ├── squad/              # Squad grid + position filter & search
│   │   ├── players/            # Players directory
│   │   ├── player/[id]/        # Player detail, FPL/season stats, bios, news mentions
│   │   ├── stats/              # Stats dashboard + /stats/[season] season archive stats
│   │   ├── season/             # Season archive overview & fixtures
│   │   ├── history/            # Club history — trophies, timeline, legends, Anfield
│   │   ├── gallery/            # Cloudinary photo gallery + lightbox (ISR)
│   │   ├── auth/               # /auth/login, /auth/register
│   │   ├── profile/            # Protected user profile — avatar, favourites, saved articles
│   │   ├── about/              # About Anfield Daily & support modal
│   │   └── legal/              # Legal, copyright & privacy disclosures
│   ├── actions/                # Server Actions (auth.ts, profile.ts, news.ts, predictions.ts)
│   ├── api/
│   │   ├── news/sync/          # Cron: sync 13 English outlets + YouTube → Supabase
│   │   ├── news/cleanup/       # Cron: prune expired cached bodies, old articles & sync_logs
│   │   ├── news/digest/generate/ # Cron: AI daily briefing + SEO article (VietAPI)
│   │   ├── news/translate/     # On-demand EN→VI full-article translation (VietAPI)
│   │   ├── news/comments/      # Article comments CRUD
│   │   ├── news/like/          # Article likes
│   │   ├── site-articles/generate/ # Cron: fact-validated AI post-match reviews (VietAPI)
│   │   ├── calendar/liverpool.ics/ # RFC 5545 spoiler-free UTC fixture subscription feed
│   │   ├── gallery/            # Gallery list, homepage featured & site settings
│   │   ├── saved-articles/     # User bookmarks check
│   │   ├── live-fixture/       # Live match polling
│   │   └── streak/             # User reading streak
│   ├── auth/callback/          # Supabase OAuth callback
│   ├── llms.txt/               # LLM guide (written-here vs attributed publisher mirrors)
│   ├── robots.txt/             # Dynamic crawl rules & SEO-tool crawler blocks
│   └── sitemap.xml/            # Dynamic bilingual XML sitemap with hreflang alternates
├── components/
│   ├── ui/                     # shadcn/ui primitives + shared UI helpers
│   ├── providers/              # QueryProvider, client-messages.ts (pickClientMessages)
│   ├── layout/                 # NavbarAuth → NavbarClient, NavbarMobileSheet, Footer, BrandMark, LanguageSwitcher
│   ├── home/                   # Hero, DigestFeature, BentoGrid, NextMatchWidget, StandingsPreview
│   ├── news/                   # NewsFeed, TranslatableExcerpt, ArticleHtmlBody, ArticleVideoPlayer, CommentSection, VideoStrip
│   ├── fixtures/               # FixtureTimeline, MatchScoreHeader, FormationPitch, H2HSection, FanPrediction, PlayerRatings, SpoilerControls, AddToCalendar
│   ├── standings/              # StandingsTable, StandingsSummary
│   ├── squad/                  # SquadGrid, PlayerCard, FavouriteHeart
│   ├── player/                 # PlayerSeasonStats & bio components
│   ├── stats/                  # SeasonOverview, FormTimeline, CompetitionBreakdown, RecordsMilestones
│   ├── history/                # TrophyCabinet, Timeline, LegendCard, StadiumShowcase
│   ├── gallery/                # GalleryContent + lightbox
│   ├── auth/ & profile/        # LoginForm, ProfileLayout, ProfileForm, AvatarUpload, SavedArticlesList
│   └── analytics/              # StructuredData, GoogleAdsense, AdsenseGate, CloudflareWebAnalytics
├── lib/
│   ├── brand.ts                # Single source of truth for BRAND, MARK, WORDMARK
│   ├── env.ts                  # Lazy env reader for Node & Cloudflare Workers isolates
│   ├── football/               # Server-only football layer (fdo-client, fdo-provider, espn-events, fpl-stats, premier-league-broadcasters, current-season)
│   ├── news/                   # Sync pipeline, adapters, enrichers (article-extractor, readability, og-meta), dedup, digest, youtube-data-api, url, source-hosts
│   ├── site-articles/          # Fact-checked AI post-match review generator & validate-draft guard
│   ├── fan-predictions/        # Prediction scoring (3/1/0) & community leaderboard
│   ├── calendar/               # RFC 5545 fixtures-ics builder
│   ├── ai/vietapi.ts           # OpenAI-compatible VietAPI client
│   ├── prompts/                # current-facts.ts & site-article-voice.ts
│   ├── og/story-card.tsx       # Shared OpenGraph card renderer
│   ├── seo.ts & seo-breadcrumbs.ts # Metadata, hreflang, canonical, JSON-LD builders
│   ├── spoiler-mode.ts         # Pre-paint spoiler-free CSS attribute & storage helpers
│   ├── supabase.ts             # Browser Supabase client
│   ├── supabase-server.ts      # Server Supabase client (import "server-only")
│   └── supabase-fetch-with-timeout.ts # 3s Promise-race timeout + 30s circuit breaker
├── data/                       # Bilingual JSON (trophies, history, legends, club-info, player-bios.vi, squad, gallery)
├── messages/                   # en.json & vi.json (1,156 keys in strict parity)
├── hooks/                      # use-favourites, use-now-after-mount, use-spoiler-free, use-url-search-param, use-viewer-time-zone
├── stores/                     # auth-store.ts, toast-store.ts
├── i18n/                       # routing.ts, request.ts, navigation.ts, revalidate.ts
└── proxy.ts                    # Next.js 16 proxy (i18n routing, scanner block, /profile auth)
```

## Architecture Rules

### Supabase Client Split (CRITICAL)

- `src/lib/supabase.ts` — browser client (`createClient()`), safe for `"use client"` components
- `src/lib/supabase-server.ts` — server client (`createServerSupabaseClient()`), guarded with `import "server-only"`
- **Never import `supabase-server.ts` in client components** — build will fail
- Service role client for admin/cron/validated writes: `src/lib/news/supabase-service.ts` (`getServiceClient()`)

### Football Data Layer

- All functions in `src/lib/football/` are server-only with `React.cache()` for per-request dedup
- Primary: Football-Data.org (`FOOTBALL_DATA_ORG_KEY`, `src/lib/football/fdo-client.ts`) — standings (PL + UCL), fixtures, archived seasons, H2H, squad, coach; includes in-flight request deduplication, `HTTP 429` retry/backoff via `X-RequestCounter-Reset`, and `requireNonEmptyArray()` so `unstable_cache` never caches transient empty upstream responses
- Supplement: ESPN (`espn-events.ts`) — cup fixtures (FA Cup, EFL Cup), live snapshots, minute-by-minute match events, lineups, and 28 match stats — free, no key
- Player stats supplement: Fantasy Premier League API (`fpl-stats.ts`) — free, no key
- "Where to watch": `src/lib/football/premier-league-broadcasters.ts` maps the viewer's IANA time zone to a country and its Premier League broadcaster (time zone, not interface language). Premier League only; unknown country renders nothing.
- Without `FOOTBALL_DATA_ORG_KEY` the data layer logs a warning and returns empty — there is no mock fallback.

### Navbar Pattern

- `NavbarAuth` (server component) → fetches auth + profile via `createServerSupabaseClient()`
- Passes data to `NavbarClient` / `NavbarMobileSheet` (client components) as props
- Layout uses `<NavbarAuth />`, never a client-fetching navbar

### News System

- 13 English outlets (`NEWS_OUTLET_COUNT` in `src/lib/news/config.ts` derives the number printed on the site):
  LFC Official, BBC Sport, The Guardian, Liverpool Echo, This Is Anfield, Anfield Watch,
  Empire of the Kop, Sky Sports, Mirror, The Independent, Anfield Index, Liverpool.com, ESPN — plus club videos (`lfctv`) via `YouTubeChannelAdapter` (`YOUTUBE_API_KEY`).
  - Only English press feeds are ingested; the `vi` interface stays bilingual while legacy source hosts/labels remain registered in `src/lib/news/source-hosts.ts` and `src/lib/news-config.ts` so older stored article URLs continue resolving cleanly.
  - Language filter chips in `NewsFeed` derive from the articles present and fall back to `"all"` when local-language rows are absent so `/vi/news` never renders empty.
  - Scraping uses the honest `NEWS_USER_AGENT` (`src/lib/news/http.ts`) — Reach sites and ESPN block spoofed browser UAs. This Is Anfield blocks automated UAs, so it is link-out only.
  - Zone names V8 cannot parse are resolved explicitly (`BST` = +01:00; `EST` = DST-aware `America/New_York` offset); future dates are clamped to fetch time.
  - LFC adapter (`src/lib/news/adapters/lfc-adapter.ts`) reads `sitemap-news.xml` for titles + exact timestamps and keeps only stories on the Men / Club category pages (excluding Women / Academy / Media Watch); Sky videos/liveblogs and Guardian `/live/` pages are dropped at ingest.
  - Each adapter records fetch status (`ok | http_error | timeout | parse_error | error`) in `sync_logs.source_stats` (`sourceFailures`, `consecutiveZeroInsertRuns`), and `news-sync.yml` alerts on stale or failing feeds.
- **Canonical article URL** (`src/lib/news/url.ts`): tracking params (`at_*`, `utm_*`, …) and trailing slashes are stripped at ingest; reads (`getArticleContentFromDB`, extractor cache, translate, likes, comments, bookmarks) try `articleUrlVariants()` for legacy rows. URLs with genuine query strings (such as `lfctv` YouTube `?v=` links) encode cleanly via base64url slugs.
- **Content Extraction (`src/lib/news/enrichers/article-extractor.ts`):**
  - Uses `linkedom` + `@mozilla/readability` + per-source Cheerio selectors + final `sanitize-html` pass, cached for 24 hours (`CONTENT_CACHE_TTL_MS`).
  - Strips publisher boilerplate ("Read more…", syndication footers, WhatsApp promos, generic next-match widgets) and blocks CORP-restricted image hosts in `isEmbeddableImageUrl`.
  - Inline video detection embeds HLS/MP4 streams as `<div class="article-video-player" data-video-src="...">`, hydrated client-side by `ArticleHtmlBody` + `ArticleVideoPlayer` (`hls.js` loaded on demand).
  - Pre-scrape runs on every hourly sync within a 45s budget (`SCRAPE_TIME_BUDGET_MS`, safely under Cloudflare's 100s timeout).
- **Full-article rendering & translation (`/news/[...slug]`):**
  - Renders the publisher's full extracted body inside `TranslatableExcerpt` (preserving rich HTML/video in English and toggling smoothly to the cached/on-demand Vietnamese translation), with publisher attribution **above** the body, `robots: { index: false, follow: true }`, and no ads.

### AI Editorial & Translation (`src/lib/ai/vietapi.ts`)

All AI features run server-side on **VietAPI** (`VIETAPI_KEY`) via `@ai-sdk/openai-compatible` and `ai`, grounded with `buildCurrentFactsBlock()` (`src/lib/prompts/current-facts.ts` — current date in `GMT+7`, `2026/27` season, head coach Andoni Iraola, active 31-player squad):

- **Daily Briefing (`src/lib/news/digest.ts`):** Generated only by `/api/news/digest/generate` (daily cron + hourly idempotent retry) in two parallel LLM calls (structured briefing + SEO article, `Europe/London` date key). Pages read via `getLatestDigest()` and never generate during render.
- **On-Demand Article Translation (`src/app/api/news/translate/route.ts`):** Translates verified `articles` rows (`<= 18,000` chars) into natural Vietnamese sports journalism (`deepseek-v4-flash` → `deepseek-v4-pro` → `claude-sonnet-5`), deduplicated in-flight per canonical URL, cached in `articles.content_vi` and browser `localStorage`.
- **Post-Match Editorial Analysis (`src/lib/site-articles/`):** `/api/site-articles/generate` builds bilingual (`en` + `vi`) match reviews strictly from verified fixture facts (`match-review-facts.ts`). Drafts must pass `validateDraft()` (score/player verification, brand positioning rules, anti-cliché & HTML entity checks) and similarity checks before publishing to `site_articles` (`/analysis/[slug]`).

### i18n

- 2 locales: `en` (default, unprefixed at `/`) and `vi` (prefixed under `/vi`), configured in `src/i18n/routing.ts` (`localePrefix: "as-needed"`).
- Which locale carries a URL prefix lives **only** in `src/i18n/routing.ts` (`withLocalePrefix`, `splitLocalePrefix`, `LOCALE_PREFIX_PATTERN`). Never hard-code `/en` or `/vi` anywhere else.
- `src/i18n/request.ts` resolves locale from the `[locale]` segment (`setRequestLocale`), keeping pages statically prerenderable; cookie (`NEXT_LOCALE`) and `Accept-Language` negotiation happen in `src/proxy.ts`.
- `<NextIntlClientProvider>` in `src/app/[locale]/layout.tsx` receives `pickClientMessages(messages)` (`src/components/providers/client-messages.ts`), sending only the 25 client-used namespaces (~52% RSC payload reduction) and locked by `client-messages.test.ts`.
- Translation files: `src/messages/en.json`, `src/messages/vi.json` (`1,156` keys in strict parity) + `.vi.json` static data variants in `src/data/`.

## Brand

- Full brand rules (name, logo, colour, type, voice): `docs/brand.md`.
- `src/lib/brand.ts` is the single source of truth that names the site (`BRAND`) and defines the mark (`MARK`: a pitch's centre circle seen from above — vertical full-height halfway line, circle, and centre spot — white on a Liverpool-red rounded tile; static files in `public/brand/` are generated by `npx tsx scripts/build-brand-icons.ts` and tested to match).
- The wordmark (`BrandWordmark`) is live text in League Gothic caps (`0.18em` tracking + short red underline bar).
- The name contains neither "Liverpool" nor "LFC" on purpose (trademark safety); the club crest is never the site's own mark, only match/team data (`TeamCrest`).
- Share images embed the font (`src/assets/fonts/league-gothic-base64.ts`) so OG cards render from code with zero disk or network calls.

## Design System — "Dark Stadium"

- **Background:** `#0D0D0D` (`bg-stadium-bg`)
- **Surface:** `#1A1A1A` (`bg-stadium-surface`), `#252525` (`bg-stadium-surface2`)
- **Red (fills):** `#C8102E` (`bg-lfc-red`, hover `#A00E24` `bg-lfc-red-dark`) — primary buttons, mark tile, rules, live strip
- **Red (text):** `#FF3347` (`text-lfc-red-text` / `text-brand`) — WCAG AA red text on dark surfaces (4.8:1 contrast; `#C8102E` is 3:1 so reserved for fills)
- **Gold:** `#F6EB61` (`text-lfc-gold`, `bg-lfc-gold`) — sparse match/trophy highlights
- **Muted:** `#A0A0A0` (`text-stadium-muted`)
- **Border:** `#2A2A2A` (`border-stadium-border`)
- **Fonts:**
  - League Gothic → `font-bebas` (wordmark, section titles, scores, big numbers)
  - Newsreader → `font-serif` (story & page headlines, daily briefing, article titles)
  - Inter → `font-inter` (body, UI, forms)
  - Barlow Condensed → `font-barlow` (uppercase labels, badges, buttons, table headers)
- Custom tokens defined in `src/app/globals.css` as `@theme inline` CSS variables; animations stick to `transform`/`opacity` and honour `prefers-reduced-motion: reduce`.
- Dark mode only (`enableSystem: false`, `defaultTheme: "dark"`).

## Environment Variables

See `.env.example`.

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (client-safe, RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin key (server-only) |
| `FOOTBALL_DATA_ORG_KEY` | Football-Data.org v4 API (10 req/min free tier) |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL — SEO, `metadataBase`, OAuth redirects |
| `VIETAPI_KEY` | VietAPI — article translation + daily briefing + post-match reviews |
| `YOUTUBE_API_KEY` | YouTube Data API v3 — club video strip on `/news` (optional; skipped if unset) |
| `CRON_SECRET` | Bearer secret protecting scheduled cron endpoints |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `NEXT_PUBLIC_ADSENSE_CLIENT_ID` | Optional Google AdSense publisher ID |
| `NEXT_PUBLIC_CF_ANALYTICS_TOKEN` | Optional Cloudflare Web Analytics token |

## Database

Supabase PostgreSQL. Migrations in `supabase/migrations/`:

1. `001_initial.sql` — `profiles`, `favourite_players` tables + RLS policies
2. `002_articles.sql` — `articles` & `sync_logs` tables for news storage
3. `003_article_interactions.sql` — `article_likes`, `article_comments`
4. `004_saved_articles.sql` — `saved_articles` user bookmarks
5. `005_gallery.sql` — `gallery` images metadata & site settings
6. `006_news_digests_seo_article.sql` — `news_digests` + SEO article payload
7. `007_news_tables_rls_and_comment_privacy.sql` — RLS on `articles` / `sync_logs` / `news_digests`, comment privacy scrubbing
8. `008_repair_articles_null_flags.sql` — Backfill non-null `is_active` / `read_count` flags on `articles`
9. `009_site_articles.sql` — `site_articles` table for fact-validated original editorial articles (`/analysis`)
10. `010_rls_repair_and_function_hardening.sql` — RLS policy & SQL function `search_path` hardening
11. `011_rls_initplan_and_fk_indexes.sql` — `(select auth.uid())` RLS initplan optimisation & foreign-key indexes
12. `012_fan_predictions_and_ratings.sql` — `match_predictions`, `player_ratings` (read-own RLS; validated writes via `src/app/actions/predictions.ts` with service role)
13. `chat_schema.sql` — legacy unused tables (`conversations`, `messages`), retained only for schema history

## Cloudflare Workers

- Worker `liverpool-app` (Workers Paid, placement `aws:ap-southeast-1` next to Supabase). Domains `anfielddaily.com` and `www.anfielddaily.com` are Worker custom domains.
- `open-next.config.ts`: R2 incremental cache (`liverpool-app-next-cache`) behind regional Cache API (`withRegionalCache`), D1 tag cache (`liverpool-app-tag-cache`), Durable Object queue (`DOQueueHandler`), `enableCacheInterception: true`.
- **Every code push to `master` deploys** via `.github/workflows/deploy-cloudflare.yml` (typecheck, lint, unit tests, `cf:build`, `cf:deploy`, R2 cache prune, smoke test, Telegram deploy ping).
- Manual: `npm run cf:build` (`DEPLOY_TARGET=cloudflare`), then `npm run cf:deploy`. Never build from a tree with local `.env*` secrets intended only for dev; runtime secrets live in the Worker (`wrangler secret put`), and server code reads env lazily via `getEnv()` (`src/lib/env.ts`).
- `scripts/cf-patch-middleware-trace.mjs` runs between `next build` and the OpenNext bundle so `@opentelemetry/api/build/esm` is included in `proxy.ts`'s trace.
- Readability uses `linkedom` (`jsdom` does not run on `workerd`). Next's image optimiser is disabled on Cloudflare builds (`images.unoptimized`).

## Scheduled Jobs

- **GitHub Actions (`.github/workflows/news-sync.yml`)** calls `/api/news/sync` hourly (`0 * * * *`) with `CRON_SECRET` bearer auth, then (`01:00–16:59 UTC`) calls `/api/news/digest/generate` as an idempotent retry for the daily briefing.
- **GitHub Actions (`.github/workflows/news-daily.yml`)** runs the daily jobs: digest (`00:07 UTC`) and cleanup (`03:17 UTC`).
- All cron routes require `CRON_SECRET` via `Authorization: Bearer` header (`src/lib/cron.ts`, constant-time check).

| Route | Scheduler | Schedule (UTC) | Purpose |
|---|---|---|---|
| `/api/news/sync` | GitHub Actions (`news-sync.yml`) | `0 * * * *` | Sync 13 outlets + YouTube, pre-scrape bodies (45s budget), revalidate feed |
| `/api/news/digest/generate` | GitHub Actions (`news-daily.yml` + retry) | `7 0 * * *` + hourly | AI daily briefing + SEO article via VietAPI (idempotent per London date) |
| `/api/news/cleanup` | GitHub Actions (`news-daily.yml`) | `17 3 * * *` | Clear cached bodies >7d, hard-delete >14d, prune `sync_logs` >14d |
| `/api/site-articles/generate` | Cron / Bearer trigger | Post-match | Generate & validate bilingual match reviews into `site_articles` |

## Protected Routes

- `/profile` (and `/vi/profile`) — requires Supabase auth (`src/proxy.ts` redirects unauthenticated requests to `/auth/login?redirect=...` and sets `X-Robots-Tag: noindex, nofollow`).

## SEO

- `robots.txt`, `sitemap.xml`, and `llms.txt` — dynamic/static route handlers under `src/app/`
- JSON-LD structured data in layout (`WebSite`, `SportsTeam`, `Organization` via `@id` graph nodes) + page-level `BreadcrumbList`, `NewsArticle`, `SportsEvent`, `Person`, `ImageGallery`
- `og:locale` follows the page's own locale (`en_GB` / `vi_VN`); English is `x-default` at `/` and `/vi/...` is the Vietnamese alternate
- Canonical and hreflang come from `getHreflangAlternates()` in `src/lib/seo.ts` — shared by page metadata and `sitemap.xml`
- Scraped `/news/<slug>` mirrors are `index: false, follow: true` and excluded from `sitemap.xml`; `/analysis/<slug>` and `/news/digest/<date>` are original content and listed
- `robots.txt` disallows `/api/`, `/profile`, `/vi/profile`, `/auth/`, `/vi/auth/` (never blanket `/*?*`) and blocks commercial SEO audit bots (`SemrushBot`, `AhrefsBot`, etc.)

## Testing

- **Unit:** Vitest — `npm test` (`vitest.config.mts`). Specs live beside their subject in `__tests__/`.
  - `src/messages/__tests__/messages-parity.test.ts` enforces 100% EN/VI key & ICU placeholder parity, squad bio coverage, and brand copy rules.
  - `src/components/providers/__tests__/client-messages.test.ts` walks the full client import graph to ensure every `"use client"` `useTranslations` namespace is included in `CLIENT_MESSAGE_NAMESPACES`.
- **E2E:** Playwright — `npm run test:e2e`. Specs in `e2e/`, config in `playwright.config.ts`.
  - Runs against a production build (`next build` + `next start`) on port 3100, desktop + mobile.
  - `e2e/support/routes.ts` drives the route smoke sweep; `e2e/support/page-diagnostics.ts` fails on console errors, uncaught exceptions, failed requests, and 5xx responses.

## Resilience

- Every Supabase client uses `createSupabaseFetch()` (`src/lib/supabase-fetch-with-timeout.ts`): a 3s Promise-race timeout (preventing hangs even when Next.js 16 strips `AbortSignal` during stale `fetch-cache` foreground revalidation), a 30s circuit breaker (tripping on network timeouts plus `502`/`503`/`504`/`52x` gateway errors), and `db: { retry: false }`.
- Public reads that are cached across viewers (gallery, player mentions, analysis lists, digests) use cookie-less Supabase clients wrapped in `unstable_cache` (`cookies()` cannot be read inside `unstable_cache`).
- Server-side fetches of article URLs must pass `isKnownNewsSourceUrl()` (`src/lib/news-config.ts`).
- Time-dependent UI must use `useNowAfterMount()` rather than reading `Date.now()` during SSR render.
- The active season year comes from `src/lib/football/current-season.ts` (UTC-derived), never a hardcoded year literal.

## Path Alias

`@/*` maps to `./src/*` (tsconfig paths)

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
