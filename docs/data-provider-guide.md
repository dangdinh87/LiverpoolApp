# Football Data Provider Pattern

## Overview

The football data layer uses an **abstract provider pattern** to decouple the application from any single API. This enables seamless switching between data sources (API-Football, SofaScore, mock) without changing business logic.

---

## Provider Interface

**Location:** `src/lib/football/provider.ts`

```typescript
interface FootballDataProvider {
  readonly name: string;

  // Squad
  getSquad(): Promise<Player[]>;

  // Matches
  getFixtures(): Promise<Fixture[]>;
  getFixtureEvents(fixtureId: number): Promise<FixtureEvent[]>;
  getFixtureLineups(fixtureId: number): Promise<FixtureLineup[]>;
  getFixtureStatistics(fixtureId: number): Promise<FixtureTeamStats[]>;

  // Standings
  getStandings(): Promise<Standing[]>;

  // Statistics
  getTopScorers(): Promise<TopScorer[]>;
  getTopAssists(): Promise<TopScorer[]>;
  getPlayerStats(playerId: number): Promise<PlayerStats | null>;

  // Team info
  getTeamInfo(): Promise<TeamInfo | null>;
  getCoach(): Promise<Coach | null>;
  getInjuries(): Promise<Injury[]>;
}
```

All providers must return **canonical types** from `src/lib/types/football.ts`.

---

## Active Providers

### 1. ApiFootballProvider

**Location:** `src/lib/football/api-football-provider.ts`

Integrates with [api-football.com](https://www.api-football.com/).

#### Characteristics
- **Team:** Liverpool (ID 40)
- **League:** Premier League (ID 39)
- **Seasons:** 2022, 2023, 2024 (free tier)
- **Current squad:** Returns 2025/26 season (always latest)
- **Rate limit:** 100 requests/day (free)
- **Cost:** Free

#### Usage

Automatically selected if:
1. `FOOTBALL_DATA_PROVIDER=api-football` (explicit), OR
2. `API_FOOTBALL_KEY` env var is set (auto-detect)

#### Known Limitations
- `getPlayerStats()` has no league filter — players without PL stats show their other league stats
- Plan restriction on season 2025 (free tier only has 2022-2024)
- Must check for `json.errors` in response

#### Example Implementation
```typescript
// api-football-provider.ts
export class ApiFootballProvider implements FootballDataProvider {
  readonly name = "api-football";

  async getSquad(): Promise<Player[]> {
    const response = await fetch(
      `https://v3.api-football.com/players?team=40&season=${SEASON}`,
      { headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY } }
    );
    const data = await response.json();

    if (data.errors) {
      console.error('[api-football] Error:', data.errors);
      return []; // graceful fallback
    }

    // Map API shape to canonical Player type
    return data.response.map((p: any) => ({
      id: p.player.id,
      name: p.player.name,
      // ...
    }));
  }
}
```

---

### 2. MockProvider

**Location:** `src/lib/football/mock-provider.ts`

Returns static mock data from `src/lib/football/mock-data.ts`.

#### Characteristics
- **No API calls** — instant responses
- **Deterministic** — same data every time
- **Development-friendly** — test without rate limits

#### Usage

Automatically selected if:
1. `FOOTBALL_DATA_PROVIDER=mock` (explicit), OR
2. No `API_FOOTBALL_KEY` env var set (fallback)

#### Example
```typescript
// mock-provider.ts
export class MockProvider implements FootballDataProvider {
  readonly name = "mock";

  async getSquad(): Promise<Player[]> {
    return MOCK_SQUAD; // from mock-data.ts
  }

  async getFixtures(): Promise<Fixture[]> {
    return MOCK_FIXTURES;
  }
}
```

---

### 3. SofaScore (Planned)

**Location:** `src/lib/football/sofascore-provider.ts` (Phase 02)

Will integrate [SofaScore](https://www.sofascore.com/) for more detailed event data.

#### Planned Support
- More granular event tracking (tackles, passes, dribbles)
- Heat maps and advanced statistics
- Live match updates

#### Current Status
```typescript
// index.ts → createProvider()
case "sofascore":
  throw new Error(
    "[football] SofaScore provider not yet implemented."
  );
```

---

## Barrel Export Pattern

**Location:** `src/lib/football/index.ts`

All provider methods are:
1. **Wrapped in React.cache()** for per-request deduplication
2. **Re-exported as named exports** for easy import
3. **Server-only** (import "server-only" directive prevents client bundles from importing)

```typescript
import "server-only";
import { cache } from "react";

const provider = createProvider(); // resolved at build time

export const getSquad = cache(() => provider.getSquad());
export const getFixtures = cache(() => provider.getFixtures());
export const getPlayerStats = cache((id: number) => provider.getPlayerStats(id));
// ... etc
```

### Why React.cache()?

Within a single request, if multiple components call `getSquad()`:

```typescript
// server component
const squad = await getSquad();           // → network call
const squad2 = await getSquad();          // → returns cached result from first call
const squad3 = await getSquad();          // → returns cached result from first call
```

Without caching, all three would hit the API. With `React.cache()`, only one network call occurs.

---

## How to Use in Page Components

**Pages always import from the barrel:**

```typescript
// ✓ CORRECT
import { getSquad, getFixtures } from '@/lib/football';

// ✗ WRONG — never import directly from provider classes
import { ApiFootballProvider } from '@/lib/football/api-football-provider';
```

**Usage in server components:**

```typescript
// src/app/squad/page.tsx
import { getSquad } from '@/lib/football';

export default async function SquadPage() {
  const players = await getSquad(); // cached, auto-selected provider

  return (
    <div>
      <SquadGrid players={players} />
    </div>
  );
}
```

---

## Error Handling

### API-Football Error Response

When API-Football returns an error:

```json
{
  "get": "players?team=40&season=2025",
  "errors": {
    "season": "This season is not available for your plan",
    "requests": "You used all requests allowed for your plan this month."
  },
  "results": 0,
  "paging": { "current": 0, "total": 0 }
}
```

**Provider response:**

```typescript
// api-football-provider.ts
if (data.errors) {
  console.error('[api-football] Error:', data.errors);
  return []; // graceful degradation
}
```

### Mock Provider Fallback

If an API provider fails and crashes, pages can manually fall back:

```typescript
// src/app/squad/page.tsx
let players = [];
try {
  players = await getSquad();
} catch (err) {
  console.error(err);
  players = []; // show empty state or cached data
}
```

---

## Switching Providers at Runtime

To switch providers:

1. **Set environment variable:**
   ```bash
   FOOTBALL_DATA_PROVIDER=mock  # or api-football, sofascore
   ```

2. **Rebuild:**
   ```bash
   npm run build
   ```

3. **Auto-detection fallback:**
   ```bash
   # If no explicit FOOTBALL_DATA_PROVIDER, checks:
   # 1. API_FOOTBALL_KEY set? → api-football
   # 2. Nothing set? → mock
   ```

---

## Extending with a New Provider

To add a new provider (e.g., SofaScore):

### Step 1: Create Provider Class

```typescript
// src/lib/football/sofascore-provider.ts
import type { FootballDataProvider } from "./provider";

export class SofaScoreProvider implements FootballDataProvider {
  readonly name = "sofascore";

  async getSquad(): Promise<Player[]> {
    // SofaScore API call
    // Map to canonical Player type
  }

  async getFixtures(): Promise<Fixture[]> {
    // ...
  }

  // ... implement all interface methods
}
```

### Step 2: Register in Factory

```typescript
// src/lib/football/index.ts
import { SofaScoreProvider } from "./sofascore-provider";

function createProvider(): FootballDataProvider {
  const providerName = resolveProviderName();

  switch (providerName) {
    case "sofascore":
      return new SofaScoreProvider();
    case "mock":
      return new MockProvider();
    case "api-football":
    default:
      return new ApiFootballProvider();
  }
}
```

### Step 3: Set Env Var

```bash
FOOTBALL_DATA_PROVIDER=sofascore
API_SOFASCORE_KEY=xxx
```

### Step 4: Rebuild

```bash
npm run build
```

---

## Testing Providers

### Using Mock Provider in Dev

```bash
# Disable API_FOOTBALL_KEY to use mock
unset API_FOOTBALL_KEY
npm run dev

# OR explicitly
FOOTBALL_DATA_PROVIDER=mock npm run dev
```

### Validating Provider Output

Each provider must return data matching `src/lib/types/football.ts`:

```typescript
// Verify Player type
const player: Player = {
  id: number;
  name: string;
  position: string;
  number: number;
  photo?: string;
  nationality?: string;
  age?: number;
  stats: PlayerStats | null;
}
```

---

## Configuration Reference

### Environment Variables

```bash
# Explicit provider selection (optional)
FOOTBALL_DATA_PROVIDER=api-football  # or: mock, sofascore

# API keys
API_FOOTBALL_KEY=your_key_here
API_SOFASCORE_KEY=your_key_here      # future

# Auto-detection
# If FOOTBALL_DATA_PROVIDER not set:
# - API_FOOTBALL_KEY present? → use api-football
# - Nothing? → use mock
```

### Provider Selection Logic

```
┌─────────────────────────────────────┐
│ resolveProviderName()              │
└─────────────────────────────────────┘
           ↓
  Is FOOTBALL_DATA_PROVIDER set?
     ↙                          ↘
   Yes                           No
    ↓                             ↓
  Use explicit            Is API_FOOTBALL_KEY set?
  value                        ↙          ↘
                            Yes           No
                             ↓             ↓
                        api-football    mock
```

---

## Architecture Diagram

```
src/lib/football/
├── provider.ts              # Interface definition
├── index.ts                 # Factory + barrel export + React.cache wrappers
├── api-football-provider.ts # Impl: api-football.com
├── mock-provider.ts         # Impl: static mock data
├── mock-data.ts             # Constants: MOCK_SQUAD, MOCK_FIXTURES, etc.
└── sofascore-provider.ts    # Impl: sofascore.com (planned)

src/app/
└── [page].tsx               # import { getSquad } from '@/lib/football'

User visits /squad
         ↓
SquadPage (server)
         ↓
  await getSquad()  ← React.cache() wrapper
         ↓
  provider.getSquad()  ← selected at build time
         ↓
    [ApiFootballProvider | MockProvider]
         ↓
  fetch() or return mock data
         ↓
  map to canonical Player[]
         ↓
  return to component
```

