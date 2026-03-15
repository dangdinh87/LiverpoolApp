# Architecture

LiverpoolApp is a Next.js 16 App Router application with server-first data fetching, a pluggable football data provider, a multi-source news pipeline, Supabase auth/storage, and Groq-powered AI features.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│  React 19 client components — Zustand, TanStack Query       │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP / RSC streaming
┌───────────────────────▼─────────────────────────────────────┐
│                    Vercel Edge / Node.js                     │
│  Next.js 16 App Router                                       │
│  ├── Server Components (data fetch + render)                 │
│  ├── API Routes (REST endpoints + cron handlers)             │
│  └── Middleware (session refresh + route protection)         │
└──────┬────────────────┬───────────────┬─────────────────────┘
       │                │               │
┌──────▼──────┐  ┌──────▼──────┐  ┌────▼───────────────┐
│  Supabase   │  │  Football   │  │  External APIs      │
│  PostgreSQL │  │  Data.org   │  │  Groq LLM           │
│  Auth       │  │  ESPN (free)│  │  Cloudinary         │
│  Storage    │  │  Mock (dev) │  │  17+ RSS feeds      │
└─────────────┘  └─────────────┘  └────────────────────┘
```

---

## Core Layers

### Layer 1: Data Sources

| Source | Purpose | Key | Rate Limit |
|---|---|---|---|
| Football-Data.org | Squad, fixtures, standings (PL + UCL) | `FOOTBALL_DATA_ORG_KEY` | 10 req/min (free) |
| ESPN (no key) | Cup fixtures (FA Cup, EFL Cup), match events | — | None |
| Mock provider | Dev fallback when no API key | — | N/A |
| Supabase PostgreSQL | Auth, user data, articles, gallery, chat history | — | Per plan |
| 17+ RSS feeds | News articles (EN + VI sources) | — | None |
| Groq API | AI chat, article translation, daily digest | `GROQ_API_KEY` | Per plan |
| Cloudinary | Gallery image hosting + transforms | `CLOUDINARY_*` | Per plan |

### Layer 2: Server Components

All data-heavy pages are server components. They fetch data server-side, then pass it as props to client components for interactivity. No client-side data fetching for initial page loads.

```typescript
// Pattern: server page fetches → passes to client component
// src/app/squad/page.tsx
export default async function SquadPage() {
  const squad = await getSquad(); // server-only, React.cache()
  return <SquadGrid players={squad} />;  // client component for filtering
}
```

### Layer 3: Client Components

Used only when interactivity is needed: filtering, form inputs, real-time updates, animations, browser APIs. Always annotated `'use client'`.

---

## Supabase Client Split (CRITICAL)

Two separate clients — **never import the server client in a client component** (build will fail).

| File | Use in | Created with | Can access |
|---|---|---|---|
| `src/lib/supabase.ts` | Client components, browser | `createClient()` | Anon key (RLS-enforced) |
| `src/lib/supabase-server.ts` | Server components, API routes | `createServerSupabaseClient()` | Anon key + session cookies |
| `src/lib/news/supabase-service.ts` | API routes (admin ops only) | `getServiceClient()` | Service role (bypasses RLS) |

```typescript
// Client component — OK
import { createClient } from '@/lib/supabase';

// Server component / API route — OK
import { createServerSupabaseClient } from '@/lib/supabase-server';

// WRONG: importing server client in a client component
// 'use client'
// import { createServerSupabaseClient } from '@/lib/supabase-server'; // BUILD FAILURE
```

---

## Football Data Layer

**Location:** `src/lib/football/`

All functions are server-only and wrapped in `React.cache()`. Pages always import from the barrel `@/lib/football`, never from individual provider files.

### Provider Interface

```typescript
// src/lib/football/provider.ts
interface FootballDataProvider {
  getSquad(): Promise<Player[]>;
  getFixtures(): Promise<Fixture[]>;
  getStandings(): Promise<Standing[]>;
  getTopScorers(): Promise<TopScorer[]>;
  getTopAssists(): Promise<TopScorer[]>;
  getPlayerStats(playerId: number): Promise<PlayerStats | null>;
  getCoach(): Promise<Coach | null>;
  // ... more methods
}
```

### Provider Selection

```
FOOTBALL_DATA_ORG_KEY set?
  ├── YES → FDO (Football-Data.org) provider
  └── NO  → Mock provider (static data, no API calls)
```

```typescript
// src/lib/football/index.ts — barrel + React.cache wrapping
export const getSquad    = cache(() => provider.getSquad());
export const getFixtures = cache(() => provider.getFixtures());
export const getStandings = cache(() => provider.getStandings());
```

### FDO Provider Notes

- Team ID: 64 (Liverpool FC), League: 39 (Premier League)
- Free tier: 10 req/min — rate limiting is handled by provider
- Cup fixtures (FA Cup, EFL Cup) are fetched from ESPN (free, no key needed)
- Mock fallback returns realistic static data for all methods

---

## News Pipeline

**Location:** `src/lib/news/`

```
Vercel Cron (6AM UTC)
  ↓
/api/news/sync
  ↓
syncPipeline()
  ├── Fetch 17+ RSS feeds in parallel
  ├── Dedup (URL hash + Jaccard title similarity)
  ├── Score relevance (LFC keywords weighted)
  ├── Categorize (transfers, match, injury, etc.)
  ├── Enrich (OG metadata)
  └── Upsert to Supabase articles table
```

**Sources:**

| Language | Sources |
|---|---|
| EN | LFC Official, BBC Sport, The Guardian, Liverpool Echo, Anfield Watch, Empire of the Kop, Sky Sports, GOAL |
| VI | VnExpress, Tuổi Trẻ, Thanh Niên, Dân Trí, ZNews, VietNamNet, Bóng Đá, 24h, Bóng Đá+, Webthethao |

**Article URL encoding:** Readable slugs at `/news/{source}/{path}` (e.g., `/news/bbc/sport/football/...`). Encoding/decoding in `src/lib/news-config.ts`.

**AI Daily Digest:** Cron at midnight UTC calls Groq (`llama-3.3-70b-versatile`), summarises top 15 articles from last 24h into Vietnamese sections. Stored in `news_digests` table. Idempotent — skips if digest for today already exists.

**Translation:** On-demand via `/api/news/translate`. Groq translates article content, result cached in `content_en` / `content_vi` columns.

---

## Auth Flow

Supabase Auth with email/password + OAuth (Google, GitHub).

```
User visits /profile (protected)
  ↓
middleware.ts
  ├── refreshSession() — refresh Supabase session from cookies
  ├── No session? → redirect to /auth/login?redirect=/profile
  └── Session OK → proceed
         ↓
       /profile page (server component)
         ├── createServerSupabaseClient().auth.getUser()
         └── render with user data
```

**OAuth callback:** `/auth/callback/route.ts` — exchanges code for session, sets cookie, redirects to original destination.

**Middleware** (`src/middleware.ts`) runs on every request:
1. Refresh Supabase session (update cookies)
2. Block unauthenticated access to `/profile`
3. Redirect back after login

---

## Navbar Pattern

The navbar needs both server-side auth state (to show user avatar) and client-side interactivity (mobile menu, theme toggle). Solved by splitting into two components:

```
Root layout
  └── <NavbarAuth />         ← Server component
        ├── getUser()        ← Supabase server client
        ├── getProfile()     ← DB query
        └── <NavbarClient    ← Client component
              user={user}
              profile={profile}
            />
              ├── useState (mobile menu)
              ├── useTheme (dark/light toggle)
              └── render nav links + user avatar
```

**Rule:** Layout always uses `<NavbarAuth />`. Never use the legacy `<Navbar />`.

---

## Caching Strategy

### React.cache() — Request-Level Deduplication

All football data functions are wrapped:

```typescript
export const getSquad = cache(() => provider.getSquad());
```

Multiple components calling `getSquad()` within the same server request share one result — no duplicate API calls.

### ISR — Route-Level Revalidation

```typescript
// Homepage — fresh content every 30 minutes
export const revalidate = 1800;

// Standings — updated every 6 hours
export const revalidate = 21600;

// History — fully static, never revalidates
export const revalidate = false;

// News article — revalidate on-demand (after sync cron)
export const revalidate = 3600;
```

### Supabase as Cache

The articles table acts as a persistent cache for RSS content. The cron sync refreshes it daily. Pages query Supabase (fast) rather than hitting RSS feeds on every request.

### Browser Storage

- Read history — `localStorage` (client-safe, `src/lib/news/read-history.ts`)
- Dismissed digest card — `localStorage`
- Article likes/saves — optimistic UI backed by Supabase

---

## State Management

| Layer | Tool | Used for |
|---|---|---|
| Server | React.cache() | Per-request football data dedup |
| Server | ISR revalidate | Page-level cache lifetime |
| Client (global) | Zustand | Auth state, user preferences, navigation |
| Client (server state) | TanStack Query | Data fetching in client components |
| Client (local) | useState | UI state (filters, modals, form inputs) |
| Browser | localStorage | Read history, dismissed UI elements |

### Zustand Stores

```
src/stores/
├── auth-store.ts        # Supabase user session
├── user-store.ts        # Locale preference, display settings
└── navigation-store.ts  # Mobile menu state
```

---

## Error Handling

### Football Data

All provider methods return empty arrays / null on failure rather than throwing. Pages render empty states gracefully.

```typescript
// Provider catches all errors, returns fallback
async getSquad(): Promise<Player[]> {
  try {
    const data = await fetchFromApi(...);
    return mapToCanonical(data);
  } catch {
    return []; // Never throws to the page
  }
}
```

### News Pipeline

Five-level error handling:

1. Adapter-level try/catch + timeout per feed
2. `Promise.allSettled()` — one failed feed doesn't abort the sync
3. Enrichment skipped on failure (OG fetch timeout)
4. Article scraping fallback chain: Readability → Cheerio → OG meta only
5. Page-level `<ErrorBoundary>` + `loading.tsx` skeleton fallbacks

### API Routes

All API routes validate `CRON_SECRET` for cron endpoints:

```typescript
const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  ?? new URL(req.url).searchParams.get('key');
if (secret !== process.env.CRON_SECRET) {
  return new Response('Unauthorized', { status: 401 });
}
```

---

## i18n

**Framework:** next-intl

**Locales:** `en` (default), `vi` (Vietnamese)

**Detection order:** `NEXT_LOCALE` cookie → `Accept-Language` header

```
src/messages/en.json    # English UI strings
src/messages/vi.json    # Vietnamese UI strings

src/data/*.vi.json      # Vietnamese variants of static content
                        # (trophies, history, legends, club-info, player-bios)
```

**Usage:**
```typescript
// Server component
const t = await getTranslations('News.digest');

// Client component
const t = useTranslations('News.categories');
```

---

## SEO Infrastructure

**Location:** `src/lib/seo.ts`, `src/components/seo/json-ld.tsx`

Key utilities:
- `makePageMeta(title, desc, options)` — generates full Next.js `Metadata` object with OG + Twitter cards
- `getCanonical(path)` — builds canonical URL from `NEXT_PUBLIC_SITE_URL`
- `getHreflangAlternates(path)` — i18n hreflang tags (same URL, cookie-based locale)
- JSON-LD builders: `buildBreadcrumbJsonLd`, `buildNewsArticleJsonLd`, `buildSportsEventJsonLd`, `buildPersonJsonLd`

Dynamic routes (`robots.txt`, `sitemap.xml`) are Next.js route handlers at `src/app/robots.txt/route.ts` and `src/app/sitemap.xml/route.ts`.

---

## Database Schema

| Table | Purpose | Key Columns |
|---|---|---|
| `profiles` | User display name, avatar | `id` (FK auth.users), `display_name`, `avatar_url` |
| `favourite_players` | User → player relationships | `user_id`, `player_id` (API int) |
| `articles` | News article cache | `url`, `title`, `source`, `content_en`, `content_vi`, `relevance_score` |
| `article_likes` | Per-user article likes | `article_id`, `user_id` |
| `article_comments` | Article comments | `article_id`, `user_id`, `content` |
| `saved_articles` | User bookmarks | `article_id`, `user_id` |
| `gallery_images` | Gallery metadata | `cloudinary_id`, `title`, `category` |
| `conversations` | AI chat sessions | `user_id`, `title` |
| `messages` | AI chat messages | `conversation_id`, `role`, `content` |
| `news_digests` | Daily AI summaries | `digest_date` (PK), `summary`, `sections` (JSONB) |

All user tables have Row Level Security (RLS) — users can only read/write their own rows.

---

## Design System — Dark Stadium

All tokens defined in `src/app/globals.css` as `@theme inline` CSS variables:

| Token | Value | Usage |
|---|---|---|
| `stadium-bg` | `#0D0D0D` | Page background |
| `stadium-surface` | `#1A1A1A` | Cards, panels |
| `stadium-surface2` | `#252525` | Elevated surfaces |
| `lfc-red` | `#C8102E` | Primary actions, accents |
| `lfc-gold` | `#F6EB61` | Secondary accents, trophies |
| `stadium-muted` | `#A0A0A0` | Secondary text |
| `stadium-border` | `#2A2A2A` | Borders, dividers |

**Fonts:**
- `font-bebas` (League Gothic) — headlines, stats, hero text
- `font-inter` (Inter) — body, UI, forms
- `font-barlow` (Barlow Condensed) — labels, sub-headlines

Dark mode only. `enableSystem: false`, `defaultTheme: "dark"`.

**Components:** shadcn/ui with `new-york` style, `neutral` base color. Always check the registry before writing custom components. Install: `npx shadcn@latest add <name>`.
