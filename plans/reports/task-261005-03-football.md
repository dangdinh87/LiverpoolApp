# Task: FOOTBALL PAGES (engineer "football", dev port 3312, build dir .build-football)

Read first: `plans/reports/task-261005-00-common-rules.md`, `plans/reports/design-brief-261005-ui-rebuild.md`, CLAUDE.md, the "Design system v2" block at the bottom of `src/app/globals.css`, the primitives in `src/components/ui/`.

## You own (edit only these)
src/app/{fixtures,season,standings,stats,squad,player,players}/** and components under src/components/{fixtures,season,standings,stats,squad,player}/**. Do NOT change `src/lib/football/**` or `src/lib/squad-data.ts`. Header/footer belong to the shell engineer; a fixed header is overlaid (PageHero offsets with `var(--header-h)`).

## Goals
1. Every page starts with the shared `PageHero` (compact on mobile) and uses `SectionHeader`, `.surface` cards, `.page-container`. Replace ad-hoc photo heroes with PageHero's image prop (≤200KB).
2. **Fixtures / Season**: scannable list grouped by month/competition; sticky horizontally-scrollable filter chips (≥40px); W/D/L badges incl. AET/PEN; kickoff in Vietnam time with a "GMT+7" hint; countdown only for the next match; finished = prominent score, upcoming = time. Match card perfect at 390 (both names readable). Fixture detail: score header, sections for events / lineups / stats / H2H each with an empty state when the provider has no data.
3. **Standings**: phone-friendly table — compact columns (Pos, Club, P, GD, Pts + form dots) with sticky Club column, full columns from `sm`; Liverpool row highlighted; zone markers (CL / EL / relegation) with legend; no horizontal page scroll.
4. **Stats**: stat tiles + charts; lazy-load Recharts via `next/dynamic` with a skeleton of equal height (first-load JS of other pages must not include it); season picker as scrollable segmented control; empty state for seasons without data.
5. **Squad**: position-grouped grid with sticky position tabs (All/GK/DEF/MID/FWD); card = photo (fixed aspect, `sizes`, fallback), number, name, position; favourite heart ≥40px hit area with accessible name; skeleton matching grid. **Player page**: hero (body shot may be square or missing: object-contain/bottom with fallback to headshot), key facts, season stats with "no stats yet" empty state, bio ≤65ch in the visitor's language.
6. `loading.tsx` for each route (rebuild existing fixtures/season/squad/standings/stats; add player/[id], fixtures/[id]) matching the new layouts.
7. Dates via `src/lib/format-match-date.ts` (Vietnam time).

## Verify
Screenshots 390/768/1440 vi+en for /fixtures, /season, /standings, /stats, /squad, /player/<real slug>, /fixtures/<real id> (get real ids/slugs from the pages); scrollWidth ≤ innerWidth; layout-shift sum < 0.02; no console errors/hydration warnings; keep `e2e/support/routes.ts` expectations true (update e2e text expectations only if your copy changes them and say so).
