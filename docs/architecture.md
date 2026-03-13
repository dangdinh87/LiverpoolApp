# System Architecture

## Overview

LiverpoolApp is a Next.js 16 server-rendered application following the App Router pattern, built with TypeScript, Tailwind CSS v4, and shadcn/ui. The app emphasizes server-side data fetching, a pluggable provider pattern for data sources, and a cohesive "Dark Stadium" design language.

---

## AI Features

### AI Daily Digest (Phase 04)

**Purpose:** Automated AI-powered news digest summarizing top 15 Liverpool FC articles daily.

**Stack:**
- **LLM:** Groq Cloud (llama-3.3-70b-versatile, ~2000 tok/request)
- **Database:** Supabase PostgreSQL (news_digests table)
- **Cron:** Vercel Cron (daily at 00:00 UTC)

**Flow:**
1. Cron triggers `/api/news/digest/generate` with `CRON_SECRET`
2. `generateDailyDigest()` queries top 15 articles (last 24h)
3. Groq LLM generates Vietnamese summary + 3-7 sections (one per category)
4. Upserts to `news_digests` table with idempotency check
5. `/news` page fetches `getLatestDigest()`, displays as pinned `DigestCard`
6. Users can dismiss (localStorage), expand summary, or click "Read Full" → `/news/digest/[date]`

**Details:** See `docs/news-feature.md` → Phase 04 for full schema + i18n keys.

---

## Core Layers

### 1. Data Layer — Football Provider Pattern

**Location:** `src/lib/football/`

The application abstracts football data sources behind a provider interface (`FootballDataProvider`). This enables swapping data sources without changing business logic.

#### Provider Interface
```typescript
// src/lib/football/provider.ts
interface FootballDataProvider {
  readonly name: string;
  getSquad(): Promise<Player[]>;
  getFixtures(): Promise<Fixture[]>;
  getStandings(): Promise<Standing[]>;
  getTopScorers(): Promise<TopScorer[]>;
  getTopAssists(): Promise<TopScorer[]>;
  getPlayerStats(playerId: number): Promise<PlayerStats | null>;
  getFixtureEvents(fixtureId: number): Promise<FixtureEvent[]>;
  getFixtureLineups(fixtureId: number): Promise<FixtureLineup[]>;
  getFixtureStatistics(fixtureId: number): Promise<FixtureTeamStats[]>;
  getInjuries(): Promise<Injury[]>;
  getTeamInfo(): Promise<TeamInfo | null>;
  getCoach(): Promise<Coach | null>;
}
```

All providers must map their API responses to canonical types in `src/lib/types/football.ts`.

#### Active Providers

1. **ApiFootballProvider** (`api-football-provider.ts`)
   - Uses api-football.com API (supports seasons 2022-2024, current squad is 2025/26)
   - 100 free requests/day
   - Auto-selects if `API_FOOTBALL_KEY` env var is set

2. **MockProvider** (`mock-provider.ts`)
   - Returns static mock data from `mock-data.ts`
   - Used in development when no API key available
   - Enables testing without API calls

#### Future Providers
- **SofaScore** (planned Phase 02) — will add support for more detailed event data

#### Provider Selection

**Location:** `src/lib/football/index.ts` → `resolveProviderName()`

```
Explicit env var? → Use FOOTBALL_DATA_PROVIDER
                 ↓ No
API_FOOTBALL_KEY set? → Use api-football
                     ↓ No
Use mock (fallback)
```

#### Barrel Export Pattern

All functions from `src/lib/football/` are:
1. Wrapped in `React.cache()` for per-request deduplication
2. Re-exported as named exports
3. Server-only (import "server-only" directive)
4. Never imported directly from provider classes

Pages import from `@/lib/football`:
```typescript
import { getSquad, getFixtures, getPlayerStats } from '@/lib/football';
```

---

### 2. Type System

**Location:** `src/lib/types/football.ts`

Canonical types that all providers map to. These types are:
- Immutable across provider swaps
- Used by all page components
- Aligned with Supabase schema for player favorites

---

### 3. Authentication & User State

**Supabase** (Auth + PostgreSQL + Storage)

#### Client vs Server
- **`src/lib/supabase.ts`** — browser client, safe for client components
- **`src/lib/supabase-server.ts`** — server-only, server components + API routes only

#### Data Models
```typescript
UserProfile {
  id: UUID
  email: string
  displayName: string
  avatarUrl: string
  createdAt: timestamp
}

FavouritePlayer {
  id: UUID
  userId: UUID
  playerId: number (from API)
  addedAt: timestamp
}
```

---

### 4. Server Components & Rendering

**Key Pattern:** Server-render all data fetches, pass to client components for interactivity

```typescript
// src/app/squad/page.tsx (Server)
export default async function SquadPage() {
  const squad = await getSquad(); // server-only, cached
  return <SquadGrid players={squad} />; // hydrate with client component
}

// src/components/squad/squad-grid.tsx (Client)
'use client';
export default function SquadGrid({ players }: Props) {
  const [filter, setFilter] = useState('all'); // client state
  // ...
}
```

---

### 5. Layout Structure

```
src/app/
├── layout.tsx                    # RootLayout: theme provider, navbar
├── page.tsx                      # /  (homepage)
├── squad/
│   ├── page.tsx                  # /squad (server)
│   └── loading.tsx               # Skeleton fallback
├── player/[id]/
│   ├── page.tsx                  # /player/[id] (server)
│   └── loading.tsx
├── fixtures/
│   ├── page.tsx                  # /fixtures (server)
│   ├── [id]/page.tsx             # /fixtures/[id] detail
│   └── loading.tsx
├── standings/page.tsx            # /standings (server)
├── stats/page.tsx                # /stats (server)
├── history/page.tsx              # /history (static, JSON-driven)
├── news/page.tsx                 # /news (RSS feed)
├── profile/page.tsx              # /profile (protected, server + client)
├── auth/
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── callback/route.ts         # OAuth callback
├── about/page.tsx                # /about (static)
├── legal/page.tsx                # /legal (static)
├── season/page.tsx               # /season picker
├── robots.txt/route.ts           # SEO
└── sitemap.xml/route.ts          # SEO
```

---

### 6. Component Organization

```
src/components/
├── layout/
│   ├── navbar.tsx               # Server: fetches auth + profile
│   ├── navbar-client.tsx        # Client: nav UI + theme toggle
│   └── footer.tsx
├── home/
│   ├── hero.tsx
│   ├── bento-grid.tsx
│   ├── squad-carousel.tsx
│   ├── standings-preview.tsx
│   └── news-section.tsx
├── squad/
│   ├── squad-grid.tsx           # Client: filtering
│   └── player-card.tsx
├── player/
│   ├── player-detail.tsx
│   └── (detail cards)
├── fixtures/
│   ├── fixture-timeline.tsx
│   └── match-card.tsx
├── standings/
│   └── standings-table.tsx
├── stats/
│   ├── stat-chart.tsx           # recharts
│   └── stat-counter.tsx         # count-up animation
├── history/
│   ├── club-timeline.tsx        # JSON-driven
│   ├── trophy-cabinet.tsx
│   ├── legend-card.tsx
│   └── club-tabs.tsx
├── profile/
│   ├── profile-form.tsx         # Client: Supabase upload
│   ├── favourite-button.tsx     # Client: add/remove
│   └── favourite-list.tsx       # Server/Client split
├── auth/
│   ├── login-form.tsx           # Client: Supabase.signUp()
│   └── register-form.tsx
├── ui/
│   ├── button.tsx               # shadcn/ui base
│   ├── dialog.tsx
│   ├── skeleton.tsx             # Loading placeholders
│   ├── error-boundary.tsx       # Error fallback
│   └── (shadcn exports)
└── injury-widget.tsx            # Reusable injury alert
```

---

## Data Flow Examples

### Example 1: Squad Page Render

```
User visits /squad
                ↓
SquadPage (server)
  ├─ await getSquad()  [cached, provider-selected]
  │  ├─ if (API_FOOTBALL_KEY) → ApiFootballProvider.getSquad()
  │  └─ else → MockProvider.getSquad()
  │           ↓
  │       HTTP call or mock data
  │           ↓
  │       [Provider] → canonical types
  ├─ return <SquadGrid players={squad} />
  │           ↓
  │        SquadGrid (client)
  │          ├─ useState([filter, setFilter])
  │          ├─ useEffect([filter change] → re-render)
  │          └─ map(players) → <PlayerCard />
  │
  └─ Hydrate + user can filter by position
```

### Example 2: Player Favorites (Client + Server)

```
User clicks heart icon on /player/[id]
                ↓
FavouriteButton (client)
  ├─ const { user } = useSupabaseClient()
  ├─ POST /api/favourite { playerId, action: 'add' }
  │           ↓
  │      Server API route
  │        ├─ auth check (serviceRole client)
  │        ├─ INSERT into favourites table
  │        └─ return { success: true }
  │           ↓
  │      Update optimistic UI
  │      Revalidate /profile cache
  │           ↓
  │      Next request to /profile
  │        ├─ await getFavourites()
  │        └─ Fresh data from Supabase
```

---

## Caching Strategy

### React.cache() — Request-Level Deduplication

All `src/lib/football` exports are wrapped:

```typescript
export const getSquad = cache(() => provider.getSquad());
```

**Effect:** Multiple calls to `getSquad()` in the same request render only hit the provider once.

### Next.js Revalidation

**Route-specific ISR:**

```typescript
// Homepage — revalidate every 30 minutes
export const revalidateTime = 1800;

// Standings — revalidate every 6 hours
export const revalidateTime = 21600;

// History — fully static, never revalidate
export const revalidateTime = false;
```

### Browser Cache

Client components (e.g., filters, favorites) use local state. No HTTP caching for API calls (all server-side).

---

## Error Handling

### API-Football Error Types

Provider catches `json.errors` and returns gracefully:

```typescript
// api-football-provider.ts
catch (err) {
  if (err.json?.errors) {
    // Plan restriction (free tier, season 2025)
    // Rate limit (100/day exceeded)
    // Invalid params
  }
  return fallback (empty array or null)
}
```

### Client-Side Boundaries

`<ErrorBoundary />` (React error fallback) + `loading.tsx` (Suspense fallback):

```tsx
// layout.tsx
<ErrorBoundary fallback={<ErrorPage />}>
  <Suspense fallback={<SkeletonLoader />}>
    {children}
  </Suspense>
</ErrorBoundary>
```

---

## Environment Configuration

Required (`.env.example`):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Football Data (optional, auto-detects)
API_FOOTBALL_KEY=abc123xyz
FOOTBALL_DATA_PROVIDER=api-football  # or: mock, sofascore

# Site metadata
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # Must match OAuth redirect URI
```

---

## Design Language — Dark Stadium

All UI follows `src/app/globals.css` tokens:

```css
--stadium-bg:      #0D0D0D (page background)
--stadium-surface: #1A1A1A (cards)
--lfc-red:         #C8102E (primary action)
--lfc-gold:        #F6EB61 (accents, trophies)
```

See `docs/design-guidelines.md` for full component patterns.

---

## Deployment Checklist

- [ ] `API_FOOTBALL_KEY` set (or mock will be used)
- [ ] Supabase credentials configured
- [ ] `NEXT_PUBLIC_SITE_URL` matches OAuth redirect URI
- [ ] `npm run build` succeeds
- [ ] Environment variables injected before deploy

---

## Performance Considerations

1. **Server-side data fetching** — no waterfall; all promises await in parallel
2. **Provider abstraction** — swap data sources without refactor
3. **React.cache()** — deduplicates per-request calls
4. **ISR** — static + revalidation balances freshness vs. compute
5. **Skeleton loaders** — `loading.tsx` provides fast perceived performance
6. **Image optimization** — Next.js Image component with explicit aspect ratios

