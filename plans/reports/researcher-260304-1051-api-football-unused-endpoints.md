# API-Football v3: Comprehensive Endpoint Analysis & Unused Endpoints
**Report Date:** 2026-03-04
**Status:** Complete Research
**Scope:** All v3.football.api-sports.io endpoints for Liverpool FC fan app

---

## Executive Summary

Analyzed **33 total endpoints** across API-Football v3. Your app currently uses **6 endpoints**; **27 additional endpoints** remain unused and could enhance Liverpool FC fan engagement.

Key opportunities:
- **Injury tracking** (real-time squad availability)
- **Coach/lineup data** (tactical insights)
- **Match events & statistics** (play-by-play analysis)
- **Player transfers** (squad news)
- **Match predictions** (engagement features)
- **Betting odds** (monetization potential)

---

## CURRENTLY USED ENDPOINTS (6)

| Endpoint | Path | Use Case | Key Params |
|----------|------|----------|-----------|
| Squad | `/players/squads` | Player roster | `team` |
| Fixtures | `/fixtures` | Match schedule & results | `team`, `season` |
| Standings | `/standings` | League table | `league`, `season` |
| Top Scorers | `/players/topscorers` | Goal leaders | `league`, `season` |
| Top Assists | `/players/topassists` | Assist leaders | `league`, `season` |
| Player Stats | `/players` | Individual player performance | `id`, `season` |

**Current revalidation strategy:**
- Squad: 24h
- Fixtures: 1h
- Standings/Stats: 6h
- Top Scorers/Assists: 6h

---

## UNUSED ENDPOINTS (27)

### A. REFERENCE/SUPPORT ENDPOINTS (4)

#### 1. **Timezone**
- **Path:** `/timezone`
- **Data:** List of available timezone identifiers
- **Params:** None (required)
- **Use case:** Validate fixture timestamps, display user-local match times
- **Relevance:** LOW (mostly for internal API validation)

#### 2. **Countries**
- **Path:** `/countries`
- **Data:** Countries list with names, codes, flags
- **Params:** `name` (optional), `code` (optional), `search` (optional, min 3 chars)
- **Use case:** Reference data only
- **Relevance:** LOW

#### 3. **Leagues**
- **Path:** `/leagues`
- **Data:** Available leagues, cups, competitions
- **Params:** `id`, `team`, `name`, `search`, `country`, `code`, `season`, `current`, `type`, `last` (all optional)
- **Use case:** Discover other leagues Liverpool plays in (Cup competitions)
- **Relevance:** MEDIUM (could show Champions League, FA Cup details)

#### 4. **Rounds/Fixtures Rounds**
- **Path:** `/fixtures/rounds`
- **Data:** Available rounds for a league/season
- **Params:** `league` (required), `season` (required), `current` (optional)
- **Use case:** Navigate match rounds, highlight current round
- **Relevance:** LOW-MEDIUM (UX enhancement)

---

### B. TEAM & PLAYER DATA ENDPOINTS (9)

#### 5. **Teams**
- **Path:** `/teams`
- **Data:** Team info (name, logo, venue, coaches, founded)
- **Params:** `id`, `league` (optional), `season` (optional), `name` (optional)
- **Use case:** Display Liverpool team info card (founding year, stadium, manager)
- **Relevance:** HIGH (low-cost team profile card)
- **Cost:** ~1 API call

#### 6. **Venues**
- **Path:** `/venues`
- **Data:** Stadium info (capacity, city, country, surface)
- **Params:** `id` (optional), `city` (optional), `country` (optional)
- **Use case:** Anfield stadium details, opponent stadium previews
- **Relevance:** MEDIUM (nice-to-have stadium guide)

#### 7. **Coaches**
- **Path:** `/coaches`
- **Data:** Coach profile (name, birth date, nationality, career stats)
- **Params:** `id` (optional), `team` (optional), `league` (optional)
- **Use case:** Manager profile, coaching career history
- **Relevance:** HIGH (complement player profiles)
- **Cost:** ~1 API call per season

#### 8. **Team Statistics**
- **Path:** `/teams/statistics`
- **Data:** Season stats (goals, assists, possession, pass completion)
- **Params:** `league` (required), `season` (required), `team` (required)
- **Use case:** Team form dashboard, performance metrics
- **Relevance:** HIGH (deeper analytics page)
- **Cost:** ~1 API call

#### 9. **Transfers**
- **Path:** `/transfers`
- **Data:** Player transfers (from/to clubs, dates, fees)
- **Params:** `player` (optional), `team` (optional), `season` (optional)
- **Use case:** Transfer news section, squad changes timeline
- **Relevance:** HIGH (Liverpool fans love transfer news)
- **Cost:** ~1-2 API calls

#### 10. **Trophies**
- **Path:** `/trophies`
- **Data:** Player awards/trophies won
- **Params:** `player` (optional), `league` (optional), `season` (optional)
- **Use case:** Player achievements page, career highlights
- **Relevance:** MEDIUM (enriches player profiles)

#### 11. **Sidelined**
- **Path:** `/sidelined`
- **Data:** Suspended/sidelined players (disciplinary, injuries)
- **Params:** `player` (optional), `team` (optional), `league` (optional)
- **Use case:** Complementary to injuries endpoint, disciplinary info
- **Relevance:** MEDIUM

#### 12. **Players/Seasons**
- **Path:** `/players/seasons`
- **Data:** Historical seasons for a player
- **Params:** `player` (required)
- **Use case:** Player career timeline, season-by-season stats
- **Relevance:** MEDIUM (nice for player detail pages)

#### 13. **Leagues/Seasons**
- **Path:** `/leagues/seasons`
- **Data:** Available seasons for a league
- **Params:** `league` (required)
- **Use case:** Browse historical seasons (2022-2024 on free plan)
- **Relevance:** LOW

---

### C. MATCH DATA ENDPOINTS (10)

#### 14. **Injuries** ⭐
- **Path:** `/injuries`
- **Data:** Players unavailable (injuries, suspensions, illness)
- **Params:** `league` (optional), `season` (optional), `team` (optional), `player` (optional), `date` (optional)
- **Use case:** Real-time squad availability, injury news widget
- **Relevance:** **VERY HIGH** (critical for match previews)
- **Cost:** ~1 API call, revalidate 3-6h
- **Feature idea:** "Squad News" widget showing injured players

#### 15. **Fixture Events** ⭐
- **Path:** `/fixtures/events`
- **Data:** Match events (goals, cards, substitutions, fouls)
- **Params:** `fixture` (required), `team` (optional), `type` (optional: goal, card, subst, etc.)
- **Use case:** Match timeline, play-by-play highlights
- **Relevance:** **VERY HIGH** (engagement feature)
- **Cost:** ~1 call per fixture, revalidate 15min during match
- **Feature idea:** Interactive match timeline with goals/cards/substitutions

#### 16. **Fixture Lineups** ⭐
- **Path:** `/fixtures/lineups`
- **Data:** Starting XI, subs, formation, coach
- **Params:** `fixture` (required)
- **Use case:** Pre-match lineups, tactical analysis
- **Relevance:** **VERY HIGH** (essential match preview)
- **Cost:** ~1 call per fixture, revalidate 30min before match
- **Feature idea:** Formation diagram showing Liverpool XI and opponent

#### 17. **Fixture Statistics** ⭐
- **Path:** `/fixtures/statistics`
- **Data:** Match stats (possession, shots, passes, tackles, fouls)
- **Params:** `fixture` (required), `team` (optional)
- **Use case:** Match analysis, post-match report
- **Relevance:** **VERY HIGH** (post-match insights)
- **Cost:** ~1 call per fixture, revalidate 1h after match
- **Feature idea:** Post-match stats comparison dashboard

#### 18. **Fixture Players**
- **Path:** `/fixtures/players`
- **Data:** Individual player match performance (ratings, stats)
- **Params:** `fixture` (required), `team` (optional)
- **Use case:** Player of match, performance ratings
- **Relevance:** HIGH (enhanced match reports)

#### 19. **Head-to-Head**
- **Path:** `/fixtures/headtohead`
- **Data:** Historical h2h results between teams
- **Params:** `h2h` (format: "team1-team2")
- **Use case:** Pre-match rivalry context
- **Relevance:** MEDIUM (interesting for rivalry matches)

#### 20. **Live/In-Play**
- **Path:** `/fixtures?live=all`
- **Data:** Currently live matches
- **Params:** `live=all` (required)
- **Use case:** Live match ticker widget
- **Relevance:** MEDIUM (could show Liverpool's live match status)

#### 21. **Events** (Deprecated/Unsupported)
- **Path:** `/events` (use `/fixtures/events` instead)
- **Relevance:** OBSOLETE (use fixture events)

#### 22. **Predictions** ⭐
- **Path:** `/predictions`
- **Data:** Match outcome predictions (winner, over/under, goals)
- **Params:** `fixture` (optional), `league` (optional), `season` (optional), `date` (optional)
- **Use case:** Pre-match predictions, engagement content
- **Relevance:** **HIGH** (fan engagement, predictions content)
- **Cost:** ~1 call per fixture
- **Feature idea:** "Expert Prediction" card showing win probability & goals forecast

#### 23. **Odds - Pre-Match** ⭐
- **Path:** `/odds`
- **Data:** Betting odds from bookmakers
- **Params:** `fixture` (optional), `date` (optional), `bookmaker` (optional), `bet` (optional)
- **Use case:** Informational odds display (not accepting bets), engagement
- **Relevance:** **MEDIUM-HIGH** (monetization potential, affiliate commissions)
- **Cost:** ~1 call per fixture
- **Feature idea:** "Odds Board" showing bookmaker consensus

#### 24. **Odds - Live** ⭐
- **Path:** `/odds/live`
- **Data:** In-match live betting odds
- **Params:** `league` (optional), `fixture` (optional)
- **Use case:** Live match engagement
- **Relevance:** MEDIUM (requires real-time updates)

#### 25. **Odds Bookmakers**
- **Path:** `/odds/bookmakers`
- **Data:** Available bookmakers list
- **Params:** None required
- **Use case:** Reference data for odds endpoint
- **Relevance:** LOW

#### 26. **Odds Bets**
- **Path:** `/odds/bets`
- **Data:** Available bet types
- **Params:** `id` (optional), `search` (optional)
- **Use case:** Reference data
- **Relevance:** LOW

#### 27. **Odds Mapping**
- **Path:** `/odds/mapping`
- **Data:** Fixture/team to odds provider mapping
- **Params:** `fixture` (optional), `bookmaker` (optional)
- **Use case:** Internal reference
- **Relevance:** LOW

---

### D. HISTORICAL/REFERENCE (3)

#### 28. **Seasons** (if separate from leagues)
- **Path:** `/seasons`
- **Data:** List of available seasons
- **Params:** None or filters
- **Relevance:** LOW

#### 29. **Seasons Squads** (inferred)
- **Use case:** Historical squad rosters
- **Relevance:** LOW

#### 30. **API Fixtures/Rounds Alternative Names**
- Various naming conventions across documentation
- **Relevance:** LOW (consolidation)

---

## RECOMMENDED PRIORITY MATRIX

### QUICK WINS (High Impact, Low Cost)
| Rank | Endpoint | Why | Effort | Impact | Est. Calls |
|------|----------|-----|--------|--------|-----------|
| 1 | **Injuries** | Real-time squad availability | 2h | VERY HIGH | 1/season |
| 2 | **Fixture Lineups** | Pre-match essential | 3h | VERY HIGH | 1/fixture |
| 3 | **Fixture Events** | Match timeline | 4h | VERY HIGH | 1/fixture |
| 4 | **Fixture Stats** | Post-match insights | 3h | VERY HIGH | 1/fixture |
| 5 | **Teams** | Liverpool profile card | 1h | HIGH | 1/season |
| 6 | **Coaches** | Manager profile | 1h | HIGH | 1/season |

### MEDIUM-TERM ENHANCEMENTS
| Rank | Endpoint | Feature |
|------|----------|---------|
| 7 | **Predictions** | "Expert Prediction" widget |
| 8 | **Transfers** | "Transfer News" section |
| 9 | **Fixture Players** | Player ratings dashboard |
| 10 | **Team Statistics** | Analytics dashboard |
| 11 | **Odds** | Informational odds display |

### FUTURE/LOWER PRIORITY
- Head-to-Head (rivalry context)
- Trophies (player achievements)
- Venues (stadium info)
- Sidelined (complementary to injuries)
- Leagues (other competitions)

---

## IMPLEMENTATION STRATEGY

### Phase 6 Candidates (Next Sprint)

#### 1. **Injury Widget** (3-4 hours)
```typescript
// Add to api-football.ts
export const getInjuries = cache(async (team?: number): Promise<Injury[]> => {
  return apiFetch<Injury>("/injuries", {
    team: team || TEAM_ID,
    season: SEASON,
  });
});
```
- Revalidate: 6 hours (check at game day)
- Display: Squad page badge, homepage widget
- Data: Player name, injury type, expected return

#### 2. **Match Lineups** (4-5 hours)
```typescript
export const getLineups = cache(async (fixtureId: number) => {
  return apiFetch<Lineup>("/fixtures/lineups", {
    fixture: fixtureId,
  });
});
```
- Revalidate: 30min (before match)
- Display: Fixture detail page, formation diagram
- Data: XI, subs, formation, coach instructions

#### 3. **Match Events** (5-6 hours)
```typescript
export const getEvents = cache(async (fixtureId: number) => {
  return apiFetch<Event>("/fixtures/events", {
    fixture: fixtureId,
  });
});
```
- Revalidate: 15min during match, 1h after
- Display: Interactive timeline on fixture page
- Data: Goals, cards, substitutions, VAR

#### 4. **Match Statistics** (4 hours)
```typescript
export const getFixtureStats = cache(async (fixtureId: number) => {
  return apiFetch<FixtureStat>("/fixtures/statistics", {
    fixture: fixtureId,
  });
});
```
- Revalidate: 1h after match
- Display: Post-match stats panel
- Data: Possession, shots, passes, tackles

### Phase 7+ Candidates

#### Predictions Widget
- 1-2 hours integration
- Feature: Win probability, goal forecast
- Revalidate: 1 hour before match

#### Transfer News Page
- Create `/news/transfers` route
- Fetch: `/transfers?team=40`
- Display: Timeline of recent moves

#### Team Profile Card
- Fetch: `/teams?id=40`
- Display: Anfield details, manager, founding year

---

## API-FOOTBALL FREE PLAN LIMITATIONS

⚠️ **Current constraints (free tier, team 40, league 39):**

| Limit | Value |
|-------|-------|
| Requests/day | 100 |
| Seasons available | 2022, 2023, 2024 (NOT 2025/26) |
| League filtering | ❌ No (players show stats from any league) |
| Real-time updates | ✅ 15-second refresh |
| All endpoints | ✅ Included (no paywall) |

**Optimization tips:**
- Cache aggressively (ISR strategy)
- Batch requests (squad + standings in parallel)
- Reuse calls (don't fetch squad 10 times)
- Skip season > 2024 on free plan

---

## COST ANALYSIS

### Current Usage (6 endpoints)
- Squad: 1/day = **30/month**
- Fixtures: 15/day = **450/month**
- Standings: 4/day = **120/month**
- Top Scorers: 4/day = **120/month**
- Top Assists: 4/day = **120/month**
- Player Stats: 5/day = **150/month**
- **Total: ~970 calls/month (well under 3,000/month free limit)**

### Adding Top 6 Recommendations (Lineups + Events + Stats + Injuries + Teams + Coaches)
- Injuries: 2/day = **60/month**
- Lineups: 1.5/day = **45/month**
- Events: 1.5/day = **45/month**
- Stats: 1.5/day = **45/month**
- Teams: 0.1/day = **3/month**
- Coaches: 0.1/day = **3/month**
- **Added: ~201 calls/month**
- **New Total: ~1,171 calls/month (still 27% under free limit)**

✅ **No paid tier needed yet.**

---

## UNRESOLVED QUESTIONS

1. **Live match updates:** Should injury/event data refresh during live matches (15min vs 1h)?
2. **Historical data:** Do you want past season data (2023, 2022) or only current season?
3. **Odds monetization:** Affiliate partnerships with bookmakers for revenue?
4. **Predictions accuracy:** Is 6-algorithm prediction reliable enough for feature?
5. **Storage:** Cache transfers/trophies to PostgreSQL or always fetch from API?

---

## SOURCES

- [API-Football Official Documentation](https://www.api-football.com/documentation-v3)
- [API-Sports Documentation Football v3](https://api-sports.io/documentation/football/v3)
- [API-Football Endpoints News](https://www.api-football.com/news/category/endpoints)
- [Support Endpoints Educational Resource](https://www.educative.io/courses/getting-soccer-data-with-api-football-in-javascript/support-endpoints)
- [API-Football v3 Ruby Gem Reference](https://github.com/agomezcampero/api_football_v3)
- [New Injuries Endpoint Announcement](https://www.api-football.com/news/post/new-endpoint-injuries)
- [Predictions Endpoint Guide](https://www.api-football.com/news/post/predictions-endpoint)

