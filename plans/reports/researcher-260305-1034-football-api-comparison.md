# Free Football APIs Research: 2025-26 Premier League Support

**Research Date:** 2026-03-05
**Goal:** Evaluate free/freemium football APIs for Liverpool FC fan app (2025-26 season)
**Current Provider:** API-Football (limited to 2024 season on free tier)

---

## COMPARISON TABLE

| API | Free Tier Limit | 2025-26 Support | Key Endpoints | Auth | Geo-Block | Update Freq | Status |
|-----|-----------------|-----------------|----------------|------|-----------|-------------|--------|
| **API-Football** | 100 req/day | ❌ Blocked (2024 max) | Squad, Fixtures, Standings, Events, Lineups, Stats | API Key | No | Live | NOT RECOMMENDED |
| **Football-Data.org** | 10 req/min (600/hr) | ✅ YES | Standings, Fixtures, Teams | Token | No | Real-time | RECOMMENDED |
| **SportMonks** | 3000/entity/hr | ⚠️ Limited (Danish, Scottish) | Squad, Fixtures, Events, Lineups, Stats | API Key | No | Live | PARTIAL |
| **TheSportsDB** | Rate-limited (1 req/min avg) | ✅ YES | Events, Teams, Players, Artwork | API Key | No | Manual | LIMITED DATA |
| **OpenFootball (football.db)** | Unlimited (static JSON) | ✅ YES | Fixtures, Teams (static) | None | No | Weekly | BACKUP ONLY |
| **iSports API** | Free tier available | ⚠️ Check | Squad, Fixtures, Stats, Standings | API Key | **NO** (Asia-optimized) | Live | UNKNOWN |

---

## DETAILED API ANALYSIS

### 1. API-FOOTBALL (Current Provider) ❌ NOT VIABLE
**Status:** FREE TIER BLOCKS 2025-26 SEASON

**Free Tier Limits:**
- 100 requests/day
- Season coverage: 2022-2024 only (2025 not available)
- Rate limit: 50 req/min burst

**2025-26 Support:** ❌ NO
- Free plan explicitly limited to past seasons (2022-2024)
- Paid plans required for 2025-26 access
- Your current app relies on 2024 data + mock fallback

**Endpoints Available (when season supported):**
- ✅ Squad, Fixtures, Standings
- ✅ Match Events (goals, cards, subs)
- ✅ Lineups, Player Stats

**Authentication:** API Key (RapidAPI or direct)
**Geo-blocking:** None detected
**Data Quality:** High (verified, real-time)
**Cost to Add 2025-26:** Paid plan required (~$20-100/month)

**Action:** Switch to alternative immediately.

---

### 2. FOOTBALL-DATA.ORG ✅ RECOMMENDED REPLACEMENT
**Status:** FULLY SUPPORTS 2025-26, FREE TIER

**Free Tier Limits:**
- 10 requests/minute (600/hour)
- Rate limit: Registered clients only
- Free forever for top competitions

**2025-26 Support:** ✅ YES
- Premier League fully supported
- Champions League, Bundesliga, La Liga, Serie A, Ligue 1 all included
- Free tier explicitly covers these competitions

**Endpoints Available:**
- ✅ Standings (current, home, away splits)
- ✅ Fixtures (scheduled, live, completed)
- ✅ Matches (results, status)
- ❌ Lineups (premium only)
- ❌ Player stats (limited)
- ❌ Match events (goals/cards - premium only)

**Authentication:** API Token (free registration required)
**Geo-blocking:** None detected
**Data Quality:** High (official league data)
**Response Format:** JSON
**Update Frequency:** Real-time

**Limitations:**
- No detailed player stats on free tier
- No match event data (goals, cards, subs)
- No lineups
- Good for standings + fixtures only

**Recommendation:** Use as primary for **standings + fixtures**, pair with another API for event details.

---

### 3. SPORTMONKS FOOTBALL API ⚠️ PARTIAL SUPPORT
**Status:** FREE TIER EXISTS but LIMITED LEAGUES

**Free Tier Limits:**
- 3,000 requests/entity/hour (per-entity rate limit, not global)
- Selected leagues only: Danish Superliga, Scottish Premiership
- **Premium required for Premier League**

**2025-26 Support:** ⚠️ CONDITIONAL
- Premier League NOT in free tier
- Paid plans include 2500+ leagues including PL
- Free tier excludes your target league

**Endpoints (if Premier League accessible):**
- ✅ Squad, Fixtures, Events, Lineups, Stats
- ✅ Live scores, standings
- ✅ Comprehensive event data

**Authentication:** API Key
**Rate Limiting:** Per-entity hourly (not per-request)
**Geo-blocking:** None detected
**Cost:** Free for selected leagues, paid for PL

**Action:** Not viable without premium.

---

### 4. THESPORTSDB ✅ PARTIAL ALTERNATIVE
**Status:** FREE TIER WITH LIMITS

**Free Tier Limits:**
- Rate limit: ~1 request/minute (enforced via 429 responses)
- Variable limits per endpoint (e.g., highlights 2 free/50 premium)
- Crowdsourced database

**2025-26 Support:** ✅ YES
- English Premier League (ID: 4328) fully supported
- Historical + current season data

**Endpoints Available:**
- ✅ Events (fixtures, results, scores)
- ✅ Teams, Players
- ✅ Artwork (logos, banners, fanart)
- ❌ Match events (goals/cards - limited/none)
- ❌ Lineups
- ❌ Detailed player stats

**Authentication:** API Key
**Geo-blocking:** None detected
**Data Quality:** Crowdsourced (variable quality)
**Update Frequency:** Manual/community-driven

**Limitations:**
- Very low rate limits (1 req/min)
- Missing detailed event data
- Data quality varies by league
- More suited for artwork + basic fixture info

**Recommendation:** Use as **secondary data source** for artwork/logos, not primary.

---

### 5. OPENFOOTBALL (football.db) ✅ BACKUP STATIC DATA
**Status:** FREE, FULLY OPEN, ZERO RATE LIMITS

**Free Tier Limits:**
- Unlimited (static JSON files)
- No API key required
- GitHub-hosted

**2025-26 Support:** ✅ YES
- English Premier League 2025-26 available
- Direct JSON: `openfootball.github.io/england/2025-26/1-premierleague.json`
- Community-maintained, fully open data

**Endpoints Available:**
- ✅ Fixtures (schedule only)
- ✅ Teams
- ✅ Basic structure
- ❌ Live scores
- ❌ Standings
- ❌ Match events
- ❌ Lineups
- ❌ Player stats

**Authentication:** None
**Geo-blocking:** None
**Data Quality:** Community-driven, static
**Update Frequency:** Weekly
**Format:** JSON (flat files on GitHub)

**Limitations:**
- Static data only (not real-time)
- No live updates
- Limited to fixture schedules
- Minimal player information

**Recommendation:** Use as **fallback fixture schedule** only, not primary.

---

### 6. ISPORTS API ⚠️ ASIA-OPTIMIZED, UNTESTED
**Status:** UNKNOWN (RESEARCH NEEDED)

**Free Tier Limits:**
- Free tier available (exact limits unclear)
- Strong Asia-Pacific focus

**2025-26 Support:** ⚠️ UNCLEAR
- Premier League coverage not explicitly confirmed
- Asia-focused suggests regional leagues prioritized

**Key Advantage:**
- Optimized for Vietnam access (no geo-blocking reported)
- Real-time, verified data focus
- Lower latency from Asia

**Limitations:**
- Limited public documentation found
- May not prioritize Premier League

**Status:** Requires direct testing if international access is critical.

---

## DECISION MATRIX

### Option A: FOOTBALL-DATA.ORG + LOCAL FALLBACK (RECOMMENDED)
**Primary:** Football-Data.org (free, standings + fixtures)
**Secondary:** TheSportsDB (artwork + basic info)
**Fallback:** OpenFootball (fixture schedule)

**Pros:**
- ✅ 100% free forever
- ✅ Supports 2025-26
- ✅ No geo-blocking
- ✅ Good rate limits (10 req/min)
- ✅ Real-time standings + fixtures

**Cons:**
- ❌ No match events (goals/cards/subs)
- ❌ No lineups
- ❌ No detailed player stats
- ⚠️ Requires migration from API-Football

**Effort:** Medium (refactor data fetching, lose some features)

---

### Option B: API-FOOTBALL PAID PLAN
**Primary:** API-Football premium
**Cost:** ~$20-100/month

**Pros:**
- ✅ Feature-complete (all endpoints)
- ✅ Minimal refactoring needed

**Cons:**
- ❌ Recurring cost
- ❌ Paid commitment

---

### Option C: HYBRID (MULTI-SOURCE)
**Primary:** Football-Data.org (standings, fixtures)
**Events:** Custom scraper or accept data gaps
**Stats:** Cache from API-Football (2024) or estimate

**Pros:**
- ✅ 100% free
- ✅ Real-time core data

**Cons:**
- ❌ Complex architecture
- ❌ Missing event data

---

## UNRESOLVED QUESTIONS

1. **iSports API specifics** — Is Premier League covered on free tier? Documentation not accessible.
2. **Football-Data.org event data roadmap** — Will free tier ever include match events?
3. **TheSportsDB data freshness** — How quickly is crowdsourced data updated during season?
4. **LiveScore API** — Mentioned in initial search but not fully evaluated; requires separate research.
5. **Vietnam geo-blocking verification** — Need direct testing from Vietnam IP to confirm no blocking.

---

## RECOMMENDATION

**Use Football-Data.org as primary free alternative:**

1. Migrate fixtures + standings to Football-Data.org (free, 2025-26 supported)
2. Accept missing match event data (goals/cards/subs) unless implementing paid solution
3. Use TheSportsDB for artwork + fallback fixture info
4. Cache 2024 season stats as placeholder for player stats pages
5. Flag missing data in UI with "Coming soon" messaging

**Cost:** $0
**Setup Time:** 2-4 hours (API client refactor)
**Data Loss:** Match events + detailed lineups (re-add if upgrading)

---

**Report Generated:** 2026-03-05 10:34
**Researcher:** Claude Code (Technical Research Specialist)
