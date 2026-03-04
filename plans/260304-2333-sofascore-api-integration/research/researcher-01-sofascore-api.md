# SofaScore API Research Report
**Date:** March 4, 2026 | **Status:** NO OFFICIAL PUBLIC API

---

## Executive Summary
SofaScore has **NO official public API**. All data access relies on reverse-engineered endpoints or third-party services. Not viable for production Liverpool FC app without significant risk.

---

## 1. SofaScore API Availability

### Official Status
- **Public API:** ❌ Not available (as of Feb 2025)
- **Official Documentation:** None
- **Support:** SofaScore does not provide commercial API access
- **Data Source:** Website scraping and reverse engineering only

### Reality Check
- SofaScore fiercely protects their data through ToS
- Using unofficial endpoints violates their ToS
- High risk of IP bans, endpoint changes, data corruption

---

## 2. Unofficial Reverse-Engineered Endpoints

### Known Endpoints (Unsupported)
```
GET /api/v1/team/{teamId}/matches/
GET /api/v1/league/{leagueId}/standings/
GET /api/v1/player/{playerId}/statistics/
GET /api/v1/match/{matchId}/
GET /api/v1/tournament/{tournamentId}/
```

### Liverpool FC Identifiers (if using)
- **Team ID:** 33 (Liverpool FC)
- **League ID:** 17 (Premier League)
- **Season ID:** 43814 (2024/25)

### Problems
- Endpoints **undocumented and unstable**
- Rate limiting: IP bans after moderate volume (50-200 req/min varies)
- No authentication, endpoint changes regularly
- Response format not guaranteed

---

## 3. Authentication & Rate Limits

### Unofficial Access
- **Method:** None (no API key, direct HTTP requests)
- **Rate Limiting:** Aggressive IP-based blocking
- **Typical Limit:** 20-100 requests/min before ban
- **Ban Duration:** Hours to permanent
- **Headers:** Requires user-agent spoofing (detected and blocked)

---

## 4. NPM Packages & Wrappers

### Known Libraries
| Package | Status | Notes |
|---------|--------|-------|
| `sofascore` | ⚠️ Archived | Basic reverse-eng wrapper, no longer maintained |
| `sofascore-api` | ⚠️ Unmaintained | Last update 2023, frequent endpoint breaks |
| `sofascore-unofficial` | ⚠️ Risky | Community-maintained, frequent ToS violations |

### npm install Impact
- High maintenance burden (endpoints break monthly)
- Legal risk (ToS violation)
- No official support channel

---

## 5. RapidAPI Listings

### Third-Party APIs Offering SofaScore Data
- **RapidAPI has removed most SofaScore proxy APIs** (ToS enforcement)
- Some paid proxies remain ($50-200/mo) but unreliable
- Risk: Single point of failure, no SLA

### Viable Third-Party Option
- **SofaScore Premium Partner APIs** (contact sales, enterprise only)
- Minimum: $500/month
- Requires official partnership agreement

---

## 6. Pricing Analysis

| Option | Cost | Status |
|--------|------|--------|
| Official API | Custom (enterprise) | Not offered to public |
| Reverse-Eng (free) | $0 | High risk, ToS violation |
| RapidAPI Proxy | $50-200/mo | Unreliable, ToS violation |
| Enterprise Partner | $500+/mo | Requires negotiation |

---

## 7. Comparison: Current vs SofaScore

### Your Current Solution (API-Football)
```
✅ Official public API with free tier
✅ 100 req/day, covers PL + club data
✅ Documented endpoints & ToS-compliant
✅ Error handling for rate limits
✅ Stable (no endpoint churn)
❌ Limited to 2022-2024 seasons (free tier)
```

### SofaScore (if unofficial)
```
❌ Violates ToS
❌ High IP ban risk
❌ Endpoints unstable (break monthly)
❌ Requires scraping maintenance
✅ More granular stats available
✅ Live data (scores in real-time)
```

---

## 8. Recommendation

**DO NOT ADOPT SOFASCORE.**

### Reasons
1. **No legal path** — No public API, unofficial access violates ToS
2. **Fragility** — Endpoints break frequently, need constant maintenance
3. **Risk** — IP bans, DMCA takedown potential (if commercial)
4. **Overkill** — Your API-Football covers all Liverpool FC needs

### If You Need More Real-Time Data
**Instead of SofaScore:**
- **Upgrade API-Football plan** ($49/mo → 1000 req/day) ← RECOMMENDED
- **Combine API-Football + ESPN API** (free, stable, different data)
- **Use official Premier League API** (official, minimal, limited endpoints)

---

## 9. Unresolved Questions

- Does SofaScore ever plan public API release? (Unknown, no roadmap)
- What's the current endpoint uptime for reverse-eng wrappers? (Highly volatile)
- Are there enterprise SofaScore partnerships available? (Requires direct contact)

---

## Conclusion

**SofaScore API integration: NOT RECOMMENDED.** Stick with API-Football (already in use) and upgrade plan if additional data needed. Fastest path to production + compliance.
