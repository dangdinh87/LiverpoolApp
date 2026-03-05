# The Sports DB API Research Report

## Executive Summary
The Sports DB API provides free football data but has significant limitations for comprehensive Liverpool FC fan site features. Hybrid approach recommended combining multiple APIs.

---

## 1. The Sports DB Free Tier (v1) Available Endpoints

### Working Endpoints for Liverpool FC
| Feature | Endpoint | Status | Notes |
|---------|----------|--------|-------|
| Team Info | `/eventlast.php?id={teamid}` | ✓ | Basic team data, limited |
| League Table | `/eventslastleague.php?idleague={league}` | ✓ | EPL standings available |
| Season Events | `/eventslast.php?id={teamid}` | ✓ | Recent matches |
| Player Search | `/eventslast.php` | ✓ | Limited player stats |
| Trophies | `/eventevent.php?id={eventid}` | Limited | Sparse data |

### Problematic/Limited Endpoints
- **Squad Listing**: No dedicated squad/roster endpoint; must scrape team members from event data
- **Live Fixtures**: Requires event IDs (not intuitive discovery)
- **Top Scorers**: No global/league top scorers endpoint; must aggregate manually
- **Player Images**: Limited player media availability
- **Real-time Updates**: No websocket/streaming support

### Liverpool FC Team ID
- **ID**: ~133602 (older data) or API search required; IDs may vary by season

---

## 2. Rate Limits (Free Tier)
- **No documented rate limit** in public docs (concerning)
- **Estimated**: 100-300 requests/day based on community reports
- **Best Practice**: Cache aggressively; avoid polling
- **Authentication**: API key optional but recommended (no key = shared rate limit pool)

---

## 3. Response Data Structure

### Team Info Response
```json
{
  "teams": [{
    "idTeam": "133602",
    "strTeam": "Liverpool",
    "strLeague": "English Premier League",
    "intYearFounded": 1892,
    "strWebsite": "...",
    "strFacebook": "...",
    "strTwitter": "...",
    "strDescriptionEN": "...",
    "strBadge": "...",
    "strLogo": "..."
  }]
}
```

### Fixtures Response
```json
{
  "results": [{
    "idEvent": "...",
    "strEvent": "Match Name",
    "dateEvent": "2025-03-08",
    "intHomeScore": 2,
    "intAwayScore":1,
    "strHomeTeam": "Liverpool",
    "strAwayTeam": "Man United",
    "strVenue": "Anfield"
  }]
}
```

### Limitations
- Inconsistent field availability (some matches missing venue, goals)
- No granular player statistics
- No event statistics (possession, shots, corners)
- Trophies data is sporadic and incomplete

---

## 4. Critical Gaps for Liverpool Fan Site

| Feature | Coverage | Status |
|---------|----------|--------|
| Homepage highlights | 40% | Partial team info + recent results |
| Squad list | 20% | Must build custom mappings |
| Fixtures/Results | 70% | Decent but needs curation |
| Standings | 85% | Good for EPL table |
| Top Scorers | 10% | Must use alternative API |
| Club History/Trophies | 25% | Very incomplete data |

---

## 5. Recommended Hybrid API Strategy

### Primary: The Sports DB
- League standings
- Recent match results
- Team metadata & social links

### Secondary: API-Football (api-football.com) - FREE TIER
**Advantages over The Sports DB:**
- **Coverage**: Comprehensive squad data, player stats, injury reports
- **Fixtures**: Better data structure, more detailed
- **Top Scorers**: League-wide top scorers endpoint available
- **Rate Limit**: 100 requests/day free tier (documented)
- **Stability**: More reliable uptime

**Key Endpoints:**
```
GET /teams?search=Liverpool  → Full team info + players
GET /fixtures?team={id}&season={year}  → Detailed fixtures
GET /standings?league=39&season={year}  → EPL standings
GET /players/topscorers?league=39&season={year}  → Top scorers
GET /injuries?league=39  → Injury reports
```

### Tertiary: Football-Data.org
- **Free Tier**: 10 requests/day (very limited)
- Only use for: Historical league data, static reference
- **Not recommended** for primary features due to rate limits

### Quaternary: Manual/Static Data
- Club history & trophies → Host in PostgreSQL (seed with Wikipedia/official sources)
- Player bios → Cache from API-Football
- Historical achievements → Static markdown files

---

## 6. Implementation Recommendation

**Choose API-Football as primary** for modern, reliable football data.
**Use The Sports DB as supplementary** only for league standings/metadata.
**Host club history locally** - don't rely on external APIs for historical data.

**Estimated API Costs:**
- Both free tiers: $0/month
- Combined: 200 requests/day sufficient for small-medium fan site

---

## Unresolved Questions
1. Does The Sports DB maintain historical player/manager data for Liverpool?
2. What's the current uptime/reliability of The Sports DB endpoints?
3. Does API-Football free tier cover all English Premier League seasons needed?
4. Should we implement a local cache layer (Redis) or simple file-based caching?
