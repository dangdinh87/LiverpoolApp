# Code Standards & Architecture

## Codebase Structure

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (theme, navbar, providers)
│   ├── page.tsx                  # / (homepage)
│   ├── globals.css               # Global styles + design tokens (CSS custom properties)
│   ├── favicon.ico
│   ├── [route]/
│   │   ├── page.tsx              # Server component (data fetch)
│   │   ├── loading.tsx           # Suspense fallback (skeleton)
│   │   └── error.tsx             # Error boundary fallback
│   ├── auth/                     # Authentication routes
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── callback/route.ts     # OAuth callback handler
│   ├── api/                      # API routes (not used much; Supabase handles auth)
│   ├── fixtures/
│   ├── player/[id]/
│   ├── squad/
│   ├── standings/
│   ├── stats/
│   ├── history/
│   ├── news/
│   ├── profile/
│   ├── about/
│   ├── legal/
│   ├── season/
│   ├── robots.txt/route.ts
│   └── sitemap.xml/route.ts
├── components/
│   ├── layout/
│   │   ├── navbar.tsx            # Server: fetches user + profile
│   │   ├── navbar-client.tsx     # Client: nav UI + theme toggle
│   │   └── footer.tsx
│   ├── home/
│   │   ├── hero.tsx
│   │   ├── bento-grid.tsx
│   │   ├── squad-carousel.tsx
│   │   ├── standings-preview.tsx
│   │   └── news-section.tsx
│   ├── squad/
│   │   ├── squad-grid.tsx        # Client: position filter state
│   │   └── player-card.tsx
│   ├── player/
│   │   ├── player-detail.tsx
│   │   └── [detail cards]
│   ├── fixtures/
│   │   ├── fixture-timeline.tsx
│   │   └── match-card.tsx
│   ├── standings/
│   │   └── standings-table.tsx
│   ├── stats/
│   │   ├── stat-chart.tsx        # recharts
│   │   └── stat-counter.tsx      # CountUp animation
│   ├── history/
│   │   ├── club-timeline.tsx     # Static JSON-driven
│   │   ├── trophy-cabinet.tsx
│   │   ├── legend-card.tsx
│   │   └── club-tabs.tsx
│   ├── profile/
│   │   ├── profile-form.tsx      # Client: avatar upload
│   │   ├── favourite-button.tsx  # Client: add/remove favourite
│   │   └── favourite-list.tsx    # Server/Client split
│   ├── auth/
│   │   ├── login-form.tsx        # Client: Supabase.auth.signUp()
│   │   └── register-form.tsx
│   ├── ui/
│   │   ├── button.tsx            # shadcn/ui base components
│   │   ├── dialog.tsx
│   │   ├── skeleton.tsx
│   │   ├── error-boundary.tsx    # React error fallback
│   │   └── [more shadcn exports]
│   └── [feature-components]
├── lib/
│   ├── football/                 # Football data provider pattern
│   │   ├── provider.ts           # Interface definition
│   │   ├── index.ts              # Factory + barrel + React.cache wrappers
│   │   ├── api-football-provider.ts
│   │   ├── mock-provider.ts
│   │   ├── mock-data.ts
│   │   └── sofascore-provider.ts (planned)
│   ├── supabase.ts               # Browser Supabase client (client-safe)
│   ├── supabase-server.ts        # Server Supabase client (server-only)
│   ├── types/
│   │   └── football.ts           # Canonical football data types
│   ├── player-photos.ts          # Player image URL mapping
│   └── squad-data.ts             # Local squad metadata
├── data/
│   ├── trophies.json             # Trophy history
│   ├── club-info.json            # Club metadata
│   ├── player-details.json       # Player supplementary data
│   ├── squad.json                # Squad roster
│   └── history.json              # Historical timeline data
├── styles/                       # (if any CSS modules)
└── public/
    ├── apple-touch-icon.png
    ├── favicon-32x32.png
    ├── favicon.ico
    ├── assets/lfc/               # LFC logos, icons
    └── [images]
```

---

## Key Patterns

### 1. Server vs Client Components

#### Server Components (default)

```typescript
// src/app/squad/page.tsx
import { getSquad } from '@/lib/football'; // server-only import

export default async function SquadPage() {
  const players = await getSquad(); // server-side fetch, React.cache() wrapped

  return (
    <div>
      <SquadGrid players={players} /> {/* hydrate client component */}
    </div>
  );
}
```

**Characteristics:**
- Can `await` promises directly
- Can `import` from `src/lib/football` (server-only)
- Cannot use hooks (no `useState`, `useEffect`)
- Data flows one-way: server → client

#### Client Components

```typescript
// src/components/squad/squad-grid.tsx
'use client'; // explicit client boundary

import { useState } from 'react';

export default function SquadGrid({ players }: Props) {
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? players : players.filter(/*...*/);

  return (
    <div>
      <Tabs value={filter} onChange={setFilter} />
      {filtered.map(p => <PlayerCard key={p.id} player={p} />)}
    </div>
  );
}
```

**Characteristics:**
- Must use `'use client'` directive
- Can use hooks (useState, useEffect, useContext)
- Cannot `await` or use `async`
- Receives server-rendered data as props

#### Navbar Split (Critical)

```typescript
// src/components/layout/navbar.tsx (Server)
import { createServerSupabaseClient } from '@/lib/supabase-server';
import NavbarClient from './navbar-client';

export default async function Navbar() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profile = user ? await getProfile(user.id) : null;

  return <NavbarClient user={user} profile={profile} />;
}

// src/components/layout/navbar-client.tsx (Client)
'use client';

import { useTheme } from 'next-themes';

export default function NavbarClient({ user, profile }: Props) {
  const { theme, setTheme } = useTheme();

  return (
    <nav>
      {/* Nav UI using user/profile data */}
      <button onClick={() => setTheme(/* ... */)}>
        {/* Theme toggle */}
      </button>
    </nav>
  );
}
```

---

### 2. Supabase Client Split

#### Never Mix These!

```typescript
// ✗ WRONG in client component
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ✗ WRONG in server component
import { createClient } from '@/lib/supabase';
```

#### Browser Client (Client Components Only)

```typescript
// src/lib/supabase.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// Usage in client component
import { createClient } from '@/lib/supabase';

export default function FavouriteButton({ playerId }: Props) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
}
```

#### Server Client (Server Components & API Routes)

```typescript
// src/lib/supabase-server.ts
import "server-only";

export function createServerSupabaseClient() {
  return createServerClient(/* ... */);
}

// Usage in server component
import { createServerSupabaseClient } from '@/lib/supabase-server';

export default async function ProfilePage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
}
```

---

### 3. Football Data Provider Pattern

See [docs/data-provider-guide.md](./data-provider-guide.md) for full details.

**Key rule:** Always import from barrel, never directly from provider classes.

```typescript
// ✓ CORRECT
import { getSquad, getFixtures } from '@/lib/football';

// ✗ WRONG
import { ApiFootballProvider } from '@/lib/football/api-football-provider';
```

---

### 4. Type System

#### Canonical Types

All data is typed using `src/lib/types/football.ts`:

```typescript
export interface Player {
  id: number;
  name: string;
  position: string;
  number: number;
  photo?: string;
  nationality?: string;
  age?: number;
  stats: PlayerStats | null;
}

export interface Fixture {
  id: number;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: 'scheduled' | 'live' | 'finished' | 'postponed';
  // ...
}
```

All providers map their API responses to these types.

#### TypeScript Strict Mode

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noUnusedLocals": true
  }
}
```

---

### 5. Error Handling

#### React Error Boundary

```typescript
// src/components/ui/error-boundary.tsx
'use client';

import React from 'react';

export class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error Boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}
```

#### Usage in Layout

```typescript
// src/app/layout.tsx
<ErrorBoundary fallback={<ErrorPage />}>
  <Suspense fallback={<SkeletonLoader />}>
    {children}
  </Suspense>
</ErrorBoundary>
```

#### Graceful API Failures

```typescript
// src/lib/football/api-football-provider.ts
async getSquad(): Promise<Player[]> {
  try {
    const response = await fetch(/* ... */);
    const data = await response.json();

    if (data.errors) {
      console.error('[api-football] Error:', data.errors);
      return []; // graceful fallback
    }

    return mapToCanonicalType(data);
  } catch (err) {
    console.error('[api-football] Network error:', err);
    return [];
  }
}
```

---

### 6. Styling

#### Tailwind CSS v4

All styling uses utility classes. No inline styles.

```typescript
// ✓ CORRECT
<div className="flex items-center gap-4 p-6 bg-lfc-surface border border-lfc-border rounded-lg" />

// ✗ WRONG
<div style={{ display: 'flex', padding: '24px' }} />
```

#### Design Tokens (CSS Variables)

```css
/* src/app/globals.css */
:root {
  --stadium-bg:      #0D0D0D;
  --stadium-surface: #1A1A1A;
  --lfc-red:         #C8102E;
  --lfc-gold:        #F6EB61;
  --lfc-muted:       #A0A0A0;
  --lfc-border:      #2A2A2A;
}
```

Used in Tailwind config:

```js
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      'stadium-bg': 'var(--stadium-bg)',
      lfc: {
        red: 'var(--lfc-red)',
        gold: 'var(--lfc-gold)',
      },
    },
  },
}
```

#### No CSS Modules (Use Tailwind Instead)

```typescript
// ✗ AVOID
import styles from './player-card.module.css';

// ✓ USE TAILWIND
export default function PlayerCard() {
  return <div className="bg-lfc-surface border border-lfc-border p-4 rounded-lg" />;
}
```

---

### 7. Animation Patterns

#### Framer Motion Variants

```typescript
// src/lib/animation-variants.ts
export const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};
```

#### Usage

```typescript
import { motion } from 'framer-motion';
import { fadeUp } from '@/lib/animation-variants';

export default function Component() {
  return (
    <motion.div variants={fadeUp} initial="hidden" whileInView="visible">
      Content
    </motion.div>
  );
}
```

#### Tailwind Animations

```typescript
// For simple keyframes
<div className="animate-pulse-red" />
```

---

### 8. Image Handling

#### Use Next.js Image Component

```typescript
import Image from 'next/image';

<Image
  src={photo}
  alt={playerName}
  width={300}
  height={400}
  className="w-full aspect-[3/4] object-cover"
/>
```

#### Player Photos

```typescript
// src/lib/player-photos.ts — maps player ID to photo URL
export const playerPhotoMap: Record<number, string> = {
  123: 'https://api-football-v3.p.rapidapi.com/crest/...',
  124: 'https://...',
};

export function getPlayerPhoto(id: number): string {
  return playerPhotoMap[id] || '/placeholder.png';
}
```

---

### 9. Environment Variables

#### Required (in .env.example)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Football Data
API_FOOTBALL_KEY=your_key
FOOTBALL_DATA_PROVIDER=api-football  # auto-detects if not set

# Site Metadata
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

#### Accessing in Code

```typescript
// Server-side only
process.env.SUPABASE_SERVICE_ROLE_KEY;
process.env.API_FOOTBALL_KEY;

// Client-safe (has NEXT_PUBLIC_ prefix)
process.env.NEXT_PUBLIC_SUPABASE_URL;
process.env.NEXT_PUBLIC_SITE_URL;
```

---

### 10. Testing & Build

#### TypeScript Check

```bash
npm run type-check
```

#### Build

```bash
npm run build
# Fails if:
# - TypeScript errors
# - Unused imports
# - Next.js validation fails
```

#### Development Server

```bash
npm run dev
# Auto-reload on file changes
# Logs [football] Provider: api-football or mock
```

---

## Naming Conventions

| Category | Convention | Example |
|----------|-----------|---------|
| Files | kebab-case | `player-card.tsx`, `api-football-provider.ts` |
| Folders | kebab-case | `src/components/player-detail/` |
| Components | PascalCase | `PlayerCard`, `SquadGrid` |
| Functions | camelCase | `getSquad()`, `mapToPlayer()` |
| Constants | UPPER_SNAKE_CASE | `MOCK_SQUAD`, `TEAM_ID` |
| CSS Classes | kebab-case | `bg-lfc-red`, `text-display-lg` |
| DB Tables | snake_case | `user_profiles`, `favourite_players` |
| DB Columns | snake_case | `user_id`, `created_at` |
| Types | PascalCase | `Player`, `Fixture` |
| Interfaces | PascalCase, optional `I` prefix | `FootballDataProvider`, `INotifiable` |
| Enums | PascalCase | `MatchStatus`, `PlayerPosition` |

---

## Git Commit Conventions

```
feat: add provider pattern for football data sources
fix: handle API-Football error responses gracefully
refactor: extract mock data constants
docs: add data provider guide
perf: implement React.cache() for request deduplication
test: add unit tests for provider factories
chore: upgrade Next.js to 16
```

---

## Performance Checklist

- [ ] All `src/lib/football` functions wrapped in `React.cache()`
- [ ] Page-level data fetches parallelized with `Promise.all()`
- [ ] No N+1 queries (use batch fetches where possible)
- [ ] ISR revalidation times set per route
- [ ] Images use `<Image>` component with explicit dimensions
- [ ] Long lists use `virtualization` or pagination
- [ ] Client bundles exclude `server-only` modules

---

## Accessibility Checklist

- [ ] Color contrast ≥4.5:1 for body text (WCAG AA)
- [ ] Focus rings visible on all interactive elements
- [ ] Touch targets ≥44×44px
- [ ] ARIA labels on icon-only buttons
- [ ] `prefers-reduced-motion` respected
- [ ] Alt text on all images
- [ ] Semantic HTML (use `<button>` not `<div>`)

