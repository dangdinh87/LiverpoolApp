# Match Lineup API Research Report

**Date:** March 15, 2026
**Project:** Liverpool FC Fan Site (Next.js)
**Context:** Evaluating free/affordable APIs for match lineups (starting XI, formations, substitutes)

---

## Executive Summary

Nine APIs were evaluated for lineup data capability. **Top recommendation: API-Football (free tier, RapidAPI)** — all endpoints available, no key needed, established. **Close second: Highlightly** — comparable free tier with 30-min pre-kickoff availability guarantee. **Football-Data.org (current provider)** — lineups NOT in free tier (requires €29/mo paid plan).

---

## API Comparison Matrix

| API | Free Tier | Lineups Available | Endpoint | Formation Data | Confirmed vs Predicted | PL Coverage | Rate Limit |
|---|---|---|---|---|---|---|---|
| **API-Football** | ✅ Yes | ✅ Yes | `GET /lineups/{fixture_id}` | ✅ Yes | Confirmed (~1h before) | ✅ Yes | 100/day free |
| **Highlightly** | ✅ Yes (limited leagues) | ✅ Yes | `GET /lineups` | ✅ Yes | Predicted (30min before) | ✅ Yes (restricted) | Limited free tier |
| **Football-Data.org** | ✅ Yes | ❌ No | Via match endpoint | ✅ Yes (in paid) | N/A | ✅ Yes (10 req/min free) | 10/min free |
| **TheSportsDB** | ✅ Yes (5 req/mo) | ✅ Yes | `/api/v2/lookup/event_lineup/{id}` | ✅ Yes | Confirmed | ⚠️ Limited | 5/mo free |
| **SportMonks** | ✅ Yes (2 leagues) | ✅ Yes | Via matches endpoint | ✅ Yes | Both available | ❌ Not PL | Variable |
| **OpenLigaDB** | ✅ Yes | ⚠️ Partial | REST JSON | Unknown | Unknown | ❌ No | Unlimited |
| **Sofascore** | ❌ Unofficial only | ✅ Via wrapper | Undocumented | ✅ Yes | Both types | ✅ Yes | Varies |
| **FotMob** | ❌ No public API | ❌ App only | N/A | N/A | N/A | N/A | N/A |
| **AllSportsAPI** | ❌ Paid only | ✅ Yes | Via lineups endpoint | ✅ Yes | Both types | ✅ Yes | Paid plans |

---

## Detailed API Profiles

### 1. API-Football (RapidAPI)
**Status:** ✅ Recommended
**Provider:** api-sports.io (available via RapidAPI)

**Free Tier:**
- 100 calls/day (base rate)
- All endpoints included
- No credit card required
- Seasonal data limitations (newer seasons may be restricted on free tier)

**Lineups Endpoint:**
- **URL Pattern:** `GET https://api-football-v1.p.rapidapi.com/lineups/{fixture_id}`
- **Auth:** `X-RapidAPI-Key` header
- **Returns:**
  - `formation` (e.g., "3-4-3")
  - `coach` (name)
  - `startXI` array (player id, name, number, position)
  - `substitutes` array (same structure)

**Timing:**
- Confirmed lineups typically available ~1 hour before kickoff
- Until `lineup_confirmed: true` in fixture, shows predicted lineup based on injuries/suspensions
- Once official, data doesn't change (no need for repeated polling)

**Premier League:** ✅ Full coverage
**Formation Data:** ✅ Included as string (e.g., "4-2-3-1")

**Pros:**
- Free tier fully functional
- Well-documented
- No key registration hassle (uses RapidAPI)
- Consistent data quality
- Covers 1,200+ competitions

**Cons:**
- RapidAPI dependency (requires account)
- Daily quota limit (100 calls/day is tight if polling multiple matches)
- Seasonal data restrictions on free tier

**Cost:** Free tier, or $9.99+/month for higher limits

---

### 2. Highlightly
**Status:** ✅ Good Alternative (with caveats)

**Free Tier:**
- BASIC plan: ~20 leagues only (limited)
- Some endpoints restricted
- PRO plan described as "quite cheap"

**Lineups Endpoint:**
- **URL Pattern:** `GET /lineups` (match ID required)
- **Availability Guarantee:** 30 minutes before kickoff
- **Returns:** Not fully documented in search results

**Premier League:** ⚠️ Available but may be restricted on free tier
**Formation Data:** ✅ Included (based on documentation mention)

**Pros:**
- Explicit 30-min pre-kickoff timing guarantee (useful for live UI)
- Supports 950+ leagues (when on paid tier)
- Updates ~1x per minute

**Cons:**
- Free tier severely limited (only ~20 leagues)
- Lineups may be hidden on free tier for some matches
- Less popular than API-Football
- PRO plan cost not specified

**Cost:** Free (very limited), PRO plan (unknown cost)

---

### 3. Football-Data.org (Current Provider)
**Status:** ⚠️ Upgrade Required for Lineups

**Free Tier:**
- 10 req/min, 12 competitions
- **Lineups NOT included**

**Paid Tiers (First includes lineups):**
- **Free + Deep Data (€29/mo):**
  - Lineups & subs
  - Goal scorers
  - Cards
  - Squad info
  - 30 req/min
  - Up to 25 competitions

**Lineups Endpoint:**
- **URL Pattern:** Via `/matches/{matchId}` with `lineup` filtering support
- **Returns (when available):**
  - `homeTeam.lineup[]` with: id, name, position, shirtNumber
  - `homeTeam.bench[]` (same structure)
  - `homeTeam.formation` (e.g., "4-2-3-1")
  - `homeTeam.coach` (name)
  - Same for `awayTeam`

**Notes:**
- Lineups are not updated during match (only once before/at start)
- Default match responses lack lineups unless specific headers set

**Pros:**
- Already integrated in your codebase
- Reliable, established provider
- Clear pricing tiers

**Cons:**
- **Must pay €29/mo to access lineups** (current free tier insufficient)
- Monthly commitment vs. API-Football's pay-as-you-go

**Cost:** €29/month + (€15/mo for odds/advanced stats optional)

---

### 4. TheSportsDB
**Status:** ⚠️ Minimal Free Tier

**Free Tier:**
- Test key "123" available
- **5 requests/month limit** (extremely restrictive)

**Lineups Endpoint:**
- **V1 URL:** `lookuplineup.php?id={idEvent}&l=en`
- **V2 URL:** `/api/v2/json/lookup/event_lineup/{idEvent}`
- **Auth:** API key required in V2 (header `X-API-KEY`)
- **Returns:** Team lineups (structure not fully detailed)

**Premier League:** Limited coverage (fan-sourced data)

**Pros:**
- Community-driven (fan artwork + stats)
- Free test access

**Cons:**
- **5 req/month is unusable for production**
- Data quality varies (crowdsourced)
- Paid tier costs not advertised
- No official Premier League partnership

**Cost:** Free (5 req/mo), unknown premium

---

### 5. SportMonks
**Status:** ❌ Not Viable (Limited Free Tier)

**Free Tier:**
- **Only 2 leagues:** Danish Superliga, Scottish Premiership
- Same professional-grade data as paid (just league-restricted)
- Call capacity limits

**Lineups:**
- ✅ Available in free tier
- Includes: startXI, substitutes, formation, coach, field positions

**Premier League:** ❌ Not included in free tier

**Pros:**
- Excellent lineup data structure (type_id for starters/subs, formation_field coordinates)
- Professional documentation

**Cons:**
- Premier League requires paid plan
- Free tier only 2 leagues
- Overkill for PL-focused site

**Cost:** Paid plans (unknown starting price)

---

### 6. OpenLigaDB
**Status:** ⚠️ Limited Info / Community Data

**Free Tier:** ✅ Completely free, no key

**Lineups Support:** Unclear from docs (partial/indirect)

**Coverage:** German Bundesliga, Champions League, World Cup focus

**Pros:**
- No API key needed
- Unlimited requests
- Community-sourced

**Cons:**
- Data accuracy/completeness varies
- Lineup support not documented
- Not designed for PL specifically

**Cost:** Free

---

### 7. Sofascore (Unofficial API)
**Status:** ❌ Unsupported / High Maintenance Risk

**Note:** No official public API; only community-built wrappers exist.

**Unofficial Wrappers:**
- `sofascore-wrapper` (Python)
- `ScraperFC` (Python)
- `soccerdata` (Python library)

**Pros:**
- Rich data (unofficial doesn't mean low quality)
- Covers 1000+ matches/day

**Cons:**
- **No official support** (API subject to change/breakage)
- Unmaintained wrappers likely
- Terms of service violation risk
- Not recommended for production

**Cost:** Free (but at risk)

---

### 8. FotMob
**Status:** ❌ No Public API

**Note:** FotMob has a user-facing lineup builder but no official developer API.

**Cost:** N/A (not available)

---

### 9. AllSportsAPI
**Status:** ⚠️ Paid Only

**Free Tier:** ❌ None (paid plans only)

**Lineups:** ✅ Included (requires plan)

**Coverage:** 400+ leagues including PL

**Pros:**
- Affordable pricing
- Comprehensive league coverage

**Cons:**
- No free tier to evaluate
- Requires signup + payment

**Cost:** Paid plans (unknown entry price)

---

## Lineup Timing & Availability

### When Confirmed Lineups Become Available
**Standard timing:** ~1 hour before kickoff (60-90 minutes pre-match)
- Clubs release official lineups to avoid tactical leaks
- Varies by competition (PL tends to be earlier, cup matches variable)

### Predicted vs Confirmed
- **Predicted (pre-release):** Based on:
  - Previous lineups
  - Injury updates
  - Suspension status
  - Form/rotation patterns
- **Confirmed:** Official, immutable once set
- Most APIs include a `lineup_confirmed` boolean flag
- Premium tiers may have "Expected Lineups" (AI-predicted based on ML patterns)

### Free Sources for Predicted Lineups (Non-API)
1. **FPL.Team** — Predicted XIs for all 20 PL teams
2. **Fantasy Football Scout** — Community lineup predictions
3. **Fantasy Football Pundit** — Start probability percentages
4. **DraftFC** — AI-powered predictions
5. **RotoWire Soccer** — Predicted & confirmed lineups

These are **human-curated** predictions (good for UI testing, not for sync automation).

---

## Architecture Recommendation for LiverpoolApp

### Option A: API-Football (Recommended)
```
Current: Football-Data.org (FDO provider)
Switch to: API-Football via RapidAPI

Changes:
1. Create api-football-provider.ts (parallel to fdo-provider.ts)
2. Implement getFixtureLineups() pulling from /lineups/{fixture_id}
3. Cache lineups for 24h (immutable after match starts)
4. Fall back to FDO for other endpoints (squad, standings, etc.)

Pros:
- Zero cost on free tier
- Minimal refactor (pluggable provider pattern already in place)
- Well-tested API

Cons:
- 100 calls/day limit (tight for polling multiple matches)
- RapidAPI account required
```

### Option B: Keep FDO + Upgrade Plan
```
Switch FDO to €29/mo "Free + Deep Data" tier
- Lineups included
- 30 req/min (vs 10)
- All existing integrations work unchanged

Pros:
- Zero code changes
- Reliable, familiar API
- Slightly higher rate limits

Cons:
- Monthly commitment (€348/year)
- Overkill if only lineups needed
```

### Option C: Hybrid (FDO primary + API-Football for lineups)
```
Keep current FDO setup for:
- Squad, standings, fixtures, coach, stats

Add API-Football for:
- Match lineups (only when needed, ~2-5 calls/day)
- Low API quota impact
- Fallback if FDO free tier sufficient for other features

Pros:
- Flexibility, minimize costs
- Test API-Football integration without full migration
- Bailout option if either API fails

Cons:
- Complexity (two providers)
- Import/auth management
```

---

## Implementation Checklist

If integrating lineups via new provider:

- [ ] **Data Structure:** Define canonical `FixtureLineup` type (already exists in `/lib/types/football.ts`)
- [ ] **Endpoint Integration:** Add `getFixtureLineups(fixtureId)` to provider interface
- [ ] **Caching:** Decide cache TTL (lineups immutable after ~match start, can be 24h+)
- [ ] **Error Handling:** Graceful fallback when lineups unavailable (pre-kickoff or API error)
- [ ] **UI Display:** Create `<LineupViewer>` component showing:
  - Formation (e.g., "3-4-3")
  - Starting XI (with positions, numbers)
  - Substitutes/bench
  - Coach name
- [ ] **Live Fixture Detail:** Add lineups to `/fixtures/[id]` page (if live/pre-kickoff)
- [ ] **Database (optional):** Store lineups in Supabase for historical analysis
- [ ] **Rate Limit Monitoring:** Track API calls per day (if free tier quota)

---

## Cost-Benefit Analysis

| Option | Setup Cost | Monthly Cost | Lineups Access | Risk |
|---|---|---|---|---|
| Keep FDO (free tier) | $0 | $0 | ❌ None | Blocked feature |
| Upgrade FDO to €29/mo | $0 | €29 | ✅ Full | Recurring cost |
| Switch to API-Football | ~2h dev | $0 | ✅ Full (100/day limit) | Quota exhaustion |
| Hybrid (FDO + API-Football) | ~4h dev | $0 | ✅ Full (redundancy) | Complexity |

---

## Unresolved Questions

1. **API-Football daily quota (100/day):** How many fixture lineup calls per day for a single team (Liverpool)?
   - Liverpool plays ~50-60 matches/year (~5 live/upcoming at any time)
   - Pre-fetch 1h before kickoff = ~5 calls/match = reasonable
   - But if polling every hour for prediction updates, quota could hit limits
   - **Action:** Test with trial account to confirm typical usage

2. **Highlightly free tier:** Which leagues are included in free BASIC plan?
   - Docs state "~20 leagues" but PL inclusion unclear
   - **Action:** Check their dashboard or contact support

3. **Football-Data.org pricing:** Is there a lighter plan between €0 and €29?
   - Documentation suggests no, but worth confirming
   - **Action:** Contact sales

4. **Sofascore unofficial API stability:** How frequently do wrappers break?
   - Community-maintained, high risk
   - **Action:** Avoid unless desperate

5. **Lineup history:** Do you need to store confirmed lineups in DB for historical analysis?
   - Affects schema design and retention policy
   - **Action:** Clarify product requirements with team

---

## Sources

- [Football-Data.org API Documentation](https://docs.football-data.org/general/v4/index.html)
- [Football-Data.org Match Endpoint](https://docs.football-data.org/general/v4/match.html)
- [Football-Data.org Pricing](https://www.football-data.org/pricing)
- [API-Football Documentation](https://www.api-football.com/documentation-v3)
- [API-Football Lineups Post](https://www.api-football.com/news/post/line-ups)
- [API-Sports Documentation](https://api-sports.io/documentation/football/v3)
- [Highlightly Football API](https://highlightly.net/documentation/football/)
- [SportMonks Lineups & Formations](https://docs.sportmonks.com/v3/tutorials-and-guides/tutorials/lineups-and-formations)
- [TheSportsDB API Documentation](https://www.thesportsdb.com/documentation)
- [RapidAPI Free Football APIs](https://rapidapi.com/Creativesdev/api/free-api-live-football-data)
- [Fantasy Premier League Predicted Lineups Resources](https://fpl.team/predicted-lineups/)
- [FPL Scout Predicted Lineups](https://www.fantasyfootballscout.co.uk/team-news)

---

**Report Generated:** March 15, 2026, 22:19 UTC
**Next Steps:** Evaluate Option A (API-Football free tier trial) vs Option B (FDO upgrade) based on team priorities and budget.
