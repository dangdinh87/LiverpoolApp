# Phase 02 — Season Overview Section

## Context
- [plan.md](./plan.md) — overall plan
- [phase-01-data-layer.md](./phase-01-data-layer.md) — `SeasonStats.overview` shape
- Current page: `src/app/stats/page.tsx` — hero + 3 count-up numbers
- Existing: `src/components/stats/stat-number.tsx` — reusable count-up component

## Overview
Replace the current 3-number headline with a richer season overview: 8 headline stats in a responsive grid, plus a form streak badge. Keep existing hero banner. Refactor page to fetch fixtures + standings alongside scorers.

## Key Insights
- `StatNumber` already supports `value`, `label`, `suffix`, `highlight` — reuse directly
- PL points + rank come from `getStandings()` (LFC row) — no extra call since standings page fetches same
- Home/away split already in `Standing.home` / `Standing.away` — can show as sub-stats
- `dynamic = "force-dynamic"` already set on page — fine for server data fetching

## Requirements
1. Refactor `page.tsx` to call `getFixtures()` + `getStandings()` + `computeSeasonStats()`
2. New `<SeasonOverview>` client component with 8 stat cards in grid
3. Keep hero banner (same design, update subtitle to include "All Competitions")
4. Add form streak badge (e.g., "W5" or "Unbeaten 8") below headline numbers
5. Mobile: 2-col grid. Tablet: 4-col. Desktop: 4-col.

## Architecture

### Page data flow (server)
```typescript
// page.tsx
const [scorers, assists, fixtures, standings] = await Promise.all([
  getTopScorers(), getTopAssists(), getFixtures(), getStandings(),
]);
const seasonStats = computeSeasonStats(fixtures, standings);
```

### Component: `src/components/stats/season-overview.tsx`
```typescript
"use client";
interface SeasonOverviewProps {
  stats: SeasonOverview;
}
// Renders 8 StatNumber cards in grid:
// Row 1: Played | Wins | Draws | Losses
// Row 2: Goals For | Goals Against | Clean Sheets | Points
// + Form streak badge below
```

### Stat card layout
Each stat uses existing `StatNumber` but with smaller sizing variant. Add a `size` prop to `StatNumber`:
- `size="lg"` — current 8xl/9xl (keep for hero highlights if desired)
- `size="md"` — 5xl/6xl (new default for overview grid)

OR: create a simpler `<StatCard>` with label + number + optional delta indicator. Simpler approach — avoids modifying existing component.

**Decision: Create `StatCard` (KISS).** `StatNumber` has complex count-up animation that's great for 3 big numbers but overkill for 8 smaller ones. A lightweight `StatCard` with Framer Motion fade-in is better for the grid.

### StatCard design
```
┌──────────────────┐
│  42               │  ← font-bebas text-4xl, lfc-red if highlight
│  Matches Played   │  ← font-barlow text-xs uppercase, stadium-muted
└──────────────────┘
```
bg-stadium-surface, border-stadium-border, p-4, text-center.

## Related Code Files
- `src/app/stats/page.tsx` — refactor data fetching
- `src/components/stats/stat-number.tsx` — keep for top scorers section
- `src/lib/football/season-stats.ts` — Phase 01 output
- `src/lib/football/index.ts` — getFixtures, getStandings exports

## Implementation Steps

1. Create `src/components/stats/season-overview.tsx` ("use client")
   - Accept `SeasonOverview` props
   - Render 8-card grid with `StatCard` sub-component
   - Add form streak badge (pill with W/D/L colored background)
   - Framer Motion stagger animation on scroll into view
2. Create inline `StatCard` within same file (no separate file — YAGNI)
3. Refactor `src/app/stats/page.tsx`:
   - Add `getFixtures()`, `getStandings()` to Promise.all
   - Call `computeSeasonStats(fixtures, standings)`
   - Replace existing 3-number grid with `<SeasonOverview stats={seasonStats.overview} />`
   - Keep existing hero banner unchanged
   - Keep existing `StatNumber` headline numbers (3 top) — now placed AFTER overview
   - Move LFC scorers table into separate client component `<LfcScorersTable>`
4. Add i18n keys for 8 stat labels (Phase 06 handles translations, but add EN keys now)

## Todo
- [ ] Create `season-overview.tsx` with StatCard grid
- [ ] Add form streak badge component
- [ ] Refactor page.tsx data fetching (add fixtures + standings)
- [ ] Wire `computeSeasonStats()` into page
- [ ] Extract LFC scorers table to separate component
- [ ] Add Stats.overview i18n keys to en.json
- [ ] Test empty state (no fixtures)

## Success Criteria
- 8 headline numbers visible in a clean responsive grid
- Form streak badge shows current run (e.g., "5 Unbeaten")
- Page still shows existing charts + scorers table below
- No extra API calls — data derived from fixtures + standings
- Mobile 2-col, tablet/desktop 4-col grid

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| Standings empty (no API key) | Points/rank show 0 | Show "—" for unavailable data |
| Too many numbers overwhelming on mobile | Poor UX | 2-col grid on mobile, larger cards |

## Next Steps
Phase 03 adds interactive performance charts below the overview section.
