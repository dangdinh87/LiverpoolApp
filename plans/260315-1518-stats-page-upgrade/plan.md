---
title: "Stats Page Upgrade"
description: "Enhance /stats with season overview, performance charts, competition breakdown, and records — using derived data from existing API calls"
status: pending
priority: P2
effort: "4h"
branch: master
tags: [stats, charts, recharts, ui, football-data]
created: 2026-03-15
---

# Stats Page Upgrade

## Goal
Transform `/stats` from a minimal 3-number + 2-chart page into a comprehensive season dashboard. All new data derived from `getFixtures()` + `getStandings()` — **zero extra API calls**.

## Current State
- 3 headline count-up numbers (LFC goals, assists, top scorer goals)
- 2 bar charts (PL top scorers, PL top assists — league-wide, LFC highlighted)
- 1 LFC scorers table (goals, assists, apps)
- Components: `stat-number.tsx`, `stat-chart.tsx`
- Data: `getTopScorers()` + `getTopAssists()` (1 FDO call, cached)

## Proposed Sections (top to bottom)
1. **Season Overview** — Hero + ~10 headline numbers (W/D/L, GF/GA/GD, clean sheets, points, PL rank, win rate %)
2. **Top Scorers & Assists** — Existing charts + LFC scorers table (improved styling)
3. **Performance Charts** — Goals by month (area), home vs away (dual bar), form timeline (W/D/L dots)
4. **Competition Breakdown** — PL / UCL / FA Cup / Carabao stats cards
5. **Records & Milestones** — Biggest win, streaks, comeback wins
6. **i18n + Polish** — Translation keys, responsive, loading skeleton

## Phases
| # | Phase | Effort | Files |
|---|-------|--------|-------|
| 1 | Data layer — `computeSeasonStats()` | 45min | `src/lib/football/season-stats.ts`, types |
| 2 | Season overview section | 30min | Page refactor + `season-overview.tsx` |
| 3 | Performance charts | 45min | 3 new chart client components |
| 4 | Competition breakdown | 30min | `competition-breakdown.tsx` |
| 5 | Records & milestones | 30min | `records-milestones.tsx` |
| 6 | i18n + responsive polish | 30min | `en.json`, `vi.json`, skeleton |

## Architecture
```
page.tsx (server)
├── getStandings(), getFixtures(), getTopScorers(), getTopAssists()
├── computeSeasonStats(fixtures, standings) → SeasonStats
└── Pass data as props to client components:
    ├── <SeasonOverview stats={...} />        (count-up grid)
    ├── <StatChart /> x2                      (existing, kept)
    ├── <LfcScorersTable />                   (extract from page)
    ├── <PerformanceCharts monthly={} home={} away={} form={} />
    ├── <CompetitionBreakdown comps={} />
    └── <RecordsMilestones records={} />
```

## Key Constraints
- Zero extra API calls — all derived from fixtures + standings
- Server component page, client components for interactive charts
- Mobile-first responsive grid (1-col mobile, 2-col tablet, dynamic desktop)
- Dark Stadium design tokens only
- next-intl keys in both `en.json` + `vi.json`
- Recharts + Framer Motion (already installed)

## Dependencies
- `getFixtures()` — returns all LFC fixtures across all comps (FDO + ESPN)
- `getStandings()` — returns PL table with home/away splits
- `getTopScorers()` / `getTopAssists()` — PL scorers (existing)
- `getMatchResult()` — existing helper in `football.ts`

## Risk
| Risk | Impact | Mitigation |
|------|--------|------------|
| Fixtures array empty (no API key) | No derived stats | Graceful empty state with "data unavailable" message |
| Recharts SSR hydration mismatch | Chart flicker | All chart components already `"use client"` — no change needed |
| Too many i18n keys | Maintenance | Flat structure under `Stats` namespace, reuse `Common.labels` where possible |

## Validation Summary

**Validated:** 2026-03-15
**Questions asked:** 4

### Confirmed Decisions
- **Overview scope:** Expand to ~10 stats — add PL Rank, Goal Difference, Win Rate % alongside original 8
- **Performance charts:** Keep all 3 (Goals by Month, Home vs Away, Form Timeline)
- **Records data shape:** Serialize Fixture → lightweight `RecordDisplay` type before passing to client
- **Stats scope:** All Competitions for overview. PL-specific data (points, rank) labeled accordingly. Per-competition split in Competition Breakdown section.

### Action Items
- [ ] Phase 01: Add `winRate` field to `SeasonOverview` type
- [ ] Phase 01: Add `RecordDisplay` serialized type (score, opponent, venue, competition) instead of passing raw Fixture
- [ ] Phase 02: Expand stat grid to ~10 cards (add PL Rank, GD, Win Rate %)
