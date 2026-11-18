# Data Providers

Server-only football data layer (`src/lib/football/`) for **Anfield Daily** — combining **Football-Data.org v4**, **ESPN Soccer API**, **Fantasy Premier League (FPL) API**, static bilingual club datasets, and time-zone broadcaster mapping behind a unified barrel.

---

## 1. Overview & Data Flow

All football data queries flow through `src/lib/football/index.ts`, which carries `import "server-only"` and wraps every exported function in `React.cache()` for per-request deduplication.

```text
Page / Route Handler (Server Component)
  ↓
import { getFixtures, getStandings, getSquad } from "@/lib/football"
  ↓
React.cache() per-request deduplication
  ├── Football-Data.org (`fdo-client.ts` — in-flight dedup + HTTP 429 backoff)
  ├── ESPN (`espn-events.ts` — FA/EFL Cup fixtures, live snapshots, events, lineups, 28 stats)
  ├── FPL API (`fpl-stats.ts` — detailed Premier League player season stats)
  └── Local JSON (`src/data/squad.json` + `.vi.json` static club datasets)
```

### Key Files

| File | Responsibility |
|---|---|
| `src/lib/football/index.ts` | Server-only barrel export + `React.cache()` wrappers + cup deduplication |
| `src/lib/football/provider.ts` | `FootballDataProvider` interface |
| `src/lib/football/fdo-client.ts` | Shared FDO fetcher (`fdoFetch`), in-flight dedup, `HTTP 429` retry/backoff, `requireNonEmptyArray` |
| `src/lib/football/fdo-provider.ts` | `FdoProvider` implementation (squad enrichment, scorers, team info) |
| `src/lib/football/fdo-standings.ts` | Premier League (`/competitions/PL/standings`) & Champions League (`/competitions/CL/standings`) tables |
| `src/lib/football/fdo-matches.ts` | Season & archived fixtures (`/teams/64/matches`) + coach lookup |
| `src/lib/football/fdo-h2h.ts` | Head-to-head record computation (`computeH2H`) |
| `src/lib/football/espn-events.ts` | ESPN cup fixtures, live snapshots, minute events, lineups, and 28-metric match stats |
| `src/lib/football/fpl-stats.ts` | Fantasy Premier League individual player statistics |
| `src/lib/football/season-stats.ts` | Derived season overview, form timeline, competition breakdown & milestones |
| `src/lib/football/current-season.ts` | UTC-derived active season year/label & selectable archive seasons |
| `src/lib/football/premier-league-broadcasters.ts` | Viewer IANA time-zone → country → Premier League TV broadcaster lookup |
| `src/lib/types/football.ts` | Canonical TypeScript models (`Player`, `Fixture`, `Standing`, `FixtureEvent`, etc.) |

---

## 2. Football-Data.org v4 (Primary)

- **Base URL:** `https://api.football-data.org/v4`
- **Liverpool Team ID:** `64` in FDO → mapped via `mapFdoTeamId()` to canonical ID `40` across the app
- **Environment Variable:** `FOOTBALL_DATA_ORG_KEY` (10 req/min on the free plan)

### Resilience in `fdo-client.ts`

1. **Per-isolate in-flight deduplication:** Concurrent calls for the same `${revalidate}:${path}` share a single Promise.
2. **Bounded `HTTP 429` retry/backoff:** Reads `X-RequestCounter-Reset` (with jitter, capped at `12s`, up to 2 retries) so multi-worker `next build` bursts wait cleanly instead of failing pages.
3. **`requireNonEmptyArray()`:** Throws before `unstable_cache` can persist an empty array caused by a transient upstream outage.
4. **No mock fallback:** When `FOOTBALL_DATA_ORG_KEY` is unset, barrel functions log a warning and return empty arrays or `null` so UI empty states render honestly.

---

## 3. ESPN Soccer API (Match Detail, Live & Domestic Cups)

- **Base URL:** `https://site.api.espn.com/apis/site/v2/sports/soccer`
- **Liverpool Team ID:** `364`
- **Credentials:** None (free public endpoints)
- **Competitions:** `eng.1` (Premier League), `uefa.champions` (Champions League), `eng.fa` (FA Cup), `eng.league_cup` (EFL Cup)

### What ESPN Supplies

- **Domestic Cup Fixtures:** `getFixtures()` merges ESPN FA Cup and EFL Cup fixtures into the FDO schedule for the active season, normalising competition keys via `competitionKey()` so competitions already covered by FDO are never duplicated.
- **Match Events & Lineups:** Preferred over FDO because ESPN provides exact goal/card/substitution minutes (including own-goal attribution) and full starting XIs + benches.
- **Match Statistics & Post-Match Facts:** `getMatchDetail(fixtureDate)` returns venue, attendance, referee, and up to 28 per-team statistics (possession, shots, shots on target/goal, passes, corners, fouls), feeding both `/fixtures/[id]` and AI post-match review generation (`src/lib/site-articles/match-review-facts.ts`).
- **Live Polling:** `getLiveSnapshot()` powers `/api/live-fixture` for live score and clock updates.

---

## 4. Fantasy Premier League (FPL) & Local Squad Data

- **Squad Base (`src/data/squad.json` + `src/data/player-bios.vi.json`):** Curated roster metadata, biographies (`en` and `vi`), honours, shirt numbers, and slugs for all 31 first-team players (`src/lib/squad-data.ts`).
- **FPL Stats (`src/lib/football/fpl-stats.ts`):** Supplements player detail pages (`/player/[id]`) with Premier League minutes, goals, assists, clean sheets, saves, and expected-goal metrics.

---

## 5. "Where to Watch" Broadcaster Mapping

`src/lib/football/premier-league-broadcasters.ts` maps the viewer's **IANA time zone** (detected client-side via `useViewerTimeZone()`) — rather than interface language — to the official Premier League rights holder in that country (for example, an English-speaking reader in Vietnam sees K+ / FPT Play, in Indonesia sees Vidio, and in the UK sees Sky Sports / TNT Sports). Unknown countries or non-PL fixtures render nothing rather than guessing.

---

## 6. Season Helper (`current-season.ts`)

`getCurrentSeasonYear()` computes the European season start year in UTC (switching on August 1 UTC) so builds, Cloudflare Workers isolates in any region, and archived routes (`/season?season=2025`, `/stats/2025`, `getFixtureById` archive fallback) agree on the active campaign without hardcoded year literals.
