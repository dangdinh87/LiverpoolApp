# Liverpool FC Premium Fan Site Research
## Next.js 15 & Sports Design Patterns

**Date:** 2026-03-03 | **Status:** Complete

---

## Topic 1: Next.js 15 App Router for Sports/Data-Heavy Sites

### ISR (Incremental Static Regeneration) Strategy
**Recommended Approach:** Time-based + On-demand hybrid
- Use `revalidate` (seconds) for static pages: `export const revalidate = 60` for fixtures, standings
- Higher revalidate times (3600s = 1hr) for player profiles, historical stats
- **On-demand revalidation** via `revalidateTag()` for real-time match updates
- **Pattern:** Serve cached pages instantly + background regeneration = fast UX + fresh data

**Sports Data Application:**
```ts
// Fixtures page: revalidate every 5 mins during season
export const revalidate = 300

// Player profiles: revalidate hourly (less volatile)
export const revalidate = 3600

// Match scores: use tags for granular control
fetch(url, { next: { tags: ['match-1234'] } })
// Then call revalidateTag('match-1234') from webhooks
```

**Key Insight:** ISR avoids expensive real-time polling. Combine with webhook-triggered revalidation for live match data.

---

### Route Handlers for API Proxying (Hide API Keys)
**Standard Pattern:**
- Create `/app/api/football/[endpoint]/route.ts`
- Proxy external APIs (ESPN, Premier League data sources)
- Backend stores API keys in environment variables
- Frontend calls `/api/football/*` instead of third-party domains

**Benefits:**
- API keys never exposed to client
- Rate limiting control on backend
- CORS management centralized
- Cache control at handler level with `revalidate`

**Example Structure:**
```
/app/api/
  ├── players/route.ts         // GET player list
  ├── fixtures/route.ts        // GET matches
  ├── standings/[team]/route.ts // GET league table
```

---

### Next.js Image Optimization
**Core Features for Player Photos:**
- Automatic WebP/AVIF format selection (modern browsers)
- Responsive sizing: auto-detects device, serves optimal resolution
- Native lazy loading (viewport entry detection)
- Blur-up placeholder for perceived performance

**Implementation:**
```tsx
import Image from 'next/image'
import playerImage from '@/public/players/mo-salah.jpg'

// Static import = auto width/height + blurDataURL
<Image
  src={playerImage}
  alt="Mohamed Salah"
  placeholder="blur"
  priority={false}
/>

// Remote images: require remotePatterns in next.config
<Image
  src="https://api.football.com/players/123.jpg"
  alt="Player"
  width={400}
  height={500}
/>
```

**Config for player image CDN:**
```ts
// next.config.ts
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'api.football.com',
      pathname: '/players/**'
    }
  ]
}
```

---

### Suspense + Streaming for Real-Time-ish Data
**Pattern:** Progressive revelation with nested Suspense boundaries

**Use Case - Match Live Feed:**
```tsx
<Suspense fallback={<MatchSkeletonLoader />}>
  <MatchHeader /> {/* loads first */}

  <Suspense fallback={<ScoresLoader />}>
    <LiveScores /> {/* staggered load */}
  </Suspense>

  <Suspense fallback={<CommentsLoader />}>
    <FanComments /> {/* last to load */}
  </Suspense>
</Suspense>
```

**Benefits:**
- Page renders immediately (faster FCP)
- Critical content loads first
- Non-blocking load sequence
- Prevents flashing/layout shifts

**Best Practice:** Use `startTransition` during navigation to avoid hiding already-visible content.

---

### Caching Strategy Summary
| Data Type | Revalidate | Method | Rationale |
|-----------|-----------|--------|-----------|
| Player roster | 86400s (daily) | Time-based | Minimal changes |
| Fixtures/Schedule | 3600s (hourly) | Time-based | Pre-planned |
| Live match score | 30-60s | Tag-based | Frequent updates |
| Standings table | 300s (5min) | Time-based | Tactical balance |
| News articles | 600s (10min) | Path-based | Editor control |

**Rule:** Fastest safe revalidation wins (YAGNI). Don't over-cache; don't under-cache.

---

## Topic 2: Premium Football/Sports Website Design

### Liverpool FC Color System
**Official Palette:**
- **Primary Red:** `#C8102E` (Pantone 200C) – iconic LFC identity
- **Gold Accent:** `#F6EB61` – complementary highlights, badges
- **Teal Secondary:** `#00B2A9` – modern accent for interactive elements
- **White:** `#FFFFFF` – backgrounds, text on red
- **Dark Charcoal:** `#1A1A1A` – text, dark mode base

**Implementation in Tailwind:**
```ts
// tailwind.config.ts
colors: {
  lfc: {
    red: '#C8102E',
    gold: '#F6EB61',
    teal: '#00B2A9',
    dark: '#1A1A1A'
  }
}
```

---

### Glassmorphism + Animation Patterns
**Glassmorphism (frosted glass effect):**
- Backdrop blur + semi-transparent background
- Creates depth perception + modern aesthetic
- Ideal for floating cards, modals, hero overlays

**Tailwind Implementation:**
```tsx
// Frosted glass card
<div className="backdrop-blur-md bg-white/20 dark:bg-black/30 border border-white/30 rounded-xl p-6">
  {/* content */}
</div>

// Hero overlay with glass effect
<div className="absolute inset-0 backdrop-blur-sm bg-gradient-to-b from-black/40 via-transparent to-transparent" />
```

**Animation Patterns (sports sites):**
- Fade + slide entrance on scroll
- Smooth hover scale (0.98 → 1.02)
- Icon rotation/pulse on stats highlights
- Match state indicator pulse (live dot animation)

```tsx
// CSS animations
@keyframes pulse-live {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

// Tailwind: use built-in `animate-pulse` for loading states
<div className="animate-pulse"> {/* pulsing skeleton */} </div>
```

---

### shadcn/ui + Tailwind Dashboard Layouts
**Why shadcn for sports:**
- Unstyled, composable components (full control)
- Tailwind-native (consistent design tokens)
- Built-in accessibility (a11y best practices)
- Zero runtime overhead

**Recommended Components for Liverpool Site:**
- `Card` – player stats, fixture cards, standings rows
- `Table` – league table, player statistics
- `Tabs` – seasons, competitions, match stats
- `Badge` – team badges, player positions
- `Dialog` – player profiles, match details modal
- `Select` – filter by position/competition
- `Toast` – live match notifications

**Example: Squad Card with shadcn:**
```tsx
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function PlayerCard({ player }) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <Image src={player.image} alt={player.name} />
      </CardHeader>
      <CardContent>
        <h3 className="font-bold">{player.name}</h3>
        <Badge variant="secondary">{player.position}</Badge>
        <p className="text-sm text-gray-600">#{player.number}</p>
      </CardContent>
    </Card>
  )
}
```

---

### Hero Section Patterns
**Football/Sports Hero Best Practices:**
1. **Background:** Hero image (player action shot) with backdrop blur overlay
2. **Call-to-Action:** Minimal text overlay (team crest, tagline, button)
3. **Live Badge:** Pulsing indicator if match is ongoing
4. **Asymmetric Layout:** Content left/center, image right (or diagonal split)

**Implementation:**
```tsx
export function HeroSection() {
  return (
    <section className="relative h-screen flex items-center overflow-hidden">
      {/* Background image */}
      <Image
        src="/hero-salah.jpg"
        alt="Liverpool Hero"
        fill
        className="object-cover"
      />

      {/* Frosted glass overlay */}
      <div className="absolute inset-0 backdrop-blur-sm bg-gradient-to-r from-lfc-dark/80 to-transparent" />

      {/* Content */}
      <div className="relative z-10 max-w-2xl px-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-3 h-3 bg-lfc-gold rounded-full animate-pulse" />
          <span className="text-sm text-lfc-gold font-semibold">LIVE MATCH</span>
        </div>
        <h1 className="text-5xl font-bold text-white mb-4">Liverpool vs Man City</h1>
        <p className="text-lg text-gray-200 mb-6">Premier League • Anfield</p>
        <button className="bg-lfc-red hover:bg-lfc-red/90 text-white px-8 py-3 rounded-lg font-bold">
          Watch Live
        </button>
      </div>
    </section>
  )
}
```

---

### Card Layouts: Squad, Fixtures, Standings
**Squad Grid:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {players.map(player => <PlayerCard key={player.id} player={player} />)}
</div>
```

**Fixtures List (horizontal scrollable on mobile):**
```tsx
<div className="overflow-x-auto">
  <div className="flex gap-4 pb-4">
    {fixtures.map(fixture => (
      <Card key={fixture.id} className="flex-shrink-0 w-80">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <TeamBadge team={fixture.home} />
            <span className="text-2xl font-bold">{fixture.score}</span>
            <TeamBadge team={fixture.away} />
          </div>
          <p className="text-xs text-gray-500 mt-2">{fixture.date}</p>
        </CardContent>
      </Card>
    ))}
  </div>
</div>
```

**Standings Table (sortable columns):**
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Pos</TableHead>
      <TableHead>Team</TableHead>
      <TableHead className="text-right">P</TableHead>
      <TableHead className="text-right">W-D-L</TableHead>
      <TableHead className="text-right">GF-GA</TableHead>
      <TableHead className="text-right">Pts</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {standings.map(row => (
      <TableRow key={row.position} className="hover:bg-gray-50 dark:hover:bg-gray-900">
        <TableCell className="font-bold">{row.position}</TableCell>
        <TableCell>{row.team}</TableCell>
        {/* stats */}
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

### Dark Mode Implementation (Tailwind)
**Recommended: Class-based (explicit toggle control)**

**Configuration:**
```ts
// tailwind.config.ts
module.exports = {
  darkMode: 'class', // user has control
  theme: {
    extend: {
      colors: {
        'lfc-dark': '#1A1A1A'
      }
    }
  }
}
```

**Toggle Component:**
```tsx
'use client'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800"
    >
      {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  )
}
```

**Persist to localStorage with `next-themes`:**
```bash
npm install next-themes
```

```tsx
// app/layout.tsx
import { ThemeProvider } from 'next-themes'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system">
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

**Dark mode utilities:**
```tsx
<div className="bg-white dark:bg-lfc-dark text-black dark:text-white">
  Automatically adapts to theme
</div>
```

---

## Implementation Priorities (YAGNI)

1. **Phase 1 (MVP):** Hero + Squad grid + Fixtures list + ISR caching
2. **Phase 2:** Live match score updates (tag-based revalidation)
3. **Phase 3:** Dark mode toggle + glassmorphism effects
4. **Phase 4:** Advanced animations + fan engagement features

---

## Unresolved Questions

- What third-party API will you use for live match data? (ESPN, RapidAPI Football, official Premier League API?)
- Do you need real-time notifications for match events (goals, cards)?
- Should player stats be sourced from DB or external API?

---

**Report Generated:** 2026-03-03 14:44 UTC
