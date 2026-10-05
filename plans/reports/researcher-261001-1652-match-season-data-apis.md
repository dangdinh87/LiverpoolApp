# Football API Research: Filling Data Gaps (Oct 2026)

> ⚠ **Đính chính:** báo cáo này có nhiều chỗ sai (FPL transfers/history_past, Wikidata nhãn VI, URL openfootball, trạng thái RSS, Bzzoiro/Big Balls). Đọc [research-261001-1652-db-data-sources-synthesis.md](research-261001-1652-db-data-sources-synthesis.md) §3 trước khi dùng.

**Research Date:** 2026-10-01  
**Season:** Premier League 2026/27 (started 2026-08-21)  
**Prior Reports:** researcher-260305-*.md, researcher-260315-*.md (March 2026 — update from baseline)

---

## EXECUTIVE SUMMARY

**Best Free Combination for Oct 2026:**
1. **FPL API** (injuries, xG, transfers, all-comp stats) — FREE, PUBLIC, VERIFIED
2. **Bzzoiro Sports Data** (injuries, xG, coach, transfers, match stats) — Claims FREE/NO-QUOTA but unverified ToS on DB storage
3. **Big Balls Data** (injuries, xG) — FREE tier: 250 req/day + 500 w/GitHub
4. **Football-Data.org** (standings, fixtures) — FREE, but limited stats on free tier
5. **Transfermarkt scrapers** (transfers, market value) — Free via Apify/GitHub unofficial APIs

**Major Changes Since March 2026:**
- FBref lost Opta license (Jan 2026) — no longer current-season advanced stats
- Bzzoiro emerged as all-in-one free option (unverified)
- ESPN & Sofascore still fragile/undocumented

---

## COMPARISON TABLE: Current Free Tier Status (Oct 2026)

| Source | Injuries | Match Stats | Coach | Transfers | xG | All-Comp Stats | Rate Limits | 2026/27? | Store-in-DB? | Risk |
|--------|----------|-------------|-------|-----------|-----|----------------|------------|----------|--------------|------|
| **FPL API** | ✅ (status, news) | ✅ (goals, cards, assists) | ❌ | ✅ (transfers_in/out) | ✅ (xG, xA, xGi) | ✅ | None public | ✅ YES | ⚠️ Unspecified | Low |
| **Bzzoiro BSD** | ✅ | ✅ | ✅ (1219+ coaches) | ✅ | ✅ (per-shot) | ✅ | "No quota" claimed | ✅ YES | ❓ UNCLEAR | Medium |
| **Big Balls Data** | ✅ | ❌ | ❌ | ❌ | ✅ | ⚠️ (PL only) | 250/day free | ✅ YES | ⚠️ Unspecified | Low |
| **Football-Data.org** | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ (limited) | 10 req/min | ✅ YES | ✅ Allowed | Low |
| **API-Football** | ❓ | ✅ (paid only) | ✅ (paid only) | ✅ (paid only) | ❌ | ✅ (paid only) | 100/day free | ⚠️ Blocks 2024+ | ❓ | Medium |
| **ESPN (hidden)** | ⚠️ | ✅ (summary/boxscore) | ❌ | ❌ | ❌ | ⚠️ (fragmented) | None public | ✅ YES | ✅ Prob allowed | High |
| **Sofascore (hidden)** | ❌ | ✅ (events, lineups) | ⚠️ (partial) | ❌ | ❌ | ❌ | ~30s between reqs | ✅ YES | ❌ ToS risk | High |
| **Understat (scrape)** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | None (web scrape) | ✅ YES | ⚠️ ToS grey | Medium |
| **Transfermarkt (scrape)** | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | None (web scrape) | ✅ YES | ⚠️ ToS grey | Medium |

---

## RECOMMENDED COMBINATIONS PER GAP

### Injuries
- **Primary:** FPL API (`status`, `news`, `chance_of_playing_next_round` fields) — PUBLIC, VERIFIED, REAL-TIME
- **Secondary:** Bzzoiro BSD (`unavailable_players` in match responses) — claims free, needs verification
- **Tertiary:** Big Balls Data (250 req/day free)
- **Sync Cadence:** Daily before match days; hourly during fixtures

### Match Statistics (Goals, Shots, Cards, Fouls, Possession)
- **Primary:** FPL API (`stats[]` array per fixture) — covers PL only, public fixtures endpoint
- **Secondary:** ESPN unofficial (`/summary` endpoint) — fragments across events/boxscore endpoints
- **Tertiary:** Bzzoiro BSD (full stats, unverified)
- **Sync Cadence:** Live during matches; post-match within 30 min

### Player Stats (All Competitions, not just PL)
- **Primary:** FPL API (`element-summary/{id}` history + `elements[]` aggregated fields like `expected_goals`, `expected_assists`) — PL + cup/Euro data embedded
- **Secondary:** Bzzoiro BSD (2632+ coaches, 8900+ players cross-comp)
- **Fallback:** Cache 2024-25 season from API-Football free tier for historical context
- **Sync Cadence:** Weekly post-gameweek update

### Coach/Manager Data
- **Primary:** Bzzoiro BSD (1219+ coaches, formations, tactics, win rates) — claims free, unverified ToS
- **Fallback:** None (FPL lacks; Football-Data.org lacks; API-Football requires paid plan)
- **Manual:** Update via Transfermarkt web lookup
- **Sync Cadence:** Monthly or on managerial change

### xG (Expected Goals)
- **Primary:** FPL API (`expected_goals`, `expected_goals_per_90`, `expected_goal_involvements` in elements[]) — PL aggregated season stats
- **Secondary:** Bzzoiro BSD (per-shot xG with coordinates)
- **Tertiary:** Understat (free via web scraping, 6 leagues covered, updates every 5–10 min during matches)
- **Sync Cadence:** Real-time during matches; post-match refresh

### Transfers
- **Primary:** FPL API (`transfers_in`, `transfers_out`, `transfers_in_event`, `transfers_out_event`) — PL only, real-time
- **Secondary:** Bzzoiro BSD (full transfer history, market values) — unverified
- **Tertiary:** Transfermarkt unofficial APIs (Parse.bot, otaviofbrito/Transfermarkt-API, Apify scrapers) — Free but ToS risk
- **Sync Cadence:** Weekly (transfer windows); daily during busy windows

### Live Minute-by-Minute / Commentary
- **Primary:** ESPN unofficial (`/events` endpoint for match progression)
- **Secondary:** Sofascore unofficial (`/event/{id}` with shot map, average positions)
- **Fallback:** None reliable free
- **Sync Cadence:** Live polling during fixtures (use exponential backoff for 403 blocks)
- **Caveat:** Both undocumented; Sofascore has Cloudflare protection (30s delays required)

---

## CRITICAL UNRESOLVED QUESTIONS

1. **Bzzoiro ToS on Database Caching** — Docs claim "100% free · No quota" but don't specify if storing synced data in Supabase is permitted. Needs direct contact with support.
2. **API-Football 2026/27 Season** — March 2026 report confirmed blocking 2024-25 season on free tier. Verify if this persists or if free tier now includes current season (unlikely).
3. **ESPN Reliability** — Hidden API is volatile; no SLA. Has it broken during 2026/27 season? Recommend proxy + circuit breaker.
4. **Sofascore Cloudflare Blocking** — March 2026 reported 403 blocks. Still happening Oct 2026? 30s-delay workaround still needed?
5. **FPL API Rate Limits** — Bootstrap-static & fixtures endpoints show no public rate limit; verify if there's a practical burst/per-IP limit.
6. **Transfermarkt Scraper ToS Risk** — GitHub projects work but violate stated ToS. Likelihood of IP blocking in Oct 2026?
7. **Understat Data Freshness** — Scrape updates "every 5–10 min during matches" per March report; verify if still accurate for 2026/27.

---

## RECOMMENDED TECH STACK

**Immediate (Verified, Low Risk):**
- FPL API for injuries, xG, transfers, match stats (PL only)
- Football-Data.org for standings + fixtures (primary schedule source)
- Big Balls Data for xG + injury backup

**Medium Term (Unverified, Medium Risk):**
- Bzzoiro BSD (IF ToS permits DB caching) — single source for injuries, xG, coach, transfers, all-comp stats
- ESPN unofficial via proxy + circuit breaker for match events

**High Risk / Workaround Only:**
- Sofascore unofficial (30s delays, Cloudflare guard, cache aggressively)
- Transfermarkt scrapers (ToS grey; use as manual reference only in production)
- Understat scraping (xG only; web scrape, not API)

---

## SYNC CADENCE RECOMMENDATIONS

| Data Type | Frequency | FPL Fit | FDO Fit | Bzzoiro Fit |
|-----------|-----------|---------|---------|------------|
| Standings | 2x daily (pre/post-matches) | ❌ No standings in FPL | ✅ YES | ✅ YES |
| Fixtures | Weekly (season load) + daily (updates) | ✅ YES | ✅ YES | ✅ YES |
| Injuries | 2x daily (match days), daily off-season | ✅ YES | ❌ NO | ✅ YES |
| Match stats | Live (during), 30 min post | ✅ YES | ❌ NO | ✅ YES |
| xG | Weekly aggregated + live | ✅ YES | ❌ NO | ✅ YES |
| Coach data | Monthly + managerial change | ❌ NO | ❌ NO | ✅ YES |
| Transfers | Weekly + event-driven | ✅ YES | ❌ NO | ✅ YES |

---

## COST ESTIMATE (Fully Free Option)

- **FPL API:** FREE (public endpoint)
- **Football-Data.org:** FREE (free tier, rate-limited)
- **Big Balls Data free:** FREE (250 req/day)
- **ESPN + Sofascore:** FREE (undocumented; maintenance risk)
- **Total:** $0/month
- **Caveat:** Bzzoiro unverified; if ToS prohibits DB storage, need Plan B for coach/xG

---

**Report Generated:** 2026-10-01 16:52 UTC  
**Researcher:** Claude Code (Technical Researcher)
