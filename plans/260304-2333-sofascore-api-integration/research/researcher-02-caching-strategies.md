# Research Report: Caching Strategies for Sports/Football APIs in Next.js

**Date:** 2026-03-04 | **Report ID:** researcher-02 | **Scope:** Next.js caching + football APIs

---

## Executive Summary

Next.js App Router (v16+) provides **4 caching layers**: Data Cache (fetch), Full Route Cache (ISR), Request Cache (React.cache), and Dynamic Rendering. For rate-limited sports APIs (100 req/day), implement **multi-layer caching**: React.cache() for request-level deduplication, fetch revalidate for time-based invalidation, and file-based fallbacks for offline resilience. Live match data requires 5-10min TTL; standings/player stats 6-24h; historical data permanent. Prefer API-Football for simplicity (100 req/day free, 2022-24 seasons only); Football-Data.org for open-data philosophy; SportMonks for enterprise features.

---

## Next.js Caching Architecture (App Router)

### 1. Data Cache (fetch level)
```typescript
// Revalidate every 30 minutes
fetch(url, { next: { revalidate: 1800 } })

// Force cache (no revalidation)
fetch(url, { cache: 'force-cache' })

// No cache
fetch(url, { cache: 'no-store' })

// Time-based with tags (manual invalidation)
fetch(url, { next: { tags: ['standings'] } })
```
- Stored on disk; persists across deployments
- Default revalidate if not specified: 60s for dynamic routes, ∞ for static
- Tags enable `revalidateTag()` for manual purge

### 2. Full Route Cache (ISR)
- Pages marked `revalidate` generate static HTML at build + regenerate on interval
- **Behind-the-scenes**: Next.js serves stale content while revalidating in background
- Replaces old ISR; now integrated into fetch revalidate + generateStaticParams

### 3. Request Cache (React.cache)
```typescript
import { cache } from 'react'

const getFixtures = cache(async () => {
  return fetch(url, { next: { revalidate: 1800 } })
})

// Same request called twice in single render → cache hit
await Promise.all([
  getFixtures(),
  getFixtures() // same request, reused from cache
])
```
- **Deduplicates** identical calls within single render
- Reduces redundant API calls; perfect for parallel data fetching
- Request-scoped; not shared across requests

### 4. Dynamic Rendering
- Setting `dynamic = 'force-dynamic'` **bypasses Data Cache entirely**
- Use sparingly; prevents ISR benefits

---

## Optimal Cache Durations by Data Type

| Data Type | TTL | Rationale | Strategy |
|-----------|-----|-----------|----------|
| **Live Match Score** | 5-10 min | Game ongoing; score updates frequently | Event-based refresh + short TTL |
| **Upcoming Fixtures** | 2-6 hours | Scheduled kickoffs stable; lineups change | Invalidate 24h before kick-off |
| **League Standings** | 6-12 hours | Only updates after matches complete | Revalidate after match finish |
| **Player Statistics** | 12-24 hours | Season-long accumulation; slow change | Nightly revalidate |
| **Historical Results** | Permanent (∞) | Never changes; cache forever | `cache: 'force-cache'` |
| **Team Info/Roster** | 12 hours | Squad updates mid-season; transfers | Revalidate daily |

---

## Multi-Layer Caching Pattern

```typescript
// src/lib/api-football.ts (server-only)
import { cache } from 'react'
import 'server-only'

const API_KEY = process.env.API_FOOTBALL_KEY
const LRU_CACHE = new Map() // In-memory backup

// Layer 1: React.cache (request deduplication)
export const getStandings = cache(async (leagueId: number) => {
  // Layer 2: Check in-memory cache (fallback when file cache empty)
  const cacheKey = `standings-${leagueId}`
  if (LRU_CACHE.has(cacheKey)) {
    console.log('[Cache] Memory hit:', cacheKey)
    return LRU_CACHE.get(cacheKey)
  }

  // Layer 3: fetch Data Cache (disk) with revalidation
  try {
    const res = await fetch(`https://api.api-football.com/v3/standings?league=${leagueId}`, {
      headers: { 'X-RapidAPI-Key': API_KEY },
      next: {
        revalidate: 6 * 3600, // 6 hours
        tags: [`standings-${leagueId}`]
      }
    })

    const data = await res.json()

    // Fallback: store in memory for next 5min
    LRU_CACHE.set(cacheKey, data)
    setTimeout(() => LRU_CACHE.delete(cacheKey), 300000)

    return data
  } catch (error) {
    // Layer 4: Fallback to memory cache if API fails
    if (LRU_CACHE.has(cacheKey)) {
      console.warn('[Cache] API failed, serving stale data:', cacheKey)
      return LRU_CACHE.get(cacheKey)
    }
    throw error
  }
})

// Manual invalidation when needed
export async function refreshStandings(leagueId: number) {
  const { revalidateTag } = await import('next/cache')
  revalidateTag(`standings-${leagueId}`)
}
```

---

## Cache Invalidation Strategies

### Time-Based (Default)
- `revalidate: 3600` — regenerate after 1 hour
- Simple; matches scheduled match times
- **Best for:** standings, player stats, upcoming fixtures

### Event-Based (Manual)
```typescript
// Server Action triggered by webhook
'use server'
export async function onMatchComplete() {
  revalidateTag('standings')
  revalidateTag('player-stats')
}
```
- Requires external event source (webhook from API/sports provider)
- **Best for:** critical live data; minimizes stale content

### Tag-Based (Selective)
```typescript
// Revalidate only specific cache entries
revalidateTag('standings-39') // Only PL standings
```
- Granular control; avoids full cache purge
- **Best for:** multi-league apps

---

## Rate-Limit Optimization (100 req/day)

### Problem
100 req/day = ~4.2 req/hour = 1 req every ~15min. Tight constraint.

### Solution
```typescript
// 1. Cache aggressively
const CACHE_DURATIONS = {
  standings: 8 * 3600,      // 1 req per 8 hours
  fixtures: 6 * 3600,       // 1 req per 6 hours
  playerStats: 24 * 3600,   // 1 req per 24 hours
  history: Infinity         // Cache forever
}

// 2. Batch requests
const [standings, fixtures] = await Promise.all([
  getStandings(39),
  getUpcomingFixtures(40)
])

// 3. React.cache() deduplication
// If page renders both <StandingsCard /> and <StandingsTable />,
// React.cache ensures single API call

// 4. Serve stale data on API failure
// In-memory fallback + graceful degradation

// 5. Progressive enhancement
// Build-time: pre-fetch static data (trophies, history)
// Render-time: fetch if available, else use stale
// Client-time: refresh on user action (button click)
```

### Budget Calculation
- **Daily budget:** 100 req/day
- **Standing:** 1 req × 3x/day = 3 req
- **Fixtures:** 2 req × 2x/day = 4 req
- **Player stats:** 1 req × 1x/day = 1 req
- **Match timeline:** 4 req × 2x/day = 8 req
- **Reserve:** 84 req (testing, growth)
- **Total:** 100 req ✓

---

## Football API Comparison (2025)

| Feature | API-Football | Football-Data | SportMonks | OpenFootball |
|---------|-------------|---------------|-----------|-------------|
| **Free Tier** | 100 req/day | 10 req/min* | Limited (outdated) | Open data |
| **Pricing** | $10-20/mo | €7-80/mo | $50-250/mo | Free |
| **Data Scope** | 600+ leagues | 100+ leagues | Top leagues | Minimal |
| **Seasons** | 2022-2024 | Current+history | Current+history | Limited |
| **Real-time Score** | ✓ (live only) | ✓ | ✓✓ | ✗ |
| **Maturity** | High | Highest | High | Low |
| **Auth** | RapidAPI key | Personal key | API key | Public |
| **Reliability** | 99% | 99%+ | 99% | ⚠️ |

*Football-Data.org: 10 req/min = 1440 req/day (no daily limit)

### Recommendation
- **LiverpoolApp (current):** API-Football (100 req/day free, simplicity)
- **Future growth:** Football-Data.org (higher limits, more stable)
- **Enterprise:** SportMonks (real-time, fixture scheduling)
- **Self-hosted:** OpenFootball API (free but limited; need own data)

---

## Implementation Code Patterns

### Pattern 1: ISR + Tag-Based Revalidation
```typescript
// app/standings/page.tsx
import { getStandings, refreshStandings } from '@/lib/api-football'

export const revalidate = 6 * 3600 // 6 hours

export default async function StandingsPage() {
  const standings = await getStandings(39)

  return (
    <div>
      <Standings data={standings} />
      <RefreshButton action={refreshStandings} /> {/* Server Action */}
    </div>
  )
}
```

### Pattern 2: React.cache() for Deduplication
```typescript
// Parallel queries, single API call
const [matches, standing] = await Promise.all([
  getFixtures(40),
  getStandings(39)
])
```

### Pattern 3: Fallback Chain
```typescript
async function getWithFallback(key, fetcher) {
  try {
    return await fetcher()
  } catch {
    const fallback = readFromDisk(key) || readFromMemory(key)
    return fallback || throwError()
  }
}
```

---

## Best Practices Checklist

- ✓ Use `React.cache()` in server components for request deduplication
- ✓ Set `revalidate` on all fetch calls; avoid implicit defaults
- ✓ Tag related data; use `revalidateTag()` for selective purges
- ✓ Implement 2-tier fallback: memory → disk → error
- ✓ For rate-limited APIs: cache aggressively (8+ hour TTL)
- ✓ Monitor cache hit ratio; log cache misses
- ✓ Use `next/cache` only in server-only files
- ✓ Avoid `dynamic = 'force-dynamic'` unless necessary
- ✓ Pre-compute static data (history, trophies) at build time
- ✓ Test offline scenarios; graceful degradation essential

---

## Unresolved Questions

1. Does API-Football support webhook callbacks for real-time match updates? (check their enterprise tier)
2. Football-Data.org's exact rate-limit behavior during peak hours (World Cup)?
3. Optimal LRU eviction policy for memory cache in production (LRU.js library recommendations)?
4. Should we implement Redis for multi-instance deployments, or stick with file-based?

---

**Report Complete** | Next: Implementation plan for LiverpoolApp caching layer
