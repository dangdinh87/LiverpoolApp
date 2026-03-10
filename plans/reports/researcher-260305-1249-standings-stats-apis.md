# Research Report: Free Football APIs — PL Standings & Liverpool Stats (2025/26)

Date: 2026-03-05

---

## Summary

Only **Football-Data.org** provides a genuinely free, no-credit-card, always-available Premier League standings API with good data fields. API-Football free tier blocks 2025+ seasons, making it unusable for current season data. Sportmonks and OpenLigaDB do not cover PL on free tiers. TheSportsDB has PL standings but with very low free-tier limits. No known geo-blocking for Vietnam on any of these services.

---

## 1. Football-Data.org (v4) — RECOMMENDED

**Base URL:** `https://api.football-data.org/v4/`
**Auth:** `X-Auth-Token: <key>` header (free registration at football-data.org)
**Free forever:** yes, no credit card

**Rate limits (free tier):**
- 10 requests/minute
- No daily cap (registered users)
- Non-authenticated: 100 req/24h, only area + competition list endpoints

**PL coverage:** Yes — Premier League is one of 12 competitions included free

**Key endpoints:**
```
GET /v4/competitions/PL/standings          # League table
GET /v4/competitions/PL/teams             # All teams
GET /v4/competitions/PL/matches           # Fixtures/results
GET /v4/competitions/PL/scorers           # Top scorers
GET /v4/teams/{id}/matches               # Team matches
```

**Standings data fields:** W, D, L, GF (goalsFor), GA (goalsAgainst), GD (goalDifference), points, playedGames, position, form (last 5 results as string e.g. `"W,D,W,L,W"`)

**2025/26 season support:** Current season data is available — the API serves the live current season by default. Season param: `?season=2025` for 2025/26.

**Player/team stats:** Basic (goals, assists, top scorers). Detailed stats (shots, possession, cards, fouls) require €15/mo Stats Add-On.

**Geo-blocking:** None known — standard HTTPS API, global access.

**Verdict:** Best free option. Covers all needed fields. 10 req/min is sufficient for a Next.js app with `React.cache()` and ISR.

---

## 2. API-Football / API-Sports (RapidAPI) — BLOCKED FOR 2025/26

**Base URL:** `https://v3.football.api-sports.io/` or via RapidAPI
**Auth:** `x-apisports-key` header or `x-rapidapi-key`
**Free tier:** 100 requests/day, no credit card

**PL coverage:** Yes, full coverage

**Key endpoints:**
```
GET /standings?league=39&season=2024      # PL standings
GET /teams/statistics?league=39&season=2024&team=40
GET /players?league=39&season=2024&team=40
```

**2025/26 season support:** **FREE TIER BLOCKS 2025+ SEASONS** — confirmed by project memory (API key in use). Free plan only covers 2022–2024 seasons. Season 2025 (`season=2025`) returns a plan restriction error.

**Data fields:** Full — W, D, L, GF, GA, GD, form, points, rank; very rich player stats.

**Verdict:** Already in use in this project. Cannot use for 2025/26 current standings on free tier. Would need paid upgrade (~$14/mo starter).

---

## 3. TheSportsDB — LIMITED FREE TIER

**Base URL:** `https://www.thesportsdb.com/api/v1/json/`
**Auth:** API key in URL path — free key is literally `"123"` (e.g. `/api/v1/json/123/lookuptable.php`)
**V2 API:** Premium only ($9/mo)

**Rate limits:** 30 req/min free; 100 req/min premium

**PL standings endpoint:**
```
GET /api/v1/json/123/lookuptable.php?l=4328&s=2025-2026
# l=4328 is English Premier League league ID
```

**Data fields returned:** Position, team name, played, W, D, L, GF, GA, GD, points. No form string.

**Player stats:** Basic lookup only — limited result counts (1 player per lookup free).

**Team stats:** Basic team info, no per-season aggregated stats.

**2025/26 support:** Yes — season param `s=2025-2026` works.

**Free tier cap on table lookups:** 5 requests free, 100 premium — effectively useless in production without $9/mo.

**Geo-blocking:** None known.

**Verdict:** Works but 5-request cap on standings is impractical. $9/mo for V2 is cheap but adds another subscription.

---

## 4. OpenLigaDB — NO PL COVERAGE

**Base URL:** `https://api.openligadb.de/`
**Auth:** None required — completely open API

**Coverage:** German Bundesliga (1 & 2), DFB-Pokal, some European competitions (UCL/UEL group stages), World Cup. **Premier League is NOT covered.**

**Verdict:** Not applicable for this use case.

---

## 5. Sportmonks — PL NOT IN FREE TIER

**Base URL:** `https://api.sportmonks.com/v3/football/`
**Auth:** Bearer token (API key)
**Free plan:** 180 calls/hour/endpoint; 14-day free trial of paid plans

**Free plan leagues:** Danish Superliga, Scottish Premiership only. **Premier League NOT included.**

**PL data quality (paid):** Excellent — live standings, W/D/L/GF/GA/GD/form, 60+ endpoints, advanced player stats. Starts ~$15/mo for PL access.

**Verdict:** Not viable on free tier.

---

## 6. Other APIs Evaluated

| API | PL Free? | 2025/26? | Notes |
|-----|----------|----------|-------|
| Statorium | Unknown | Unknown | Commercial, no clear free tier |
| Premier League official API | No | Yes | Private, no public access |
| ESPN API (unofficial) | Yes* | Yes | Undocumented, no key needed, can break anytime |
| SofaScore (unofficial) | Yes* | Yes | Undocumented, scraping risk, ToS violation |

**ESPN unofficial:** `https://site.api.espn.com/apis/v2/sports/soccer/eng.1/standings` — no auth, returns current PL table with W/D/L/GF/GA/GD. No official support, no SLA, may break.

---

## Recommendation

| Use Case | API |
|----------|-----|
| PL Standings (current 2025/26) | **Football-Data.org v4** (free, 10 req/min, all needed fields) |
| Liverpool player stats (current) | **Football-Data.org** `/scorers` or upgrade API-Football |
| Backup/fallback | ESPN unofficial endpoint (no auth, volatile) |

**Migration plan:** Replace `API_FOOTBALL_KEY` standings calls with Football-Data.org. Keep API-Football for historical (2022–2024) data if needed.

Football-Data.org standings response structure:
```json
{
  "standings": [{
    "type": "TOTAL",
    "table": [{
      "position": 1,
      "team": { "id": 64, "name": "Liverpool FC" },
      "playedGames": 27,
      "won": 20, "draw": 4, "lost": 3,
      "points": 64,
      "goalsFor": 61, "goalsAgainst": 28, "goalDifference": 33,
      "form": "W,W,W,D,W"
    }]
  }]
}
```

Liverpool FC team ID on Football-Data.org: **64**

---

## Unresolved Questions

1. Football-Data.org: does `/v4/competitions/PL/standings?season=2025` return 2025/26 data (season param convention — year of start or end)?
2. Is there a free per-match lineup/events endpoint on Football-Data.org or does that require the €29/mo Deep Data plan?
3. ESPN unofficial API: are there known breakage incidents in 2025/26 season that would make it unreliable as a fallback?
4. API-Football paid upgrade cost for single-season 2025/26 access vs switching to Football-Data.org entirely — needs cost-benefit check if richer player stats are required.
