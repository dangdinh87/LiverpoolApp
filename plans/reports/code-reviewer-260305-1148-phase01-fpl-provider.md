---
date: 2026-03-05
reviewer: code-reviewer
plan: plans/260305-1130-fpl-api-integration/phase-01-fpl-provider.md
score: 8/10
---

# Code Review — Phase 01: FPL Provider + Cleanup

## Scope

- Files reviewed: `src/lib/football/fpl-provider.ts` (622 lines), `src/lib/football/index.ts`, `src/lib/football/provider.ts`, `next.config.ts`, `src/lib/types/football.ts`, `.env`, `.env.example`
- Lines analyzed: ~750
- Review focus: new FPL provider implementation, cleanup verification

## Overall Assessment

Solid implementation. Interface compliance is complete (all 12 methods), caching strategy is sensible, error handling consistent. `tsc --noEmit` passes clean. Three meaningful issues found; none are blockers for Phase 01 delivery, but two should be fixed before Phase 03.

---

## Critical Issues

None.

---

## High Priority Findings

### 1. `PL_LOGO` constant is misnamed and misused (line 17 + 377)

`PL_LOGO = "…/badges/t14.png"` — in FPL, `t{code}` URLs are **team** badges, and code 14 = Liverpool. So `t14.png` is the **LFC badge**, not the Premier League logo.

- Line 253 (fallback for unknown team badge): acceptable — any badge is fine as fallback
- **Line 377 (`fixture.league.logo`)**: fixture league logo will render as LFC badge, not PL logo

Fix options:
- Use a real PL league logo URL (e.g. from `resources.premierleague.com/premierleague/competitions/1/badges/c1.png`)
- Or rename the constant to `LFC_BADGE_URL` and use `""` or a different URL for `league.logo`

```typescript
// Suggested fix
const LFC_BADGE_URL = "https://resources.premierleague.com/premierleague/badges/t14.png";
const PL_LOGO = "https://resources.premierleague.com/premierleague/competitions/1/badges/c1.png";
```

### 2. `getStandings()` returns `[]` — page silently shows empty table

Comment says "standings come from fdo-standings.ts via barrel" but `fdo-standings.ts` does not exist yet (Phase 03 / separate FDO provider). Currently `getStandings` in the barrel just calls `provider.getStandings()` which returns `[]`. The `/standings` page will render an empty table until Phase 03.

This is an **architectural gap**, not a code bug, but it's undocumented in Phase 01 success criteria. Phase 01 should note this as a known regression, or mock data should fall through.

---

## Medium Priority Improvements

### 3. `server-only` guard missing from `fpl-provider.ts`

`index.ts` correctly has `import "server-only"` at the top, which propagates the guard transitively. However `fpl-provider.ts` itself has no guard. If a future developer imports `FplProvider` directly from the file (bypassing index), it will run on the client.

Low risk given current usage, but defense-in-depth says: add `import "server-only"` at the top of `fpl-provider.ts`.

### 4. Bootstrap race condition (theoretical)

`bootstrapCache` and `fixturesCache` are in-memory instance fields. On first request, if two concurrent async paths both call `getBootstrap()` before either resolves, `fplFetch` fires twice. React.cache() in `index.ts` provides per-request deduplication, so this only matters at the process/instance level during cold boot when multiple parallel requests arrive simultaneously.

Not worth a complex promise-singleton fix now, but worth noting. The ISR caching at the HTTP layer (30min `revalidate`) makes this unlikely to matter in practice.

### 5. `getPlayerStats` doesn't fetch `/element-summary/{id}/`

Phase plan requirement: "fetch `/element-summary/{id}/` for history." Implementation uses only bootstrap `elementMap` — returns season-aggregate stats but no match-by-match history. `FplElementSummary` interface is defined but never fetched.

Acceptable for Phase 01 (plan doesn't mandate match history in this phase), but the plan comment is misleading. This should be addressed in Phase 02/03 or explicitly deferred.

### 6. Assist heuristic matches first unassisted goal, ignoring team

Lines 524-534: assist matching iterates all assists from both teams combined and matches them to the first unassisted `Normal Goal` event regardless of team. An assist by a home player could get credited to an away goal.

```typescript
// Bug: allAssists mixes home + away, no team filter
const allAssists = [...assistStat.h, ...assistStat.a];
```

Should keep home and away assists separate and match within each team's goal events.

---

## Low Priority Suggestions

### 7. `.env.example` stale — still has `API_FOOTBALL_KEY`

`API_FOOTBALL_KEY=your-api-football-key-here` remains in `.env.example` but was removed from `.env` and is no longer used. Should also add `FOOTBALL_DATA_PROVIDER=fpl` and upcoming `FOOTBALL_DATA_ORG_KEY` placeholder.

### 8. `appearences` typo is inherited from canonical type

Line 286 uses `appearences` (typo in `PlayerStatistic`). This is a pre-existing issue in `src/lib/types/football.ts` line 30, not introduced here. Note for future cleanup.

### 9. `mock-data.ts` comment references old monolith

Line 2: `// Extracted from the original api-football.ts monolith.` — stale comment, no action needed but cosmetically outdated.

---

## Positive Observations

- Bootstrap cache pattern is clean: single fetch, map population, reuse across all methods — exactly what was planned
- `AbortSignal.timeout(10_000)` on every fetch — correct, no need for manual controllers
- All 12 interface methods implemented and TypeScript-verified (`tsc --noEmit` clean)
- `getInjuries()` correctly uses `status !== "a"` filter with `news` guard — no empty injury entries
- Error handling: every public method has try/catch with `console.error` and safe fallback return
- Provider instance created at module level, wrapped in `React.cache()` — correct deduplication strategy
- `mapTeamId` used consistently for canonical ID remapping throughout
- Old providers deleted cleanly — no stale imports in any active source file

---

## Recommended Actions

1. **Fix `PL_LOGO`**: rename constant + update `league.logo` in `mapFixture` to use real PL logo URL (Medium effort, clear UX bug)
2. **Fix assist team filter** in `getFixtureEvents` — keep home/away assists separate before matching
3. **Add `import "server-only"` to `fpl-provider.ts`** — one-line safety guard
4. **Update `.env.example`**: remove `API_FOOTBALL_KEY`, add `FOOTBALL_DATA_PROVIDER=fpl`, add `FOOTBALL_DATA_ORG_KEY=` placeholder
5. **Document standings regression** in Phase 01 plan — standings page will be empty until FDO provider lands

---

## Task Completeness (Phase 01 Todo)

| Task | Status |
|------|--------|
| Create fpl-provider.ts with all 12 methods | DONE |
| Delete api-football-provider.ts + sofascore-provider.ts | DONE |
| Update index.ts — fpl + mock only | DONE |
| Update .env | DONE (API_FOOTBALL_KEY removed, FOOTBALL_DATA_PROVIDER=fpl set) |
| TypeScript check passes | DONE (tsc --noEmit: clean) |
| Build passes | NOT VERIFIED (build command blocked by scout-block hook) |

---

## Metrics

- Type Coverage: 100% (tsc --noEmit clean)
- Build: not verified (hook blocked)
- Linting: not run
- Stale provider references in src/: 0
- Interface compliance: 12/12 methods

---

## Unresolved Questions

1. Is `resources.premierleague.com/premierleague/competitions/1/badges/c1.png` a valid PL logo URL? Needs verification — the correct URL format for league logo should be confirmed before fix.
2. Phase plan mentions `fdo-standings.ts` as part of Phase 01 architecture but it's listed in the overall plan under Phase 03. Which phase owns FDO standings? Until it lands, `/standings` is empty.
3. FPL rate limits are unknown — no documented headers in FPL responses. Should the bootstrap revalidate be reducible if rate limits are generous?
