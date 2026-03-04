---
title: "Multi-Provider Football Data with SofaScore + Advanced Caching"
description: "Provider abstraction for API-Football + SofaScore with multi-layer cache & LRU fallback"
status: in-progress
priority: P2
effort: "7h"
branch: master
tags: [api, caching, provider-pattern, sofascore]
created: 2026-03-04
---

# Multi-Provider Football Data Architecture

## Why SofaScore (with caveats)

SofaScore has **NO official public API**. All access uses reverse-engineered endpoints at `https://www.sofascore.com/api/v1`. Risks: ToS violation, IP bans (25-30 req/min limit), endpoint instability. User accepted these risks.

**Mitigation:** Aggressive caching (6-24h TTL), User-Agent rotation, exponential backoff, LRU fallback for failures.

## Architecture Overview

```
Page (server component)
  -> getFixtures() / getStandings() / ...   (unchanged public API)
    -> src/lib/football/index.ts             (re-exports from active provider)
      -> src/lib/football/provider.ts        (interface contract)
      -> src/lib/football/api-football.ts    (existing, refactored)
      -> src/lib/football/sofascore.ts       (new provider — reverse-eng)
      -> src/lib/football/cache.ts           (multi-layer: React.cache + fetch ISR + LRU)
      -> src/lib/football/mock-provider.ts   (dev mode, extracted from current mocks)
```

Provider selected via `FOOTBALL_DATA_PROVIDER` env var (`api-football` | `sofascore` | `mock`).

## Key Decisions

1. **Types stay as-is** — providers map external shapes to existing `football.ts` interfaces
2. **Pages unchanged** — import paths shift from `@/lib/api-football` to `@/lib/football`
3. **SofaScore IDs differ** — Liverpool=44, PL tournament=17, season=~52186
4. **User-Agent rotation** required for SofaScore (Cloudflare protection)
5. **LRU in-memory cache** as graceful-degradation fallback when APIs fail/get banned

## Phases

| Phase | File | Effort | Status | Summary |
|-------|------|--------|--------|---------|
| 01 | [provider-abstraction](./phase-01-provider-abstraction.md) | 2h | ✅ DONE (2026-03-05) | Define interface, refactor existing client, extract mocks |
| 02 | [sofascore-provider](./phase-02-sofascore-provider.md) | 2.5h | pending | SofaScore reverse-eng provider with data mapping |
| 03 | [advanced-caching](./phase-03-advanced-caching.md) | 1.5h | pending | Multi-layer cache: LRU fallback + revalidateTag + throttle |
| 04 | [integration-testing](./phase-04-integration-testing.md) | 1h | pending | Wire up, env config, test, docs |

## Env Variables (new)

```
FOOTBALL_DATA_PROVIDER=api-football    # or "sofascore" or "mock"
API_FOOTBALL_KEY=                      # existing, unchanged
```

## Risk Summary

- **IP ban risk** — SofaScore aggressively rate-limits; cache must be extremely aggressive
- **Endpoint instability** — SofaScore endpoints may change without notice
- **No official support** — Zero recourse if endpoints break
- **ID mapping** — SofaScore IDs incompatible with API-Football (need lookup)

## Research

- [SofaScore API Research](./research/researcher-01-sofascore-api.md)
- [Caching Strategies](./research/researcher-02-caching-strategies.md)
- [SofaScore Endpoints Detail](./research/researcher-03-sofascore-endpoints.md)
