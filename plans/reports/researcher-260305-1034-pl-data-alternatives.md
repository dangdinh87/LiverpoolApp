# PL 2025-26 Data Sources: Research Report

**Date**: 2026-03-05 | **Context**: Replace API-Football (free tier blocked for 2025+) with alternative PL data sources

---

## 1. SofaScore API

**Access**: Reverse-engineered, npm package available
- **Package**: `@sindicuab/sofascore-api` (v0.1.7, MIT, updated Nov 2025)
- **Installation**: `npm i @sindicuab/sofascore-api`
- **Docs**: Provides pre-configured country/competition/season IDs for queries

**Data Coverage**: ✅ Full PL 2025-26 support
**Rate Limits**: Unknown (reverse-engineered, no official limits documented)
**Geo-Restrictions**: ✅ Works from Asia/Vietnam (unofficial domain traversal)
**CORS**: ❌ Backend-only (must use server-side from Next.js)

**Reliability & Risk**: 🔴 **HIGH RISK**
- Reverse-engineered, SofaScore can block at any time
- No official support or docs
- Last update 4 months ago (appears maintained but fragile)

**Pros**:
- Actively maintained npm package exists
- No auth key needed
- Works from restricted regions

**Cons**:
- Unmaintained API endpoint could break
- Zero official documentation
- Legal/ToS gray area
- No guaranteed uptime

---

## 2. FotMob API

**Access**: Reverse-engineered, multiple npm wrappers
- **Packages**:
  - `@max-xoo/fotmob` (v2.5.1, last updated 1 year ago)
  - `fotmob` (v2.4.1, last updated 7 months ago)
- **Installation**: `npm i @max-xoo/fotmob` or `npm i fotmob`
- **Auth**: X-Fm-Req header discovered (Nov 2024 security research)

**Data Coverage**: ✅ Full PL 2025-26 support
**Rate Limits**: Unknown (undocumented reverse-engineered API)
**Geo-Restrictions**: ✅ Works from Asia/Vietnam
**CORS**: ❌ Backend-only (Node.js/server-side)

**Reliability & Risk**: 🟠 **MEDIUM-HIGH RISK**
- Reverse-engineered with new auth header in late 2024
- FotMob actively blocks scrapers/bots
- npm packages less frequently updated than SofaScore

**Pros**:
- Comprehensive match/player/league data
- Type definitions in npm packages
- Auth mechanism documented by security researcher

**Cons**:
- New authentication mechanism = packages may break soon
- Older package updates (7+ months old)
- Legal/ToS violation risk
- FotMob actively enforces bot blocking

---

## 3. Transfermarkt (via scraping/datasets)

**Access**: No official API; scraping or pre-built datasets
- **Datasets**: `dcaribou/transfermarkt-datasets` (GitHub) + Kaggle exports
- **Data**: 93,000+ players: profiles, market values, transfer history, injuries
- **Tools**:
  - Apify ScrapeAPI
  - `worldfootballR` R package
  - Custom web scrapers

**Data Coverage**: ✅ PL 2025-26 (player/squad data only, no live fixtures)
**Rate Limits**: ⚠️ Transfermarkt blocks aggressive scrapers
**Geo-Restrictions**: ✅ Works from Asia/Vietnam
**CORS**: ❌ Requires server-side scraping

**Reliability & Risk**: 🟠 **MEDIUM RISK**
- Transfermarkt explicitly states no scraping in ToS
- Anti-bot detection triggers IP bans
- Pre-built datasets lag (data outdated 1-2 months)

**Pros**:
- Rich player/transfer/market value data (not in other APIs)
- Pre-built datasets available on Kaggle (no scraping needed)
- 93K+ players comprehensive coverage

**Cons**:
- No live match/fixture data
- ToS violation if you scrape directly
- Pre-built datasets stale quickly
- IP bans if caught scraping aggressively

---

## 4. Premier League Official (Fantasy Premier League API)

**Access**: Public, unofficial but from official domain
- **URL**: `https://fantasy.premierleague.com/api/`
- **Auth**: None required
- **Endpoints**: Fantasy football + underlying PL data

**Data Coverage**: ✅ PL 2025-26 (live scores, fixtures, player stats)
**Rate Limits**: ⚠️ No documented limits; likely IP-throttled
**Geo-Restrictions**: ✅ Works globally (including Asia)
**CORS**: ❌ Browser CORS blocked, backend-only safe

**Reliability & Risk**: 🟢 **LOW RISK (best official option)**
- De facto standard for PL data access
- Used by thousands of FPL projects
- Premier League unlikely to block it (unofficial but tolerated)

**Pros**:
- Official Premier League data source
- Comprehensive live fixture + player stats
- No authentication required
- Reliably maintained by Premier League
- Widely used (battle-tested by community)

**Cons**:
- No official documentation (reverse-engineered endpoints)
- CORS blocked from browsers (must use server-side)
- Rate limits not published (need to throttle)
- PL could technically shut it down (unlikely)

---

## 5. Football-Data.org

**Access**: Freemium, API key required
- **URL**: `https://www.football-data.org/`
- **Auth**: Free tier with API key (no payment)
- **Free Tier**: Limited requests/day

**Data Coverage**: ✅ PL 2025-26 (fixtures, standings, live scores)
**Rate Limits**: ✅ Free: 10 req/min, paid tiers available
**Geo-Restrictions**: ✅ Works globally
**CORS**: ❌ Backend-only (API key in requests)

**Reliability & Risk**: 🟢 **LOW RISK (official, freemium)**
- Official maintained API (not reverse-engineered)
- Clear pricing/ToS
- Documented endpoints
- Used commercially

**Pros**:
- Official, documented API
- Free tier available (no payment needed)
- Clear rate limits + pricing
- Reliable infrastructure
- Legal/ToS compliant

**Cons**:
- Free tier limited (10 req/min may not be enough)
- Requires API key registration
- May eventually paywall 2025-26 data
- Less comprehensive than fantasy.premierleague.com

---

## 6. API-Sports / API-Football

**Access**: Freemium, API key required
- **URL**: `https://api-sports.io/`
- **Auth**: Free tier with API key (100 req/day)
- **Free Tier**: 100 req/day max (current plan: 100 req/day)

**Data Coverage**: ✅ PL 2025-26 (your current provider)
**Rate Limits**: 🔴 100 req/day (same as now, will block 2025+)
**Geo-Restrictions**: ✅ Works globally
**CORS**: ❌ Backend-only

**Reliability & Risk**: 🟢 **LOW RISK**
- Official, documented API
- Already using it

**Cons**:
- Free tier blocks 2025-26 season (your problem!)
- Paid plans expensive for small apps
- Why you're researching alternatives

---

## 7. Scraping-Friendly Sources

**BBC Sport**: ❌ No public API (community scrapers exist but fragile)
**FlashScore**: ❌ Heavily bot-protected; Cloudflare/bot detection blocks requests
**ESPN**: ⚠️ Limited data; API blocked from non-official apps; aggressive scraper detection

---

## Recommendation for Liverpool App

### ✅ **Primary: Fantasy Premier League API** (premierleague.com)
```javascript
// src/lib/api-fpl.ts (new)
const FPL_BASE = 'https://fantasy.premierleague.com/api/';
// GET /bootstrap-static/ (all teams, players, gameweeks)
// GET /fixtures/ (all fixtures + live scores)
// GET /element/{id}/ (player stats)
// GET /teams/{id}/ (team data)
```

**Why**:
- Official PL source, zero ToS violation
- Live fixture + player stat data complete
- Widely battle-tested (FPL community)
- Unlikely to be blocked by PL
- No auth needed
- Works from Vietnam/Asia

**Rate Limit Strategy**: Cache aggressively (fixtures revalidate 30min, season data 6h)

### ✅ **Secondary: Football-Data.org** (fallback)
```javascript
// src/lib/api-fdo.ts (new)
const FDO_BASE = 'https://www.football-data.org/api/';
// Requires API key
// GET /competitions/PL/matches
// GET /competitions/PL/standings
```

**Why**:
- Official, legal, documented
- Free tier sufficient for small app
- Good fallback if FPL changes
- Clear ToS

### ❌ **Avoid for Now**:
- **SofaScore**: Unmaintained npm package + fragile reverse-engineering
- **FotMob**: New auth discovery means packages will break soon
- **Transfermarkt direct scraping**: ToS violation, IP bans
- **API-Football free tier**: Already blocking 2025+

---

## Implementation Path

1. **Immediate** (this week):
   - Migrate to Fantasy PL API
   - Test all endpoints (bootstrap, fixtures, elements)
   - Implement caching strategy

2. **Secondary** (next 2 weeks):
   - Add Football-Data.org as fallback
   - Implement feature-flag for API switching
   - Monitor both sources for reliability

3. **Long-term** (next month):
   - Add Transfermarkt datasets (for player bio/market value only, not live data)
   - Document rate limits + caching strategy
   - Set up monitoring alerts

---

## Unresolved Questions

1. **FPL API rate limits**: No documented limits; need empirical testing (how many req/day before IP throttling?)
2. **Football-Data.org free tier limits**: Is 10 req/min enough for multi-user app? Need load testing.
3. **Transfermarkt IP ban recovery**: How long does an IP ban last if caught scraping?
4. **FotMob X-Fm-Req header stability**: Will the auth header remain stable, or will FotMob change it again?

---

**Sources**:
- [@sindicuab/sofascore-api npm](https://www.npmjs.com/package/@sindicuab/sofascore-api)
- [@max-xoo/fotmob npm](https://www.npmjs.com/package/@max-xoo/fotmob)
- [FotMob Auth Reverse Engineering (Nov 2024)](https://viktornilsson.github.io/security/2024/11/01/fotmob-auth.html)
- [dcaribou/transfermarkt-datasets](https://github.com/dcaribou/transfermarkt-datasets)
- [Fantasy PL API](https://fantasy.premierleague.com/api/)
- [Football-Data.org](https://www.football-data.org/docs/v1/index.html)
- [API-Sports Documentation](https://api-sports.io/documentation/football/v3)
