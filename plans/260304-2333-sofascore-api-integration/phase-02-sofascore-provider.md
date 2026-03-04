# Phase 02: SofaScore Provider Implementation

## Context Links

- Provider interface: [Phase 01](./phase-01-provider-abstraction.md)
- SofaScore endpoints research: [researcher-03](./research/researcher-03-sofascore-endpoints.md)
- Existing types: `src/lib/types/football.ts`
- Plan overview: [plan.md](./plan.md)

## Overview

Implement `SofaScoreProvider` class in `src/lib/football/sofascore-provider.ts`. This uses reverse-engineered SofaScore endpoints and maps their response shapes to canonical types in `football.ts`. **No API key needed** — SofaScore uses no auth, but requires User-Agent rotation and aggressive rate-limit handling.

## Key Insights

### SofaScore API Structure (Reverse-Engineered)

- **Base URL**: `https://www.sofascore.com/api/v1`
- **Auth**: None (unauthenticated, Cloudflare-protected)
- **Rate limit**: ~25-30 req/min before IP ban (503/1015 errors)
- **Ban duration**: 10s to 24h depending on severity

### Liverpool FC Identifiers

```typescript
const SOFA_CONFIG = {
  BASE_URL: "https://www.sofascore.com/api/v1",
  TEAM_ID: 44,           // Liverpool FC (API-Football uses 40)
  TOURNAMENT_ID: 17,     // Premier League (API-Football uses league 39)
  SEASON_ID: 52186,      // 2024-25 season (approx, needs runtime check)
} as const;
```

### Endpoint Mapping

| App Function | SofaScore Endpoint | Available? |
|-------------|-------------------|------------|
| `getStandings` | `/unique-tournament/17/season/{sid}/standings/total` | Yes |
| `getFixtures` | `/team/44/events` | Yes |
| `getFixtureEvents` | `/event/{eventId}` (includes incidents) | Yes |
| `getFixtureLineups` | `/event/{eventId}/lineups` | Yes |
| `getFixtureStatistics` | `/event/{eventId}/statistics` | Yes |
| `getTopScorers` | `/unique-tournament/17/season/{sid}/statistics?order=-goals` | Yes |
| `getTopAssists` | `/unique-tournament/17/season/{sid}/statistics?order=-assists` | Yes |
| `getPlayerStats` | `/player/{playerId}/unique-tournament/17/season/{sid}/rating` | Partial |
| `getSquad` | `/team/44/players` (undocumented) | Partial |
| `getTeamInfo` | `/team/44` | Yes |
| `getCoach` | `/team/44` (includes manager) | Partial |
| `getInjuries` | No endpoint available | **NO** |

### Coverage Gaps

- `getInjuries` — no SofaScore endpoint. Return `[]` (UI already handles empty state)
- `getSquad` — `/team/44/players` may not return full squad details (age, number, etc.)
- `getCoach` — Team endpoint includes manager name but limited career history
- `getPlayerStats` — Rating endpoint gives per-match rating, not full stat breakdown

## Requirements

- [ ] Implement `SofaScoreProvider` class conforming to `FootballDataProvider` interface
- [ ] Build `sofaFetch<T>()` fetcher with User-Agent rotation + exponential backoff
- [ ] Map all SofaScore response shapes → canonical `football.ts` types
- [ ] Handle 503/1015 Cloudflare errors gracefully (exponential backoff → mock fallback)
- [ ] Use very aggressive ISR revalidation (6-24h) to minimize requests
- [ ] Discover season ID dynamically via `/unique-tournament/17/seasons`

## Architecture

### User-Agent Rotation

```typescript
const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
];

function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}
```

### Core Fetcher with Backoff

```typescript
async function sofaFetch<T>(path: string, revalidate: number): Promise<T> {
  const url = `${SOFA_CONFIG.BASE_URL}${path}`;

  const res = await fetch(url, {
    headers: { "User-Agent": randomUA() },
    next: { revalidate },
  });

  // Cloudflare rate-limit responses
  if (res.status === 503 || res.status === 1015 || res.status === 403) {
    console.error(`[sofascore] Rate limited (${res.status}) on ${path}`);
    throw new Error(`SofaScore rate limited: ${res.status}`);
  }

  if (!res.ok) {
    throw new Error(`[sofascore] ${res.status} ${path}`);
  }

  return res.json();
}
```

### Response Shape Mapping Examples

**Standings mapping** (SofaScore → canonical `Standing`):

```typescript
interface SofaStandingRow {
  position: number;
  team: { id: number; name: string; slug: string };
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  scoresFor: number;
  scoresAgainst: number;
}

function mapStanding(row: SofaStandingRow): Standing {
  return {
    rank: row.position,
    team: {
      id: row.team.id,
      name: row.team.name,
      logo: `https://api.sofascore.app/api/v1/team/${row.team.id}/image`,
    },
    points: row.points,
    goalsDiff: row.scoresFor - row.scoresAgainst,
    group: null,
    form: null, // SofaScore standings may not include form string
    status: null,
    description: null,
    all: {
      played: row.matches,
      win: row.wins,
      draw: row.draws,
      lose: row.losses,
      goals: { for: row.scoresFor, against: row.scoresAgainst },
    },
    home: { played: 0, win: 0, draw: 0, lose: 0, goals: { for: 0, against: 0 } },
    away: { played: 0, win: 0, draw: 0, lose: 0, goals: { for: 0, against: 0 } },
  };
}
```

**Fixture mapping** (SofaScore event → canonical `Fixture`):

```typescript
interface SofaEvent {
  id: number;
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
  homeScore: { current?: number; display?: number };
  awayScore: { current?: number; display?: number };
  status: { code: number; description: string };
  startTimestamp: number; // Unix timestamp
  tournament: { uniqueTournament: { id: number; name: string } };
  roundInfo?: { round: number };
}

// Status code mapping (SofaScore status.code → canonical FixtureStatus)
const SOFA_STATUS_MAP: Record<number, { long: string; short: string }> = {
  0: { long: "Not Started", short: "NS" },
  6: { long: "First Half", short: "1H" },
  7: { long: "Second Half", short: "2H" },
  31: { long: "Half Time", short: "HT" },
  100: { long: "Match Finished", short: "FT" },
  110: { long: "After Extra Time", short: "AET" },
  120: { long: "After Penalties", short: "PEN" },
  70: { long: "Cancelled", short: "CANC" },
  60: { long: "Postponed", short: "PST" },
};
```

**Team logo URL pattern:**
```
https://api.sofascore.app/api/v1/team/{teamId}/image
```

**Tournament logo URL pattern:**
```
https://api.sofascore.app/api/v1/unique-tournament/{tournamentId}/image
```

### Season ID Discovery

```typescript
// Run once at startup/build, cache forever
async function discoverSeasonId(): Promise<number> {
  const data = await sofaFetch<{ seasons: Array<{ id: number; year: string }> }>(
    `/unique-tournament/${SOFA_CONFIG.TOURNAMENT_ID}/seasons`,
    86400 // 24h cache
  );
  // Get latest season
  return data.seasons[0]?.id ?? SOFA_CONFIG.SEASON_ID;
}
```

## Related Code Files

| File | Role | Change |
|------|------|--------|
| `src/lib/football/provider.ts` | Interface | From Phase 01, no change |
| `src/lib/football/sofascore-provider.ts` | **NEW** | This phase's main deliverable |
| `src/lib/types/football.ts` | Types | UNCHANGED — provider maps to these |

## Implementation Steps

1. **Create `sofascore-provider.ts`** with class skeleton implementing interface
2. **Implement `sofaFetch<T>()`** — core fetcher with UA rotation + error handling
3. **Implement `discoverSeasonId()`** — dynamic season ID lookup
4. **Implement `getStandings()`** — map standings endpoint, use 12h revalidate
5. **Implement `getFixtures()`** — map team events, use 6h revalidate
6. **Implement `getFixtureEvents()`** — map event incidents (goals, cards, subs)
7. **Implement `getFixtureLineups()`** — map event lineups
8. **Implement `getFixtureStatistics()`** — map event statistics
9. **Implement `getTopScorers()` + `getTopAssists()`** — statistics endpoint with sort
10. **Implement `getTeamInfo()`** — map `/team/44` response
11. **Stub `getSquad()`, `getPlayerStats()`, `getCoach()`** — partial data + fallback
12. **Stub `getInjuries()`** — return `[]`
13. **Add inline JSDoc** explaining each mapping + risk warnings

## Todo List

- [ ] Create `src/lib/football/sofascore-provider.ts`
- [ ] Implement `sofaFetch` with UA rotation + backoff
- [ ] Implement season ID discovery
- [ ] Implement `getStandings()` with mapping
- [ ] Implement `getFixtures()` with status code mapping
- [ ] Implement `getFixtureEvents()`, `getFixtureLineups()`, `getFixtureStatistics()`
- [ ] Implement `getTopScorers()` + `getTopAssists()`
- [ ] Implement `getTeamInfo()`
- [ ] Stub `getSquad()`, `getPlayerStats()`, `getCoach()`, `getInjuries()`
- [ ] Add JSDoc + risk warnings on class/methods

## Success Criteria

1. `FOOTBALL_DATA_PROVIDER=sofascore npm run build` passes
2. Standings page renders correct league table from SofaScore data
3. Fixtures page renders matches with correct dates, scores, statuses
4. No more than 10 requests made during a full build (aggressive caching)
5. 503/1015 errors logged, not thrown to user (LRU fallback from Phase 03 handles it)

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| IP ban during build/dev | High | High | 12-24h revalidate, sequential requests, never parallel |
| Endpoint URL changes | Medium | High | Isolate all paths in config constants, easy to update |
| Status code mapping incomplete | Medium | Medium | Default to "NS" for unknown codes |
| Season ID changes yearly | Certain | Low | Dynamic discovery via `/seasons` endpoint |
| Player photo URLs change | Low | Medium | Team image endpoint is stable |
| Response shape changes | Medium | High | TypeScript mapping catches at build time |

## Security Considerations

- No API keys needed (SofaScore is unauthenticated)
- UA strings are not sensitive; rotation is for ban avoidance
- SofaScore data usage may violate their ToS — user has accepted this risk
- No user-facing error messages should expose SofaScore endpoint URLs

## Next Steps

Proceed to [Phase 03](./phase-03-advanced-caching.md) to add multi-layer caching with SofaScore-specific throttling.
