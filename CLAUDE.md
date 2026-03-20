# Liverpool FC Việt Nam — Fan Site

Trang fan Liverpool FC dành cho cộng đồng fan Việt Nam. Cung cấp thông tin đội hình, lịch thi đấu, bảng xếp hạng, thống kê, tin tức tổng hợp (EN + VI) từ 17+ nguồn RSS, gallery ảnh, lịch sử CLB, và trợ lý AI chat. Thiết kế "Dark Stadium" lấy cảm hứng từ sân Anfield, hỗ trợ song ngữ Anh-Việt.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript + React 19
- **Styling:** Tailwind CSS v4 + shadcn/ui (Radix primitives)
- **Backend:** Supabase (Auth + PostgreSQL + Storage)
- **Football Data:** Football-Data.org (primary, free: 10 req/min) + ESPN (cup fixtures, free)
- **News:** 17+ RSS sources synced to Supabase, Groq API for translation + daily digest
- **AI Chat:** Groq API via Vercel AI SDK (`ai` package) + `assistant-ui` components
- **Gallery:** Cloudinary image hosting + lightbox viewer
- **i18n:** next-intl (EN/VI), detected via cookie `NEXT_LOCALE` or `Accept-Language` header
- **State:** Zustand (client stores), React Query / TanStack Query (server state)
- **Animation:** Framer Motion
- **Charts:** Recharts
- **Deploy:** Vercel (Hobby plan, with cron jobs)

## Commands

```bash
npm run dev          # Start dev server (next dev)
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest
npm run seed:gallery # Seed gallery data (tsx scripts/seed-gallery.ts)
```

## UI Components — shadcn/ui

**Ưu tiên dùng shadcn/ui cho mọi component UI.** Style: `new-york`, icon: `lucide`, base color: `neutral`.

Installed components (`src/components/ui/`):
`alert-dialog`, `avatar`, `badge`, `button`, `dialog`, `dropdown-menu`, `input`, `popover`, `scroll-area`, `select`, `sheet`, `skeleton`, `tabs`, `tooltip`

Custom UI components: `error-boundary`, `lfc-loader`, `toast-notification`

Install thêm component:
```bash
npx shadcn@latest add <component-name>
# Ví dụ: npx shadcn@latest add card table accordion separator
```

Quy tắc:
- Luôn check shadcn/ui registry trước khi tự viết component (button, dialog, select, tabs, etc.)
- Component shadcn nằm ở `src/components/ui/`, import qua `@/components/ui/<name>`
- Utility `cn()` ở `src/lib/utils.ts` — dùng cho merge Tailwind classes
- Config: `components.json` (style: new-york, rsc: true, cssVariables: true)

## Project Structure

```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── page.tsx            # Homepage — Hero + BentoGrid widgets
│   ├── layout.tsx          # Root layout — fonts, ThemeProvider, NavbarAuth, Footer, GlobalChat
│   ├── middleware.ts       # Supabase session refresh + route protection
│   ├── api/
│   │   ├── news/sync/      # Cron: sync RSS → Supabase
│   │   ├── news/cleanup/   # Cron: deactivate old articles
│   │   ├── news/digest/    # Cron: AI-generated daily digest
│   │   ├── news/translate/ # On-demand article translation (Groq)
│   │   ├── news/comments/  # Article comments CRUD
│   │   ├── news/like/      # Article likes
│   │   ├── chat/           # AI chat streaming (Groq + assistant-ui)
│   │   ├── gallery/        # Gallery API + homepage featured
│   │   ├── saved-articles/ # User bookmarks
│   │   ├── conversations/  # Chat history persistence
│   │   ├── live-fixture/   # Live match polling
│   │   └── streak/         # User activity streak
│   ├── auth/               # /auth/login, /auth/register, /auth/callback (Supabase OAuth)
│   ├── chat/               # AI chat page (BRO AI assistant)
│   ├── fixtures/           # Match fixtures list + /fixtures/[id] detail
│   ├── gallery/            # Photo gallery with lightbox
│   ├── history/            # Club history — trophies, timeline, legends (fully static from JSON)
│   ├── news/               # News listing + /news/[...slug] article reader + /news/digest
│   ├── player/[id]/        # Player detail page + favourite button
│   ├── players/            # Players directory
│   ├── profile/            # User profile (protected) — avatar upload, favourites
│   ├── season/             # Season archive
│   ├── squad/              # Squad grid + position filter
│   ├── standings/          # Premier League table (revalidate 6h)
│   ├── stats/              # Stats dashboard — count-up numbers + recharts
│   ├── about/              # About page
│   └── legal/              # Legal / privacy
├── components/
│   ├── ui/                 # shadcn/ui primitives (button, dialog, tabs, etc.)
│   ├── home/               # Homepage widgets (hero, bento-grid, next-match, standings-preview, form-widget)
│   ├── layout/             # NavbarAuth (server) → NavbarClient (client), Footer
│   ├── news/               # News cards, article reader, comments, digest viewer, video player, HTML body
│   ├── squad/              # Player cards, position filter, favourite-heart
│   ├── player/             # Player detail components
│   ├── fixtures/           # Fixture timeline, match detail
│   ├── standings/          # League table components
│   ├── stats/              # Stats charts, count-up
│   ├── history/            # Trophy cabinet, timeline, legends, stadium-showcase
│   ├── gallery/            # Gallery grid, lightbox
│   ├── chat/               # GlobalChat (floating), chat thread
│   ├── auth/               # Login/register forms
│   ├── profile/            # Profile form, favourite list, avatar upload
│   ├── season/             # Season archive components
│   ├── providers/          # QueryProvider (TanStack)
│   └── assistant-ui/       # assistant-ui chat primitives
├── lib/
│   ├── football/           # Football data layer (server-only, React.cache)
│   │   ├── index.ts        # Barrel — getSquad, getFixtures, getStandings, etc.
│   │   ├── fdo-provider.ts # Football-Data.org API client
│   │   ├── fdo-standings.ts # PL + UCL standings
│   │   ├── fdo-matches.ts  # Fixtures + coach info
│   │   ├── espn-events.ts  # ESPN match events, cup fixtures (free)
│   │   ├── provider.ts     # Provider interface
│   │   └── mock-*.ts       # Mock fallback when no API key
│   ├── news/               # News system
│   │   ├── sync.ts         # RSS sync pipeline
│   │   ├── config.ts       # Source feeds config
│   │   ├── adapters/       # Per-source RSS adapters
│   │   ├── enrichers/      # Content enrichment (category, relevance, article-extractor)
│   │   │   └── article-extractor.ts # HTML scraping + video detection (per-source selectors, 24h cache)
│   │   ├── digest.ts       # AI daily digest generation
│   │   ├── translation-cache.ts # Groq translation
│   │   ├── dedup.ts        # Deduplication logic
│   │   ├── types.ts        # Shared types (ArticleContent with htmlContent + videoUrl fields)
│   │   └── db.ts           # News DB operations
│   ├── gallery/            # Gallery helpers
│   ├── prompts/            # AI system prompts (BRO AI)
│   ├── tools/              # AI function-calling tools
│   ├── types/              # TypeScript types (football.ts)
│   ├── supabase.ts         # Browser client + DB types (UserProfile, FavouritePlayer, SavedArticle)
│   ├── supabase-server.ts  # Server client (import "server-only")
│   ├── cloudinary.ts       # Cloudinary upload/transform config
│   ├── news-config.ts      # Source labels/colors + URL slug encode/decode
│   ├── squad-data.ts       # Squad data helpers
│   ├── player-photos.ts    # Player photo URL mapping
│   ├── rate-limit.ts       # Rate limiting utility
│   ├── seo.ts              # SEO/metadata helpers
│   ├── constants.ts        # App-wide constants
│   └── utils.ts            # cn() utility for Tailwind class merging
├── data/                   # Static JSON data
│   ├── trophies.json       # Trophy cabinet (EN)
│   ├── trophies.vi.json    # Trophy cabinet (VI)
│   ├── history.json        # Club timeline (EN)
│   ├── history.vi.json     # Club timeline (VI)
│   ├── legends.json        # Club legends (EN)
│   ├── legends.vi.json     # Club legends (VI)
│   ├── club-info.json      # Club information (EN)
│   ├── club-info.vi.json   # Club information (VI)
│   ├── player-details.json # Player bios & details
│   ├── player-bios.vi.json # Player bios (VI)
│   ├── squad.json          # Squad data
│   └── gallery.json        # Gallery image metadata
├── messages/               # i18n translation files
│   ├── en.json             # English translations
│   └── vi.json             # Vietnamese translations
├── stores/                 # Zustand client stores
│   ├── auth-store.ts       # Auth state
│   ├── user-store.ts       # User preferences
│   └── navigation-store.ts # Navigation state
├── hooks/                  # Custom React hooks
│   └── use-favourites.ts   # Favourite players hook
├── contexts/               # React contexts
├── config/                 # App config (constants)
├── i18n/
│   └── request.ts          # next-intl server config (locale detection)
└── middleware.ts            # Supabase session refresh + route protection
```

## Architecture Rules

### Supabase Client Split (CRITICAL)

- `src/lib/supabase.ts` — browser client (`createClient()`), safe for `"use client"` components
- `src/lib/supabase-server.ts` — server client (`createServerSupabaseClient()`), guarded with `import "server-only"`
- **Never import `supabase-server.ts` in client components** — build will fail
- Service role client for admin ops: `src/lib/news/supabase-service.ts` (`getServiceClient()`)

### Football Data Layer

- All functions in `src/lib/football/` are server-only with `React.cache()` for per-request dedup
- Primary: Football-Data.org (`FOOTBALL_DATA_ORG_KEY`) — standings (PL + UCL), fixtures, squad, coach
- Supplement: ESPN — cup fixtures (FA Cup, EFL Cup), match events with minute data — free, no key
- Mock fallback when `FOOTBALL_DATA_ORG_KEY` not set (dev mode)
- Free tier limits: 10 req/min, seasons data only

### Navbar Pattern

- `NavbarAuth` (server component) → fetches auth + profile via `createServerSupabaseClient()`
- Passes data to `NavbarClient` (client component) as props
- Layout uses `<NavbarAuth />`, never the old `<Navbar />`

### News System

- 17+ RSS sources in 2 languages:
  - **EN:** LFC Official, BBC Sport, The Guardian, Liverpool Echo, Anfield Watch, Empire of the Kop, Sky Sports, GOAL
  - **VI:** VnExpress, Tuổi Trẻ, Thanh Niên, Dân Trí, ZNews, VietNamNet, Bóng Đá, 24h, Bóng Đá+, Webthethao
- Sync pipeline: RSS fetch → dedup → relevance scoring → category detection → upsert to Supabase
- Article URLs encoded as readable slugs: `/news/{source}/{path}` (e.g., `/news/bbc/sport/football/...`)
- **Content Extraction (article-extractor.ts):**
  - Per-source CSS selectors (verified 2026-03-11) extract `htmlContent` from article DOM
  - 24-hour cache (CONTENT_CACHE_TTL_MS) — skips re-extraction of recently scraped articles
  - Filters junk text from match widget articles (removes generic "next match" HTML)
  - Inline video detection: embeds HLS/MP4 videos as `<div class="article-video-player" data-video-src="...">` placeholders
  - Returns ArticleContent: `{ title, heroImage, paragraphs, htmlContent?, videoUrl?, images, readingTime, isThinContent }`
- Translation: Groq API on-demand, cached in `content_en` / `content_vi` columns
- Daily digest: AI-generated summary of top stories, stored in `news_digests` table
- **Article Rendering Components:**
  - `ArticleHtmlBody` — renders `htmlContent` with imperatively-mounted video player React portals (avoids dangerouslySetInnerHTML conflicts)
  - `ArticleVideoPlayer` — HLS.js + fallback to native HTML5 video; supports HLS and MP4 formats

### i18n

- 2 locales: `en`, `vi` (default: `en`)
- Detection order: `NEXT_LOCALE` cookie → `Accept-Language` header
- Translation files: `src/messages/en.json`, `src/messages/vi.json`
- Static data has `.vi.json` variants (trophies, history, legends, club-info, player-bios)

## Design System — "Dark Stadium"

- **Background:** `#0D0D0D` (`bg-stadium-bg`)
- **Surface:** `#1A1A1A` (`bg-stadium-surface`), `#252525` (`bg-stadium-surface2`)
- **Red:** `#C8102E` (`text-lfc-red`, `bg-lfc-red`) — primary accent
- **Gold:** `#F6EB61` (`text-lfc-gold`, `bg-lfc-gold`) — secondary accent
- **Muted:** `#A0A0A0` (`text-stadium-muted`)
- **Border:** `#2A2A2A` (`border-stadium-border`)
- **Fonts:**
  - League Gothic → `font-bebas` (headlines, stats, hero text)
  - Inter → `font-inter` (body, UI, forms)
  - Barlow Condensed → `font-barlow` (sub-headlines, stat labels)
- Custom tokens defined in `src/app/globals.css` as `@theme inline` CSS variables
- Dark mode only (`enableSystem: false`, `defaultTheme: "dark"`)

## Environment Variables

See `.env.example`. All required for full functionality:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (client-safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin key (server-only) |
| `FOOTBALL_DATA_ORG_KEY` | Football-Data.org API (free: 10 req/min) |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL — SEO, metadataBase, OAuth redirects |
| `GROQ_API_KEY` | Groq API — AI chat + article translation + digest |
| `CRON_SECRET` | Protects cron endpoints (random string) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |

## Database

Supabase PostgreSQL. Migrations in `supabase/migrations/`:

1. `001_initial.sql` — `profiles`, `favourite_players` tables + RLS policies
2. `002_articles.sql` — `articles` table for news storage
3. `003_article_interactions.sql` — `article_likes`, `article_comments`
4. `004_saved_articles.sql` — user bookmarks
5. `005_gallery.sql` — gallery images metadata
6. `chat_schema.sql` — `conversations`, `messages` for AI chat persistence

## Cron Jobs (Vercel)

Configured in `vercel.json`. All routes require `CRON_SECRET` via `Authorization: Bearer` header (auto-sent by Vercel) or `?key=` query param.

| Route | Schedule | maxDuration | Purpose |
|---|---|---|---|
| `/api/news/sync` | `0 6 * * *` (6 AM UTC) | 60s | Sync RSS feeds → Supabase, revalidate homepage |
| `/api/news/cleanup` | `0 3 * * *` (3 AM UTC) | default | Soft-delete >30d articles, hard-delete >60d |
| `/api/news/digest/generate` | `0 0 * * *` (midnight UTC) | 60s | AI daily digest via Groq, skip if already generated |

## Protected Routes

- `/profile` — requires Supabase auth (middleware redirects to `/auth/login?redirect=/profile`)

## SEO

- `robots.txt` and `sitemap.xml` — dynamic route handlers
- JSON-LD structured data in root layout (WebSite, SportsTeam, Organization)
- OpenGraph + Twitter Card metadata on all pages
- Vietnamese locale priority (`vi_VN`), English alternate (`en_GB`)

## Path Alias

`@/*` maps to `./src/*` (tsconfig paths)
