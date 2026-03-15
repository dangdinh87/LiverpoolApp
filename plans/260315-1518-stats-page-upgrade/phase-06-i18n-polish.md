# Phase 06 — i18n & Responsive Polish

## Context
- [plan.md](./plan.md) — overall plan
- i18n files: `src/messages/en.json`, `src/messages/vi.json`
- Existing Stats keys: `Stats.metadata`, `Stats.hero`, `Stats.headlines`, `Stats.charts`, `Stats.table`
- next-intl pattern: `useTranslations("Stats")` in client, `getTranslations("Stats")` in server

## Overview
Add all new translation keys for Phases 02-05, provide Vietnamese translations, add loading skeleton, and ensure responsive layout across breakpoints. Final polish pass.

## Key Insights
- Stats keys are flat under `"Stats"` namespace — extend with new sub-sections
- Vietnamese translations should be natural, not literal (match existing style in vi.json)
- Loading skeleton pattern: existing pages use `Skeleton` from shadcn/ui — follow same
- Current page uses `max-w-5xl` container — keep for consistency
- Mobile breakpoints: grid-cols-2 (default), sm:grid-cols-2, md:grid-cols-3, lg:grid-cols-4

## Requirements
1. Add EN translation keys for all new sections
2. Add VI translations for all new keys
3. Pass `t()` function or translated strings to client components
4. Add loading skeleton for stats page (Next.js `loading.tsx`)
5. Responsive audit: verify all sections on 375px, 768px, 1024px, 1280px
6. Accessibility: chart `aria-label`s, color contrast check

## Architecture

### New i18n keys structure
```json
"Stats": {
  "metadata": { ... },
  "hero": { ... },
  "overview": {
    "title": "Season Overview",
    "played": "Played",
    "wins": "Wins",
    "draws": "Draws",
    "losses": "Losses",
    "goalsFor": "Goals For",
    "goalsAgainst": "Goals Against",
    "cleanSheets": "Clean Sheets",
    "points": "Points",
    "rank": "PL Position",
    "unbeaten": "{count} Unbeaten",
    "winStreak": "{count}W Streak",
    "allComps": "All Competitions · 2025/26"
  },
  "charts": {
    "scorers": "Top Scorers",
    "assists": "Top Assists",
    "legend": "...",
    "goalsByMonth": "Goals by Month",
    "goalsByMonthSub": "Scored vs Conceded — all competitions",
    "scored": "Scored",
    "conceded": "Conceded",
    "homeAway": "Home vs Away",
    "homeAwaySub": "Performance comparison",
    "home": "Home",
    "away": "Away",
    "formTimeline": "Form Timeline",
    "formTimelineSub": "Last {count} matches",
    "months": {
      "Jan": "Jan", "Feb": "Feb", ...
    }
  },
  "competitions": {
    "title": "By Competition",
    "subtitle": "Season 2025/26",
    "winRate": "Win Rate",
    "gf": "GF",
    "ga": "GA"
  },
  "records": {
    "title": "Season Records",
    "subtitle": "Season so far",
    "biggestWin": "Biggest Win",
    "biggestLoss": "Biggest Loss",
    "highestScoring": "Highest Scoring",
    "winStreak": "Win Streak",
    "unbeatenStreak": "Unbeaten Streak",
    "comebacks": "Comeback Wins",
    "scoringFirst": "Scoring First Win %",
    "matches": "{count} matches",
    "times": "{count} times"
  },
  "headlines": { ... },
  "table": { ... }
}
```

### Loading skeleton: `src/app/stats/loading.tsx`
```typescript
import { Skeleton } from "@/components/ui/skeleton";
// Hero skeleton + 8 stat card skeletons + 2 chart skeletons
```

### Client component i18n pattern
Since charts are `"use client"`, pass translated labels as props from the server page:
```typescript
// page.tsx (server)
const t = await getTranslations("Stats");
<GoalsByMonthChart
  data={seasonStats.monthly}
  labels={{ scored: t("charts.scored"), conceded: t("charts.conceded") }}
/>
```

## Related Code Files
- `src/messages/en.json` — English translations
- `src/messages/vi.json` — Vietnamese translations
- `src/app/stats/page.tsx` — passes translations to client components
- All Phase 02-05 client components — receive label props

## Implementation Steps

1. Add EN keys to `src/messages/en.json` under `Stats` namespace
2. Add VI keys to `src/messages/vi.json` — natural Vietnamese translations:
   - "Season Overview" → "Tổng quan mùa giải"
   - "Played" → "Trận"
   - "Wins" → "Thắng"
   - "Clean Sheets" → "Sạch lưới"
   - "By Competition" → "Theo giải đấu"
   - "Season Records" → "Kỷ lục mùa giải"
   - "Biggest Win" → "Thắng lớn nhất"
   - "Comeback Wins" → "Ngược dòng"
3. Create `src/app/stats/loading.tsx` with skeleton layout
4. Update page.tsx to pass translated strings to all client components
5. Responsive audit checklist:
   - [ ] 375px (iPhone SE): 2-col stat grid, stacked charts, scrollable timeline
   - [ ] 768px (iPad): 4-col stats, 2-col charts
   - [ ] 1024px+: full layout
6. Accessibility:
   - Add `role="img" aria-label="..."` to chart containers
   - Ensure color contrast (stadium-muted on stadium-bg passes AA)
   - Form timeline dots need `aria-label` with result text

## Todo
- [ ] Add ~30 EN translation keys
- [ ] Add ~30 VI translation keys
- [ ] Create `loading.tsx` skeleton
- [ ] Wire translations to all client components via props
- [ ] Responsive audit at 4 breakpoints
- [ ] Accessibility pass (aria-labels, contrast)
- [ ] Final visual QA — consistent spacing, font usage, borders

## Success Criteria
- All visible text comes from i18n (no hardcoded strings)
- Vietnamese translations sound natural (not Google Translate)
- Loading skeleton matches final layout shape
- Page looks good on mobile (375px) through desktop (1280px+)
- No accessibility warnings from Lighthouse audit

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| Too many translation keys | Maintenance burden | Reuse `Common.labels` keys where possible (goals, assists) |
| Chart labels overflow on mobile | Truncated text | Use abbreviated labels on small screens |
| Missing VI translation | Shows EN fallback | next-intl handles fallback automatically |

## Unresolved Questions
- Should month abbreviations be translated (e.g., "Thg 8" for August in Vietnamese)?
  - Recommendation: Yes, use Vietnamese month abbreviations. Add to `Stats.charts.months`.
