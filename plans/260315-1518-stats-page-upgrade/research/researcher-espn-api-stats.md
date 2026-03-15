# ESPN API Football Statistics — Research Report

**Date:** 2026-03-15
**Target:** Season & team-level stats availability for Liverpool FC (ID: 364)

---

## Executive Summary

ESPN's **public API provides limited season-level aggregates**. Per-match boxscore data is the primary stat source; season totals must be derived via client-side aggregation from schedule/boxscore endpoints.

---

## Available Endpoints

### 1. **Team Endpoint** (`/eng.1/teams/364`)
✅ **Provides:** Season summary in `record.items[0].stats`

Example Liverpool data (29 matches into 2025-26 season):
```
gamesPlayed: 29
wins: 14, draws: 6, losses: 9
points: 48, pointsFor: 48, pointsAgainst: 39
pointDifferential: 9
Home/Away splits: homeWins, homeLosses, homePointsFor/Against, etc.
rank: 6
```

**Limitations:** Only basic W-L-D + goal differential. No possession, shots, tackles, pass completion, or key defensive stats.

### 2. **Standings Endpoint** (`/eng.1/standings`)
✅ **Provides:** Team entries with same basic stats as team endpoint
- W-L-D records, GF/GA, points, rank
- No performance metrics beyond goals

### 3. **Roster Endpoint** (`/eng.1/teams/364/roster`)
✅ **Provides:** Full squad with positions, height, age, DOB, links
❌ **Does NOT include:** Per-player season stats (appearances, goals, assists)
- Player stat links exist on ESPN desktop (e.g., `/soccer/player/stats/_/id/{id}`) but **not in API**

### 4. **Schedule Endpoint** (`/eng.1/teams/364/schedule`)
✅ **Provides:** Match list with links to summaries
- Each match links to boxscore endpoint

### 5. **Summary/Boxscore Endpoint** (`/eng.1/summary?event={id}`)
✅ **Provides:** Per-match detailed stats
- Possession %, shots on target, tackles, interceptions, fouls, pass completion, ball recovery, etc.
- **But:** Requires fetching each match individually (29+ API calls for full season)

### 6. **Statistics Endpoint** (`/eng.1/teams/364/statistics`)
❌ **Empty/Not Available** — returns `{"status":"success","results":{}}`

---

## Data Field Analysis

### What ESPN HAS (per-match level)
- Possession percentage
- Shots (on target + blocked)
- Passes completed / attempted
- Tackles, interceptions, fouls, yellow/red cards
- Ball recovery, clearances
- Offsides, corner kicks, throw-ins

### What ESPN LACKS (season-level direct endpoints)
- Aggregated season stats (total shots, avg possession, etc.)
- Individual player stats (goals, assists, appearances)
- Expected Goals (xG)
- Heat maps, passing networks
- Detailed positional analytics

---

## Aggregation Feasibility

### Option 1: Manual Client-Side Aggregation
**Cost:** 1 schedule fetch + 29 boxscore fetches = ~30 API calls per season
**Frequency:** Cache for 7 days, refresh weekly
**Feasibility:** ✅ **Yes, but expensive**

```javascript
// Pseudocode
const matches = await fetchSchedule(teamId); // 1 call
const stats = {};
for (const match of matches) {
  const boxscore = await fetchSummary(match.id); // 29 calls
  stats.possession += boxscore.possession;
  stats.shotsOnTarget += boxscore.shotsOnTarget;
  // ... aggregate
}
stats.avgPossession = stats.possession / matches.length;
```

**Pros:** Complete data, no external deps
**Cons:** Slow initial load, high API quota burn (30 calls vs. Football-Data.org's 1 call)

### Option 2: Football-Data.org (Primary)
**Recommended:** Use FDO for season stats, ESPN for per-match boxscore details
- FDO provides aggregated season stats in 1 call
- ESPN provides match-by-match tactical breakdown
- Hybrid approach balances cost & richness

### Option 3: Cache & Incremental Sync
- Cache full boxscore history on Supabase
- On new match: fetch 1 boxscore, update running totals
- Rebuild cache on demand (weekly cron)

---

## Recommendations

### For Liverpool Stats Page

1. **Primary Source: Football-Data.org**
   - Season totals (goals, assists, etc.)
   - Player statistics
   - Standings & progression
   - Cost: 1 call per endpoint

2. **Supplement with ESPN**
   - Per-match boxscore detail (possession, shots, tactical breakdown)
   - Match event data (goals, assists, substitutions)
   - Cost: Cache boxscores, fetch on-demand

3. **Avoid Direct Season Aggregation**
   - Don't iterate all 38 matches to sum stats
   - Too expensive relative to FDO's unified season endpoint
   - Unless caching in Supabase with incremental updates

### Implementation Path

```
Stats Page Architecture:
├── Season Overview
│   └── FDO: season stats (goals, assists, form)
├── Per-Match Breakdown
│   └── ESPN boxscore cache (possession, shots, tactics)
└── Player Stats
    └── FDO: player list + goals/assists/apps
```

---

## Unresolved Questions

1. Does ESPN's roster endpoint support historical seasons (2024-25, 2023-24)?
2. Are boxscore stats available for past seasons or only current?
3. Does FDO free tier include player goal/assist stats?
