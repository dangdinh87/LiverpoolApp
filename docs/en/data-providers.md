# Data Providers

Football data layer for LiverpoolApp — provider pattern decouples the app from any single API.

---

## 1. Overview

All football data flows through an abstract provider interface. Providers translate external API responses into canonical types. The barrel (`src/lib/football/index.ts`) wraps every function in `React.cache()` for per-request deduplication and re-exports them as named functions.

```
User visits /squad
     ↓
SquadPage (server component)
     ↓
await getSquad()         ← import from '@/lib/football'
     ↓
React.cache wrapper      ← deduplicates within same request
     ↓
provider.getSquad()      ← FdoProvider (or MockProvider in dev)
     ↓
fdoFetch('/teams/64/..') ← HTTP call with ISR revalidation
     ↓
map to Player[]          ← canonical types from src/lib/types/football.ts
     ↓
return to component
```

### Key files

| File | Purpose |
|------|---------|
| `src/lib/football/provider.ts` | `FootballDataProvider` interface |
| `src/lib/football/index.ts` | Factory + barrel export + `React.cache()` wrappers |
| `src/lib/football/fdo-provider.ts` | Football-Data.org implementation |
| `src/lib/football/fdo-standings.ts` | PL + UCL standings (FDO) |
| `src/lib/football/fdo-matches.ts` | Fixtures + coach info (FDO) |
| `src/lib/football/espn-events.ts` | Match events, lineups, cup fixtures (ESPN) |
| `src/lib/football/mock-provider.ts` | Static mock fallback |
| `src/lib/football/mock-data.ts` | Mock constants (`MOCK_SQUAD`, etc.) |
| `src/lib/football/fpl-stats.ts` | FPL API player stats supplement |
| `src/lib/types/football.ts` | Canonical type definitions |

---

## 2. Provider Interface

`src/lib/football/provider.ts`

```typescript
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
  getGameweekInfo(): Promise<GameweekInfo | null>;
}
```

All return types come from `src/lib/types/football.ts`. Providers must map their API shape to these canonical types.

---

## 3. Football-Data.org (Primary)

**File:** `src/lib/football/fdo-provider.ts`
**API:** `https://api.football-data.org/v4`
**Liverpool ID in FDO:** 64 (mapped to canonical ID 40 in responses)
**Env var:** `FOOTBALL_DATA_ORG_KEY`

### What it provides

| Data | Endpoint | Revalidation |
|------|----------|-------------|
| Squad + player bios | Local `squad.json` + FDO enrichment | Static |
| PL standings | `/competitions/PL/standings` | 6h |
| UCL standings | `/competitions/CL/standings` | 6h |
| All fixtures | `/teams/64/matches` | 1h |
| Coach info | `/teams/64` | 24h |
| Top scorers | `/competitions/PL/scorers` | 6h |
| Top assists | `/competitions/PL/scorers?limit=20` | 6h |

### Rate limits (free tier)

- **10 requests / minute**
- Season data: 2022, 2023, 2024 (2025 season blocked on free plan)
- All functions use `next: { revalidate }` via `fetch()` — rate limit is rarely hit in production

### API key setup

```bash
# .env.local
FOOTBALL_DATA_ORG_KEY=your_key_here
```

Get a key at [football-data.org/client/register](https://www.football-data.org/client/register). Free tier is sufficient for all current features.

### Core fetcher

```typescript
// src/lib/football/fdo-provider.ts
const FDO_BASE = 'https://api.football-data.org/v4';

async function fdoFetch<T>(path: string, revalidate: number): Promise<T> {
  const key = process.env.FOOTBALL_DATA_ORG_KEY;
  if (!key) throw new Error('[fdo-provider] FOOTBALL_DATA_ORG_KEY not set');

  const res = await fetch(`${FDO_BASE}${path}`, {
    headers: { 'X-Auth-Token': key },
    next: { revalidate },
    signal: AbortSignal.timeout(12_000),
  });

  if (!res.ok) throw new Error(`[fdo-provider] HTTP ${res.status} on ${path}`);
  return res.json();
}
```

### Known limitations

- `getPlayerStats()` delegates to FPL API (Fantasy Premier League) — no league filter, players without PL stats may return stats from other leagues
- Season 2025 unavailable on free tier
- No match events with exact minute data (use ESPN for that)

---

## 4. ESPN (Supplementary)

**File:** `src/lib/football/espn-events.ts`
**API:** `https://site.api.espn.com/apis/site/v2/sports/soccer`
**Liverpool ID in ESPN:** `364`
**Env var:** none — free, no key required

### What it provides

| Data | Coverage |
|------|---------|
| Match events (goals, cards, subs) | Exact minute data |
| Match lineups | Starting XI + substitutes |
| Match detail | Venue, attendance, referee, 28 per-team stats |
| Cup fixtures | FA Cup (`eng.fa`), EFL Cup (`eng.league_cup`) |

ESPN is used as the **preferred source for match-level detail** because it provides minute data that FDO does not. The barrel implements a fallback chain:

```typescript
// src/lib/football/index.ts
export const getFixtureEvents = cache(async (id: number, fixtureDate?: string) => {
  if (fixtureDate) {
    try {
      const espnEvents = await getEspnMatchEvents(fixtureDate);
      if (espnEvents.length > 0) return espnEvents; // ESPN preferred
    } catch (err) {
      console.error('[football] ESPN events failed:', err);
    }
  }
  return provider.getFixtureEvents(id); // FDO fallback
});
```

### League slugs

```typescript
const LEAGUE_SLUGS = ['eng.1', 'uefa.champions', 'eng.fa', 'eng.league_cup'];
```

---

## 5. Mock Provider (Dev Fallback)

**File:** `src/lib/football/mock-provider.ts`
**Data:** `src/lib/football/mock-data.ts`

Automatically used when `FOOTBALL_DATA_ORG_KEY` is not set. Returns deterministic static data — no network calls, no rate limits.

```typescript
// mock-provider.ts
export class MockProvider implements FootballDataProvider {
  readonly name = 'mock';
  async getSquad(): Promise<Player[]> { return MOCK_SQUAD; }
  async getFixtures(): Promise<Fixture[]> { return MOCK_FIXTURES; }
  // ... all interface methods return mock constants
}
```

To force mock in development:

```bash
# Option 1: remove key from .env.local
# Option 2: explicit override (not yet wired — just unset the key)
unset FOOTBALL_DATA_ORG_KEY && npm run dev
```

The console will log: `[football] Provider: fdo, FDO key: no` and functions will return empty arrays with a warning — extend `MockProvider` if you need richer dev data.

---

## 6. Barrel Export & React.cache()

`src/lib/football/index.ts` is the **only** entry point for consuming football data. Never import directly from provider files.

```typescript
// CORRECT
import { getSquad, getFixtures, getStandings } from '@/lib/football';

// WRONG — never do this
import { FdoProvider } from '@/lib/football/fdo-provider';
```

The barrel applies `React.cache()` to every export:

```typescript
import 'server-only';
import { cache } from 'react';

export const getSquad = cache(() => provider.getSquad());
export const getStandings = cache(async (season?: number) => { ... });
export const getPlayerStats = cache((id: number) => provider.getPlayerStats(id));
```

`React.cache()` deduplicates within a single request — if three server components on the same page call `getSquad()`, only one network request is made.

---

## 7. Data Flow: Provider → Component

```typescript
// src/app/squad/page.tsx (Server Component)
import { getSquad } from '@/lib/football';

export const revalidate = 3600; // ISR: re-fetch at most once per hour

export default async function SquadPage() {
  const players = await getSquad();
  return <SquadGrid players={players} />;
}
```

```typescript
// src/app/standings/page.tsx — parallel fetches
import { getStandings, getUclStandings } from '@/lib/football';

export default async function StandingsPage() {
  const [pl, ucl] = await Promise.all([getStandings(), getUclStandings()]);
  return <StandingsTabs pl={pl} ucl={ucl} />;
}
```

---

## 8. Error Handling & Graceful Degradation

Every exported function in the barrel follows the same pattern:

1. Check for required env var — return empty / null and warn if missing
2. `try/catch` around the actual fetch
3. Return empty array / `null` on failure — never throw to the page

```typescript
export const getStandings = cache(async (season?: number) => {
  if (!hasFdoKey) {
    console.warn('[football] FOOTBALL_DATA_ORG_KEY not set — no standings');
    return [];
  }
  try {
    return await getFdoStandings(season);
  } catch (err) {
    console.error('[football] FDO standings failed:', err);
    return []; // page renders empty state, not error
  }
});
```

Pages should handle the empty case with a UI fallback rather than assuming data exists:

```typescript
// src/app/standings/page.tsx
const standings = await getStandings();
if (standings.length === 0) return <EmptyState message="Standings unavailable" />;
```

---

## 9. Adding a New Provider

### Step 1 — Create the provider class

```typescript
// src/lib/football/sofascore-provider.ts
import type { FootballDataProvider } from './provider';
import type { Player, Fixture /* ... */ } from '@/lib/types/football';

export class SofaScoreProvider implements FootballDataProvider {
  readonly name = 'sofascore';

  async getSquad(): Promise<Player[]> {
    const res = await fetch('https://api.sofascore.com/...', {
      next: { revalidate: 3600 },
    });
    const data = await res.json();
    return data.players.map(mapSofaScorePlayer); // map to canonical Player
  }

  // implement all interface methods ...
}
```

### Step 2 — Register in the barrel

```typescript
// src/lib/football/index.ts — add to provider selection logic
import { SofaScoreProvider } from './sofascore-provider';

function createProvider(): FootballDataProvider {
  if (process.env.SOFASCORE_KEY) return new SofaScoreProvider();
  if (process.env.FOOTBALL_DATA_ORG_KEY) return new FdoProvider();
  return new MockProvider();
}
```

### Step 3 — Add env var

```bash
# .env.local
SOFASCORE_KEY=your_key
```

### Step 4 — Rebuild

```bash
npm run build
```

### Mapping rules

- Always map to the exact shape defined in `src/lib/types/football.ts`
- Never expose provider-specific types outside the provider file
- If a field is unavailable from the new API, set it to `null` or `undefined` per the type definition
- Add a `console.info('[sofascore] provider loaded')` in dev so it's easy to verify which provider is active

---

## 10. Environment Variables

| Variable | Provider | Required |
|----------|---------|---------|
| `FOOTBALL_DATA_ORG_KEY` | Football-Data.org | Yes (for live data) |

Without `FOOTBALL_DATA_ORG_KEY`, all FDO functions return empty arrays/null and log a warning. The app remains functional with empty states.

ESPN requires no credentials and is always active.
