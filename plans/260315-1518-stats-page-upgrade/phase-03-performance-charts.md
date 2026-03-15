# Phase 03 — Performance Charts

## Context
- [plan.md](./plan.md) — overall plan
- [phase-01-data-layer.md](./phase-01-data-layer.md) — `MonthlyGoals[]`, `FormEntry[]`, `SeasonOverview.homeRecord/awayRecord`
- Existing chart: `src/components/stats/stat-chart.tsx` — Recharts BarChart pattern
- Design: Dark Stadium tokens, Recharts already installed

## Overview
Add 3 new interactive chart sections below the existing top scorers/assists charts:
1. **Goals by Month** — Area/line chart showing scored vs conceded per month
2. **Home vs Away** — Dual horizontal bar chart comparing home/away W/D/L and goals
3. **Form Timeline** — Horizontal W/D/L dot sequence showing results chronologically

## Key Insights
- Recharts `ResponsiveContainer` already used in `stat-chart.tsx` — follow same pattern
- All chart components must be `"use client"` (Recharts requires DOM)
- `MonthlyGoals[]` from Phase 01 provides month, scored, conceded, matches
- Home/away data available from both standings (`Standing.home/away`) and derived fixtures
- Form timeline uses `FormEntry[]` — array of {date, opponent, result, score, competition}
- Recharts custom tooltip pattern established in `stat-chart.tsx` — reuse styling

## Requirements
1. `<GoalsByMonthChart>` — Area chart, dual Y-axis lines (scored in red, conceded in grey)
2. `<HomeAwayChart>` — Grouped bar chart: Home vs Away for W/D/L and GF/GA
3. `<FormTimeline>` — Custom component (not Recharts): horizontal scrollable W/D/L dots with tooltips
4. All charts wrapped in stadium-surface card containers (consistent with existing)
5. Responsive: charts stack vertically on mobile, 2-col where sensible on desktop

## Architecture

### File: `src/components/stats/goals-by-month-chart.tsx`
```typescript
"use client";
// Props: { data: MonthlyGoals[] }
// Recharts AreaChart with:
//   - X: month label ("Aug", "Sep", ...)
//   - Area 1: scored (fill lfc-red, stroke lfc-red)
//   - Area 2: conceded (fill grey, stroke grey)
//   - Custom tooltip showing: "Sep — 12 scored, 3 conceded (5 matches)"
```

### File: `src/components/stats/home-away-chart.tsx`
```typescript
"use client";
// Props: { home: { w, d, l, gf, ga }, away: { w, d, l, gf, ga } }
// Recharts BarChart (horizontal) with grouped bars:
//   - Categories: Wins, Draws, Losses, Goals For, Goals Against
//   - Two bars per category: Home (lfc-red) vs Away (lfc-gold)
```

### File: `src/components/stats/form-timeline.tsx`
```typescript
"use client";
// Props: { entries: FormEntry[] }
// Custom SVG/div-based timeline (NOT Recharts — simpler for dots):
//   - Horizontal scrollable row of circles
//   - W = green, D = amber, L = red
//   - Hover/tap shows tooltip: "vs Arsenal (H) 3-1 — Premier League"
//   - Most recent on right
```

### Chart container pattern (reuse)
```tsx
<div className="bg-stadium-surface border border-stadium-border p-6">
  <h2 className="font-bebas text-2xl text-white tracking-wider mb-1">{title}</h2>
  <p className="font-inter text-xs text-stadium-muted mb-5">{subtitle}</p>
  <ChartComponent ... />
</div>
```

### Color tokens for charts
```
scored line:   #C8102E (lfc-red)
conceded line: #6B7280 (grey-500)
home bar:      #C8102E (lfc-red)
away bar:      #F6EB61 (lfc-gold)
win dot:       #22C55E (green-500)
draw dot:      #F59E0B (amber-500)
loss dot:      #EF4444 (red-500)
```

## Related Code Files
- `src/components/stats/stat-chart.tsx` — existing Recharts pattern + tooltip styling
- `src/lib/football/season-stats.ts` — `MonthlyGoals[]`, `FormEntry[]`
- `src/app/stats/page.tsx` — will render these below existing charts

## Implementation Steps

1. Create `src/components/stats/goals-by-month-chart.tsx`
   - AreaChart with two Area elements (scored, conceded)
   - Custom tooltip matching existing dark theme
   - Smooth curve type (`monotone`)
2. Create `src/components/stats/home-away-chart.tsx`
   - Grouped BarChart with Home vs Away categories
   - Legend showing Home (red) / Away (gold)
   - Horizontal layout for better label readability
3. Create `src/components/stats/form-timeline.tsx`
   - Div-based horizontal scroll container
   - Circles with W/D/L color coding
   - Framer Motion hover tooltip (or shadcn Tooltip)
   - Show last 20 matches max (avoid overcrowding)
4. Update `page.tsx` to render new charts section
   - Goals by Month: full width
   - Home vs Away + Form Timeline: 2-col grid on desktop

## Todo
- [ ] Create `goals-by-month-chart.tsx` (AreaChart)
- [ ] Create `home-away-chart.tsx` (grouped BarChart)
- [ ] Create `form-timeline.tsx` (custom W/D/L dots)
- [ ] Add chart section to page.tsx
- [ ] Verify responsive layout (mobile stack, desktop grid)
- [ ] Test with empty monthly data (graceful empty state)

## Success Criteria
- 3 new chart visualizations render correctly with real data
- Charts follow Dark Stadium theme (no white backgrounds, correct fonts)
- Tooltips show contextual info on hover
- Form timeline is horizontally scrollable on mobile
- No SSR errors (all charts `"use client"`)

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| Recharts hydration mismatch | Flicker on load | `"use client"` + wrap in `ResponsiveContainer` (already proven) |
| Monthly data has only 1-2 months early season | Sparse chart | Show message "More data as season progresses" if <3 months |
| Form timeline too long | Scroll fatigue | Cap at last 20 matches, show "showing last 20" label |

## Next Steps
Phase 04 adds competition breakdown cards below the charts.
