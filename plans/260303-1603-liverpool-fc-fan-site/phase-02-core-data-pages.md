# Phase 02 -- Core Data Pages (Squad, Fixtures, Standings)

## Context
- [plan.md](./plan.md) | Phase 2 of 5 | Effort: 4h
- Depends on: Phase 01 (project setup, Supabase, layout)

## Overview
Build API-Football proxy routes, TypeScript client library, and three data-driven pages: `/squad`, `/player/[id]`, `/fixtures`, `/standings`. All use ISR caching to stay within 100 req/day free tier.

## Key Insights
- API-Football free tier = 100 req/day. With ISR (squad 24h, fixtures 1h, standings 6h), daily requests stay under 20
- Proxy via `/api/football/` route handlers keeps API key server-side
- Team ID 40 (Liverpool), League 39 (PL), Season 2024 are hardcoded constants
- Squad endpoint returns all players with position, number, photo -- sufficient for grid + detail

## Requirements
- API-Football key (v3, free tier)
- Phase 01 complete (layout, Tailwind tokens, Supabase)

## Architecture
- `src/lib/api-football.ts`: typed fetch wrapper, exports functions like `getSquad()`, `getFixtures()`, `getStandings()`
- Route handlers in `src/app/api/football/[endpoint]/route.ts` proxy requests with API key from env
- Pages use `fetch()` to internal API routes with `next: { revalidate: N }` for ISR
- Alternative: call `api-football.ts` directly in server components (simpler, avoids extra hop)

## Related Code Files
- `src/lib/api-football.ts` -- API client with types + fetch helpers
- `src/lib/types/football.ts` -- Player, Fixture, Standing, TeamStats interfaces
- `src/app/squad/page.tsx` -- squad grid page (ISR 24h)
- `src/app/player/[id]/page.tsx` -- player detail (ISR 24h)
- `src/app/fixtures/page.tsx` -- fixture timeline (ISR 1h)
- `src/app/standings/page.tsx` -- standings with progress bars (ISR 6h)
- `src/components/squad/player-card.tsx` -- card with jersey watermark
- `src/components/squad/squad-grid.tsx` -- filterable grid
- `src/components/fixtures/fixture-timeline.tsx` -- horizontal timeline
- `src/components/fixtures/match-card.tsx` -- single match display
- `src/components/standings/standings-table.tsx` -- progress bar rows

## Implementation Steps

### 1. Define TypeScript types (`src/lib/types/football.ts`) (20min)
- `Player`: id, name, age, number, position, photo, nationality, height, weight
- `PlayerStats`: games.appearances, goals.total, goals.assists, cards.yellow, cards.red
- `Fixture`: id, date, venue, status (FT/NS/LIVE), teams (home/away with name, logo, goals), league, score
- `Standing`: rank, team (id, name, logo), points, played, win, draw, lose, goalsFor, goalsAgainst, goalsDiff, form (string like "WWDLW")
- Map from API-Football response shapes to these clean types

### 2. Build API client (`src/lib/api-football.ts`) (30min)
- Base URL: `https://v3.football.api-sports.io`
- Headers: `x-apisports-key: process.env.API_FOOTBALL_KEY`
- Constants: `TEAM_ID = 40`, `LEAGUE_ID = 39`, `SEASON = 2024`
- Functions: `getSquad()` -> `/players/squads?team=40`, `getFixtures()` -> `/fixtures?team=40&season=2024`, `getStandings()` -> `/standings?league=39&season=2024`, `getPlayerStats(playerId)` -> `/players?id={id}&season=2024`
- Each function maps raw API response to typed interfaces
- Server-only (use `import 'server-only'` guard)

### 3. Build `/squad` page (45min)
- Server component, call `getSquad()` with `revalidate: 86400` (24h)
- `SquadGrid`: CSS grid (3-4 cols desktop, 2 mobile), filter buttons top (All, GK, DEF, MID, FWD)
- Filter is client-side (`'use client'` wrapper around filter state)
- `PlayerCard`: dark glass card, player photo centered, jersey number as Bebas Neue watermark (absolute positioned, text-[120px], opacity-5), name + position bottom. Link to `/player/[id]`

### 4. Build `/player/[id]` page (30min)
- Dynamic route, `generateStaticParams` from squad list for static generation
- Call `getPlayerStats(id)` with `revalidate: 86400`
- Layout: left column = large photo + basic info (nationality flag, age, height); right column = season stats grid (appearances, goals, assists, cards) using Bebas Neue big numbers
- Back button to `/squad`

### 5. Build `/fixtures` page (45min)
- Server component, call `getFixtures()` with `revalidate: 3600` (1h)
- `FixtureTimeline`: vertical timeline (line down center on desktop, left-aligned mobile)
- Each `MatchCard`: date label, home/away logos + names + score, competition badge
- Color code: green dot = W, yellow = D, red = L, gray = upcoming (NS)
- Filter tabs: All, Premier League, Champions League, FA Cup, etc.
- Separate upcoming vs results sections

### 6. Build `/standings` page (30min)
- Server component, call `getStandings()` with `revalidate: 21600` (6h)
- Table with columns: Pos, Team, P, W, D, L, GD, Pts
- Points column also rendered as progress bar (max width = leader's points)
- Liverpool row (team.id === 40): highlighted with `border-l-4 border-liverpool-red bg-liverpool-red/10`
- Form column: 5 colored circles (W=green, D=yellow, L=red)

## Todo List
- [x] Define TypeScript interfaces for Player, Fixture, Standing
- [x] Build api-football.ts client with all 4 fetch functions
- [x] Build PlayerCard component with jersey watermark
- [x] Build SquadGrid with position filter
- [x] Build /squad page with ISR 24h
- [x] Build /player/[id] page with stats layout
- [x] Build MatchCard + FixtureTimeline components
- [x] Build /fixtures page with competition filter, ISR 1h
- [x] Build StandingsTable with progress bars
- [x] Build /standings page with Liverpool highlight, ISR 6h

## Phase 02 Review — 2026-03-03
**Status: Complete. Score 8.5/10.**
Build passes. 0 TypeScript errors. 1 ESLint warning.

### Open Fixes (from code review)
- [ ] **[High]** `next/image` onError in `player-card.tsx:50` — use useState fallback, confirm `/public/player-placeholder.png` exists
- [ ] **[Medium]** Progress bar uses magic number `75` instead of `maxPoints` in `standings-table.tsx:145` — fix + clears ESLint warning
- [ ] **[Medium]** Move `getMatchResult` from `football.ts` to a utils file (business logic in types file)
- [ ] **[Medium]** `POSITION_ORDER` defined inside render in `squad-grid.tsx` — move to module scope
- [ ] **[Medium]** Ordinal suffix logic wrong for ranks 11–13 in `standings/page.tsx:36`
- [ ] **[Low]** Add `"P"` status to live detection in `match-card.tsx:30`
- [ ] **[Low]** Add `aria-label` to position/competition filter buttons

Report: `/Users/nguyendangdinh/LiverpoolApp/plans/reports/code-reviewer-260303-1705-phase-02-core-data-pages.md`

## Success Criteria
- `/squad` shows all Liverpool players in grid, filterable by position
- `/player/[id]` shows individual stats with big Bebas numbers
- `/fixtures` displays timeline with colored W/D/L indicators
- `/standings` shows full PL table, Liverpool row highlighted, progress bars
- Pages revalidate at configured intervals; no API key exposed client-side

## Risk Assessment
- **API-Football rate limit**: If 100/day exceeded, pages serve stale ISR cache (graceful degradation). Add `try/catch` with fallback messaging.
- **API response shape changes**: Types act as contract; mapping layer isolates changes to `api-football.ts`
- **Large squad images**: Use `next/image` with `width/height` + `loading="lazy"` for non-visible cards

## Security Considerations
- `API_FOOTBALL_KEY` only accessed in server components/route handlers via `process.env`
- `import 'server-only'` in `api-football.ts` prevents accidental client bundle inclusion
- No user input passed directly to API queries (all params are hardcoded constants)

## Next Steps
Proceed to [Phase 03](./phase-03-homepage-stats-news.md) -- Homepage, Stats & News
