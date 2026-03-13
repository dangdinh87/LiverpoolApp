# Football-Data.org API v4 — Historical Season Support Audit

**Date:** 2026-03-13
**Research Scope:** Season parameter format, historical data availability, free tier limitations

---

## Executive Summary

✅ **FDO API v4 DOES support historical seasons** via `?season=YYYY` parameter.

- **Season Format:** Integer 4-digit year (start year of season). Example: `season=2023` for 2023/24 season.
- **Supported Endpoints:** Standings, Matches, Scorers all accept `?season=` filter.
- **Free Tier:** Limited to 12 competitions, 10 requests/minute, **exact historical depth NOT documented**.
- **Recommendation:** Contact FDO directly or test empirically for free tier historical limits.

---

## Detailed Findings

### 1. Season Parameter Format

**Format:** `?season=YYYY` (single 4-digit integer, start year)

**Evidence:**
- Official FDO v4 docs confirm: "An integer, like `[\d]{4}`"
- Example from docs shows `season=2021` maps to 2021-08-13 → 2022-05-22 season
- **Therefore, for 2023/24 season: use `?season=2023`**

**Applicable Endpoints:**
- ✅ `/competitions/PL/standings?season=2023`
- ✅ `/teams/64/matches?season=2023`
- ✅ `/competitions/PL/scorers?season=2023`

### 2. Historical Data Availability

**Free Tier (12 Competitions):**
- Access to current + past seasons documented
- Exact number of historical years **NOT specified** in public docs
- Standings data has caveats: "compiled by match information only, so they lack possible deducted points" when season+matchday filters combined

**Paid Tier Note:**
- ML Pack Light (€29/month) explicitly offers "10 seasons of history"
- This suggests free tier has fewer than 10 seasons available
- Official FDO docs state: "you can combine season and matchday filters"

**Gotcha:**
- Standings may not be available for very old seasons (pre-2000s)
- FDO recommends contacting support directly for specific historical coverage questions

### 3. Free Tier Limitations

| Aspect | Details |
|--------|---------|
| Rate Limit | 10 requests/minute (authenticated free) |
| Competitions | 12 top leagues (PL, La Liga, Bundesliga, Ligue 1, Serie A, etc.) |
| Data Freshness | Scores delayed (vs. real-time on paid tiers) |
| Historical Seasons | **Not publicly documented** |
| Contact | daniel@football-data.org |

---

## Unresolved Questions

1. **How many seasons of historical data does free tier actually provide?**
   - Docs reference "past season data" but not the depth
   - Paid tier offers 10 seasons; free likely has fewer
   - **Action:** Test empirically or contact FDO support

2. **Do standings return for all historical seasons?**
   - Docs mention standings can be queried by season
   - But also note deduction caveats with filters
   - **Action:** Test against FDO API directly for pre-2010 seasons

3. **Are there any breaking differences between FDO v4 and API-Football?**
   - Current app uses API-Football (team 40, league 39, season 2024)
   - FDO is separate provider
   - **Action:** Verify endpoint compatibility if considering migration

---

## Comparison to Current Stack (API-Football)

| Aspect | API-Football | Football-Data.org |
|--------|--------------|-------------------|
| **Season Format** | Start year (`2024` for 2024/25) | Start year (`2024` for 2024/25) ✅ |
| **Free Tier Seasons** | 2022-2024 only (2025 blocked) | Unknown (likely 3-5 years) |
| **Standings Support** | ✅ Yes | ✅ Yes (with caveats) |
| **Matches Support** | ✅ Yes | ✅ Yes |
| **Scorers Support** | ✅ Yes | ✅ Yes |
| **Rate Limit** | 100 req/day unauthenticated | 10 req/min (authenticated free) |

---

## Recommendation

FDO v4 **is a viable alternative** to API-Football for historical season data, but:

1. **Verify free tier depth** — contact daniel@football-data.org or test empirically
2. **If deeper history needed** (10+ seasons), FDO paid tier is explicit about coverage
3. **Season format is identical** to current API-Football implementation (`?season=YYYY`)
4. **Standings queries work differently** — test for pre-2010 availability before committing

---

## Sources

- [Football-Data.org API v4 Docs](https://docs.football-data.org/general/v4/index.html)
- [Competition Endpoint Docs](https://docs.football-data.org/general/v4/competition.html)
- [API Policies & Rate Limits](https://docs.football-data.org/general/v4/policies.html)
- [Pricing & Free Tier](https://www.football-data.org/pricing)
- [Coverage Overview](https://www.football-data.org/coverage)
- [Quickstart Guide](https://www.football-data.org/documentation/quickstart)
