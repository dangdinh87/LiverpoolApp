---
title: "FPL API Integration + Players Page"
description: "Replace all providers with FPL API, add new Players page with live 2025-26 stats, enhance missing features"
status: pending
priority: P1
effort: 6h
branch: master
tags: [api, fpl, players, stats, cleanup]
created: 2026-03-05
---

# FPL API Integration + Players Page

## Overview

Replace all existing providers (SofaScore + API-Football) with **Fantasy Premier League API** as the sole data source for 2025-26 season. Create new `/players` page with live FPL stats. Enhance app with missing data. Clean up deprecated providers.

## Research

- [API Comparison Report](../reports/researcher-260305-1034-football-api-comparison.md)
- [PL Data Alternatives Report](../reports/researcher-260305-1034-pl-data-alternatives.md)

## Provider Decision

| Provider | Decision | Reason |
|----------|----------|--------|
| **FPL API** | **PRIMARY** | Free, 2025-26, works from VN, rich player stats |
| **Football-Data.org** | **SECONDARY** | Standings (W/D/L/GF/GA/form) — FPL teams have 0 values for these |
| **API-Football** | **REMOVE** | Free tier blocked for 2025+ season, 100 req/day too low |
| **SofaScore** | **REMOVE** | Geo-blocked from Vietnam, reverse-engineered/unreliable |
| **Mock** | **KEEP** | Fallback for dev without network |

### Why Football-Data.org is needed
FPL `/bootstrap-static/` teams have `win/draw/loss/played/points` fields but **all return 0** — they're FPL game-internal, not real PL standings. Football-Data.org provides real standings with W/D/L, GF/GA, form string, free tier (10 req/min, API key required).

## API Endpoints (Verified Working from Vietnam)

### FPL API (Primary — players, fixtures, stats)
- `GET /bootstrap-static/` — 820 players, 20 teams, 38 GWs (~1.8MB, cache 30min)
- `GET /fixtures/` — 380 fixtures with match stats (cache 30min)
- `GET /element-summary/{id}/` — Player match-by-match + past seasons (cache 1h)
- `GET /event/{gw}/live/` — Live GW player stats (cache 5min)

### Football-Data.org (Secondary — standings only)
- `GET /v4/competitions/PL/standings` — Full standings: W/D/L, GF/GA, form (cache 6h)
- Rate: 10 req/min, requires free API key (`FOOTBALL_DATA_ORG_KEY`)

## Phases

| # | Phase | Status | Effort |
|---|-------|--------|--------|
| 1 | [FPL Provider + Cleanup](phase-01-fpl-provider.md) | ✅ DONE (2026-03-05) | 2h |
| 2 | [Players Page + Components](phase-02-players-page.md) | Planned | 2.5h |
| 3 | [Data Enhancement & Polish](phase-03-data-enhancement.md) | Planned | 1.5h |

## Architecture (After Cleanup)

```
src/lib/football/
├── provider.ts          (interface — unchanged)
├── fpl-provider.ts      (NEW — FPL API for players/fixtures/stats)
├── fdo-standings.ts     (NEW — Football-Data.org for standings only)
├── mock-provider.ts     (existing — kept for dev fallback)
├── index.ts             (barrel — fpl + fdo + mock)
└── [DELETED] api-football-provider.ts
└── [DELETED] sofascore-provider.ts
```

```
src/app/players/
├── page.tsx             (NEW — FPL players grid with live stats)
└── [id]/page.tsx        (NEW — FPL player detail with match history)
```

## Key Decisions
- `/squad` stays as-is (liverpoolfc.com data with bios/honors)
- `/players` is NEW (FPL live stats, all PL players, sortable)
- FPL Liverpool team ID = 12 (remap to canonical 40 for page compat)
- `FOOTBALL_DATA_PROVIDER=fpl` env var (default when no key set)
- `FOOTBALL_DATA_ORG_KEY` env var for standings
- Delete `api-football-provider.ts` + `sofascore-provider.ts`
- Remove `API_FOOTBALL_KEY` from .env
