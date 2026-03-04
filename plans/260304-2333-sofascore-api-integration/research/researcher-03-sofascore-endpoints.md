# SofaScore API Research — Reverse-Engineered Endpoints (2025-26)

**Date:** March 4, 2026 | **Status:** Active, No Official Support | **Risk Level:** High (ToS violation)

---

## 1. Base URL & Authentication

**Base URL:** `https://www.sofascore.com/api/v1` (also `https://api.sofascore.com/api/v1`)

**Headers Required:**
- `User-Agent`: Must rotate dynamically (recommended: Faker library or browser user agents)
- No auth tokens needed; endpoint access is unauthenticated

**Cloudflare Protection:** SofaScore uses Varnish + Cloudflare. IPs making 25-30+ requests/min will receive 503/1015 rate-limit errors. Ban duration: 10s–24h depending on severity.

---

## 2. Liverpool FC & Premier League Identifiers

| Entity | SofaScore ID |
|--------|-------------|
| **Liverpool FC (Team)** | 44 |
| **Premier League (Tournament)** | 17 |
| **Season 2024-25** | 52186 (approx.) |
| **Season 2025-26** | TBD (check `GET /unique-tournament/17/seasons`) |

---

## 3. Working Endpoints

### A. League Standings
```
GET /unique-tournament/{tournamentId}/season/{seasonId}/standings/total
GET /unique-tournament/{tournamentId}/season/{seasonId}/standings/home
GET /unique-tournament/{tournamentId}/season/{seasonId}/standings/away
```
**Example:** `https://www.sofascore.com/api/v1/unique-tournament/17/season/52186/standings/total`

**Response:** JSON with 3 standings objects (combined, home, away). Each has `rows[]` containing teams with `position`, `name`, `points`, `matches`, `wins`, etc.

### B. Team Matches/Fixtures
```
GET /team/{teamId}/events
GET /team/{teamId}/events/{pageNum}
```
**Example:** `https://www.sofascore.com/api/v1/team/44/events`

**Response:** Array of match objects with `homeTeam`, `awayTeam`, `homeScore`, `awayScore`, `status`, `startTimestamp`.

### C. Match Details & Lineups
```
GET /event/{eventId}
GET /event/{eventId}/lineups
GET /event/{eventId}/statistics
GET /event/{eventId}/graph
GET /event/{eventId}/shotmap
```
**Example:** `https://www.sofascore.com/api/v1/event/12345678`

**Response (Event):** Match metadata + `homeTeam.name`, `awayTeam.name`, `homeScore`, `awayScore`, `startTimestamp`.
**Response (Lineups):** `home[]` and `away[]` arrays with player objects (ID, name, position, rating).
**Response (Statistics):** Detailed match stats (possession, shots, passes, tackles, etc.).

### D. Player Statistics
```
GET /unique-tournament/{tournamentId}/season/{seasonId}/statistics
    ?limit=100
    &order=-rating
    &offset=0
    &accumulation=total|per90|perMatch
    &fields={stat_fields}
    &filters=position.in.{positions}

GET /player/{playerId}/unique-tournament/{tournamentId}/season/{seasonId}/heatmap/overall
GET /player/{playerId}/unique-tournament/{tournamentId}/season/{seasonId}/rating
```
**Example:** `https://www.sofascore.com/api/v1/unique-tournament/17/season/52186/statistics?limit=100&order=-rating&accumulation=total`

**Response (Statistics):** `results[]` with player stats: `goals`, `assists`, `rating`, `minutesPlayed`, etc. Paginated via `page`/`pages`.
**Response (Heatmap):** `points[]` array with x,y coordinates for season-long heat map.

### E. Team/Season Stats
```
GET /team/{teamId}/unique-tournament/{tournamentId}/season/{seasonId}/statistics/overall
```
**Example:** `https://www.sofascore.com/api/v1/team/44/unique-tournament/17/season/52186/statistics/overall`

**Response:** Aggregated team stats (goals, assists, possession %, shots, defensive metrics).

### F. Tournament Seasons
```
GET /unique-tournament/{tournamentId}/seasons
```
**Response:** Array of season objects with `id`, `year`, `name`. Use to discover current season ID.

---

## 4. Response Format Examples

### Match Object (Events)
```json
{
  "id": 12345678,
  "homeTeam": {"id": 44, "name": "Liverpool"},
  "awayTeam": {"id": 50, "name": "Manchester United"},
  "homeScore": {"current": 2, "display": 2},
  "awayScore": {"current": 1, "display": 1},
  "status": {"code": 100, "description": "Ended"},
  "startTimestamp": 1704067200,
  "tournament": {"id": 17, "name": "Premier League"}
}
```

### Standings Row
```json
{
  "position": 1,
  "team": {"id": 44, "name": "Liverpool"},
  "matches": 15,
  "wins": 12,
  "draws": 2,
  "losses": 1,
  "points": 38,
  "scoresFor": 35,
  "scoresAgainst": 12
}
```

### Player Stat
```json
{
  "player": {
    "id": 123456,
    "name": "Mohamed Salah",
    "position": "F"
  },
  "statistics": {
    "goals": 8,
    "assists": 5,
    "rating": 7.45,
    "minutesPlayed": 1350
  }
}
```

---

## 5. Rate Limiting & Mitigation

| Factor | Guidance |
|--------|----------|
| **Request Frequency** | 1 request per 25–30 seconds max (avoid clustering) |
| **Concurrent Requests** | Single-threaded recommended |
| **User-Agent Rotation** | Use Faker or real browser agents; rotate per request |
| **Ban Detection** | 503, 1015, 403 errors indicate rate-limit hit |
| **Ban Duration** | 10s–24h; usually auto-lifts after inactivity |
| **IP Rotation** | Residential/IPv6 proxies reduce detection (if available) |
| **Cache Strategy** | Cache responses 6–24h to minimize API calls |

**Mitigation:** Implement exponential backoff (5s→10s→30s) on 503/1015 errors.

---

## 6. npm Packages & GitHub Resources

| Project | Type | Status | Notes |
|---------|------|--------|-------|
| [@sindicuab/sofascore-api](https://www.npmjs.com/package/@sindicuab/sofascore-api) | npm | Active (v0.1.7, 4mo old) | Quick ID lookup package |
| [apdmatos/sofascore-api](https://github.com/apdmatos/sofascore-api) | Docs | Active | Full API endpoint documentation |
| [victorstdev/sofascore-api-stats](https://github.com/victorstdev/sofascore-api-stats) | Python | Active | Match/tournament data scraper |
| [devsmith88/sofascore-php-sdk](https://github.com/devsmith88/sofascore-php-sdk) | PHP | Active | SDK with Team/Player/Event services |
| [LanusStats/sofascore.py](https://github.com/federicorabanos/LanusStats/blob/main/LanusStats/sofascore.py) | Python | Active | Complete implementation with lineups, heatmaps, stats |

**Recommendation:** Use `@sindicuab/sofascore-api` for ID lookups; reference `devsmith88/sofascore-php-sdk` or LanusStats for endpoint patterns.

---

## 7. ID Mapping: SofaScore vs API-Football

| Entity | SofaScore | API-Football | Notes |
|--------|-----------|--------------|-------|
| Liverpool Team | 44 | 40 | Different ID systems; no direct mapping |
| Premier League | 17 | 39 | Different tournament IDs |
| Player IDs | 6-7 digits | 5-6 digits | Incompatible; maintain separate lookups |
| Season IDs | 5 digits (52186) | 2-digit year (2024) | SofaScore uses internal season IDs |

**Migration Strategy:** Create a lookup table in DB for cross-referencing both APIs by player/team name + season context.

---

## 8. Known Warnings & Limitations

- **No Official Support:** SofaScore explicitly states data unavailable via public API due to provider agreements. Use at own risk.
- **Player Stats Filtering:** Some endpoints don't have league filters; may return multi-league stats for players.
- **Live Data:** Real-time updates lag 30s–2min behind SofaScore UI.
- **Historical Data:** Older seasons (pre-2020) may have incomplete data.
- **Maintenance Risk:** Endpoint signatures can change without notice. Monitor for 404s.

---

## 9. Implementation Checklist

- [ ] Choose npm package or build direct HTTP client
- [ ] Implement User-Agent rotation (Faker or browser list)
- [ ] Add 25–30s request throttling + exponential backoff on rate limits
- [ ] Cache responses 6–24h to DB/Redis
- [ ] Map SofaScore IDs to API-Football IDs in lookup table
- [ ] Monitor for 503/1015 errors and implement auto-retry
- [ ] Test endpoints: standings → matches → lineups → player stats
- [ ] Document season/tournament IDs for current + future seasons

---

**Unresolved Questions:**
- Exact season ID for 2025-26 (needs `/unique-tournament/17/seasons` call)
- Whether SofaScore will increase enforcement against reverse-engineered API usage
- Long-term sustainability of current endpoint structure (may change in 2026)

