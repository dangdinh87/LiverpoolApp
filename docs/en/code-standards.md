# Code Standards

LiverpoolApp — Next.js 16 (App Router) + TypeScript + Tailwind v4 + Supabase.

---

## 1. Server vs Client Components

### Rule of thumb

Default to **Server Components**. Add `'use client'` only when you need interactivity (hooks, event handlers, browser APIs).

### Server Components

```typescript
// src/app/squad/page.tsx
import { getSquad } from '@/lib/football'; // server-only import

export default async function SquadPage() {
  const players = await getSquad(); // direct await, React.cache dedupes
  return <SquadGrid players={players} />;
}
```

- Can `await` promises directly in component body
- Can import from `src/lib/football` and `src/lib/supabase-server`
- Cannot use `useState`, `useEffect`, event handlers
- Data flows one-way: server renders → passes serialisable props to client

### Client Components

```typescript
// src/components/squad/squad-grid.tsx
'use client';

import { useState } from 'react';

export default function SquadGrid({ players }: { players: Player[] }) {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? players : players.filter(p => p.position === filter);
  return (
    <>
      <PositionTabs value={filter} onChange={setFilter} />
      {filtered.map(p => <PlayerCard key={p.id} player={p} />)}
    </>
  );
}
```

- Must declare `'use client'` at top of file
- Can use all React hooks
- Cannot `await` top-level; cannot import `server-only` modules
- Receives server-rendered data as serialisable props

### Navbar pattern (critical split)

```typescript
// src/components/layout/navbar.tsx — Server
import { createServerSupabaseClient } from '@/lib/supabase-server';
import NavbarClient from './navbar-client';

export default async function NavbarAuth() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profile = user ? await getProfile(user.id) : null;
  return <NavbarClient user={user} profile={profile} />;
}

// src/components/layout/navbar-client.tsx — Client
'use client';
export default function NavbarClient({ user, profile }: Props) {
  // hooks, event handlers here
}
```

Root layout uses `<NavbarAuth />`, never `<Navbar />`.

---

## 2. Supabase Client Split (CRITICAL)

Two separate clients — **never mix them**.

| File | Purpose | Where to use |
|------|---------|--------------|
| `src/lib/supabase.ts` | Browser client (`createBrowserClient`) | `'use client'` components only |
| `src/lib/supabase-server.ts` | Server client (`createServerClient`) | Server components, API routes |
| `src/lib/news/supabase-service.ts` | Service role client | Admin/cron API routes only |

```typescript
// WRONG — will cause build error
// In a client component:
import { createServerSupabaseClient } from '@/lib/supabase-server'; // has "server-only" guard

// WRONG — auth state won't sync
// In a server component:
import { createClient } from '@/lib/supabase'; // browser-only client
```

```typescript
// Correct — client component
'use client';
import { createClient } from '@/lib/supabase';
const supabase = createClient();

// Correct — server component / API route
import { createServerSupabaseClient } from '@/lib/supabase-server';
const supabase = createServerSupabaseClient();
```

`supabase-server.ts` carries `import "server-only"` — importing it in a client component causes a **build-time error**, which is intentional.

---

## 3. Type System

### Canonical types

All football data types live in `src/lib/types/football.ts`. Every provider maps its API response to these types. Never use `any` in component props.

```typescript
// src/lib/types/football.ts
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
  league: { name: string; round: string };
}
```

### Supabase DB types

`src/lib/supabase.ts` exports `UserProfile`, `FavouritePlayer`, `SavedArticle` — inferred from Supabase schema. Use these for all DB row operations.

### TypeScript config

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noUnusedLocals": true
  }
}
```

Strict mode is enforced. `npm run build` fails on type errors.

---

## 4. Naming Conventions

| Category | Convention | Example |
|----------|-----------|---------|
| Files | kebab-case | `player-card.tsx`, `fdo-provider.ts` |
| Folders | kebab-case | `src/components/squad/` |
| Components | PascalCase | `PlayerCard`, `SquadGrid` |
| Functions | camelCase | `getSquad()`, `mapToPlayer()` |
| Constants | UPPER_SNAKE_CASE | `MOCK_SQUAD`, `FDO_LFC_ID` |
| CSS classes | kebab-case | `bg-lfc-red`, `text-stadium-muted` |
| DB tables | snake_case | `user_profiles`, `favourite_players` |
| DB columns | snake_case | `user_id`, `created_at` |
| Types / Interfaces | PascalCase | `Player`, `FootballDataProvider` |
| Enums | PascalCase | `MatchStatus`, `PlayerPosition` |

---

## 5. Error Handling

### Page-level error boundaries

Each route directory can include an `error.tsx` (must be `'use client'`):

```typescript
// src/app/squad/error.tsx
'use client';
export default function SquadError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="text-center py-20">
      <p className="text-stadium-muted">{error.message}</p>
      <button onClick={reset} className="mt-4 bg-lfc-red text-white px-6 py-2 rounded">
        Try again
      </button>
    </div>
  );
}
```

### Graceful API degradation

All football data functions catch errors and return safe empty values — pages render an empty state rather than crashing.

```typescript
export const getStandings = cache(async () => {
  if (!hasFdoKey) {
    console.warn('[football] FOOTBALL_DATA_ORG_KEY not set');
    return [];
  }
  try {
    return await getFdoStandings();
  } catch (err) {
    console.error('[football] standings failed:', err);
    return []; // graceful empty state
  }
});
```

### try/catch in server actions and API routes

```typescript
// src/app/api/news/sync/route.ts
export async function GET(req: Request) {
  try {
    await syncRssFeeds();
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[news/sync] failed:', err);
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
```

---

## 6. Styling Rules

### Tailwind only — no inline styles

```typescript
// CORRECT
<div className="flex items-center gap-4 p-6 bg-stadium-surface border border-stadium-border rounded-lg" />

// WRONG
<div style={{ display: 'flex', padding: '24px' }} />
```

### cn() utility

Use `cn()` from `src/lib/utils.ts` (wraps `clsx` + `tailwind-merge`) whenever classes are conditional:

```typescript
import { cn } from '@/lib/utils';

<div className={cn(
  'px-4 py-2 rounded font-barlow text-sm uppercase tracking-wide',
  isActive && 'bg-lfc-red text-white',
  !isActive && 'text-stadium-muted hover:text-white'
)} />
```

### No CSS modules

Do not create `.module.css` files. All styles go through Tailwind utility classes.

### Design tokens

Use semantic token classes (`bg-stadium-bg`, `text-lfc-red`, `border-stadium-border`) rather than raw hex values. Tokens are defined as CSS custom properties in `src/app/globals.css` and mapped in the Tailwind config.

---

## 7. Animation Patterns

### Framer Motion variants

Define variants outside the component to avoid re-creation on each render:

```typescript
// Reuse from src/lib/animation-variants.ts (or define inline for one-off use)
export const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};
```

```typescript
import { motion } from 'framer-motion';
import { fadeUp, stagger } from '@/lib/animation-variants';

<motion.ul variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
  {items.map(item => (
    <motion.li key={item.id} variants={fadeUp}>{item.name}</motion.li>
  ))}
</motion.ul>
```

### Respect reduced motion

All Framer Motion animations automatically honour `prefers-reduced-motion` when using `whileInView`/`animate`. For CSS keyframes, add the override in `globals.css`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 8. Image Handling

### Always use Next.js `<Image>`

```typescript
import Image from 'next/image';

<Image
  src={player.photo ?? '/placeholder-player.png'}
  alt={player.name}
  width={300}
  height={400}
  className="w-full aspect-[3/4] object-cover object-top"
  priority={isAboveFold}
/>
```

- Set explicit `width` and `height` — prevents layout shift
- Use `priority` for above-the-fold images (hero, first 3 players in a grid)
- Cloudinary images go through `src/lib/cloudinary.ts` helpers for transform URLs

### Player photos

```typescript
import { getPlayerPhoto } from '@/lib/player-photos';
// Returns mapped URL or '/placeholder-player.png'
const src = getPlayerPhoto(player.id);
```

---

## 9. Git Commit Conventions

```
feat: add ESPN cup fixtures to match feed
fix: handle FDO rate limit error response
refactor: extract FDO standings to separate module
perf: wrap getStandings in React.cache()
docs: add data-providers guide
test: add unit tests for season-stats computation
chore: upgrade to Next.js 16.2
```

Use lowercase, imperative mood. No period at end. Keep subject ≤72 chars.

---

## 10. Performance Checklist

- [ ] All `src/lib/football` functions wrapped in `React.cache()` (done by barrel in `index.ts`)
- [ ] Page-level fetches parallelised with `Promise.all()` when independent
- [ ] ISR revalidation times set per route (`export const revalidate = 3600`)
- [ ] `<Image>` used with explicit dimensions on every image
- [ ] No `server-only` modules imported in client bundles
- [ ] Long lists paginated or virtualised
- [ ] `loading.tsx` added for routes with async data fetches

---

## 11. Accessibility Checklist

- [ ] Color contrast ≥4.5:1 for body text (WCAG AA) — white on `#1A1A1A` is ~13:1
- [ ] Focus rings on all interactive elements: `focus-visible:ring-2 focus-visible:ring-lfc-red`
- [ ] Touch targets ≥44×44px
- [ ] ARIA labels on icon-only buttons (`aria-label="Toggle navigation"`)
- [ ] Alt text on all `<Image>` components
- [ ] Semantic HTML — `<button>` not `<div onClick>`, `<nav>`, `<main>`, `<article>`
- [ ] Skip link in layout: `<a href="#main" className="sr-only focus:not-sr-only">`
- [ ] `prefers-reduced-motion` respected in all animation code
