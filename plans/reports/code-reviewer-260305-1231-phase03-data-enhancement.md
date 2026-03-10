# Code Review — Phase 03 Data Enhancement & Polish

**Date:** 2026-03-05
**Reviewer:** code-reviewer subagent
**Score: 6.5/10**

---

## Scope

- Files reviewed: 5 directly modified + 3 supporting files
- `src/app/stats/page.tsx` — season label update
- `src/app/squad/page.tsx` — async + InjuryWidget wiring
- `src/lib/fpl-data.ts` — FplEventRaw, FplGameweekInfo types + getCurrentGameweek()
- `src/components/home/bento-grid.tsx` — gameweek prop + GW bar
- `src/app/page.tsx` — getCurrentGameweek() fetch + prop pass
- Supporting: `src/lib/football/fpl-provider.ts`, `src/components/squad/injury-widget.tsx`, `src/lib/types/football.ts`
- Build: PASS (tsc --noEmit clean, next build clean)

---

## Overall Assessment

Functional changes land cleanly — build passes, TypeScript is clean. The GW bar integration is straightforward and properly optional. Main concern: a **silent functional bug** in the injury display (wrong status strings = injuries always fall into default/unmapped bucket), and a **significant DRY violation** where `fpl-data.ts` duplicates the entire FPL fetch infrastructure already in `fpl-provider.ts`.

---

## Critical Issues

None (no data loss, no security risks, build passes).

---

## High Priority Findings

### 1. Injury status string mismatch — injuries never display correctly

`fpl-provider.ts:580` emits these `player.type` values:
```ts
type: el.status === "i" ? "Injury" : el.status === "s" ? "Suspended" : "Unavailable"
```

`injury-widget.tsx:23` `STATUS_CONFIG` keys are:
```ts
"Missing Fixture" | "Doubtful" | "Questionable"
```

**Zero overlap.** Every injury falls through to `DEFAULT_STATUS` which is `STATUS_CONFIG["Missing Fixture"]`. The widget renders all players as "OUT / Confirmed out" regardless of actual status. The `outCount` counter is always 0 (no `player.type` ever equals `"Missing Fixture"`), so the "X out" badge in the dialog header never appears.

Fix — align provider output to widget keys OR align widget keys to provider output. Simpler to change provider:
```ts
// fpl-provider.ts ~line 580
type: el.status === "i" ? "Missing Fixture"
    : el.status === "s" ? "Missing Fixture"
    : el.status === "d" ? "Doubtful"
    : "Questionable",
```
Or better: update widget STATUS_CONFIG keys to `"Injury" | "Suspended" | "Unavailable"` and drop the API-Football legacy keys.

### 2. `doubtCount` is always `unique.length` (downstream of bug #1)

```ts
const outCount = unique.filter((i) => i.player.type === "Missing Fixture").length; // always 0
const doubtCount = unique.length - outCount; // always unique.length
```
The "X doubtful" badge in the dialog shows ALL players as doubtful. Fix follows from fixing #1.

---

## Medium Priority Improvements

### 3. DRY violation — duplicated FPL infrastructure

`src/lib/fpl-data.ts` re-declares:
- `FPL_BASE` constant (identical string)
- `FETCH_TIMEOUT_MS` constant (identical value)
- `fplFetch<T>()` function (near-identical implementation)
- `FplBootstrapRaw` interface (structurally identical to `FplBootstrap` in fpl-provider.ts)
- `FplEventRaw` interface (identical to `FplEvent` in fpl-provider.ts)

`getCurrentGameweek()` calls `/bootstrap-static/` directly via its own `fplFetch` instead of going through the provider. This means:
- Two separate in-memory fetch caches for `/bootstrap-static/` (fpl-data.ts uses `React.cache`-less raw fetch with ISR tag; fpl-provider uses its own `bootstrapCache` + React.cache wrapper)
- On the homepage, `/bootstrap-static/` is fetched twice per request: once via `provider.getInjuries()`/`getStandings()` etc., and once via `getCurrentGameweek()`

**Fix:** Add `getGameweekInfo()` to `FootballDataProvider` interface and implement in `FplProvider` using `this.getBootstrap()`. Remove `getCurrentGameweek()` from fpl-data.ts or have it delegate to the provider.

### 4. `gameweek` optional prop with conditional render — minor prop-drilling smell

`page.tsx → BentoGrid` passes `gameweek` as optional. BentoGrid already uses it defensively (`{gameweek && ...}`). This is fine for now but if GW info is needed in more sub-components, it will need Context or a shared server component.

---

## Low Priority Suggestions

### 5. `formatDeadline` is client-side with `toLocaleDateString` — timezone caveat

`bento-grid.tsx` is `"use client"`. `formatDeadline` uses `toLocaleDateString("en-GB", {...})` with both date and time options. This will format in the **user's local timezone**, not UTC/London. FPL deadlines are UTC. A user in UTC+8 will see a time 8 hours ahead of the actual deadline displayed on the FPL site. Intentional? If not:
```ts
function formatDeadline(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}
```

### 6. Season label change in stats/page.tsx — trivial, correct

Three occurrences updated "2024/25" → "2025/26". Clean, no issues.

### 7. `getInjuries()` adds to homepage's `Promise.all` in squad/page.tsx — not homepage

squad/page.tsx adds `getInjuries()` correctly. The `revalidate = 1800` is appropriate since injury status changes during the day.

---

## Positive Observations

- Build fully clean — zero TS errors
- `gameweek` prop is optional with `| null` — safe fallback for when FPL API is down
- `getCurrentGameweek()` has a top-level try/catch returning `null` on failure — correct resilience pattern
- `BentoCard` stays reused for the GW bar (no new component) — good KISS
- `InjuryWidget` deduplication logic (`new Map(injuries.map(inj => [inj.player.id, inj]))`) is clean
- GW bar renders nothing when `gameweek` is null — correct graceful degradation
- Squad page `revalidate = 1800` correctly accounts for injury update frequency

---

## Recommended Actions

1. **[CRITICAL-FUNCTIONAL] Fix injury status string mismatch** — align `fpl-provider.ts` type values to `STATUS_CONFIG` keys in `injury-widget.tsx`. All injuries currently render as "OUT" and outCount is always 0.

2. **[HIGH] Consolidate FPL bootstrap fetch** — move `getCurrentGameweek()` logic into `FplProvider.getGameweekInfo()`, expose via `football/index.ts`, remove duplicate infrastructure from `fpl-data.ts`. Eliminates double `/bootstrap-static/` fetch on homepage.

3. **[LOW] Fix deadline timezone** — use `timeZone: "Europe/London"` in `formatDeadline` if accuracy matters.

---

## Metrics

- Type Coverage: 100% (tsc clean)
- Build: PASS
- Linting Issues: 0 TS errors
- DRY violations: 1 significant (fpl-data.ts duplicates fpl-provider.ts fetch layer)
- Functional bugs: 1 silent (injury status strings never match widget config)

---

## Unresolved Questions

- Was the injury status mismatch pre-existing before this phase, or introduced in the InjuryWidget wiring? (The widget appears pre-existing per context, provider mapping appears pre-existing — the wiring just exposed the pre-existing bug.)
- Is `doubtCount` intended to count "Doubtful + Questionable" or "everything that isn't confirmed out"? Affects how to fix label.
- Is the deadline timezone intentional (user-local) or an oversight?
