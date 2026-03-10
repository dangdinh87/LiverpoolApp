# Code Review Report — Phase 02: Players Page + Components

**Score: 8.2 / 10**

---

## Scope

- Files reviewed: 9
- Lines of code: ~1 188 total
  - `src/lib/fpl-data.ts` — 358 lines
  - `src/components/players/players-table.tsx` — 287 lines
  - `src/components/players/player-stats-card.tsx` — 98 lines
  - `src/components/players/player-match-log.tsx` — 152 lines
  - `src/app/players/page.tsx` — 49 lines
  - `src/app/players/loading.tsx` — 37 lines
  - `src/app/players/[id]/page.tsx` — 170 lines
  - `src/app/players/[id]/loading.tsx` — 37 lines
  - `src/components/layout/navbar-client.tsx` — 239 lines (nav link addition only)
- TypeScript: clean (tsc --noEmit exited 0)
- `next.config.ts` confirms `resources.premierleague.com` is whitelisted — no CSP gap for images

---

## Overall Assessment

Solid implementation. Server/client boundary is correctly applied throughout. FPL API usage is idiomatic for Next.js 16 ISR. No critical security issues. Primary concerns are: double data-fetch on the detail page, DRY violation in `getFplPlayerDetail` (duplicates `FplPlayerRow` mapping logic), missing `aria-sort` on sortable columns, and one edge-case pagination bug.

---

## Critical Issues

None.

---

## High Priority Findings

### H1 — Double bootstrap-static fetch on detail page (performance)

`getFplPlayerDetail` calls `fplFetch("/bootstrap-static/", 1800)` independently, duplicating the call already made by `getAllFplPlayers` on the list page. In ISR this shares the cache entry (same URL + revalidate time), so it is fine at the HTTP level — **but** on a cold cache, a direct visit to `/players/[id]` triggers two parallel fetches: bootstrap + element-summary. Both are in the same `Promise.all`, so latency is bounded by the slower of the two. This is acceptable given ISR, but worth noting if cold-cache P99 matters.

No code change required if cache hit rate is high; add `React.cache()` wrapping if the bootstrap fetch ever becomes uncached frequently:

```ts
import { cache } from "react";
const getBootstrap = cache(() => fplFetch<FplBootstrapRaw>("/bootstrap-static/", 1800));
```

### H2 — DRY: `FplPlayerRow` mapping duplicated in `getFplPlayerDetail` (maintainability)

Lines 317–342 in `fpl-data.ts` re-implement the entire `FplPlayerRow` mapping that `getAllFplPlayers` does on lines 234–263. Any future field addition (e.g. adding `xGI` to the row type) must be updated in two places.

**Fix:** extract a shared `mapElement(el, team): FplPlayerRow` helper, call it from both functions.

```ts
function mapElement(el: FplElementRaw, team: FplTeamRaw | undefined): FplPlayerRow {
  return {
    id: el.id,
    webName: el.web_name,
    // ... all fields once
  };
}

// getFplPlayerDetail:
return { ...mapElement(el, team), squadNumber: el.squad_number, ... };
```

### H3 — Pagination does not reset on sort column change when `handleFilterChange` not called (minor bug)

`handleSort` calls `setPage(0)` correctly. `handleFilterChange` resets page but is called inline alongside state setters, making it a no-op call (page is already being set to 0 by the filter change handlers). `handleFilterChange` is a single-line function `() => setPage(0)` called redundantly in all three filter `onChange` handlers. The sort handler already calls `setPage(0)` directly, so the pattern is inconsistent. No actual bug — but `handleFilterChange` is dead weight. Remove it; call `setPage(0)` directly in sort, or consolidate into a single handler. (KISS)

---

## Medium Priority Improvements

### M1 — Missing `aria-sort` on sortable `<th>` elements (accessibility)

WCAG 2.1 SC 1.3.1 requires sortable column headers to expose sort state. Current: chevron icons only. Add `aria-sort` to each sortable `<th>`:

```tsx
<th
  aria-sort={sortKey === col.key ? (sortDir === "desc" ? "descending" : "ascending") : "none"}
  ...
>
```

### M2 — `unoptimized` on all `<Image>` in table rows (performance)

All player photo + team badge `<Image>` elements use `unoptimized`. With 50 rows per page this means 100 un-optimised images per render, missing Next.js AVIF/WebP conversion and auto-sizing. Since the remote hostname is already whitelisted in `next.config.ts`, `unoptimized` is unnecessary. Remove it to gain CDN-level optimisation. If PL's CDN blocks Next.js image proxy requests, keep `unoptimized` but document why.

### M3 — `<select>` has no accessible label (accessibility)

The team dropdown (`<select value={teamFilter}...>`) has no `<label>` or `aria-label`. Screen readers announce it as unlabelled. Fix:

```tsx
<select aria-label="Filter by team" ...>
```

### M4 — `players/page.tsx` pre-sorts server-side then `PlayersTable` re-sorts client-side (YAGNI)

The page sorts `players` Liverpool-first before passing to `PlayersTable`. `PlayersTable` then re-sorts on mount by `totalPoints` descending (default sort state). The server sort is immediately overwritten. Either:
- Remove the server-side sort (simpler), or
- Pass a `defaultSort` prop to `PlayersTable` and honour it as initial state.

Current code wastes a `.sort()` call on ~820 items on every server render.

### M5 — `player-stats-card.tsx`: zero-value colour check is fragile

```ts
stat.value === 0 || stat.value === "0" || stat.value === "0.0"
```

This misses `"0.00"`, negative values, and future format changes. Replace with:

```ts
const numVal = typeof stat.value === "number" ? stat.value : parseFloat(String(stat.value));
const isDim = !isNaN(numVal) && numVal === 0;
```

### M6 — `PlayerMatchLog` uses `key={m.gameweek}` — not unique if a player has DGW (double gameweek)

A player can play twice in the same gameweek (FPL double gameweeks). Using `gameweek` as React key causes silent deduplication bugs. Use the row index or a composite: `key={`${m.gameweek}-${i}`}`.

### M7 — `player-stats-card.tsx` is labelled as a server component but has no `"use server"` / is not async

The file imports no server-only APIs and has no async data fetching — it is a pure presentation component. Labelling it "server component" in the review context is accurate (no `"use client"`, so it is by default server), but the inline `STAT_GROUPS` array with function callbacks (`stats: (p) => [...]`) means it instantiates functions on every request, not module-level constant. Move the stats values into the component body or make `STAT_GROUPS` a constant array of static configs. Minor.

---

## Low Priority Suggestions

### L1 — `FPL_LFC_TEAM_ID = 12` hardcoded; if FPL ever re-orders teams this silently breaks

Derive it dynamically from `data.teams.find(t => t.short_name === "LIV")?.id` for robustness.

### L2 — `badgeUrl` / `photoUrl` are module-level functions but could be inlined as template literals at call site

KISS: they are only used in this file and are trivially simple. Either is fine; current extracted form aids readability — keep as-is.

### L3 — `PlayersLoading` skeleton doesn't visually match the hero section that appears on the real page

Loading skeleton starts with a title/subtitle, but the real page has a full-bleed 30vh hero banner. On slow connections, layout shift will be significant. Consider adding a hero skeleton or matching heights.

### L4 — `navbar-client.tsx`: `Players` link positioned between `Squad` and `Season`

Nav order is: Home → Squad → **Players** → Season → News → The Club → About. Since Players is a PL-wide stats page (not LFC-specific like Squad), consider placing it after News or as a standalone section. Minor UX.

### L5 — `fpl-data.ts` comment says "ISR cache shared with fpl-provider.ts (same URL = same cache entry)" — verify

If `fpl-provider.ts` uses a different `revalidate` value for the same URL, Next.js will use the **first** registered revalidation time. Check that both files use `revalidate: 1800` for `/bootstrap-static/` to avoid unexpected cache behaviour.

---

## Positive Observations

- `import "server-only"` in `fpl-data.ts` — correct guard, prevents accidental client-side import.
- `AbortSignal.timeout(FETCH_TIMEOUT_MS)` — proper timeout on external fetch, avoids hanging SSR requests.
- `React.cache()` not yet needed here (ISR handles dedup at the HTTP layer) — no over-engineering.
- `FplPosition` union type + `POS_MAP` with `?? "MID"` fallback — defensive but sensible.
- `not.ok` HTTP check in `fplFetch` with descriptive error message — good.
- `useMemo` on the filtered+sorted list in `PlayersTable` — correct for 820-item client-side computation.
- Pagination with `PAGE_SIZE = 50` avoids rendering all 820 rows into the DOM — good.
- `sticky left-0` on player name column — correct sticky positioning for mobile horizontal scroll.
- `server-only` split between `fpl-data.ts` (FPL) and existing `api-football.ts` (LFC) is clean and consistent with the project's existing Supabase split pattern.
- `next.config.ts` image domains correctly configured before images were added.
- `generateMetadata` in `[id]/page.tsx` correctly awaits params and handles `null` player gracefully.
- `notFound()` call prevents undefined access if FPL player ID not found.

---

## Recommended Actions

1. **[H2] Extract shared `mapElement` helper** — eliminates the ~30-line duplication in `getFplPlayerDetail`. One-time refactor, prevents future drift.
2. **[M1] Add `aria-sort` to sortable `<th>` elements** — accessibility, low effort.
3. **[M3] Add `aria-label` to team `<select>`** — one-line fix.
4. **[M6] Fix `key={m.gameweek}`** — use `key={i}` or composite key to handle DGW correctly.
5. **[M4] Remove redundant server-side sort in `players/page.tsx`** — 3-line deletion.
6. **[M2] Evaluate `unoptimized` removal** — test if PL CDN supports Next.js image proxy; remove if it does.
7. **[H1] Optionally wrap bootstrap fetch in `React.cache()`** — only if cold-cache page loads become a reported issue.
8. **[M5] Harden zero-value check in `player-stats-card.tsx`** — parse to number before comparing.
9. **[L5] Cross-check `revalidate` values** between `fpl-data.ts` and `fpl-provider.ts`.

---

## Metrics

- TypeScript coverage: 100% (all files typed, tsc clean)
- Test coverage: 0% (no tests — consistent with project convention)
- Linting: ESLint config exists but `next lint` required different invocation; `tsc` clean confirms no type errors
- Critical issues: 0
- High priority: 2 (H2 DRY, H3 minor)
- Medium priority: 7
- Low priority: 5

---

## Unresolved Questions

1. Does `fpl-provider.ts` use the same `revalidate: 1800` for `/bootstrap-static/`? If not, ISR cache collision could cause stale data on one of the two callers.
2. Does PL's CDN (`resources.premierleague.com`) allow Next.js image optimisation proxy requests, or does it require `unoptimized`? This determines whether M2 is actionable.
3. Is the `Players` nav link intentionally placed before `Season`, or is that a sequencing oversight?
