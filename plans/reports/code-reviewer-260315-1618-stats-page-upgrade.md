# Code Review Report — Stats Page Upgrade

**Date:** 2026-03-15
**Reviewer:** code-reviewer
**Slug:** stats-page-upgrade

---

## Scope

- **Files reviewed:** 12 (season-stats.ts, page.tsx, loading.tsx, season-overview.tsx, goals-by-month-chart.tsx, home-away-chart.tsx, form-timeline.tsx, competition-breakdown.tsx, records-milestones.tsx, navbar-client.tsx, en.json, vi.json)
- **Lines of code:** ~800
- **Review focus:** Logic correctness, type safety, i18n coverage, performance, accessibility

---

## Overall Assessment

Solid, well-structured implementation. Architecture constraints followed correctly (zero extra API calls, server page + client charts, Dark Stadium tokens, next-intl). Two logic bugs found — one is a data-correctness defect that silently miscounts W/D/L for cup matches decided in extra time or penalties.

---

## Critical Issues

None (no security vulnerabilities, no data loss risk, no breaking changes).

---

## High Priority Findings

### 1. AET/PEN matches — W/D/L miscounted (data correctness bug)

**File:** `src/lib/football/season-stats.ts` + `src/lib/types/football.ts`

`computeSeasonStats` correctly filters for finished statuses `{"FT", "AET", "PEN"}` but then calls `getMatchResult()`, which hardcodes `if (f.status.short !== "FT") return "NS"`. AET and PEN matches return `"NS"`, which falls through every `if/else if` branch in `computeOverview`, `computeCompetitionStats`, `computeRecords` — so goals are counted but the match result is silently ignored.

Impact: Cup matches decided on penalties/extra time inflate `goalsFor`/`goalsAgainst` but don't add to `wins`/`losses`, making `played` > `wins + draws + losses` and `winRate` wrong.

Fix — either extend `getMatchResult` to handle AET/PEN:

```ts
// in football.ts getMatchResult
if (!["FT", "AET", "PEN"].includes(f.status.short)) return "NS";
```

Or (cleaner, no change to shared type) add a local helper in `season-stats.ts`:

```ts
function getResult(f: Fixture): "W" | "D" | "L" | "NS" {
  const finishedStatuses = new Set(["FT", "AET", "PEN"]);
  if (!finishedStatuses.has(f.fixture.status.short)) return "NS";
  if (f.goals.home === null || f.goals.away === null) return "NS";
  const isHome = f.teams.home.id === LFC_ID;
  const lfc = isHome ? f.goals.home : f.goals.away;
  const opp = isHome ? f.goals.away : f.goals.home;
  return lfc > opp ? "W" : lfc < opp ? "L" : "D";
}
```

---

## Medium Priority Improvements

### 2. `currentStreak.type` includes unreachable `"D"` variant

**File:** `src/lib/football/season-stats.ts` (line 75)

`SeasonRecords.currentStreak.type` is typed as `"W" | "D" | "unbeaten"` but `computeRecords` only ever assigns `"W"` or `"unbeaten"`. `"D"` is dead. `season-overview.tsx` renders only W/unbeaten badge variants — a `"D"` value would silently render the `"unbeaten"` style, which is misleading.

Fix — remove `"D"` from the union or add D-streak tracking. Given `"D"` has no corresponding badge, remove it:

```ts
currentStreak: { type: "W" | "unbeaten"; count: number };
```

### 3. `scoringFirst` metric mislabeled — tracks HT lead not first goal

**File:** `src/lib/football/season-stats.ts` (lines 305-311)

The label says "Scoring First Win %" but the logic counts matches where LFC is **leading at HT** (`htLfcGoals > htOppGoals`), not where LFC scored first. These are different concepts. A match where LFC concedes first, equalizes, then leads at HT would be incorrectly counted.

Fix — either rename to "Leading at HT Win %" in i18n keys, or replace the logic with a first-goal check (would require events data, which violates the zero-extra-API-calls constraint). Recommend renaming:

```json
// en.json
"scoringFirst": "Leading at HT Win %"
// vi.json
"scoringFirst": "Dẫn trước HT thắng %"
```

### 4. vi.json: `competitions.gf` and `competitions.ga` both map to `"BT"` (Bàn Thắng)

**File:** `src/messages/vi.json`

```json
"gf": "BT",
"ga": "BT"
```

Both "Goals For" and "Goals Against" render as `"BT"` in Vietnamese. They are indistinguishable in the competition cards.

Fix:
```json
"gf": "BT",
"ga": "BTh"
```
Or use full labels: `"Bàn thắng"` / `"Bàn thua"`.

### 5. Streak badge strings hardcoded in English

**File:** `src/components/stats/season-overview.tsx` (line 72)

```tsx
{streak.type === "W" ? `${streak.count}W Streak` : `${streak.count} Unbeaten`}
```

These strings are not from i18n translations. If the page renders in Vietnamese, the badge shows English.

Fix — the server page already passes translated `labels` to `SeasonOverview`. Add streak label keys to the labels prop:

```ts
// in page.tsx labels:
streakW: t("overview.streakW"),
streakUnbeaten: t("overview.streakUnbeaten"),

// in en.json:
"streakW": "{count}W Streak",
"streakUnbeaten": "{count} Unbeaten"
```

Or simply pass the resolved string down from the server, keeping client component dumb.

### 6. NAV_LINKS constant is dead code

**File:** `src/components/layout/navbar-client.tsx` (lines 29-37)

```ts
const NAV_LINKS = [
  { href: "/", label: "Home" },
  ...
  { href: "/stats", label: "Stats" },
  ...
];
```

This constant is defined but never referenced. The desktop nav and mobile nav both use inline arrays with `t()` calls. The Stats link at line 33 is unreachable. The mobile nav (SheetContent) does not include `/stats` at all.

**Impact:** Stats page is not accessible from mobile nav.

Fix — add Stats to the mobile nav inline array:

```ts
// in SheetContent nav array (line ~394):
{ href: "/stats", label: t("stats") },
```

And delete the unused `NAV_LINKS` constant.

---

## Low Priority Suggestions

### 7. `force-dynamic` prevents any caching for football data

**File:** `src/app/stats/page.tsx` (line 19)

`force-dynamic` on the stats page means every request hits the Football-Data.org API (10 req/min free tier). Fixtures and standings don't change minute-to-minute. Consistent with `/standings` and `/fixtures` pages, so not a deviation, but `export const revalidate = 1800` (30 min) would be more appropriate for a stats summary page and reduce API pressure.

### 8. `highestScoring` will match 0-0 draws when no data exists

**File:** `src/lib/football/season-stats.ts` (line 277)

If `finished` is non-empty, `highestScoring` always gets a value (even a 0-0 goalless draw with `total=0`). This is a minor UX noise — a 0-0 match shown as "Highest Scoring" is confusing.

Fix:
```ts
if (total > 0 && (highestScoring === null || total > highestScoring.total)) {
  highestScoring = { fixture: f, total };
}
```

### 9. `goalDiff` display: zero shows as `"0"` not `"+0"` — acceptable but inconsistent with common football display conventions

**File:** `src/components/stats/season-overview.tsx` (line 42)

```ts
value: stats.goalDiff > 0 ? `+${stats.goalDiff}` : String(stats.goalDiff)
```

Zero shows as `"0"`, negatives as `"-3"`. This is standard but some apps show `+0` for clarity. Not a bug.

### 10. Tooltip emoji in `CustomTooltip` (goals-by-month) uses `p.name` for color logic but `name` is the translated label

**File:** `src/components/stats/goals-by-month-chart.tsx` (line 17)

```tsx
style={{ color: p.name === "scored" ? "#C8102E" : "#6B7280" }}
```

`p.name` is set from `name={labels.scored}` on the `<Area>` — so in Vietnamese `p.name` is `"Ghi bàn"`, not `"scored"`. The color check `=== "scored"` always fails in VI locale, rendering both series in gray.

Fix — use `p.dataKey` instead of `p.name`:
```tsx
style={{ color: p.dataKey === "scored" ? "#C8102E" : "#6B7280" }}
```

---

## Positive Observations

- Pure function design in `season-stats.ts` is excellent — testable, no side effects, proper null guards throughout
- `import "server-only"` on `season-stats.ts` prevents accidental client bundle inclusion
- All serialized data passed to clients uses `RecordDisplay` (lightweight strings), raw `Fixture` objects never cross the server→client boundary
- `Promise.all()` parallelizes all 4 data fetches correctly
- Every chart component has `"use client"` — no Recharts SSR issues
- `whileInView` + `viewport={{ once: true }}` on Framer Motion prevents repeated animations on scroll-back
- `getOrdinal` handles the 11th/12th/13th edge case correctly
- `formTimeline` key uses `${entry.date}-${i}` to handle duplicate dates
- `computeMonthlyGoals` and `computeCompetitionStats` both use `Map` correctly with non-null assertion only after `has()` check
- Loading skeleton matches actual layout structure — good perceived performance

---

## Recommended Actions

1. **[High]** Fix `getMatchResult` or add local helper in `season-stats.ts` to handle AET/PEN statuses — prevents silent W/D/L miscount for cup matches
2. **[High]** Add `/stats` to mobile nav SheetContent array — currently inaccessible on mobile
3. **[Medium]** Fix tooltip color logic in `GoalsByMonthChart` — use `p.dataKey` instead of `p.name` to fix VI locale rendering
4. **[Medium]** Fix `vi.json` `competitions.ga` to not duplicate `"BT"` (same as `gf`)
5. **[Medium]** Translate streak badge strings in `season-overview.tsx` via labels prop
6. **[Medium]** Rename `scoringFirst` i18n key to "Leading at HT" to match actual logic
7. **[Low]** Remove dead `NAV_LINKS` constant
8. **[Low]** Remove `"D"` from `currentStreak.type` union
9. **[Low]** Guard `highestScoring` with `total > 0` check
10. **[Low]** Consider `revalidate = 1800` instead of `force-dynamic` if live accuracy not required

---

## Metrics

- **Type Coverage:** High — all public interfaces typed, no `any` in new files
- **Test Coverage:** Not measured (no test files for stats components found)
- **Linting Issues (stats files):** 0 errors, 0 warnings from ESLint for reviewed files
- **TypeScript:** Clean compile (0 errors overall from `tsc --noEmit`)

---

## Unresolved Questions

1. Should AET/PEN wins count as "wins" in the season overview? (e.g., FA Cup shootout win). Current behavior counts them as neither W/D/L, which understates the win count. Confirm intended behavior before patching `getMatchResult` globally — it may affect other consumers.
2. Is the `scoringFirst` metric intentionally tracking HT lead (not actual first goal), given event data isn't available? If yes, rename label. If actual first-goal tracking is desired, it requires fixture events (extra API call per match — violates zero-API constraint).
