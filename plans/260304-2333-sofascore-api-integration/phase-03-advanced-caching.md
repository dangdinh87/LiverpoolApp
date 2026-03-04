# Phase 03: Advanced Multi-Layer Caching

## Context Links

- Current caching strategy: `src/lib/api-football.ts` lines 19-36
- Provider barrel: `src/lib/football/index.ts` (from Phase 01)
- Plan overview: [plan.md](./plan.md)

## Overview

Add an **in-memory LRU cache** as a third caching layer and introduce `revalidateTag()` for selective on-demand cache invalidation. The existing two layers (React.cache for per-request dedup + Next.js fetch ISR) remain unchanged. The LRU layer serves as a **graceful degradation fallback** when API calls fail.

## Key Insights

### Current 2-Layer Cache (Unchanged)

```
Layer 1: React.cache()           -- per-request dedup (same render)
Layer 2: fetch({ next: { revalidate } })  -- ISR data cache (across requests)
```

### New 3-Layer Cache

```
Layer 1: React.cache()           -- per-request dedup
Layer 2: fetch + next.revalidate -- ISR data cache
Layer 3: In-memory LRU Map       -- fallback when API fails, TTL-based eviction
Layer 4: revalidateTag()         -- on-demand invalidation trigger
```

### Revalidation Schedule (tuned)

| Data Type | fetch revalidate | LRU TTL | Tag |
|-----------|-----------------|---------|-----|
| Live match in progress | 300s (5min) | 600s | `fixtures-live` |
| Upcoming fixtures | 7200s (2h) | 14400s | `fixtures` |
| League standings | 21600s (6h) | 43200s | `standings` |
| Player statistics | 43200s (12h) | 86400s | `player-stats` |
| Squad data | 86400s (24h) | 172800s | `squad` |
| Historical results | 86400s (24h) | 604800s (7d) | `fixtures-past` |
| Team info / Coach | 86400s (24h) | 604800s | `team-info` |
| Top scorers/assists | 21600s (6h) | 43200s | `scorers` |
| Injuries | 21600s (6h) | 43200s | `injuries` |

### Why In-Memory LRU?

- API rate limits hit (100/day for API-Football, 25-30/min for SofaScore before IP ban)
- API downtime or network errors
- Vercel edge function cold starts need fast fallback
- Prevents cascading failures -- stale data > no data

## Requirements

- [ ] Create `src/lib/football/cache.ts` with LRU cache implementation
- [ ] Integrate LRU into provider barrel (wrap provider calls with fallback)
- [ ] Add `next: { tags: [...] }` to fetch calls in both providers
- [ ] Create `/api/revalidate` route for on-demand cache busting
- [ ] Keep LRU size bounded (max 50 entries, ~2MB memory ceiling)

## Architecture

### LRU Cache Module (`cache.ts`)

```typescript
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class LRUCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly maxSize: number;

  constructor(maxSize = 50) {
    this.maxSize = maxSize;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttl * 1000) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttl: number): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }

  invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) this.cache.delete(key);
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

export const footballCache = new LRUCache(50);
```

### Integration with Provider Barrel

The barrel (`index.ts`) wraps each provider call:

```typescript
import { footballCache } from "./cache";

async function withCache<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  try {
    const data = await fetcher();
    footballCache.set(key, data, ttl);
    return data;
  } catch (error) {
    console.warn(`[football] API error for ${key}, checking LRU cache`);
    const cached = footballCache.get<T>(key);
    if (cached) {
      console.info(`[football] Serving stale data for ${key}`);
      return cached;
    }
    throw error; // No cache fallback available
  }
}

// Updated exports
export const getStandings = cache(() =>
  withCache("standings", 43200, () => provider.getStandings())
);
```

### Fetch Tags for On-Demand Revalidation

Each provider adds `tags` to fetch options:

```typescript
// In api-football-provider.ts
const res = await fetch(url.toString(), {
  headers: { "x-apisports-key": apiKey },
  next: {
    revalidate: getRevalidateTime(endpoint),
    tags: [getTag(endpoint)],          // NEW
  },
});

function getTag(endpoint: string): string {
  if (endpoint.includes("/fixtures")) return "fixtures";
  if (endpoint.includes("/standings")) return "standings";
  if (endpoint.includes("/players/topscorers")) return "scorers";
  if (endpoint.includes("/players/topassists")) return "scorers";
  if (endpoint.includes("/players")) return "player-stats";
  if (endpoint.includes("/injuries")) return "injuries";
  if (endpoint.includes("/teams")) return "team-info";
  return "football-generic";
}
```

### On-Demand Revalidation API Route

```typescript
// src/app/api/revalidate/route.ts
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-revalidate-secret");
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tag } = await request.json();
  if (!tag || typeof tag !== "string") {
    return NextResponse.json({ error: "Missing tag" }, { status: 400 });
  }

  revalidateTag(tag);
  return NextResponse.json({ revalidated: true, tag });
}
```

### Memory Safety

- **Max 50 entries**: Each entry is typically 1-40KB (standings ~5KB, fixtures ~30KB). Max ~2MB total.
- **LRU eviction**: Oldest entry removed when at capacity.
- **TTL-based expiry**: Stale entries cleaned on read.
- **No persistence**: Cache is per-process, resets on deploy/restart. This is intentional -- keeps it simple.

## Related Code Files

| File | Role | Change |
|------|------|--------|
| `src/lib/football/cache.ts` | **NEW** | LRU cache module |
| `src/lib/football/index.ts` | Barrel | Add `withCache` wrapper |
| `src/lib/football/api-football-provider.ts` | Provider | Add fetch tags |
| `src/lib/football/sofascore-provider.ts` | Provider | Add fetch tags |
| `src/app/api/revalidate/route.ts` | **NEW** | On-demand revalidation endpoint |

## Implementation Steps

1. **Create `cache.ts`** with LRU implementation
2. **Add `withCache` wrapper** to `index.ts` barrel
3. **Add fetch tags** to `api-football-provider.ts` fetcher
4. **Add fetch tags** to `sofascore-provider.ts` fetcher
5. **Create `/api/revalidate` route** with secret auth
6. **Add `REVALIDATE_SECRET`** to `.env.example`
7. **Test failure scenarios**: disable API key, verify LRU serves stale data
8. **Test revalidation**: POST to `/api/revalidate` with tag, verify fresh data

## Todo List

- [ ] Create `src/lib/football/cache.ts`
- [ ] Add `withCache()` wrapper to barrel exports
- [ ] Add `next: { tags }` to API-Football provider fetch calls
- [ ] Add `next: { tags }` to SofaScore provider fetch calls
- [ ] Create `src/app/api/revalidate/route.ts`
- [ ] Update `.env.example` with `REVALIDATE_SECRET`
- [ ] Manual test: API failure -> LRU fallback works
- [ ] Manual test: POST revalidate -> fresh data served

## Success Criteria

1. When API key is revoked mid-session, pages still render with stale LRU data
2. `POST /api/revalidate` with correct secret + tag returns 200 and clears ISR cache
3. LRU cache never exceeds 50 entries
4. No memory leaks across multiple requests (verify with `process.memoryUsage()`)
5. Build passes with no type errors

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| LRU memory bloat in long-running process | Low | Medium | 50-entry cap + TTL eviction |
| Stale data served too long | Medium | Low | Conservative TTLs (2x ISR time) |
| Revalidate route exposed without auth | Low | High | Secret header required |
| Cache key collision between providers | Low | Medium | Prefix keys with provider name |

## Security Considerations

- `/api/revalidate` protected by `REVALIDATE_SECRET` header check
- LRU cache is server-side only, no client exposure
- Cache keys should not contain sensitive data (they contain endpoint paths)
- Rate limit info from headers is logged but not cached

## Next Steps

Proceed to [Phase 04](./phase-04-integration-testing.md) to wire everything together and test.
