# Code Review — Phase 02: Core Data Pages

**Date:** 2026-03-03
**Score: 8.5 / 10**

---

## Scope

- Files reviewed: 11 (all listed in request)
- LOC: ~900
- Build: `next build` passes, 0 errors
- TypeScript: `tsc --noEmit` passes, 0 errors
- ESLint: 1 warning, 0 errors
- Plan file: `/Users/nguyendangdinh/LiverpoolApp/plans/260303-1603-liverpool-fc-fan-site/phase-02-core-data-pages.md`

---

## Overall Assessment

Solid implementation. API key never reaches the client. `server-only` guard is correct. ISR revalidation values match plan spec. Type coverage is near 100% (one unused var warning). Design tokens are consistent throughout. Most issues are low-to-medium severity.

---

## Critical Issues

None.

---

## High Priority Findings

### H1 — `onError` DOM mutation on `next/image` is unsupported pattern
**File:** `/Users/nguyendangdinh/LiverpoolApp/src/components/squad/player-card.tsx:50-53`

```tsx
onError={(e) => {
  (e.target as HTMLImageElement).src = "/player-placeholder.png";
}}
```

`next/image` optimizes images via `<img>` with srcsets; directly mutating `.src` bypasses the optimization pipeline and can cause infinite error loops if `/player-placeholder.png` is also missing. The recommended pattern is a controlled `useState` with a fallback `src` prop:

```tsx
const [imgSrc, setImgSrc] = useState(player.photo);
<Image src={imgSrc} onError={() => setImgSrc("/player-placeholder.png")} ... />
```

Also note: `/player-placeholder.png` is referenced but not confirmed to exist in `/public`.

### H2 — Double API call for player on `/player/[id]` page
**File:** `/Users/nguyendangdinh/LiverpoolApp/src/app/player/[id]/page.tsx:26-38`

`generateMetadata` and the default export both call `getPlayerStats(Number(id))` independently. With ISR these calls are cached by Next.js `fetch` deduplication only if the same cache key is used — which it is here (same URL + revalidate time). This is fine in most cases, but the pattern is fragile: if `getPlayerStats` ever wraps a non-`fetch` call (e.g., database) deduplication breaks silently. Consider using React `cache()` to wrap `getPlayerStats` for explicit request-level memoization.

---

## Medium Priority Improvements

### M1 — Unused variable: `maxPoints`
**File:** `/Users/nguyendangdinh/LiverpoolApp/src/components/standings/standings-table.tsx:17`

```ts
const maxPoints = standings[0]?.points ?? 1;  // never read
```

The progress bar on L145 uses a hardcoded `75` instead of `maxPoints`:
```tsx
style={{ width: `${(standing.points / 75) * 100}%` }}
```

`75` is an arbitrary magic number. Should be `maxPoints` (dynamically derived from standings leader). Fixes both the unused-var ESLint warning and the logic error.

### M2 — `getMatchResult` defaults `teamId = 40` but is exported from types file
**File:** `/Users/nguyendangdinh/LiverpoolApp/src/lib/types/football.ts:103-116`

Business logic (hardcoded `TEAM_ID = 40`) lives in a types file. Types files should be pure interface/type definitions. Move `getMatchResult` to `api-football.ts` or a dedicated `src/lib/football-utils.ts`. Minor architectural smell but easy to fix.

### M3 — `POSITION_ORDER` defined inside render on every filter change
**File:** `/Users/nguyendangdinh/LiverpoolApp/src/components/squad/squad-grid.tsx:29-34`

`POSITION_ORDER` is a constant object recreated on every render. Move it outside the component (module-level const) for clarity and micro-perf.

### M4 — `FixtureStatus` union ends with `| string` defeating narrowing
**File:** `/Users/nguyendangdinh/LiverpoolApp/src/lib/types/football.ts:58-70`

```ts
export type FixtureStatus =
  | "NS" | "1H" | ... | "PEN" | "CANC" | "PST"
  | string; // catch-all
```

`| string` widens the type to just `string`, making all the literal branches unreachable for type guards. This is a known TS limitation with catch-all strings. Consider `(string & {})` trick or remove the catch-all and handle unknowns with a default in consumers. Current code in `match-card.tsx:30` uses `Array.includes()` which works at runtime, but TS provides no narrowing benefit.

### M5 — Ordinal suffix logic in standings page is incorrect for 11–13
**File:** `/Users/nguyendangdinh/LiverpoolApp/src/app/standings/page.tsx:36`

```ts
["", "st", "nd", "rd"][Math.min(lfcStanding.rank, 3)] ?? "th"
```

This produces "11st", "12nd", "13rd" which are wrong. The `Math.min` cap at 3 always picks index 3 = `"rd"` for rank >= 4, then `?? "th"` never fires because index 3 resolves to `"rd"`, not `undefined`. For a football fan app Liverpool will almost certainly always be top-6, making this a cosmetic edge case, but it's still wrong logic. Use a proper ordinal helper or hardcode for top-6.

---

## Low Priority Suggestions

### L1 — Live status detection incomplete
**File:** `/Users/nguyendangdinh/LiverpoolApp/src/components/fixtures/match-card.tsx:30`

`["1H", "2H", "HT", "ET"]` is missing `"P"` (Penalty in Progress) and `"LIVE"` (some API-Football endpoints return this). Consider aligning with the `FixtureStatus` union defined in types.

### L2 — `FixtureTimeline` filter list is hardcoded; won't auto-show new cups
**File:** `/Users/nguyendangdinh/LiverpoolApp/src/components/fixtures/fixture-timeline.tsx:10-16`

Hardcoded `COMP_FILTERS` means a Conference League run won't get a filter tab. The `hasMatches` guard prevents phantom tabs, but the inverse — tabs not showing for real competitions — could happen. Consider deriving unique competitions from fixtures dynamically. YAGNI trade-off: acceptable for a static season fan site.

### L3 — No `aria-label` on filter buttons
**File:** `squad-grid.tsx:48-55`, `fixture-timeline.tsx:57-65`

Filter buttons use text only. `<button>GK <span>3</span></button>` — screen readers would read "GK 3" without context. Add `aria-label="Filter by Goalkeeper (3 players)"`.

### L4 — `generateMetadata` in player page calls API at build time with no revalidation
**File:** `/Users/nguyendangdinh/LiverpoolApp/src/app/player/[id]/page.tsx:26-33`

`generateMetadata` does not set `revalidate`; it inherits the route's `export const revalidate = 86400`. This is correct Next.js behavior but worth documenting explicitly so future devs don't extract metadata into a separate cached segment accidentally.

### L5 — Mock data and real data in the same file increases bundle surface
**File:** `/Users/nguyendangdinh/LiverpoolApp/src/lib/api-football.ts:129-184`

Mock arrays are `export const`, so they're reachable from anywhere importing this module. Since `server-only` guards the whole file, this doesn't leak to client, but it means mock data is always included in the server bundle. For a fan site this is negligible, but in a larger app, move mocks to a `__mocks__` directory and import conditionally.

---

## Positive Observations

- `import "server-only"` at top of `api-football.ts` — correct and first-line, won't be tree-shaken away.
- `API_FOOTBALL_KEY` only accessed via `process.env` server-side; never `NEXT_PUBLIC_` prefixed. No leak risk.
- ISR `revalidate` values are consistent between page-level exports and `getRevalidateTime()` in the API client. No drift.
- `next/image` used throughout with correct `fill` + `sizes` attributes. No raw `<img>` tags.
- `generateStaticParams` with graceful `try/catch` for build-time API unavailability — exactly right.
- `useMemo` in `FixtureTimeline` for expensive sort+split — appropriate use.
- Rate-limit and HTTP error fallback to mock data is clean and correct.
- Dark Stadium design tokens (`stadium-surface`, `stadium-muted`, `lfc-red`) applied consistently across all 11 files. No hardcoded hex colors leaked in.
- TypeScript strict — zero `any` types, all API shapes fully typed.
- `POSITION_LABELS`, `POSITION_COLORS` are derived from the same `Player["position"]` union; no string drift possible.

---

## Recommended Actions

1. **[High]** Fix `next/image` `onError` pattern — use `useState` fallback src, confirm `/player-placeholder.png` exists in `/public`.
2. **[Medium]** Fix progress bar: replace magic `75` with `maxPoints` variable (already computed on L17) — fixes ESLint warning too.
3. **[Medium]** Move `getMatchResult` out of `football.ts` types file into `football-utils.ts` or `api-football.ts`.
4. **[Medium]** Move `POSITION_ORDER` to module-level const in `squad-grid.tsx`.
5. **[Medium]** Fix ordinal suffix logic for standings rank (11th/12th/13th edge case).
6. **[Low]** Add `"P"` to live status check in `match-card.tsx`.
7. **[Low]** Add `aria-label` to filter buttons for accessibility.

---

## Task Completeness Verification

All 10 items from the plan's Todo List are complete:

| Task | Status |
|---|---|
| Define TypeScript interfaces for Player, Fixture, Standing | Done |
| Build api-football.ts client with all 4 fetch functions | Done |
| Build PlayerCard component with jersey watermark | Done |
| Build SquadGrid with position filter | Done |
| Build /squad page with ISR 24h | Done |
| Build /player/[id] page with stats layout | Done |
| Build MatchCard + FixtureTimeline components | Done |
| Build /fixtures page with competition filter, ISR 1h | Done |
| Build StandingsTable with progress bars | Done |
| Build /standings page with Liverpool highlight, ISR 6h | Done |

Build output confirms all routes exist and revalidate at correct intervals.

---

## Metrics

- Type Coverage: ~99% (0 `any` types)
- ESLint Issues: 0 errors, 1 warning (`maxPoints` unused)
- Build: Pass (19/19 static pages generated)
- TypeScript: Pass (0 type errors)
- Test Coverage: N/A (no tests in Phase 02 scope)

---

## Unresolved Questions

1. Does `/public/player-placeholder.png` exist? It's referenced in `player-card.tsx` but not confirmed. If missing, broken API-Football images will display a broken image icon.
2. The plan mentions "Route handlers in `src/app/api/football/[endpoint]/route.ts`" as an alternative architecture. The implementation chose the simpler direct server component call path (correct choice), but the plan's Architecture section still describes the proxy route approach. Should the plan be updated to reflect the actual decision?
