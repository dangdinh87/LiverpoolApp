# Liverpool FC Vietnam Fan Site — Codebase Summary

Generated: 2026-03-20 | Last Updated: 2026-03-20

## Overview

Full-featured Next.js 16 fan site for Liverpool FC Vietnam community. Provides squad info, fixtures, standings, stats, multilingual news (17+ RSS sources), AI chat, gallery, history, and user profiles.

**Stack:** Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui + Supabase + Groq API + Vercel Cron

---

## Recent Changes (2026-03-16 to 2026-03-20)

### News Content Extraction & Video Support
- **New:** `ArticleHtmlBody` component — renders raw HTML content with embedded video players
- **New:** `ArticleVideoPlayer` component — HLS.js + native HTML5 video support (MP4, HLS streams)
- **Enhanced:** `article-extractor.ts` — 24-hour cache TTL (CONTENT_CACHE_TTL_MS) to skip re-scraping recently extracted articles
- **Enhanced:** Match widget junk text filtering — removes generic "next match" section from article content
- **New fields in ArticleContent type:** `htmlContent` (sanitized HTML), `videoUrl` (embedded video URL)
- **Removed:** `floating-action-bar.tsx`, `floating-action-bar-translate.tsx` (consolidated UI)
- **Updated:** `translate-button.tsx` — simplified to work with new article detail layout
- **Updated:** news detail page (`src/app/news/[...slug]/page.tsx`) — uses ArticleHtmlBody for HTML rendering

### Design & Layout
- Updated `src/app/globals.css` — styles for `.article-html-content`, `.article-video-container`, `.article-video-player`
- i18n messages updated (`en.json`, `vi.json`) — new string keys for video player fallback text

---

## Architecture Highlights

### 1. Football Data Layer (`src/lib/football/`)
- **Primary:** Football-Data.org (standings, fixtures, squad, coach) — 10 req/min free tier
- **Supplement:** ESPN (cup fixtures, match events) — free, no key
- **Fallback:** Mock data when `FOOTBALL_DATA_ORG_KEY` not set
- All functions use `React.cache()` for per-request deduplication
- Server-only with `import "server-only"` guard

### 2. News System (`src/lib/news/`)

#### Sources (17+ feeds in 2 languages)
**English (8):**
- LFC Official (liverpoolfc.com)
- BBC Sport
- The Guardian
- Liverpool Echo
- Anfield Watch
- Empire of the Kop
- Sky Sports
- GOAL

**Vietnamese (9):**
- VnExpress
- Tuổi Trẻ
- Thanh Niên
- Dân Trí
- ZNews
- VietNamNet
- Bóng Đá
- 24h
- Bóng Đá+, Webthethao

#### Sync Pipeline (`src/lib/news/sync.ts`)
1. Fetch RSS feeds (parallel, with retries)
2. Deduplicate by URL hash
3. Extract metadata (title, publish date, author, snippet)
4. Detect source & language
5. Score relevance (keyword matching for Liverpool, Reds, etc.)
6. Categorize (match-report, transfer, injury, opinion, team-news, analysis, general)
7. Upsert to Supabase `articles` table

#### Content Extraction (`src/lib/news/enrichers/article-extractor.ts`)
- **Per-source selectors** (verified 2026-03-11) — DOM path to article body for each source
- **24-hour cache** — skips re-extraction for recently scraped articles (stored in `content_en` column + `content_scraped_at` timestamp)
- **Sanitization** — whitelist HTML tags (p, h1-h4, img, figure, figcaption, a, em, strong, code, pre, ul, ol, li, blockquote, table, tr, th, td, br)
- **Image extraction** — collects all `<img src>` URLs from article body
- **Reading time estimation** — word count / 200
- **Thin content detection** — flags articles with <400 words as `isThinContent: true`
- **Match widget filtering** — removes generic "next match" HTML sections from articles
- **Video detection** — finds embedded video URLs (HLS/MP4) and inserts placeholder divs: `<div class="article-video-player" data-video-src="...">` for hydration

#### Translation (`src/lib/news/translation-cache.ts`)
- On-demand Groq API call for article body
- Cached in `content_vi` / `content_en` columns
- Skips translation if content already exists

#### Daily Digest (`src/lib/news/digest.ts`)
- Cron job (`0 0 * * *` UTC) generates AI summary of top 10 articles
- Groq prompt: "Create a brief Liverpool FC news digest for Vietnamese fans"
- Stores in `news_digests` table with generated HTML summary

### 3. Supabase Architecture
- **Browser client:** `src/lib/supabase.ts` — `createClient()`, safe for `"use client"` components
- **Server client:** `src/lib/supabase-server.ts` — `createServerSupabaseClient()`, guarded with `import "server-only"`
- **Service role client:** `src/lib/news/supabase-service.ts` — admin ops (content cache writes, digest storage)

#### Database Schema
| Table | Purpose | Key Columns |
|---|---|---|
| `profiles` | User info | `id`, `avatar_url`, `bio` |
| `favourite_players` | User favorites | `user_id`, `player_id` |
| `articles` | News storage | `url`, `title`, `source`, `category`, `content_en`, `content_vi`, `htmlContent`, `videoUrl`, `content_scraped_at` |
| `article_likes` | Article engagement | `article_id`, `user_id` |
| `article_comments` | Reader comments | `article_id`, `user_id`, `body`, `created_at` |
| `saved_articles` | User bookmarks | `user_id`, `article_id` |
| `gallery` | Image metadata | `image_url`, `title`, `description`, `tag` |
| `conversations` | Chat history | `user_id`, `title`, `created_at` |
| `messages` | Chat messages | `conversation_id`, `role`, `content` |

### 4. UI Component System
- **Framework:** shadcn/ui (Radix primitives) — new-york style, lucide icons, neutral base color
- **Styling:** Tailwind CSS v4 with custom design tokens
- **Layout:** RSC-friendly split pattern (NavbarAuth server → NavbarClient client)

#### News Components
| Component | Purpose | Type |
|---|---|---|
| `news-feed.tsx` | Paginated news list with filters | Client |
| `article-end-sections.tsx` | Related articles, comments, engagement | Client |
| `article-sidebar.tsx` | Table of contents, up-next, share | Client |
| `article-html-body.tsx` | Renders htmlContent with video hydration | Client |
| `article-video-player.tsx` | HLS.js + native video player | Client |
| `comment-section.tsx` | Article comments (CRUD + likes) | Client |
| `translate-button.tsx` | Toggle EN/VI translation | Client |
| `related-articles.tsx` | Contextual article suggestions | Server |
| `share-button.tsx` | Social share + copy link | Client |
| `digest-card.tsx` | Daily digest preview | Server |

### 5. API Routes
| Route | Method | Purpose | Auth | Cron? |
|---|---|---|---|---|
| `/api/news/sync` | GET | Sync RSS feeds → Supabase | CRON_SECRET | Yes (6 AM UTC) |
| `/api/news/cleanup` | GET | Soft-delete >30d, hard-delete >60d articles | CRON_SECRET | Yes (3 AM UTC) |
| `/api/news/digest/generate` | GET | AI daily digest generation | CRON_SECRET | Yes (midnight UTC) |
| `/api/news/translate` | POST | On-demand article translation | Supabase session | No |
| `/api/news/comments` | GET/POST | Article comments CRUD | Supabase session | No |
| `/api/news/like` | POST | Like/unlike articles | Supabase session | No |
| `/api/chat` | POST | AI streaming chat (Groq) | Supabase session | No |
| `/api/gallery` | GET | Gallery metadata + Cloudinary featured | Public | No |
| `/api/saved-articles` | GET/POST | User bookmarks | Supabase session | No |
| `/api/conversations` | GET/POST | Chat history CRUD | Supabase session | No |
| `/api/live-fixture` | POST | Live match polling | Public | No |
| `/api/streak` | GET/POST | User activity streak | Supabase session | No |

### 6. i18n System
- **Framework:** next-intl (EN/VI)
- **Detection:** Cookie `NEXT_LOCALE` → `Accept-Language` header → default `en`
- **Translation files:** `src/messages/{en,vi}.json`
- **Static data:** Trophies, history, legends, club-info, player-bios have `.vi.json` variants
- **Config:** `src/i18n/request.ts` — server-side locale detection for App Router

### 7. Design System — "Dark Stadium"
| Element | Value | CSS Class |
|---|---|---|
| Background | `#0D0D0D` | `bg-stadium-bg` |
| Surface 1 | `#1A1A1A` | `bg-stadium-surface` |
| Surface 2 | `#252525` | `bg-stadium-surface2` |
| LFC Red | `#C8102E` | `text-lfc-red`, `bg-lfc-red` |
| LFC Gold | `#F6EB61` | `text-lfc-gold`, `bg-lfc-gold` |
| Muted text | `#A0A0A0` | `text-stadium-muted` |
| Border | `#2A2A2A` | `border-stadium-border` |
| Fonts | Inter (body), Bebas (headlines), Barlow (labels) | `font-inter`, `font-bebas`, `font-barlow` |

---

## File Organization

### Key Directories

```
src/
├── app/
│   ├── api/
│   │   ├── news/{sync,cleanup,digest,translate,comments,like}/
│   │   ├── chat/
│   │   ├── gallery/
│   │   ├── saved-articles/
│   │   ├── conversations/
│   │   ├── live-fixture/
│   │   └── streak/
│   ├── auth/{login,register,callback}
│   ├── chat/
│   ├── fixtures/
│   ├── gallery/
│   ├── history/
│   ├── news/
│   │   ├── [...slug]/ (article detail)
│   │   └── digest/ (daily digest viewer)
│   ├── player/[id]/
│   ├── players/
│   ├── profile/
│   ├── season/
│   ├── squad/
│   ├── standings/
│   ├── stats/
│   ├── about/
│   └── legal/
├── components/
│   ├── ui/ (shadcn: button, dialog, tabs, select, input, avatar, badge, etc.)
│   ├── news/ (article rendering, comments, digest, etc.)
│   ├── fixtures/ (match timeline, detail)
│   ├── squad/ (player grid, filters)
│   ├── stats/ (charts, count-up)
│   ├── gallery/ (grid, lightbox)
│   ├── chat/ (floating, thread)
│   ├── profile/ (form, favorites)
│   └── layout/ (navbar, footer)
├── lib/
│   ├── football/ (server-only data layer)
│   ├── news/ (sync, enrichment, db)
│   ├── prompts/ (AI system prompts)
│   ├── tools/ (AI function-calling tools)
│   ├── types/ (TypeScript interfaces)
│   ├── supabase.ts (browser client)
│   ├── supabase-server.ts (server client)
│   ├── cloudinary.ts (image config)
│   └── utils.ts (cn() utility)
├── data/ (static JSON: trophies, history, legends, club-info, squad, gallery)
├── messages/ (i18n: en.json, vi.json)
├── stores/ (Zustand: auth, user, navigation)
└── middleware.ts (session refresh, route protection)
```

---

## Development Commands

```bash
npm run dev          # Start Next.js dev server (localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run Vitest unit tests
npm run seed:gallery # Seed gallery data from Cloudinary
```

---

## Dependencies (Key)

| Category | Packages |
|---|---|
| **Framework** | next@16.1.6, react@19.2.3, typescript@5 |
| **Styling** | tailwindcss@4, @tailwindcss/postcss@4 |
| **UI** | @radix-ui/*, lucide-react, shadcn@3.8.5 |
| **Data** | @supabase/supabase-js, @tanstack/react-query |
| **Football Data** | (external APIs: Football-Data.org, ESPN) |
| **AI** | @ai-sdk/groq, ai@6.0.116, @assistant-ui/react |
| **News** | rss-parser, cheerio, sanitize-html, @mozilla/readability |
| **Video** | hls.js (HLS stream playback) |
| **Animation** | framer-motion, recharts |
| **i18n** | next-intl@4.8.3 |
| **State** | zustand, next-themes |
| **Dev** | vitest, eslint-9, tsx, patch-package |

---

## Environment Variables

Required for full functionality. See `.env.example`:

| Variable | Purpose | Sensitive |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project endpoint | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client-safe auth key | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin key | Yes |
| `FOOTBALL_DATA_ORG_KEY` | Football-Data.org API | Yes |
| `NEXT_PUBLIC_SITE_URL` | Canonical domain (SEO, OAuth redirects) | No |
| `GROQ_API_KEY` | AI chat + translation + digest | Yes |
| `CRON_SECRET` | Vercel cron job authentication | Yes |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account | No |
| `CLOUDINARY_API_KEY` | Cloudinary auth | Yes |
| `CLOUDINARY_API_SECRET` | Cloudinary auth | Yes |

---

## Critical Rules

### 1. Supabase Client Split
- `src/lib/supabase.ts` — browser only (`"use client"`)
- `src/lib/supabase-server.ts` — server only (`import "server-only"`)
- **Never cross the boundary** — build will fail

### 2. Football Data Layer
- All functions in `src/lib/football/` are server-only
- Use `React.cache()` for per-request deduplication
- Check `FOOTBALL_DATA_ORG_KEY` before calling Football-Data.org

### 3. News Extraction
- Article-extractor runs on sync (cron), not on page load
- Content cached for 24 hours to avoid re-scraping
- Video detection inserts placeholder divs with `data-video-src` attributes
- HTML content is sanitized before storage

### 4. Component Patterns
- Use shadcn/ui before writing custom components
- Server components for data fetching, client for interactivity
- NavbarAuth (server) → NavbarClient (client) split for auth data

### 5. i18n
- Always detect locale server-side in layouts/pages
- Pass locale to client components as props
- Static data variants: `trophies.json` + `trophies.vi.json`

---

## Performance Optimizations

1. **Image optimization:** Cloudinary transforms + next/image
2. **Caching:**
   - Football data: Football-Data.org rate limits (10 req/min free)
   - Article content: 24-hour DB cache
   - Page revalidation: ISR on squad (30min), standings (6h), news (30min)
3. **Streaming:** AI chat uses Vercel AI SDK for incremental token rendering
4. **Code splitting:** Dynamic imports for HLS.js in ArticleVideoPlayer

---

## Testing

- Unit tests: Vitest in `src/**/*.test.ts`
- Coverage: SEO builders, type safety, utility functions
- No E2E tests (frontend focus)

---

## Deployment

- **Platform:** Vercel (Hobby plan)
- **Cron jobs:** 3 jobs configured in `vercel.json`
  - `/api/news/sync` — 6 AM UTC (60s timeout)
  - `/api/news/cleanup` — 3 AM UTC
  - `/api/news/digest/generate` — midnight UTC (60s timeout)
- **Environment variables:** Set in Vercel project settings
- **Database:** Supabase PostgreSQL with RLS policies

---

## References

- [CLAUDE.md](../CLAUDE.md) — Project instructions & architecture rules
- [Football Data Layer](./en/data-providers.md)
- [News System](./en/news-system.md)
- [i18n Setup](./en/i18n.md)
- [Deployment](./en/deployment.md)
- [Design System](./en/design-system.md)
