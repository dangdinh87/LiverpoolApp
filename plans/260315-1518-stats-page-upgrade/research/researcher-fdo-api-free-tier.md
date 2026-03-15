# Football-Data.org v4 API — Free Tier Statistics Research

**Date:** 2026-03-15
**API:** Football-Data.org v4
**Free Tier Rate Limit:** 10 requests/minute (registered plan)

## Available Endpoints (Free Tier)

### Competition-Level Stats

| Endpoint | Status | Returns | Notable Limits |
|---|---|---|---|
| `/competitions/{id}` | ✅ Free | Season, area, plan info | Must specify competition |
| `/competitions/{id}/matches` | ✅ Free | Match list, scores, dates | Paginated, 10/min rate limit |
| `/competitions/{id}/standings` | ✅ Free | League table, home/away splits | **Current season only** |
| `/competitions/{id}/scorers` | ✅ Free | Top goal scorers by competition | Returns goals + assists? (unconfirmed) |
| `/competitions/{id}/teams` | ✅ Free | Squad list per competition | Team IDs + squad info |

### Team-Level Stats

| Endpoint | Status | Returns | Notable Limits |
|---|---|---|---|
| `/teams/{id}` | ✅ Free | Team info, name, crest, area | Basic metadata only |
| `/teams/{id}/matches` | ✅ Free | Team match history | Filterable by date range, status |

### Person (Player) Stats

| Endpoint | Status | Returns | Notable Limits |
|---|---|---|---|
| `/persons/{id}` | ✅ Free | Player name, DOB, position | **No statistics field** |
| `/persons/{id}/matches` | ⚠️ Unclear | Player match appearances | **Not documented on free tier** |

## Data Field Details

### Standings Response
- `position`, `playedGames`, `won`, `draw`, `lost`, `points`
- `goalsFor`, `goalsAgainst`, `goalDifference`
- **Home & Away Tables** (separate objects in response)
- ⚠️ Form string or trailing fixtures — not in docs

### Scorers Response
- **Confirmed:** Goals (descending sort)
- **Presumed:** Player ID, player name
- **Unconfirmed:** Assists, minutes played, conversion rate, penalties

### Matches Response
- `id`, `utcDate`, `status`, `score` (fullTime, halfTime, etc.)
- `homeTeam`, `awayTeam` (basic info)
- `competition`, `season`, `stage` (if applicable)
- ⚠️ Player statistics (minutes per player, assists) — requires full match detail endpoint

## Free Tier Limitations

1. **No Historical Stats** — Standings endpoint is current season only (historical tables unavailable)
2. **No Player-Level Stats** — `/persons/{id}` returns name/DOB/position only, no career stats
3. **No Match Detail** — Scorers & assists are only at competition level (top 50), not per-match drill-down
4. **No Aggregates** — Cannot fetch "Liverpool goals against per month" or "clean sheets by position"
5. **Competition Scope** — PL, CL, and other major leagues available; tier-2 leagues restricted
6. **Rate Limit:** 10 req/min (enforced; no burst allowance)

## Unconfirmed Questions

- Does `/competitions/{id}/scorers` include assists or only goals?
- Does the response include minutes played or conversion rates?
- Can `/persons/{id}/matches` be accessed on free tier to build player stats?
- Does standings include "form" (last 5 matches) or recent streak data?
- Are historical standings available for past seasons on free tier?

## Recommendations for Stats Page

### What's Achievable on Free Tier

✅ **Top Scorers & Assists** — Use `/competitions/PL/scorers` for current season leaders (limit=50 or pagination)

✅ **League Table** — Use `/competitions/PL/standings` for total, home, and away tables

✅ **Recent Form** — Aggregate `/teams/{id}/matches` with date filters to compute rolling statistics

✅ **Head-to-Head** — Query `/competitions/PL/matches` and filter by both teams manually

### What Requires Workarounds or Paid Tier

❌ **Player Career Stats** — Paid tier or supplement with external data source (ESPN, Transfermarkt)

❌ **Historical Season Comparisons** — Not available; would need data warehouse approach

❌ **Player Performance Heat Maps** — Not available on free tier

### Caching Strategy

- **Standings:** 6 hours (unlikely to change mid-day for PL)
- **Scorers:** 24 hours (updated post-fixture)
- **Matches:** 1 hour (for live match polling during fixtures)
- **Teams:** 7 days (static during season)

### Implementation Notes

1. Current implementation (`/competitions/PL/scorers?limit=50`) is already optimal for free tier
2. To show assists, verify if FDO includes that field in response; if not, use ESPN or supplement data
3. Consider caching recent team matches (`/teams/64/matches`) to compute Liverpool-specific streaks
4. Hard limit at 50 scorers per competition on free tier (pagination boundary unclear)

## Conclusion

Free tier provides **competition & match-level data** but lacks **player-level aggregates & historical stats**. Current stats page implementation is aligned with free tier capabilities. Expansion would require either paid tier upgrade or multi-source data integration (ESPN, Transfermarkt).
