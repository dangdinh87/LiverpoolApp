# Design brief — UI/UX rebuild "Matchday" (2026-10-05)

Goal: the whole site feels like ONE modern, fast, smooth product. Keep the Dark Stadium identity (near-black, Liverpool red, League Gothic headlines) but fix hierarchy, density, consistency, accessibility and motion. Mobile-first (390px is the primary viewport: Vietnamese fans, phones).

## Principles
1. **Content first.** Scores, kickoff times, headlines and standings are the product. Decoration never pushes them below the fold on 390px.
2. **One system.** Use the tokens/utilities in `src/app/globals.css` ("Design system v2" block at the bottom) and the shared primitives in `src/components/ui/` (`page-hero`, `section-header`, `empty-state`, `skeleton`). No new per-page colours, radii or shadows.
3. **Smooth = no jank.** No layout shift (reserve space: aspect ratios, skeletons shaped like the real content). No scale-on-hover that moves neighbours (use colour/border/opacity). Transitions 120–360ms with `var(--ease-out)`; only animate `transform`/`opacity`. Animate-in on mount with the CSS `.reveal` classes — avoid framer-motion for simple fades (hydration cost + flash of invisible SSR text). Keep framer-motion only where gesture/layout animation is truly needed. Everything must work with `prefers-reduced-motion` (already handled globally).
4. **Fast.** Server components by default; client components only for interaction. `defer-render` on long below-the-fold sections. `next/image` with `sizes` and explicit dimensions/fill+aspect box; `priority` only for the LCP image. No giant client bundles.
5. **Honest states.** Every data section has: loading (skeleton, same geometry), empty (EmptyState with a helpful next step), error/outage (calm message, retry/link). Never raw error text, never blank gaps.
6. **Accessible.** Text on dark uses `text-white`, `text-stadium-muted` (7:1) or `text-brand` (`--color-lfc-red-text`, 5.8:1). NEVER `text-lfc-red` for text (3:1, fails AA) — use it only for fills, borders, icons ≥24px. Visible focus (global `:focus-visible`). Buttons/links ≥40px hit area (`.tap-target` for small icons). Real headings (one h1 per page), labelled inputs, alt text, `aria-label` on icon buttons.
7. **Bilingual.** All user-visible strings via next-intl (`src/messages/en.json` AND `vi.json`; a test enforces key parity and that keys used in code exist). Dates/times via the helpers in `src/lib/format-match-date.ts` (Vietnam time). No hard-coded locale.

## Visual language
- Palette: bg `#0d0d0d`, surfaces `--surface-1/2/3` (`#141414/#1a1a1a/#222`), hairlines `--line`/`--line-strong`, red `#c8102e` (fills), `text-brand` (text), gold `#f6eb61` (sparingly: live/highlight/winner), muted `#a0a0a0`.
- Type: League Gothic (`font-bebas`) for page titles/scores/numerals; Barlow Condensed (`font-barlow`) uppercase tracking for labels/eyebrows/buttons; Inter for body (≥15px on mobile body copy, 12–13px minimum for meta).
- Shape: sharp-cornered cards (existing identity) with 1px hairline borders; consistent 16/24/32px rhythm; sections separated by space, not heavy dividers. Page frame: `.page-container`.
- Cards: `.surface` / `.surface-interactive`. Rows with 44px+ min height. Prefer one clear primary action per card.
- Header: slim, solid on scroll with blur, transparent over heroes only if icon/text contrast stays ≥4.5:1 (use a top scrim). `--header-h` is the offset for sticky/hero content.
- Page hero (shared `PageHero`): eyebrow, h1, one-line description, optional background image (≤200KB, `fill`, `sizes`, gradient scrim). Compact on mobile (≤ ~180px tall).

## Shared primitives (already written by the lead — use them)
`src/components/ui/page-hero.tsx`, `section-header.tsx`, `empty-state.tsx`, `skeleton.tsx` (+ `Skeleton` helpers). Extend them if a need repeats on ≥2 pages; do not fork.

## Definition of done (per owner)
- Looks right at 390 / 768 / 1440, in vi and en: Playwright screenshots saved under the scratchpad, opened and visually checked by you.
- `document.documentElement.scrollWidth <= innerWidth` on every page you touched.
- Every route you own has a `loading.tsx` whose skeleton matches the final layout (no CLS), and empty/error states.
- `npx tsc --noEmit -p .` clean, `npx eslint <your files>` 0 errors, `npx vitest run` green (add tests where logic is added), no console errors/hydration warnings in the browser.
- Do NOT commit/push, do NOT change dependencies, do NOT touch files owned by others.
