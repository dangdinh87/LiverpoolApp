# Research Report: FPL API Standings & Stats Deep Dive

Date: 2026-03-05

---

## 1. FPL bootstrap-static — Teams Array

Endpoint: `GET https://fantasy.premierleague.com/api/bootstrap-static/`

Full schema per team object (verified live):

| Field | Value type | Real or zero? |
|---|---|---|
| `id` | int | Real |
| `code` | int | Real |
| `name` | string | Real |
| `short_name` | string | Real |
| `pulse_id` | int | Real (maps to PulseLive team id) |
| `strength` | int 1-5 | Real (FPL-assigned difficulty tier) |
| `strength_overall_home` | int ~1200-1400 | Real (Elo-like score) |
| `strength_overall_away` | int ~1200-1400 | Real |
| `strength_attack_home` | int ~1100-1400 | Real |
| `strength_attack_away` | int ~1100-1400 | Real |
| `strength_defence_home` | int ~1200-1400 | Real |
| `strength_defence_away` | int ~1200-1400 | Real |
| `win` | int | **ALWAYS 0** |
| `draw` | int | **ALWAYS 0** |
| `loss` | int | **ALWAYS 0** |
| `played` | int | **ALWAYS 0** |
| `points` | int | **ALWAYS 0** |
| `position` | int | **Stale/wrong** (e.g. Liverpool = 6 while actual PL position = 1) |
| `form` | null | Always null |
| `team_division` | null | Always null |
| `unavailable` | bool | Real |

**Key finding:** `win/draw/loss/played/points` are **hardcoded zeros**. `position` is stale. The `strength_*` fields are the only useful team-level stats — they are Elo-style difficulty ratings used by FPL, not real standings data.

Liverpool sample: `strength=4`, `strength_overall_home=1215`, `strength_overall_away=1245`, `position=6` (incorrect).

---

## 2. FPL Fixtures Endpoint

Endpoint: `GET https://fantasy.premierleague.com/api/fixtures/`

Returns all 380 PL fixtures for current season. Fields per fixture:

| Field | Notes |
|---|---|
| `id`, `code`, `event` | IDs |
| `team_h`, `team_a` | Team IDs (match bootstrap-static team ids) |
| `team_h_score`, `team_a_score` | Int or null (null if not played) |
| `team_h_difficulty`, `team_a_difficulty` | FPL FDR 1-5 |
| `kickoff_time` | ISO datetime or null |
| `finished`, `finished_provisional`, `started` | Booleans |
| `minutes` | 0-90+ |
| `stats` | Array of per-player events (goals, assists, cards, saves, bonus, bps, defensive_contribution) |
| `pulse_id` | PulseLive fixture id |

**Standings derivation via fixtures: YES, fully possible.**
- 290/380 fixtures are `finished=True` (as of GW29).
- Iterate all finished fixtures, accumulate W/D/L/GF/GA per team → compute full standings table.
- No authentication required. Single API call.
- Stats array has goals_scored, assists, own_goals, penalties_saved/missed, yellow_cards, red_cards, saves, bonus, bps, defensive_contribution per player per fixture.

---

## 3. FPL event/{id}/live Endpoint

Endpoint: `GET https://fantasy.premierleague.com/api/event/{gw}/live/`

Returns 820 player elements for GW. Per element:

```json
{
  "id": 1,
  "stats": { ... },
  "explain": [ { "fixture": 283, "stats": [...] } ],
  "modified": true
}
```

Stats fields (all int/float, real values):

```
minutes, goals_scored, assists, clean_sheets, goals_conceded,
own_goals, penalties_saved, penalties_missed, yellow_cards, red_cards,
saves, bonus, bps, influence, creativity, threat, ict_index,
starts, expected_goals, expected_assists, expected_goal_involvements,
expected_goals_conceded, total_points, in_dreamteam,
clearances_blocks_interceptions, recoveries, tackles, defensive_contribution
```

`explain` array breaks down points per fixture with identifier + points + value.

**Use case:** Per-player gameweek stats. Not useful for team standings.

---

## 4. Premier League Official API (PulseLive)

Base: `https://footballapi.pulselive.com/football/`

**Working standings endpoint (verified live):**

```
GET https://footballapi.pulselive.com/football/standings?compSeasons=719&altIds=true&detail=2&FOOTBALL_COMPETITION=1&live=true
Headers:
  Origin: https://www.premierleague.com
  User-Agent: [browser UA]
```

No auth token required currently. `compSeasons=719` = 2024/25 season.

Response structure:
```
tables[0].entries[] → {
  position: int,
  startingPosition: int,
  team: { name, shortName, abbr, id, altIds.opta },
  overall: { played, won, drawn, lost, goalsFor, goalsAgainst, goalsDifference, points },
  home: { played, won, drawn, lost, goalsFor, goalsAgainst, goalsDifference, points },
  away: { played, won, drawn, lost, goalsFor, goalsAgainst, goalsDifference, points },
  form: [...],
  annotations: [...]
}
```

Liverpool verified live data: `position=1`, `overall.played=38`, `won=25`, `drawn=9`, `lost=4`, `goalsFor=86`, `goalsAgainst=41`, `goalsDifference=45`, `points=84`.

**This is the richest public standings source.** Home/away split included. No API key needed (as of now).

**Caveats:**
- Unofficial/undocumented — no SLA, may break or add CORS restrictions
- `compSeasons` id changes each season (719 = 2024/25)
- Requires `Origin: https://www.premierleague.com` header
- CORS blocks browser-side fetch; must be server-side only

Other PulseLive endpoints (pattern-based, unverified):
- Fixtures: `GET /football/fixtures?compSeasons=719&teams=10&page=0&pageSize=40&sort=asc&statuses=C`
- Player stats: `GET /football/stats/player/{id}?compSeasons=719`
- Clubs: `GET /football/clubs?compSeasons=719`

---

## 5. BBC Sport / Sky Sports

- **No public JSON API** for either. Both serve data via internal GraphQL/REST APIs behind auth.
- BBC Sport RSS feeds exist (`/sport/football/premier-league/rss.xml`) but contain news only, no standings/stats.
- Sky Sports: no structured data endpoints found.
- Both sites use client-side JS rendering making HTML scraping fragile.
- **JSON-LD on premierleague.com:** Premier League website uses minimal JSON-LD (SportsEvent schema for fixtures) but not for standings tables. Standings are rendered client-side via React — no structured microdata.

---

## Recommendation Summary

| Goal | Best Source | Approach |
|---|---|---|
| Real standings (W/D/L/GF/GA/pts) | PulseLive standings API | Server-side fetch, `Origin` header, cache aggressively |
| Home/away split standings | PulseLive standings API | Same endpoint, parse `home`/`away` sub-objects |
| Derive standings from scratch | FPL fixtures API | Accumulate from `finished` fixtures (free, stable) |
| Team strength/FDR | FPL bootstrap-static | `strength_*` fields only |
| Per-player GW stats | FPL event live API | `event/{gw}/live/` |
| Upcoming fixtures | FPL fixtures API | Filter `finished=false` |

**For LiverpoolApp:** PulseLive standings is the cleanest drop-in with no API key. FPL fixtures derivation is the fallback if PulseLive becomes unreliable.

---

## Unresolved Questions

1. PulseLive `compSeasons` id for 2025/26 — unknown until season starts; need to discover dynamically via `/football/compseasons` endpoint.
2. PulseLive rate limits — no documented limits; unknown how many req/day are tolerated.
3. PulseLive CORS policy longevity — currently no auth token required but could change without notice.
4. FPL fixtures for 2025/26 — once new season starts, `bootstrap-static` resets; historical standings must be cached or re-fetched from PulseLive.
5. Whether `annotations` field in PulseLive entries contains penalty shootout or deduction data — not investigated.
