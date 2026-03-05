---
phase: 1
title: "FPL Provider + Provider Cleanup"
status: Done
completed: 2026-03-05
effort: 2h
depends: []
---

# Phase 01 — FPL Provider + Provider Cleanup

## Context
- Parent plan: [plan.md](plan.md)
- Provider interface: `src/lib/football/provider.ts`
- Types: `src/lib/types/football.ts`

## Overview
1. Implement `FplProvider` class conforming to `FootballDataProvider` interface
2. Delete `api-football-provider.ts` + `sofascore-provider.ts` (deprecated)
3. Wire FPL as default provider

## Key Insights
- FPL `/bootstrap-static/` returns ALL data in 1 call (~1.8MB) — cache & reuse
- Liverpool FPL team_id=12, remap to canonical 40
- Player positions: element_type 1=GK, 2=DEF, 3=MID, 4=FWD
- Fixture stats include goal scorers with player element IDs
- No lineups endpoint — `getFixtureLineups()` returns `[]`
- No venue data — fixture venue returns null

## Requirements
1. Create `src/lib/football/fpl-provider.ts` implementing all 12 interface methods
2. Delete `api-football-provider.ts` (free tier blocked 2025+, 100req/day)
3. Delete `sofascore-provider.ts` (geo-blocked from Vietnam)
4. Update `index.ts` barrel — only fpl + mock
5. Update `.env` — remove `API_FOOTBALL_KEY`, set `FOOTBALL_DATA_PROVIDER=fpl`
6. Remove `api-football.ts` (old monolithic file) if still exists

## Architecture

### Bootstrap Cache Pattern
```typescript
// Single fetch for /bootstrap-static/, cached 30min via ISR
// All methods reuse this cached data — avoids multiple API calls
private bootstrap: BootstrapData | null = null;
private async getBootstrap(): Promise<BootstrapData> { ... }
```

### ID Mapping
| FPL | Canonical | Notes |
|-----|-----------|-------|
| team_id=12 | 40 | Liverpool |
| element_type 1-4 | GK/DEF/MID/FWD | Position mapping |
| element.id | player.id | Direct use (no remap) |
| fixture.id | fixture.id | Direct use |

## Implementation Steps

### 1. Create FPL fetcher + types
- `fplFetch<T>(path, revalidate)` with 10s timeout
- Internal FPL response types (FplBootstrap, FplFixture, FplElement, FplTeam, FplEvent)
- Team ID mapping helper

### 2. Implement FplProvider class
- `getSquad()` — filter elements by team=12, map to Player[]
- `getFixtures()` — map FPL fixtures to Fixture[], filter Liverpool matches
- `getStandings()` — derive from teams[] in bootstrap (position, points, W/D/L)
- `getTopScorers()` — sort all elements by goals_scored desc, top 20
- `getTopAssists()` — sort all elements by assists desc, top 20
- `getPlayerStats(id)` — find element, fetch /element-summary/{id}/ for history
- `getFixtureEvents(id)` — extract goals/cards from fixture.stats[]
- `getFixtureLineups(id)` — return [] (not available)
- `getFixtureStatistics(id)` — return [] (not available)
- `getInjuries()` — filter elements with status != 'a' and news set
- `getTeamInfo()` — map Liverpool team from bootstrap
- `getCoach()` — return null (not in FPL)

### 3. Cleanup deprecated providers
- Delete `api-football-provider.ts`
- Delete `sofascore-provider.ts`
- Delete `src/lib/api-football.ts` (old monolithic, if exists)
- Update `index.ts` — remove imports, simplify switch to fpl + mock
- Clean `.env` — remove `API_FOOTBALL_KEY`

### 4. TypeScript check + build verification

## Todo
- [x] Create fpl-provider.ts with all 12 methods
- [x] Delete api-football-provider.ts + sofascore-provider.ts
- [x] Update index.ts — fpl + mock only
- [x] Update .env
- [x] TypeScript check passes
- [ ] Build passes (not verified — hook blocked)

## Known Issues (from code review)
- `PL_LOGO` constant (line 17) is actually LFC badge t14 — used incorrectly as league.logo in fixtures
- Assist heuristic in getFixtureEvents mixes home/away, may credit wrong team
- `server-only` guard missing from fpl-provider.ts directly (only in index.ts)
- `.env.example` still has stale `API_FOOTBALL_KEY`; `FOOTBALL_DATA_ORG_KEY` not yet added
- `getStandings()` returns [] until fdo-standings.ts is implemented (Phase 03)
- Review report: plans/reports/code-reviewer-260305-1148-phase01-fpl-provider.md

## Success Criteria
- All 12 provider methods return correctly typed data
- `tsc --noEmit` passes clean
- `next build` succeeds
- No references to api-football or sofascore in active code
- FPL API calls have 10s timeout
- Bootstrap data cached, reused across methods

## Risk Assessment
- FPL rate limits unknown — mitigate with aggressive caching (30min bootstrap)
- FPL may change response shape — types are internal, easy to update
- No lineups/venue — acceptable, return empty/null

## Security
- No API keys needed (FPL is public)
- Server-only module (import "server-only")
