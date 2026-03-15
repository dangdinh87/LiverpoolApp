# Phase 01 — Data Layer: `computeSeasonStats()`

## Context
- [plan.md](./plan.md) — overall plan
- Types: `src/lib/types/football.ts` — `Fixture`, `Standing`, `getMatchResult()`
- Data barrel: `src/lib/football/index.ts` — `getFixtures()`, `getStandings()`
- LFC canonical team ID: `40`

## Overview
Create a pure utility function that takes existing data (fixtures + standings) and computes all derived season statistics. No API calls. Returns a typed `SeasonStats` object consumed by all new UI sections.

## Key Insights
- `getMatchResult()` already exists in `football.ts` — handles FT status check + LFC perspective
- Fixtures contain `score.halftime` — enables comeback win detection
- `league.name` field allows competition filtering (PL, UCL, FA Cup, etc.)
- Standings `home`/`away` splits already available from FDO — no need to recompute
- All fixtures are for LFC only (the `/teams/64/matches` endpoint) — simplifies logic

## Requirements
1. `SeasonStats` type covering all sections' data needs
2. `computeSeasonStats(fixtures, standings)` pure function
3. `computeMonthlyGoals(fixtures)` for chart data
4. `computeStreaks(fixtures)` for records section
5. `computeCompetitionStats(fixtures)` for competition breakdown
6. Unit-testable — pure functions with no side effects

## Architecture

### New file: `src/lib/football/season-stats.ts`
```typescript
import "server-only";
import type { Fixture, Standing } from "@/lib/types/football";
import { getMatchResult } from "@/lib/types/football";

// ── Types ──
export interface SeasonStats {
  overview: SeasonOverview;
  monthly: MonthlyGoals[];
  competitions: CompetitionStats[];
  records: SeasonRecords;
  formTimeline: FormEntry[];
}

export interface SeasonOverview {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  cleanSheets: number;
  points: number;         // from standings
  rank: number;           // from standings
  form: string | null;    // from standings
  homeRecord: { w: number; d: number; l: number; gf: number; ga: number };
  awayRecord: { w: number; d: number; l: number; gf: number; ga: number };
}

export interface MonthlyGoals {
  month: string;     // "2025-08"
  label: string;     // "Aug"
  scored: number;
  conceded: number;
  matches: number;
}

export interface CompetitionStats {
  name: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
}

export interface SeasonRecords {
  biggestWin: { fixture: Fixture; diff: number } | null;
  biggestLoss: { fixture: Fixture; diff: number } | null;
  highestScoring: { fixture: Fixture; total: number } | null;
  currentStreak: { type: "W" | "D" | "unbeaten"; count: number };
  longestWinStreak: number;
  longestUnbeatenStreak: number;
  comebackWins: number;
  scoringFirst: { wins: number; total: number };
}

export interface FormEntry {
  date: string;
  opponent: string;
  result: "W" | "D" | "L";
  score: string;       // "3-1"
  competition: string;
}
```

### Core function logic
```typescript
export function computeSeasonStats(fixtures: Fixture[], standings: Standing[]): SeasonStats {
  const LFC_ID = 40;
  const finished = fixtures
    .filter(f => f.fixture.status.short === "FT")
    .sort((a, b) => a.fixture.date.localeCompare(b.fixture.date));

  const lfcStanding = standings.find(s => s.team.id === LFC_ID);

  // overview — derive from finished fixtures
  // monthly — group by YYYY-MM, sum goals
  // competitions — group by league.name
  // records — iterate finished for max/min diffs, streaks
  // formTimeline — map finished to W/D/L entries
  return { overview, monthly, competitions, records, formTimeline };
}
```

### Helper: getLfcGoals(fixture)
Extract LFC goals scored/conceded from any fixture:
```typescript
function getLfcGoals(f: Fixture): { scored: number; conceded: number } {
  const isHome = f.teams.home.id === 40;
  return {
    scored: (isHome ? f.goals.home : f.goals.away) ?? 0,
    conceded: (isHome ? f.goals.away : f.goals.home) ?? 0,
  };
}
```

## Related Code Files
- `src/lib/types/football.ts` — Fixture, Standing, getMatchResult types
- `src/lib/football/index.ts` — barrel exports (getFixtures, getStandings)
- `src/app/stats/page.tsx` — will consume SeasonStats in Phase 02

## Implementation Steps

1. Create `src/lib/football/season-stats.ts` with `"server-only"` guard
2. Define all interfaces (`SeasonStats`, `SeasonOverview`, etc.)
3. Implement `getLfcGoals()` helper
4. Implement `computeSeasonStats()`:
   - Filter finished fixtures, extract LFC standing
   - Compute overview (W/D/L/GF/GA/CS) from fixtures, points/rank from standing
   - Group fixtures by month for `MonthlyGoals[]`
   - Group fixtures by `league.name` for `CompetitionStats[]`
   - Iterate chronologically for streaks, biggest win/loss, comebacks
   - Map to `FormEntry[]` for timeline
5. Export `computeSeasonStats` from barrel `index.ts`
6. Add unit tests in `src/lib/football/__tests__/season-stats.test.ts` (optional)

## Todo
- [ ] Create `src/lib/football/season-stats.ts`
- [ ] Define `SeasonStats` + sub-interfaces
- [ ] Implement `computeSeasonStats()`
- [ ] Implement streak calculation (win streak, unbeaten streak)
- [ ] Implement comeback detection (losing at HT, winning at FT)
- [ ] Export from barrel `index.ts`
- [ ] Verify with mock fixtures data

## Success Criteria
- `computeSeasonStats()` returns correct stats for sample fixture data
- Zero additional API calls — pure computation only
- All chart sections have data they need from one function call
- Graceful handling of empty arrays (returns zeroed stats, not errors)

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| Halftime scores null for some fixtures | Comeback detection skipped | Guard with null check, count only when HT data available |
| ESPN cup fixtures have different `league.name` | Wrong grouping | Normalize: "EFL Cup" → "Carabao Cup" mapping |
| Fixtures include non-FT statuses (PST, CANC) | Inflated counts | Pre-filter by `status.short === "FT"` |

## Next Steps
Phase 02 uses `SeasonStats.overview` for the hero + headline numbers section.
