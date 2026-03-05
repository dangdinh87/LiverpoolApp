# Code Review — Phase 01: Provider Abstraction & Refactor

**Score: 7/10**

---

## Scope

- Files reviewed: `src/lib/football/provider.ts`, `mock-data.ts`, `mock-provider.ts`, `api-football-provider.ts`, `index.ts`; original monolith via `git show HEAD:src/lib/api-football.ts`
- Pages checked: `src/app/fixtures/[id]/page.tsx` (new), 6 pages with updated imports
- LOC analyzed: ~415 (old) → ~550 (new, 5 files)
- TypeScript: `tsc --noEmit` — **0 errors**

---

## Overall Assessment

Structurally sound refactor. Provider interface is clean, barrel exports are correct, and `server-only` + `React.cache()` are properly placed. However, there are **two correctness regressions** vs. the original monolith and one architectural concern with `require()` inside an ESM module.

---

## Critical Issues

None. No security vulnerabilities, no secrets exposure, no breaking type errors.

---

## High Priority Findings

### 1. Behavior regression: `getPlayerStats` drops `league` filter param
**File:** `src/lib/football/api-football-provider.ts:110-116`

Original monolith passed `league: LEAGUE_ID` to the `/players` endpoint. The new provider omits it:

```ts
// OLD (api-football.ts)
await apiFetch<PlayerStats>("/players", {
  id: playerId,
  season: SEASON,
  league: LEAGUE_ID,   // <-- was here
});

// NEW (api-football-provider.ts:111-114)
await this.apiFetch<PlayerStats>("/players", {
  id: playerId,
  season: SEASON,
  // league param gone
});
```

The project memory notes: "`getPlayerStats` has NO league filter (players without PL stats show their other league stats)". This was **an intentional known issue in the original** — however, by removing the league param, the new provider now returns the same behavior, so it's actually consistent. If the intent was to restore filtering, it needs to be added back explicitly. This needs a decision: if the known issue is accepted, add a comment; if it should be fixed, add `league: LEAGUE_ID` back.

**Verdict:** Not a regression if the old behavior was also no-filter (per memory notes), but the param was actually in the old code. Ambiguous — needs clarification.

### 2. Behavior regression: `apiFetch` no longer falls back to mock data on HTTP error or missing key
**File:** `src/lib/football/api-football-provider.ts:41-43, 57-60`

Old monolith `apiFetch`:
- Missing `API_FOOTBALL_KEY` → `return getMockData<T>(endpoint)` (silent fallback)
- Non-2xx HTTP → `return getMockData<T>(endpoint)` (silent fallback)
- `json.errors.requests` (rate limit) → `return getMockData<T>(endpoint)` (silent fallback)

New `ApiFootballProvider.apiFetch`:
- Missing key → `throw new Error(...)` (breaks pages)
- Non-2xx → `throw new Error(...)` (breaks pages)
- `json.errors` (any) → `throw new Error(...)` (breaks pages)

The old design was intentional "fail-safe": if anything goes wrong, return mock data so the UI still renders. The new design throws, which propagates to Next.js error boundaries. This is arguably **better behavior** (fail loudly instead of silently serving stale mock data), but it is a **behavioral change**, not a pure refactor. Pages consuming these functions may now hit error boundaries where they previously rendered mock data. If the intent is to keep the fail-safe pattern, the throws should be `try/catch` with mock fallback. If the intent is strict failure, this should be called out in the plan as an intentional change, not a pure refactor.

### 3. `require()` inside ESM module is a code smell
**File:** `src/lib/football/index.ts:24, 29, 34`

```ts
// ESM file (module: "esnext") using CJS require()
const { MockProvider } = require("./mock-provider");
const { ApiFootballProvider } = require("./api-football-provider");
```

Next.js with bundler module resolution handles this at build time, so it won't break. However, mixing `import`/`require` in the same ESM file is inconsistent and bypasses TypeScript's static analysis on those imports. The reason for using `require()` is likely lazy/conditional loading to avoid importing all providers at startup. If so, use dynamic `import()` instead:

```ts
// Preferred for ESM
const { MockProvider } = await import("./mock-provider");
```

But since `createProvider()` is called synchronously at module load (`const provider = createProvider()`), async dynamic import won't work without restructuring. The cleaner fix: just use static top-level `import` since all three provider files are small and tree-shaking will handle unused ones. The lazy loading optimization is YAGNI here.

---

## Medium Priority Improvements

### 4. `getRevalidateTime` order bug for `/fixtures/*` sub-routes
**File:** `src/lib/football/api-football-provider.ts:23`

```ts
if (endpoint.includes("/fixtures/lineups")) return 3600;    // line 20
if (endpoint.includes("/fixtures/events")) return 3600;     // line 21
if (endpoint.includes("/fixtures/statistics")) return 3600; // line 22
if (endpoint.includes("/fixtures")) return 3600;            // line 23 — catches all above too
```

All return 3600, so no bug today, but the catch-all `/fixtures` at line 23 would shadow sub-routes if their values ever differ. The old monolith had the same ordering issue. Should reorder: sub-routes before catch-all. Not a regression since values are identical, but fragile.

### 5. Module-level `console.info` on every cold start
**File:** `src/lib/football/index.ts:41`

```ts
console.info(`[football] Provider: ${provider.name}`);
```

This runs on every serverless function cold start / hot reload in dev. Low noise but worth noting — use `process.env.NODE_ENV !== "production"` guard if this is dev-only.

### 6. SofaScore placeholder uses `require()` + `console.warn` — placeholder code in production bundle
**File:** `src/lib/football/index.ts:23-27`

```ts
case "sofascore": {
  const { MockProvider } = require("./mock-provider");
  console.warn("[football] SofaScore provider not yet implemented, falling back to mock");
  return new MockProvider();
}
```

This is fine for Phase 02 scaffolding but ships a `console.warn` to prod if someone sets `FOOTBALL_DATA_PROVIDER=sofascore`. Consider throwing an error instead to make misconfiguration explicit, or remove the case until Phase 02 is implemented (YAGNI).

---

## Low Priority Suggestions

### 7. `mockSquad` re-exported for "backward compatibility" but no consumers exist
**File:** `src/lib/football/index.ts:59`

```ts
export { mockSquad } from "./mock-data";
```

Comment says "some components reference mockSquad directly". Grep shows no component imports `mockSquad` from `@/lib/football` — only `api-football-provider.ts` imports it from `./mock-data`. This re-export is dead code today. Remove unless it's needed for Phase 02.

### 8. Mock data stat shape differs between files
**File:** `src/lib/football/mock-data.ts:79-88` vs old `api-football.ts`

New `mock-data.ts` top-scorer stats include extra fields (`substitutes`, `duels`, `fouls`, `penalty`, etc.) that the old mock omitted. This is an enhancement, not a regression, but means mock data no longer matches old mock data shape exactly. Since `PlayerStats` type is the canonical source, this is fine as long as types match — and `tsc` confirms they do.

---

## Positive Observations

- Interface design is clean and minimal — 12 methods, no leaky abstractions
- `FootballDataProvider` correctly uses `readonly name` for provider identification
- `server-only` placed at correct location (barrel `index.ts`) — prevents any client-side import
- `React.cache()` wrappers consolidated in one place rather than scattered across provider implementations
- `MockProvider` is a clean, trivial implementation — no logic, no surprises
- TypeScript: `tsc --noEmit` passes with zero errors
- Import updates in 6 pages are all `@/lib/football` — consistent, clean
- Fixture detail page (`/fixtures/[id]/`) correctly uses the new barrel imports

---

## Recommended Actions

1. **Clarify `getPlayerStats` league param** — decide if `league: LEAGUE_ID` should be added back to align with original behavior. If accepted as-is, remove the ambiguity by adding a comment explaining the intentional difference.
2. **Document the error-handling change as intentional** — old code did silent mock fallback; new code throws. If this is intentional, it's a good improvement. If it needs to stay silent, wrap `apiFetch` calls in try/catch within each method with mock fallbacks.
3. **Replace `require()` with static `import`** in `index.ts` — move imports to top of file, remove dynamic require calls. Tree-shaking handles the rest.
4. **Remove or gate the SofaScore placeholder** until Phase 02 lands (YAGNI).
5. **Remove the dead `mockSquad` re-export** from `index.ts:59` if no external consumer exists.

---

## Metrics

- Type Coverage: 100% (tsc clean)
- Test Coverage: 0% (no tests, pre-existing)
- Linting Issues: 0 (tsc passes)
- Behavioral regressions: 2 (error handling strategy, `getPlayerStats` league param — both need clarification)

---

## Unresolved Questions

1. Is the removal of `league: LEAGUE_ID` from `getPlayerStats` intentional? The old code had it, project memory says "no league filter" suggesting it was already known-broken.
2. Is the shift from "silent mock fallback on all errors" to "throw on errors" intentional? It changes UX behavior (error boundary vs. mock data render).
3. Will `mockFixtures`, `mockStandings`, `mockTopScorers`, `mockTopAssists` be re-exported from the barrel in Phase 02, or are they internal-only going forward?
