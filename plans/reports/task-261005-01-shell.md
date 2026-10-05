# Task: APP SHELL (engineer "shell", dev port 3310, build dir .build-shell)

Read first: `plans/reports/task-261005-00-common-rules.md`, `plans/reports/design-brief-261005-ui-rebuild.md`, CLAUDE.md, the "Design system v2" block at the bottom of `src/app/globals.css`, and the primitives in `src/components/ui/` (page-hero, section-header, empty-state, skeleton).

## You own (edit only these)
src/app/layout.tsx, src/app/not-found.tsx, src/app/error.tsx and global-error.tsx (create if missing), src/app/globals.css (refine the design-system block; keep existing class names other pages use), src/components/layout/** (navbar, navbar-client, navbar-auth, footer, splash-screen, LanguageSwitcher, news-source-marquee), src/components/ui/** (shared primitives + shadcn parts — extend, keep exports/APIs stable), src/components/providers/**, src/components/chat/** (floating trigger + panel UX only; no chat API/logic), src/components/auth/** and src/app/auth/** (login/register UX).

## Goals
1. **Header/nav**: clean, fast, accessible. Mobile: slim bar + full-screen/sheet menu with large tap targets, language switch, auth, streak badge. Desktop nav shows from `lg` (≥1024). Solid-on-scroll with blur; over-hero scrim so icons stay visible; active-route indicator; keyboard-operable dropdown (keep hover-open with grace timer + click toggle). Keep `--header-h` equal to the real header height at each breakpoint (PageHero offsets with it).
2. **Footer**: compact link groups, language/legal, no debug text; no overflow at 390.
3. **Route transitions & perceived speed**: CSS cross-document view transitions are enabled (globals.css); verify no flash/jump — give the header `view-transition-name` so it doesn't re-animate; add a thin top navigation-progress indicator WITHOUT a new dependency (small client component with usePathname + CSS); the splash screen must never delay first paint (shorten/remove).
4. **Global states**: polished `not-found` (helpful links), `error.tsx`/`global-error.tsx` (calm bilingual copy + retry), consistent toast styling, scroll-to-top not overlapping the chat button or bottom safe-area.
5. **Chat widget UX**: floating button/panel positions don't collide with scroll-to-top; panel full-screen on mobile with clear close; focus moves into panel on open, Esc closes, focus returns. Keep the lazy-loaded panel architecture (global-chat.tsx loads global-chat-panel.tsx on first click).
6. **Auth pages**: clean card, proper labels/autocomplete/inputmode, password show/hide with accessible name, inline validation, loading states, translated friendly errors (error codes already map to `Auth.errors.*`), no layout jump.
7. Extend shared primitives if other pages will need it (Badge/Button variants, Tabs look, a `Stat` tile, `FilterChips` scroller) — keep APIs stable, comment them, list what you added in your report.

Quality bar: header/footer are on every page — zero CLS, zero hydration warnings, no horizontal overflow at 320/390/768/1024/1440, contrast ≥4.5:1.
