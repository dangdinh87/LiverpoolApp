---
title: "ESPN Lineup Integration"
description: "Add match lineup data from ESPN API to fixture detail pages"
status: pending
priority: P2
effort: 1h
branch: master
tags: [espn, lineup, fixtures, api]
created: 2026-03-15
---

# ESPN Lineup Integration

## Problem

`getFixtureLineups(id)` delegates to `FdoProvider.getFixtureLineups()` which returns `[]`.
Football-Data.org free tier does not provide lineup data. ESPN summary endpoint already
returns `rosters` array with formation, starters, subs, and coach -- but `EspnSummary`
interface omits it and no mapping function exists.

## Solution

Extend the existing ESPN integration to extract lineup/roster data from the summary
endpoint already being called. Map ESPN roster shape to canonical `FixtureLineup` type.
Wire through barrel exports so fixture detail page gets real lineups.

## Phases

| # | Phase | Effort | Status | File |
|---|-------|--------|--------|------|
| 1 | [ESPN Lineup Data Layer](./phase-01-espn-lineup-data-layer.md) | 30min | pending | `espn-events.ts` |
| 2 | [Wire Lineup in Barrel & Page](./phase-02-wire-lineup-barrel-and-page.md) | 15min | pending | `index.ts`, fixture page |
| 3 | [Build Verification](./phase-03-build-verification.md) | 15min | pending | n/a |

## Files Modified

- `src/lib/football/espn-events.ts` -- add ESPN roster interfaces + `getEspnMatchLineups()`
- `src/lib/football/index.ts` -- update `getFixtureLineups` to try ESPN first
- `src/app/fixtures/[id]/page.tsx` -- pass `f.date` to `getFixtureLineups`

## Constraints

- No new env vars, no new packages
- Must match existing `FixtureLineup` / `LineupPlayer` types exactly
- Graceful fallback: no roster data -> return `[]`
- Reuse existing `fetchSummary()` (already hits summary endpoint)
