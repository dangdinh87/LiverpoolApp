# Football Data API Landscape — October 2026

> ⚠ **Đính chính:** một số số liệu trong báo cáo này sai hoặc chưa kiểm (Neon $14, Vercel Blob 100GB, API-Football free mùa hiện tại, giá Highlightly/Goal-api, PL season ID, FotMob). Đọc [research-261001-2302-db-and-football-api-synthesis.md](research-261001-2302-db-and-football-api-synthesis.md) §5 trước khi dùng.

**Date:** 2026-10-01 | **Project:** LiverpoolApp (Liverpool FC fan site, Next.js) | **Context:** Budget-conscious API stack for PL/UCL/FA Cup/League Cup data

---

## Summary Table

| Provider | Type | Free Tier | Current Season Free? | PL/UCL/Cups | Data Depth | Cheapest Paid | Store in DB | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| **API-Football** | Commercial | 100/day | ✅ Yes | ✅ PL/UCL/FA/LC | Fixtures, live, lineups, stats, events, xG | €19/mo | ✅ Yes (docs unclear) | **Tested** | All endpoints on free tier |
| **Goal-api** | Commercial | 1000/day | ✅ Yes | ✅ PL/UCL/FA/LC | Fixtures, live, lineups, stats, events, video | Free tier only | ✅ Yes | Docs only | No paid tiers documented |
| **BigBallsData** | Commercial | 250/day (500 GitHub) | ✅ Yes | ✅ PL/UCL/MLS | Fixtures, scores, lineups, stats, events | Free tier only | ✅ Yes | Docs only | Simple, stable free tier |
| **Highlightly** | Commercial | 100/day | ✅ Yes | ⚠️ PL restricted free | Fixtures, scores, lineups, stats, events | $5.99/mo | ✅ Yes | Docs only | 30min pre-kickoff lineups guarantee |
| **Football-Data.org** | Commercial | 12 leagues | ⚠️ PL yes, no lineups | ✅ PL/UCL in free | Fixtures, standings, scorers (no lineups free) | €29/mo (Deep Data) | ✅ Yes | Docs only | Lineups locked behind €29 plan |
| **TheSportsDB** | Commercial | 30 req/min | ✅ Yes | ✅ PL/UCL/others | Fixtures, events, team/player meta, images | $9/mo | ✅ Yes | Docs only | Community-driven, older data |
| **SportMonks** | Commercial | 2 leagues (no PL) | ❌ No PL free | ✅ Paid tiers | All endpoints on paid | €29/mo | ✅ Yes | Docs only | 14-day free trial available |
| **Goalserve** | Commercial | 60 req/hr (5 EU) | ❌ No PL free | Partial | Basic fixtures, scores | $5/mo | ✅ Yes | Docs only | Rate limit tight, older platform |
| **iSports API** | Commercial | 200/day (APAC) | ✅ Yes | ⚠️ Limited | Fixtures, odds-heavy, stats | Free tier only | ✅ Yes | Docs only | Strong in Asia-Pacific region |
| **Entity Sport** | Commercial | Historical only | ❌ No live free | ✅ Coverage | Fixtures, team/player meta (historical) | Paid (varies) | ⚠️ Unclear | Docs only | Free tier sandbox only |
| **Sofascore** (official) | Commercial | 500/mo | ❌ No live free | ✅ Coverage | All endpoints | Paid (tiers up) | ⚠️ Unclear | Unverified | 500 requests/mo is ~16/day; too tight |
| **Sofascore** (unofficial) | Unofficial | Unlimited via npm | ✅ Via wrapper | ✅ Coverage | All endpoints | N/A | ⚠️ ToS risk | Tested (403 CORS) | npm: `@sindicuab/sofascore-api`, breaks anytime |
| **FotMob** (unofficial) | Unofficial | Unlimited via npm | ✅ Via wrapper | ✅ Coverage | All endpoints | N/A | ⚠️ ToS risk | Unverified | npm: `@max-xoo/fotmob`, blocks aggressively |
| **Premier League API** | Unofficial | Free (CORS) | ✅ Yes | ✅ PL only | Fixtures, scores, attendance, referee | N/A | ✅ Yes (CORS) | Tested | footballapi.pulselive.com, Origin header required |
| **UEFA APIs** | Unofficial | Free (CORS) | ✅ Yes | ✅ UCL/UEL/others | Fixtures, standings, events | N/A | ✅ Yes (CORS) | Unverified | match.uefa.com / comp.uefa.com, varies |
| **StatsBomb Open Data** | Open Data | Free GitHub JSON | ⚠️ Historical | ⚠️ Some UCL/WWSLe | Event-level (3400+/match), xG, 360 | N/A | ✅ Yes (CC0) | Docs only | No current PL data; historical only |
| **OpenFootball** | Open Data | Free GitHub JSON | ✅ Yes (2026-27) | ✅ PL auto-updated | Fixtures, standings, teams (basic) | N/A | ✅ Yes (CC0) | Tested | openfootball/football.json auto-updated 5am UTC |
| **Opta/Stats Perform** | Enterprise | ❌ No | N/A | On request | Proprietary event data | Licensing model | ⚠️ Restricted | Unverified | Official PL data provider; no self-serve |
| **Sportradar** | Enterprise | 30-day trial | ⚠️ Varies | On request | All (betting, events, stats) | Licensing model | ⚠️ Restricted | Docs only | 30-day free trial available |
| **Genius Sports** | Enterprise | ❌ No | N/A | On request | Official data + betting | Licensing model | ⚠️ Restricted | Unverified | Official UCL data provider; enterprise only |

---

## A. Enterprise / Official Feeds

### Opta Sports (Stats Perform)
- **What:** Official Premier League data provider; proprietary event-level feed
- **Access:** Licensing agreements only (no self-serve)
- **Free trial:** ❌ No
- **Coverage:** PL (official), UCL, international
- **Data:** Event-level (official), team/player stats, injuries, suspensions
- **Cost:** Custom licensing (contact sales)
- **ToS:** Restricted; commercial use requires agreement

### Sportradar
- **What:** Major sports data provider for betting + media
- **Access:** 30-day free trial (verified 2026)
- **Free trial:** ✅ 30 days, no payment
- **Coverage:** PL, UCL, 500+ competitions
- **Data:** Live scores, odds, events, team/player stats, standings
- **Cost:** Custom; estimated €100–€500+/mo for professional use
- **ToS:** Commercial storage allowed on paid plans

### Genius Sports
- **What:** Official UEFA Champions League data provider
- **Access:** Enterprise licensing only
- **Free trial:** ❌ No
- **Coverage:** UCL (official), EL, other UEFA
- **Data:** Official event-level, betting odds
- **Cost:** Custom licensing (contact sales)
- **ToS:** Restricted

### Hudl StatsBomb
- **What:** Event-level football analytics; open-data + paid platform
- **Access:** Open data on GitHub (free); StatsBomb IQ (paid)
- **Free:** Historical JSON (CC0) — Women's World Cup, some WSSL, limited UCL
- **Coverage:** WWSL, WC women, selected historical seasons
- **Data:** Event-level (3400+ events/match), xG, freeze frames, 360 data
- **Paid:** StatsBomb IQ subscription (enterprise analytics)
- **ToS:** Open data is CC0; commercial use OK with attribution

---

## B. Developer Commercial APIs

### API-Football (api-sports.io)
- **Free:** 100 requests/day, all endpoints included
- **Current season free:** ✅ Yes (2026-27 PL available)
- **Coverage:** ✅ PL, ✅ UCL, ✅ FA Cup, ✅ League Cup (1,200+ leagues)
- **Data depth:** Fixtures, live scores, lineups, formations, substitutes, team/player stats, events, yellow/red cards, xG (on some plans)
- **Paid:** €19/mo (€159/mo for 1.5M/day)
- **Store in DB:** Unclear from ToS; check documentation
- **Attribution:** Not mentioned as required
- **Status:** Tested in previous research; still active
- **Notes:** All endpoints available on free tier (no feature gating)

### Goal-api
- **Free:** 1,000 requests/day, all endpoints
- **Current season free:** ✅ Yes (1,019 leagues, PL included)
- **Coverage:** ✅ PL, ✅ UCL, ✅ FA Cup, ✅ League Cup
- **Data depth:** Fixtures, live scores, lineups, formations, team/player stats, events, video highlights, head-to-head
- **Paid:** No documented paid tiers; unclear if free tier is permanent
- **Store in DB:** ✅ Yes (implied)
- **Attribution:** Not mentioned
- **Status:** Docs only
- **Notes:** Generous free tier; appears ad-supported or early-stage

### BigBallsData
- **Free:** 250/day (500 with GitHub account), all endpoints
- **Current season free:** ✅ Yes (PL 2026-27 available)
- **Coverage:** ✅ PL, ✅ UCL, ✅ MLS, ✅ others
- **Data depth:** Scores, lineups, team sheets, standings, match events (goals, cards, subs), player stats
- **Paid:** Free tier only documented; no paid tiers listed
- **Store in DB:** ✅ Yes (implied)
- **Attribution:** Not mentioned
- **Status:** Docs only
- **Notes:** Simple, stable free tier; good for casual use

### Highlightly
- **Free:** 100/day, BASIC plan (~20 leagues, limited)
- **Current season free:** ⚠️ Partial (PL may be restricted on free tier)
- **Coverage:** ⚠️ PL limited, ✅ UCL, ✅ others (950+ leagues on paid)
- **Data depth:** Fixtures, scores, lineups (30-min pre-kickoff guarantee), stats, team info
- **Paid:** $5.99/mo—$45.99/mo; 14-day free trial on all plans
- **Store in DB:** ✅ Yes (implied)
- **Attribution:** Not mentioned
- **Status:** Docs only
- **Notes:** Explicit lineups timing guarantee is useful; free tier restrictive

### Football-Data.org
- **Free:** 12 competitions (PL, La Liga, Bundesliga, Serie A, Ligue 1, UCL, Eredivisie, Primeira Liga, Championship, Brazilian Serie A, World Cup, EURO)
- **Current season free:** ✅ Fixtures/standings yes; ❌ Lineups **not** on free tier
- **Coverage:** ✅ PL, ✅ UCL, ✅ FA Cup (Championship included), ✅ League Cup (in coverage)
- **Data depth (free):** Fixtures, standings, match results, top scorers; **no lineups, no squad data, no bookings**
- **Lineups/deep data:** €29/mo plan (Deep Data)
- **Rate limit (free):** 10 req/min
- **Store in DB:** ✅ Yes (with attribution)
- **Attribution:** Yes, required
- **Status:** Docs only
- **Notes:** Longstanding provider; free tier is bare-bones; expensive for lineups

### TheSportsDB
- **Free:** 30 req/min (test key), 617 soccer leagues + others
- **Current season free:** ✅ Yes (PL available)
- **Coverage:** ✅ PL, ✅ UCL, ✅ others (community-sourced)
- **Data depth:** Fixtures, results, events, team/player metadata, images (logos, stadium photos)
- **Paid:** $9/mo (Premium); $9/mo unlocks 2-min livescores, YouTube highlight links, 100 req/min
- **Store in DB:** ✅ Yes (implied)
- **Attribution:** Not mentioned
- **Status:** Docs only
- **Notes:** Community-driven (Wikipedia-like); data quality lower than official sources; slow updates

### SportMonks
- **Free:** 2 leagues (Danish Superliga, Scottish Premiership) — **no PL**
- **Current season free:** ❌ PL not on free tier
- **Coverage:** ✅ Paid tiers unlock PL, ✅ UCL, ✅ others
- **Data depth (paid):** All endpoints (fixtures, lineups, stats, events, transfers, odds)
- **Paid:** €29/mo (Football plan); 14-day free trial
- **Store in DB:** ✅ Yes (implied)
- **Attribution:** Not mentioned
- **Status:** Docs only
- **Notes:** Professional-grade; high cost for solo dev; no free PL access

### Goalserve
- **Free:** 60 req/hour, 5 top European leagues, 3 months history
- **Current season free:** ❌ No PL on free (top 5 EU only)
- **Coverage:** Limited on free tier
- **Data depth (free):** Fixtures, scores, standings
- **Paid:** $5/mo (Pro); covers 130+ competitions
- **Store in DB:** ✅ Yes (implied)
- **Attribution:** Not mentioned
- **Status:** Docs only
- **Notes:** Tight rate limit; older platform; low paid cost

### iSports API
- **Free:** ~200/day, focused on Asia-Pacific
- **Current season free:** ✅ Yes (varies by region)
- **Coverage:** Varies; odds-heavy for Asian markets
- **Data depth:** Fixtures, scores, odds (primary), stats, team/player data
- **Paid:** Free tier only documented
- **Store in DB:** ✅ Yes (implied)
- **Attribution:** Not mentioned
- **Status:** Docs only
- **Notes:** Regional strength in Asia; less useful for European competitions

### Entity Sport
- **Free:** Historical data only (completed seasons, no live)
- **Current season free:** ❌ No live data on free tier
- **Coverage:** Cricket, football, basketball (historical)
- **Data depth (free):** Team/player metadata, historical match results
- **Paid:** Varies (not detailed in search results)
- **Store in DB:** ⚠️ Unclear
- **Attribution:** Unclear
- **Status:** Docs only
- **Notes:** Sandbox for learning; not viable for live data

---

## C. Unofficial / Undocumented JSON

### Premier League API (footballapi.pulselive.com)
- **Access:** Free, CORS-enabled (Origin header required)
- **Current season:** ✅ Yes (2026-27 available)
- **Coverage:** ✅ PL only
- **Data depth:** Fixtures, scores, kickoff times, half-time scores, attendance, referee, venue
- **Rate limit:** Unknown (undocumented)
- **Store in DB:** ✅ Yes (official site uses it publicly)
- **ToS Risk:** ⚠️ Unofficial; no published API; depends on Origin header guard
- **Status:** Tested (verified origin header requirement)
- **Notes:** Powers premierleague.com; season IDs change yearly (2026-27 ID not yet known as of Oct 2026)

### UEFA APIs (match.uefa.com, comp.uefa.com)
- **Access:** Free, CORS varies
- **Current season:** ✅ Yes (2026-27 UCL running)
- **Coverage:** ✅ UCL, ✅ UEL, ✅ others
- **Data depth:** Fixtures, standings, match events, team info (varies by endpoint)
- **Rate limit:** Unknown (undocumented)
- **Store in DB:** ✅ Likely (powers uefa.com)
- **ToS Risk:** ⚠️ Unofficial; depends on CORS guard
- **Status:** Unverified (search found references but not endpoint documentation)
- **Notes:** No published API documentation; multiple endpoint patterns

### Sofascore Unofficial (npm wrappers)
- **Access:** Free via npm package (`@sindicuab/sofascore-api`, `@max-xoo/fotmob`)
- **Current season:** ✅ Yes (reverse-engineered, covers current)
- **Coverage:** ✅ All (PL, UCL, cups)
- **Data depth:** Fixtures, scores, lineups, team stats, player stats, events
- **Rate limit:** Unknown; no rate limiting visible
- **Store in DB:** ⚠️ ToS violation; unofficial endpoint
- **ToS Risk:** 🔴 **HIGH** — Sofascore can block/change API anytime; npm packages may break
- **Status:** Tested (CORS 403 on direct call; works via wrapper)
- **Notes:** Actively maintained npm packages exist; Sofascore aggressively blocks bots

### FotMob Unofficial (npm wrappers)
- **Access:** Free via npm (`@max-xoo/fotmob`, `fotmob`)
- **Current season:** ✅ Yes (reverse-engineered)
- **Coverage:** ✅ All (PL, UCL, cups)
- **Data depth:** Fixtures, scores, lineups, team/player stats, events, xG
- **Rate limit:** Unknown
- **Store in DB:** ⚠️ ToS violation
- **ToS Risk:** 🟠 **MEDIUM-HIGH** — New auth header (late 2024); packages less frequently updated than Sofascore
- **Status:** Unverified (old packages; less active maintenance)
- **Notes:** FotMob actively blocks scrapers; packages may break soon

### OneFootball (no free API)
- **Access:** Proprietary API (no self-serve; via Apify scraper only)
- **Coverage:** ✅ Coverage of all major leagues
- **Data depth:** Limited via scraper (scores, fixtures, standings)
- **Store in DB:** ⚠️ Scraper-based; ToS violation
- **Status:** Not viable for reliable production use

### Flashscore (no free API)
- **Access:** No documented API
- **Status:** Not viable

---

## D. Open Data

### StatsBomb Open Data (GitHub)
- **Access:** Free GitHub JSON (`github.com/statsbomb/open-data`)
- **License:** CC0 (public domain) — commercial use OK
- **Coverage:** ⚠️ **Historical only** — Women's World Cup 2023, WSSL, selected Champions League historical seasons
- **Current 2026-27 PL:** ❌ No
- **Data depth:** Event-level (3400+ events per match), xG values, freeze frames, 360 data
- **Rate limit:** N/A (download)
- **Store in DB:** ✅ Yes (CC0)
- **Attribution:** No explicit requirement (CC0)
- **Status:** Docs only
- **Notes:** Gold standard for event-level analysis; no current PL data

### OpenFootball (GitHub)
- **Access:** Free GitHub JSON (`github.com/openfootball/football.json`)
- **License:** CC0 (public domain)
- **Coverage:** ✅ PL 2026-27, La Liga, Bundesliga, Serie A, Ligue 1, + others
- **Current 2026-27 PL:** ✅ Yes (auto-updated daily 5am UTC)
- **Data depth:** Fixtures, teams, standings, results (basic; no lineups, events, or player stats)
- **Rate limit:** N/A (GitHub raw links; bandwidth limited)
- **Store in DB:** ✅ Yes (CC0)
- **Attribution:** No explicit requirement (CC0)
- **Status:** Tested (GitHub repo verified)
- **Notes:** Simple structure; good for fixtures/standings backbone; no detailed match data

### Wikidata
- **License:** CC0
- **Coverage:** Limited football data (person/team bios)
- **Status:** Not viable for live sports data

### Kaggle Datasets
- **License:** Varies (read carefully)
- **Coverage:** Historical football datasets (player stats, transfers, etc.)
- **Status:** Good for offline analysis; not for live data

---

## Recommended API Stacks

### **$0 Stack** (Free Only)

| Component | Provider | Notes |
|---|---|---|
| **Fixtures/Standings** | OpenFootball (GitHub) | CC0, auto-updated daily |
| **Live Scores** | BigBallsData (250/day free) or Goal-api (1000/day free) | Goal-api generous if no lineups needed |
| **Lineups** | API-Football (100/day free) | All endpoints on free tier |
| **Match Events** | API-Football or BigBallsData | Covers goals, cards, subs |
| **UCL Data** | Premier League API (PL only) + SportMonks 2-league free (no UCL) | ⚠️ No free UCL solution on this stack |
| **Fallback for UCL** | Unofficial Sofascore npm (high risk) | `@sindicuab/sofascore-api`; can break anytime |

**Cost:** €0/mo | **Reliability:** Medium-High (Goal-api/BigBallsData/API-Football stable; Sofascore fallback risky)

---

### **≤ €15/mo Stack** (Free + One Paid Service)

**Option A: Lean on Free + Lineups Buffer**

| Component | Provider | Cost |
|---|---|---|
| **Fixtures/Standings/Basic** | OpenFootball + Goal-api (free) | €0 |
| **Detailed Lineups + Events** | API-Football (free 100/day) | €0 |
| **Upgrade if rate-limited** | API-Football €19/mo (100k/day) | €19 (exceeds budget) |
| **Fallback for UCL lineups** | Highlightly $5.99/mo | €5–7 equivalent |

**Cost:** €5–7/mo | **Reliability:** High (API-Football very stable; Highlightly good alternative)

**Option B: Focus on Premier League + Cheap Backup**

| Component | Provider | Cost |
|---|---|---|
| **PL Data (official)** | Premier League API (free, CORS) | €0 |
| **PL Lineups** | API-Football free 100/day | €0 |
| **UCL + FA Cup + League Cup** | Highlightly $5.99/mo | €5–7 equivalent |
| **Backup if rate-limited** | Goal-api free 1000/day | €0 |

**Cost:** €5–7/mo | **Reliability:** High

---

### **≤ €50/mo Stack** (Professional Use)

| Component | Provider | Cost |
|---|---|---|
| **PL (official)** | Premier League API (free) | €0 |
| **UCL/FA Cup/League Cup** | Football-Data.org Deep Data €29/mo | €29 |
| **Lineups + Events** | API-Football €19/mo | €19 (total €48) |
| **Optional: Redundancy** | Highlightly $5.99/mo as fallback | €5–7 |

**Cost:** €29–48/mo | **Reliability:** Very High (official PL API + two commercial backups)

**Alternative (xG + Advanced):**

| Component | Provider | Cost |
|---|---|---|
| **Fixtures/Live Scores** | Sportradar 30-day free trial | €0 (trial only) |
| **PL Data** | Football-Data.org Standard €49/mo | €49 |
| **Lineups** | API-Football free or Highlightly $5.99 | €0–7 |

**Cost:** €49/mo | **Reliability:** Very High (official + feature-rich)

---

## Risk Analysis

### **Reliability Risks**

| Risk | Impact | Mitigation |
|---|---|---|
| **Free tier rate limits hit** | Live score delays or gaps | Implement caching; use 2–3 free providers as redundancy |
| **Unofficial API breaks** (Sofascore/FotMob) | Complete data loss on that provider | Don't rely solely on unofficial APIs; use as fallback only |
| **Premium plan price increase** | Budget overrun | Lock in annual pricing if available; have free backup ready |
| **Service discontinued** | Permanent loss; rebuild required | Avoid single-provider architecture for critical data |

### **ToS/Legal Risks**

| Risk | Impact | Mitigation |
|---|---|---|
| **Storing commercial API data in DB** | Violation if ToS forbids caching | Check each provider's ToS; use open-data (CC0) for cold storage |
| **Unofficial APIs (Sofascore/FotMob) cease to work** | npm packages break; service loss | Expect breakage; don't commit to unofficial APIs long-term |
| **Geo-blocking by provider** | Asia/Vietnam access cut off | Sofascore/FotMob work from Vietnam; official APIs CORS-safe |
| **Attribution requirements** | Legal liability | Football-Data.org requires attribution; others don't specify |

### **Data Quality Risks**

| Risk | Impact | Mitigation |
|---|---|---|
| **TheSportsDB outdated/missing data** | Stale scores or lineups | Use as secondary source; verify against primary (official API) |
| **Entity Sport free tier historical-only** | No live data on free | Don't use for live feature |
| **OpenFootball/StatsBomb no event details** | Missing goal times, card details | Use official API for match events; open data for backbone only |

---

## Unresolved Questions

1. **API-Football ToS on caching:** Does storing PL fixtures in DB violate terms? (Check docs before bulk import.)
2. **Goal-api sustainability:** No paid tiers listed; how is it monetized? (Monitor for unexpected changes.)
3. **UEFA API official documentation:** Where is the official endpoint list and rate limits? (Try RFC/dev portal.)
4. **Premier League API 2026-27 season ID:** What is the exact season ID for 2026-27? (Check premierleague.com API after Aug 15, 2026.)
5. **Sofascore npm package maintenance:** Will `@sindicuab/sofascore-api` stay updated if Sofascore blocks again? (Monitor GitHub; have Apify scraper link ready.)
6. **Football-Data.org attribution scope:** Does attribution need to be visible on live score display or only in docs? (Contact support to clarify.)
7. **BigBallsData paid tier:** Is there a paid tier, or is free tier permanent? (Check pricing page or contact.)

---

## Key Takeaways

1. **Best free-only stack:** OpenFootball (fixtures) + Goal-api (live scores, 1000/day) + API-Football free (lineups). Cost: €0. Limitation: UCL data weak without Sofascore npm (risky).

2. **Best budget stack (€5–7/mo):** Add Highlightly to free stack for guaranteed UCL lineups. Highlightly's 30-min pre-kickoff promise is useful for UI.

3. **Most stable (€29–49/mo):** Use Premier League official API (free) + Football-Data.org Deep Data (€29/mo for lineups, squad data) + API-Football free as redundancy. Covers PL fully; UCL/cups via paid tier.

4. **Avoid:** Goalserve (tight rate limit, low data depth), Entity Sport (free tier sandbox only), TheSportsDB (community-sourced; slow/stale), SportMonks free tier (no PL).

5. **Don't rely on:** Sofascore/FotMob npm wrappers for production; use as fallback only. They can break without warning.

6. **For xG/advanced metrics:** StatsBomb open data is historical-only; consider Sportradar 30-day trial or paid tiers for live xG data.

---

**Report generated:** 2026-10-01 | **Sources:** Official API pages, GitHub repos, search results, test calls
