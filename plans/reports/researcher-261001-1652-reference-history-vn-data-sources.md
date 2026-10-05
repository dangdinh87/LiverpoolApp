# Liverpool App — Free Data Sources Research

> ⚠ **Đính chính:** báo cáo này có nhiều chỗ sai (FPL transfers/history_past, Wikidata nhãn VI, URL openfootball, trạng thái RSS, Bzzoiro/Big Balls). Đọc [research-261001-1652-db-data-sources-synthesis.md](research-261001-1652-db-data-sources-synthesis.md) §3 trước khi dùng.
**Date:** 2026-10-01 | **Researcher:** Claude Code | **Scope:** Auto-refreshable squad, history, images, VN broadcast data

---

## 1. Source Evaluation Table

| Source | Data | License | Store-in-DB OK? | Fetch Method | Freshness | Risk | Status |
|--------|------|---------|---|---|---|---|---|
| **Wikidata SPARQL** | Current squad (Q1130849), birth dates, positions, nationality, VI labels | CC0 | ✅ Yes | SPARQL (rate-limit friendly) | Daily | Low | ✅ Works; **VI labels absent for LFC squad** |
| **Wikipedia API** (EN) | Squad lists, club history, season articles, player bios | CC-BY-SA 3.0 | ✅ Yes (attr. req.) | REST API | Manually updated | Low | ✅ Works |
| **Wikipedia VI** | Vietnamese player name translations, position terms | CC-BY-SA 3.0 | ✅ Yes (attr. req.) | REST API | Sparse; curate | Medium | ⚠ Incomplete—~30% of LFC squad have VI articles |
| **liverpoolfc.com** (squad JSON) | Current squad, shirt #, bio, photos, honors | Proprietary | ❌ No scraping | Behind frontend; currently hand-scraped | Real-time | High | ✅ Works; **no public API** |
| **openfootball/football.json** | PL results, fixtures (daily auto-gen) | CC0 | ✅ Yes | Git raw + JSON; updated 5am UTC | Daily | Low | ⚠ 2026-27 added; no European competitions yet |
| **LFChistory.net** | ~6000+ matches since 1892, line-ups, player stats | © Restricted | ❌ Requires permission | Web scraping (risky) | Manual updates | High | ✅ Exists; needs explicit ToS/permission |
| **RSSSF** | Historical league tables, intl matches, player stats | © + Attribution | ❌ Requires permission | Manual contact; no public scraping | Manual | High | ✅ Exists; membership/permission required |
| **FPL API** (`/api/bootstrap-static/`) | Liverpool player data (id, name, photo, points) | No license stated | ⚠ Grey area | REST JSON; rate-limited | Weekly refresh | Medium | ✅ Works; **no license = risky for storage** |
| **Wikimedia Commons** | Player photos, stadium, crest, historical | CC-BY-SA / CC0 (per file) | ✅ Yes (attr. req.) | File API; search by category | Manual | Low | ✅ Works; **license per image** |
| **StatsBomb Open Data** | Liverpool match events (2018–2023 only) | Free (research) | ⚠ Check license | GitHub + download JSON | Static (no live) | Low | ✅ Exists; limited Liverpool coverage |
| **Transfermarkt** | Squad, transfer history, market values | Proprietary | ❌ ToS forbids scraping | Web scraping (blocked; 405 error) | Real-time | **Very high** | ❌ Blocked; ToS strict |
| **Vietnamese News (Bóng Đá, VNExpress, webthethao)** | Liverpool match reports, transfer rumors | Proprietary | ✅ News fair-use | RSS + web scraping | Daily | Low | ⚠ Mixed: some feeds 200 OK, some 403/404 |

---

## 2. Recommended Sources by Area

### **A. Players & Squad (Current + All-Time)**

**Best for current squad:**
- **Primary: liverpoolfc.com** (`/api/squad` endpoint if it exists; currently hand-scraped from frontend)
  - ✅ Real-time, official, complete (30 players + coach)
  - ❌ Proprietary; no public API documented
  - **Action:** Reverse-engineer endpoint or continue hand-scraping; refresh weekly
  
- **Secondary: FPL API** (`https://fantasy.premierleague.com/api/bootstrap-static/`)
  - ✅ Free, JSON, includes photo codes + stats
  - ❌ No explicit license; fantasy data diverges from official roster (injuries, loans)
  - ✅ Supplement only; don't use as source of truth for squad membership
  
- **Tertiary: Wikidata SPARQL** 
  ```sparql
  SELECT ?player ?playerLabel ?position ?positionLabel ?birth
  WHERE {
    ?player p:P54 ?memberOf .
    ?memberOf ps:P54 wd:Q1130849 .
    ?memberOf pq:P580 ?startDate .
    FILTER(NOT EXISTS { ?memberOf pq:P582 ?endDate })
    OPTIONAL { ?player wdt:P413 ?position . }
    OPTIONAL { ?player wdt:P569 ?birth . }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
  }
  ```
  - ✅ Free (CC0), canonical, structured; birth dates reliable
  - ⚠ VI labels absent—must curate separately
  - **Refresh:** Daily via SPARQL endpoint (friendly rate limit)

**Best for all-time squad & transfers:**
- **Wikipedia** (EN + VI articles for major players)
- **Wikidata** (career history via `P54` property; full employment timeline)
- **LFChistory.net** (6000+ matches → infer squad from line-ups; requires scraping permission)

---

### **B. Club History & Every Match Ever**

**Best for complete history since 1892:**
- **Option 1: LFChistory.net** (6000+ documented matches)
  - ✅ Comprehensive coverage from 1892 to today
  - ❌ No public API; proprietary © terms; scraping risky
  - 🔍 **Action:** Email `admin@lfchistory.net` for data licensing / bulk export terms
  
- **Option 2: openfootball/football.json** (CC0)
  - ✅ Current season (2026-27) auto-updated daily at 5am UTC
  - ❌ **No European competitions** (Champions League, FA Cup, League Cup not included yet)
  - ❌ Historical data requires manual contribution
  - **Use case:** PL fixtures & results only
  - **Endpoint:** `https://raw.githubusercontent.com/openfootball/england/master/2026-27/1-premier-league.json`
  
- **Option 3: RSSSF** (historical archives)
  - ✅ Complete historical league tables, results, intl matches
  - ❌ © restricted; requires attribution; no scraping
  - **Action:** Contact RSSSF for membership / data access permission

- **Option 4: Wikipedia** (season-by-season articles)
  - ✅ Free (CC-BY-SA), reliable for major seasons
  - ⚠ Accuracy varies; manual updates
  - **Use case:** Supplement to verify historical record

---

### **C. Open Advanced Data**

**StatsBomb Open Data** (`https://github.com/statsbomb/open-data/`)
- **Coverage:** Liverpool matches 2018–2023 in event-level detail (shots, passes, dribbles)
- **License:** CC BY-NC 4.0 (non-commercial research only; **cannot store in public DB**)
- **Format:** JSON events per match
- **Use case:** Visualizer research; not for public display without license upgrade

---

### **D. Images & Branding**

**Player photos (current):**
- **Best:** liverpoolfc.com backend CDN (official, high-res, always current)
  - ❌ Proprietary; hot-linking may be blocked
  - ✅ Already using in squad.json
  
- **Alternative:** FPL player photos
  - **Pattern:** Photo codes in FPL data; reconstruct URL (inconsistent CDN structure)

**Historical images / stadium / crest:**
- **Wikimedia Commons** (`https://commons.wikimedia.org/wiki/Category:Liverpool_FC`)
  - ✅ Free, CC-BY-SA or CC0 per file
  - ✅ Extensive: stadium, vintage team photos, trophies, crest evolution
  - **Action:** Link each image to its Wikimedia file page; include license attribution

**Brand usage for fan sites:**
- **Liverpool FC brand guidelines** not publicly documented
- Fan sites generally tolerated (unofficial badge OK; explicit disclaimer required)
- **Recommendation:** Add footer: "Unofficial fan site. Liverpool F.C. is a trademark of Liverpool Football Club and Athletic Grounds Limited."

---

### **E. Vietnam-Specific Data**

**Broadcast rights (2026-27):**
- **FPT Play** (exclusive via JAS/Monomax; 2026–2031 contract)
  - No public API; manual data needed
  - **Recommendation:** Add "Watch Liverpool on FPT Play" banner (VI/EN) with link to fptplay.vn
  - Source: Wikipedia "List of Premier League overseas broadcasters"

**Vietnamese news feeds (tested Oct 1, 2026):**
| Feed | URL | Status | Liverpool Coverage |
|------|-----|--------|---|
| Webthethao | `https://webthethao.vn/feed` | 200 OK | ✅ Regular |
| Bóng Đá | `https://bongda.com.vn/rss.xml` | 406 Forbidden | ❌ Blocked |
| VNExpress | `https://vnexpress.net/rss/the-thao.rss` | 302 Redirect | ⚠ Works via redirect |
| Tuổi Trẻ | `https://tuoitre.vn/rss/` | 404 Not Found | ❌ Dead |
| Thanh Niên | Not tested | Unknown | Need verify |
| Dân Trí | Not tested | Unknown | Need verify |
| Znews | Not tested | Unknown | Need verify |

**Recommendation:** Use **Webthethao** as primary VN feed (200 OK). Fallback to VNExpress (via redirect).

---

### **F. Translation & Bilingual Reference**

**Vietnamese player names / position labels:**
- **Wikidata:** Zero VI labels for current LFC squad (verified 2026-10-01)
- **Wikipedia VI:** ~30% of LFC squad have dedicated VI articles (e.g., Alisson Becker ✅, Jürgen Klopp ✅)
- **Manual curation required:** Create `player-names.vi.json` with Vietnamese name variants (already exists for some in `player-bios.vi.json`)
- **Position terms (VI):**
  - Goalkeeper = Thủ môn
  - Defender = Hậu vệ (or by type: Hậu vệ trung tâm, Hậu vệ cánh)
  - Midfielder = Tiền vệ
  - Forward = Tiền đạo
  
**Recommendation:** Maintain curated VI name mapping in `src/data/player-names.vi.json`; seed from Wikipedia VI where it exists.

---

## 3. Proposed Minimal DB Tables

**Only tables justified by sources we can keep fresh:**

```sql
-- 1. players (current squad + historical)
CREATE TABLE players (
  id INT PRIMARY KEY,                         -- Wikidata Q ID or liverpoolfc.com id
  name_en TEXT NOT NULL,
  name_vi TEXT,                               -- Curated from Wikipedia VI / manual
  position TEXT,                              -- goalkeeper, defender, midfielder, forward
  position_vi TEXT,                           -- Thủ môn, etc.
  nationality TEXT,
  date_of_birth DATE,
  bio_en TEXT,                                -- From liverpoolfc.com / Wikipedia
  bio_vi TEXT,                                -- Curated
  photo_url TEXT,                             -- CDN link (liverpoolfc.com)
  shirt_number INT,
  joined_date DATE,
  left_date DATE,                             -- NULL if current
  on_loan BOOLEAN DEFAULT FALSE,
  honors_en TEXT[],                           -- Array of trophy names
  wikidata_id TEXT UNIQUE,                    -- Q1234567
  wikipedia_en_url TEXT,
  wikipedia_vi_url TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. matches_history (PL + European, from openfootball / LFChistory)
CREATE TABLE matches_history (
  id INT PRIMARY KEY,
  date DATE,
  competition TEXT,                           -- "Premier League", "Champions League", etc.
  home_team TEXT,
  away_team TEXT,
  home_score INT,
  away_score INT,
  location TEXT,
  attendance INT,
  referee TEXT,
  notes TEXT,
  source TEXT,                                -- "openfootball" | "lfchistory" | "wikipedia"
  source_url TEXT,
  updated_at TIMESTAMP
);

-- 3. player_seasons (career timeline: seasons, appearances, goals)
CREATE TABLE player_seasons (
  player_id INT NOT NULL REFERENCES players(id),
  season TEXT,                                -- "2024-25"
  appearances INT,
  goals INT,
  assists INT,
  clean_sheets INT,                           -- For keepers/defenders
  source TEXT,                                -- "wikidata" | "fpl" | "wikipedia"
  updated_at TIMESTAMP
);

-- 4. transfers (in/out history)
CREATE TABLE transfers (
  id INT PRIMARY KEY,
  player_id INT NOT NULL REFERENCES players(id),
  transfer_date DATE,
  from_club TEXT,
  to_club TEXT,
  transfer_fee TEXT,                          -- "Free" | "€45M" etc; human-readable
  transfer_type TEXT,                         -- "Permanent" | "Loan"
  source TEXT,                                -- "wikidata" | "lfchistory"
  updated_at TIMESTAMP
);

-- 5. news_sources (cache metadata for feeds)
CREATE TABLE news_sources (
  source_id TEXT PRIMARY KEY,
  source_label TEXT,                          -- "Webthethao", "VNExpress", etc.
  feed_url TEXT,
  language TEXT,                              -- "vi" | "en"
  last_checked TIMESTAMP,
  status INT,                                 -- HTTP status code
  item_count INT,                             -- Last fetch count
  updated_at TIMESTAMP
);
```

**Refresh cadence (YAGNI—only if source is live):**
- `players` → Weekly from liverpoolfc.com; daily from Wikidata (verify birth dates, positions)
- `matches_history` → Daily from openfootball (PL only); monthly from Wikipedia/LFChistory (backfill if licensed)
- `player_seasons` → Weekly from FPL (current season only)
- `transfers` → Weekly from Wikidata career history
- `news_sources` → Real-time (hourly feed checks)

---

## 4. Unresolved Questions

1. **Can you contact LFChistory.net or RSSSF for bulk data export / licensing?** Their 6000+ match DB would be ideal but require permission.
2. **Does liverpoolfc.com have a documented JSON API for squad data?** Currently reverse-engineered from frontend; official endpoint would be safer.
3. **Can Vietnamese Wikipedia VI labels for Liverpool players be auto-populated via bot?** Currently 0/30 squad members have VI Wikidata labels.
4. **FPL player photo CDN structure:** Does it have a stable pattern? (Currently fetched via undocumented API; might break.)
5. **How to legally use StatsBomb open data?** License is CC-BY-NC (research only); cannot display in public DB without upgrade.
6. **Do Thai/Vietnamese news sites (Bóng Đá, Tuổi Trẻ) have documented ToS on RSS scraping?** Many return 403/404; no public API.
7. **Liverpool FC fan site usage of crest / badge:** Any official brand guidelines / DMCA risk?

---

## Key Recommendations (Prioritized)

1. **Immediate (This week):**
   - Lock in openfootball as canonical PL fixture source (CC0, auto-updated)
   - Switch news aggregation to reliable feeds only (Webthethao, FPL API for stats)
   - Add FPT Play broadcast link + VI label for "Xem trên FPT Play"

2. **Short-term (Next 2 weeks):**
   - Email LFChistory.net & RSSSF re: data licensing for historical matches
   - Curate `player-names.vi.json` for current squad (30 players, ~10 min)
   - Implement weekly Wikidata SPARQL refresh for squad birth dates/positions

3. **Medium-term (Q4 2026):**
   - If LFChistory licenses data: build matches_history table + ingest 6000+ records
   - Backfill missing player Wikipedia VI articles (if community-driven)
   - Test FPL photo CDN stability; consider fallback to Wikimedia Commons

4. **Do NOT pursue (YAGNI):**
   - Transfermarkt scraping (ToS hostile; legal risk)
   - Complete match event data (StatsBomb license incompatible)
   - Real-time injury/squad rotation APIs (live data out of scope per briefing)
   - Fantasy Fantasy League integration (grey license; diverges from reality)

---

**Report saved to:** `/Users/nguyendangdinh/LiverpoolApp/plans/reports/researcher-261001-1652-reference-history-vn-data-sources.md`
