# Phase 05 — Records & Milestones

## Context
- [plan.md](./plan.md) — overall plan
- [phase-01-data-layer.md](./phase-01-data-layer.md) — `SeasonRecords` shape
- Design: Dark Stadium, font-bebas headlines, font-barlow labels

## Overview
Display notable season records in a visually striking list/grid: biggest win, biggest loss, longest streaks, comeback wins, and scoring-first win percentage. Data-driven storytelling — makes raw numbers memorable.

## Key Insights
- `SeasonRecords` from Phase 01 provides all data
- Biggest win/loss includes the actual `Fixture` object — can show opponent + score
- Streaks are computed chronologically in Phase 01 — just display the numbers
- Comeback wins = losing at HT, winning at FT (requires halftime scores)
- "Scoring first" = HT score has LFC leading, then check final result
- Some records may be null (e.g., no losses yet) — handle gracefully

## Requirements
1. `<RecordsMilestones>` client component
2. Card-based layout with icon + stat + context
3. Records shown:
   - Biggest Win (e.g., "5-0 vs Wolves (H)")
   - Biggest Loss (e.g., "0-3 vs Man City (A)")
   - Highest Scoring Match (e.g., "4-3 vs Chelsea")
   - Longest Win Streak (e.g., "7 matches")
   - Longest Unbeaten Streak (e.g., "12 matches")
   - Comeback Wins (e.g., "3 times")
   - Scoring First Win Rate (e.g., "85%")
4. Framer Motion staggered entrance animation
5. Hide record card if value is null/zero (e.g., no losses → hide biggest loss)

## Architecture

### File: `src/components/stats/records-milestones.tsx`
```typescript
"use client";
import type { SeasonRecords } from "@/lib/football/season-stats";
import { motion } from "framer-motion";

interface Props {
  records: SeasonRecords;
}

// Record card layout:
// ┌──────────────────────────┐
// │ 🏆  Biggest Win           │
// │     5 — 0                │  ← font-bebas text-4xl, lfc-red
// │     vs Wolverhampton (H) │  ← font-inter text-sm, stadium-muted
// └──────────────────────────┘
```

### Helper: format fixture as record string
```typescript
function formatRecord(fixture: Fixture): { score: string; opponent: string } {
  const isHome = fixture.teams.home.id === 40;
  const lfc = isHome ? fixture.goals.home : fixture.goals.away;
  const opp = isHome ? fixture.goals.away : fixture.goals.home;
  const oppName = isHome ? fixture.teams.away.name : fixture.teams.home.name;
  const venue = isHome ? "H" : "A";
  return {
    score: `${lfc} — ${opp}`,
    opponent: `vs ${oppName} (${venue})`,
  };
}
```

### Record items config
```typescript
const items = [
  { key: "biggestWin", icon: TrophyIcon, label: t("records.biggestWin"), ... },
  { key: "biggestLoss", icon: AlertIcon, label: t("records.biggestLoss"), ... },
  // ...
].filter(item => item.value !== null);
```

### Icon source
Use Lucide icons (already installed via shadcn): `Trophy`, `TrendingUp`, `Flame`, `Target`, `Shield`, `RotateCcw`.

## Related Code Files
- `src/lib/football/season-stats.ts` — `SeasonRecords` type
- `src/lib/types/football.ts` — `Fixture` type for record fixtures
- `src/app/stats/page.tsx` — renders this component

## Implementation Steps

1. Create `src/components/stats/records-milestones.tsx`
   - Accept `SeasonRecords` as props
   - Build array of record items from data
   - Filter out null/zero records
   - Render grid of record cards with Lucide icons
2. Add `formatRecord()` helper for fixture → display string
3. Style record cards:
   - bg-stadium-surface, border-stadium-border
   - Icon in lfc-red or lfc-gold
   - Large number in font-bebas
   - Context text in font-inter text-sm
4. Framer Motion stagger: `variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}`
5. Add to page.tsx after competition breakdown
6. Add section header: "Season Records"

## Todo
- [ ] Create `records-milestones.tsx`
- [ ] Implement record card with icon + stat + context
- [ ] Add fixture formatting helper
- [ ] Framer Motion stagger animation
- [ ] Filter out null records
- [ ] Add to page.tsx layout
- [ ] Test with various data scenarios (no losses, no comebacks, etc.)

## Success Criteria
- Records display correctly with real match data
- Null records gracefully hidden (not showing "0" or empty cards)
- Fixture context (opponent, venue) shown for biggest win/loss
- Stagger animation feels polished
- Consistent Dark Stadium styling

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| No halftime data for some fixtures | Comeback count inaccurate | Show "—" if insufficient HT data |
| Only 2-3 matches played early season | Records feel trivial | Add "(Season so far)" qualifier in subtitle |
| All wins, no losses | Empty biggest loss card | Filter out null — card simply doesn't render |

## Next Steps
Phase 06 handles i18n translations and responsive polish.
