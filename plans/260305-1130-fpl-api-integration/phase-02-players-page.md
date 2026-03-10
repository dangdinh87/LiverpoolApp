---
phase: 2
title: "Players Page + Components"
status: Done
effort: 2.5h
depends: [phase-01]
completed: 2026-03-05
---

# Phase 02 — Players Page + Components

## Context
- Parent plan: [plan.md](plan.md)
- Existing squad page: `src/app/squad/page.tsx` (stays unchanged, liverpoolfc.com data)
- Design system: Dark Stadium theme (globals.css tokens)

## Overview
Create new `/players` page showing ALL Premier League players with live FPL stats. Separate from `/squad` (which is LFC-only from liverpoolfc.com). Features: sortable table, position/team filter, player detail with match-by-match history.

## Key Insights
- FPL has 820 players across 20 PL teams — need good filtering
- Rich stat data: goals, assists, xG, xA, form, minutes, cards, clean sheets, bonus
- `/element-summary/{id}/` gives per-match history + past seasons
- Player photos: `https://resources.premierleague.com/premierleague/photos/players/250x250/p{code}.png`

## Requirements

### `/players` page
1. Hero section (consistent with other pages)
2. Filter bar: Position (All/GK/DEF/MID/FWD), Team (all 20 PL teams), Search
3. Sortable stats table: Name, Team, Pos, Mins, Goals, Assists, xG, xA, Form, Points
4. Default: show Liverpool players first, sorted by total_points
5. Click player → `/players/[id]` detail page

### `/players/[id]` detail page
1. Player header: photo, name, team, position, shirt number
2. Season stats card: goals, assists, xG, xA, minutes, clean sheets, cards, form
3. Match-by-match history table (from element-summary)
4. Past seasons summary
5. Availability status (injured/suspended/available)

## Architecture

```
src/app/players/
├── page.tsx              (server — fetch FPL bootstrap, render grid)
├── loading.tsx           (skeleton)
└── [id]/
    ├── page.tsx          (server — fetch element-summary)
    └── loading.tsx       (skeleton)

src/components/players/
├── players-table.tsx     (client — sortable, filterable table)
├── player-stats-card.tsx (server — season stats display)
└── player-match-log.tsx  (client — match-by-match history)
```

## Implementation Steps

### 1. FPL-specific data helpers
- `src/lib/fpl-helpers.ts` — FPL photo URL builder, team name lookup, position mapping
- Export functions used by both provider and components

### 2. Players table component
- Client component with useState for sort/filter
- Columns: Name, Team, Pos, Mins, G, A, xG, xA, CS, YC, Form, Pts
- Click header to sort (asc/desc toggle)
- Position filter chips + Team dropdown + Search input
- Pagination or virtual scroll for 820 players

### 3. `/players` page
- Server component, fetch bootstrap data via FPL provider
- Pass to PlayersTable client component
- Revalidate: 30min

### 4. Player detail page
- Fetch element-summary for match history
- Stats card with key metrics
- Match log table: GW, Opponent, Score, Mins, G, A, xG, Pts
- Past seasons accordion
- Injury/availability badge

### 5. Navigation update
- Add "Players" link to navbar (between Squad and Fixtures)

## Todo
- [ ] Create FPL helper utilities
- [ ] Build PlayersTable component (sortable/filterable)
- [ ] Create /players page.tsx + loading.tsx
- [ ] Build PlayerStatsCard component
- [ ] Build PlayerMatchLog component
- [ ] Create /players/[id] page.tsx + loading.tsx
- [ ] Add Players to navbar
- [ ] Responsive design check

## Success Criteria
- `/players` shows all 820 PL players with filtering
- Sort by any stat column works
- `/players/[id]` shows full player detail + match history
- Liverpool players highlighted/default filtered
- Consistent with Dark Stadium design
- Mobile responsive

## Risk
- 820 players = large table, may need pagination
- FPL player photos may not all be available
- element-summary endpoint latency unknown
