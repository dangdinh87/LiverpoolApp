# Phase 01: Provider Abstraction & Refactor

**Status:** ✅ COMPLETE (2026-03-05)

## Context Links

- Current API client: `src/lib/api-football.ts` (415 lines)
- Type definitions: `src/lib/types/football.ts` (252 lines)
- Plan overview: [plan.md](./plan.md)

## Overview

Extract the **provider interface** from the current monolithic `api-football.ts`, split mock data into a standalone module, and restructure into `src/lib/football/` directory. Zero behavior change for pages -- this is a pure refactor.

## Key Insights

1. Current `api-football.ts` mixes three concerns: API fetching, data transformation, and mock data (~225 lines of mocks)
2. 12 public functions to abstract: `getSquad`, `getFixtures`, `getStandings`, `getTopScorers`, `getTopAssists`, `getPlayerStats`, `getFixtureEvents`, `getFixtureLineups`, `getFixtureStatistics`, `getInjuries`, `getTeamInfo`, `getCoach`
3. Squad page (`/squad`, `/player/[id]`) uses `squad-data.ts` (local JSON), NOT the API -- only 5 pages actually hit the API
4. Types in `football.ts` are the **canonical contract** -- providers must output these shapes

## Requirements

- [x] Define `FootballDataProvider` interface matching all 12 public functions
- [x] Create `src/lib/football/` directory with barrel export
- [x] Refactor `api-football.ts` -> `src/lib/football/api-football-provider.ts`
- [x] Extract mocks -> `src/lib/football/mock-provider.ts`
- [x] Create factory in `src/lib/football/index.ts` that selects provider by env var
- [x] Update all page imports from `@/lib/api-football` to `@/lib/football`
- [x] Types file stays at `src/lib/types/football.ts` (no move)

## Architecture

### New Directory Structure

```
src/lib/football/
  provider.ts            # FootballDataProvider interface
  index.ts               # Factory + re-exports (server-only)
  api-football-provider.ts  # Current logic, refactored
  mock-provider.ts       # Extracted mock data + provider impl
  mock-data.ts           # Raw mock data constants (shared)
```

### Provider Interface (`provider.ts`)

```typescript
import type {
  Player, PlayerStats, Fixture, Standing, TopScorer,
  FixtureEvent, FixtureLineup, FixtureTeamStats,
  Injury, TeamInfo, Coach,
} from "@/lib/types/football";

export interface FootballDataProvider {
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

### Factory (`index.ts`)

```typescript
import "server-only";
import { cache } from "react";
import type { FootballDataProvider } from "./provider";

function createProvider(): FootballDataProvider {
  const providerName = process.env.FOOTBALL_DATA_PROVIDER ?? "api-football";
  switch (providerName) {
    case "sofascore":
      // lazy import to avoid loading unused provider code
      const { SofaScoreProvider } = require("./sofascore-provider");
      return new SofaScoreProvider();
    case "mock":
      const { MockProvider } = require("./mock-provider");
      return new MockProvider();
    case "api-football":
    default:
      const { ApiFootballProvider } = require("./api-football-provider");
      return new ApiFootballProvider();
  }
}

const provider = createProvider();

// Re-export all functions wrapped in React.cache() for request deduplication
export const getSquad = cache(() => provider.getSquad());
export const getFixtures = cache(() => provider.getFixtures());
export const getStandings = cache(() => provider.getStandings());
export const getTopScorers = cache(() => provider.getTopScorers());
export const getTopAssists = cache(() => provider.getTopAssists());
export const getPlayerStats = cache((id: number) => provider.getPlayerStats(id));
export const getFixtureEvents = cache((id: number) => provider.getFixtureEvents(id));
export const getFixtureLineups = cache((id: number) => provider.getFixtureLineups(id));
export const getFixtureStatistics = cache((id: number) => provider.getFixtureStatistics(id));
export const getInjuries = cache(() => provider.getInjuries());
export const getTeamInfo = cache(() => provider.getTeamInfo());
export const getCoach = cache(() => provider.getCoach());
```

### API-Football Provider Refactor

The existing `apiFetch`, `getRevalidateTime`, and all public functions move into a class implementing `FootballDataProvider`. Key changes:

- Remove `cache()` wrappers (moved to barrel)
- Remove mock fallback from `apiFetch` (mock is its own provider now)
- Keep `import "server-only"` on the barrel, remove from individual providers
- Keep `fetch({ next: { revalidate } })` ISR caching in each provider

### Mock Provider

Extract all `mock*` constants from `api-football.ts` into `mock-data.ts`. The `MockProvider` class returns them directly. This provider is used when:
- `FOOTBALL_DATA_PROVIDER=mock`
- Dev mode with no API keys set (factory auto-detects)

## Related Code Files

| File | Role | Change |
|------|------|--------|
| `src/lib/api-football.ts` | Current monolith | DELETE after refactor |
| `src/lib/types/football.ts` | Type definitions | UNCHANGED |
| `src/app/page.tsx` | Homepage | Update import path |
| `src/app/fixtures/page.tsx` | Fixtures | Update import path |
| `src/app/fixtures/[id]/page.tsx` | Fixture detail | Update import path |
| `src/app/standings/page.tsx` | Standings | Update import path |
| `src/app/stats/page.tsx` | Stats | Update import path |

## Implementation Steps

1. **Create directory**: `src/lib/football/`
2. **Write `provider.ts`**: Interface definition (see above)
3. **Write `mock-data.ts`**: Move all `mock*` constants from `api-football.ts`
4. **Write `mock-provider.ts`**: Class implementing interface using mock data
5. **Write `api-football-provider.ts`**: Refactor -- move `apiFetch`, `getRevalidateTime`, all methods into class. On API failure, throw (let cache layer handle fallback, or caller catches)
6. **Write `index.ts`**: Factory + `cache()` wrapped re-exports
7. **Update page imports** (5 files): `@/lib/api-football` -> `@/lib/football`
8. **Delete `src/lib/api-football.ts`**
9. **Verify build**: `npm run build` must pass with zero changes in behavior

## Todo List

- [x] Create `src/lib/football/provider.ts`
- [x] Create `src/lib/football/mock-data.ts` (extract ~225 lines of mocks)
- [x] Create `src/lib/football/mock-provider.ts`
- [x] Refactor `api-football.ts` -> `src/lib/football/api-football-provider.ts`
- [x] Create `src/lib/football/index.ts` (factory + barrel)
- [x] Update imports in `src/app/page.tsx`
- [x] Update imports in `src/app/fixtures/page.tsx`
- [x] Update imports in `src/app/fixtures/[id]/page.tsx`
- [x] Update imports in `src/app/standings/page.tsx`
- [x] Update imports in `src/app/stats/page.tsx`
- [x] Delete `src/lib/api-football.ts`
- [x] Run `npm run build` and verify

## Success Criteria

1. `npm run build` passes with zero errors
2. All pages render identically (no visual diff)
3. `FOOTBALL_DATA_PROVIDER=mock npm run dev` works without API keys
4. Provider interface is documented with JSDoc
5. No circular imports

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Import path breaks | Medium | High | Automated grep for old import path after deletion |
| `cache()` dedup breaks | Low | Medium | Keep same wrapping pattern, test with concurrent calls |
| Mock data mismatch | Low | Low | Copy exactly, no transformations |

## Security Considerations

- API keys remain in env vars, never in source
- `server-only` import stays on barrel to prevent client-side leakage
- Individual provider files do NOT need `server-only` since barrel enforces it

## Next Steps

Proceed to [Phase 02](./phase-02-sofascore-provider.md) to implement the SofaScore provider.
