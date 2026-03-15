# Phase 04 — Competition Breakdown

## Context
- [plan.md](./plan.md) — overall plan
- [phase-01-data-layer.md](./phase-01-data-layer.md) — `CompetitionStats[]` shape
- Competition logos: `public/assets/lfc/premier-league.svg`, `champions-league.png`, `fa-cup.png`, `carabao-cup.png`
- Fixture `league.name` values: "Premier League", "UEFA Champions League", "FA Cup", "Carabao Cup"/"EFL Cup"

## Overview
Display per-competition stats in a card grid. Each card shows W/D/L record, goals for/against, and a small win rate bar for one competition. Visual at a glance — which competition is LFC performing best in?

## Key Insights
- `CompetitionStats[]` from Phase 01 groups fixtures by `league.name`
- Competition logos already exist locally — use them for visual identity
- "EFL Cup" and "Carabao Cup" may appear as different names — normalize in Phase 01
- Some competitions may have very few matches (e.g., 2 FA Cup games) — still show card
- Total across all comps should match the season overview numbers

## Requirements
1. `<CompetitionBreakdown>` client component
2. Grid of competition cards (2-col mobile, 4-col desktop)
3. Each card: competition logo + name, W/D/L, GF-GA, win rate progress bar
4. Cards sorted by number of matches played (descending)
5. Empty state if no finished fixtures

## Architecture

### File: `src/components/stats/competition-breakdown.tsx`
```typescript
"use client";
import type { CompetitionStats } from "@/lib/football/season-stats";

interface Props {
  competitions: CompetitionStats[];
}

// Card layout:
// ┌─────────────────────┐
// │ [logo] Premier League│
// │                      │
// │  12W  3D  1L         │  ← font-bebas numbers, colored
// │  ━━━━━━━━━━━━━━━     │  ← win rate bar (green fill)
// │  32 GF  ·  10 GA     │  ← goals summary
// └─────────────────────┘
```

### Competition logo mapping
```typescript
const COMP_LOGOS: Record<string, string> = {
  "Premier League": "/assets/lfc/premier-league.svg",
  "UEFA Champions League": "/assets/lfc/champions-league.png",
  "FA Cup": "/assets/lfc/fa-cup.png",
  "Carabao Cup": "/assets/lfc/carabao-cup.png",
  "EFL Cup": "/assets/lfc/carabao-cup.png",
};
```

### Win rate bar
Simple div with percentage width. Green portion = wins / played * 100.
Amber = draws. No loss segment needed (implied).
```
[████████████░░░░░]  75% win rate
 green(W)  amber(D)  empty(L)
```

## Related Code Files
- `src/lib/football/season-stats.ts` — `CompetitionStats[]`
- `src/lib/football/fdo-matches.ts` — `COMP_LOGO` mapping (reference)
- `src/app/stats/page.tsx` — renders this component

## Implementation Steps

1. Create `src/components/stats/competition-breakdown.tsx`
   - Accept `CompetitionStats[]` as props
   - Map to sorted card grid
   - Each card: Image (competition logo, 24x24), name, W/D/L row, win rate bar, GF/GA
2. Add competition logo mapping (or import from shared constant)
3. Style win rate bar:
   - Container: `bg-stadium-surface2 h-2 rounded-full overflow-hidden`
   - Win segment: `bg-green-500`, Draw segment: `bg-amber-500`
   - Width calculated as percentage of played
4. Add to page.tsx after performance charts section
5. Add section header: "By Competition" with subtitle "Season 2025/26"

## Todo
- [ ] Create `competition-breakdown.tsx`
- [ ] Add win rate progress bar
- [ ] Map competition logos
- [ ] Add to page.tsx layout
- [ ] Handle empty/single competition gracefully
- [ ] Verify card responsive grid

## Success Criteria
- Cards display for each competition with real W/D/L data
- Win rate bar visually communicates performance at a glance
- Grid responsive: 2-col mobile, up to 4-col desktop
- Correct competition logos displayed
- Numbers across all cards sum to overview totals

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| Unknown competition name | Missing logo | Fallback to generic football icon |
| Only 1 competition early in season | Lonely single card | Still render grid; no minimum |

## Next Steps
Phase 05 adds records and milestones section.
