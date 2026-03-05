# Liverpool FC Fan Site — Design System & Wireframes Report

**Date:** 2026-03-03
**Agent:** ui-ux-designer
**Slug:** liverpool-design-system

---

## Deliverables

| File | Description |
|------|-------------|
| `/Users/nguyendangdinh/LiverpoolApp/docs/design-guidelines.md` | Full design system documentation |
| `/Users/nguyendangdinh/LiverpoolApp/docs/wireframes/homepage.html` | Homepage — hero + bento grid |
| `/Users/nguyendangdinh/LiverpoolApp/docs/wireframes/squad.html` | Squad page — position groups + player cards |
| `/Users/nguyendangdinh/LiverpoolApp/docs/wireframes/fixtures.html` | Fixtures — vertical timeline layout |
| `/Users/nguyendangdinh/LiverpoolApp/docs/wireframes/standings.html` | PL standings — progress bars + sidebar |
| `/Users/nguyendangdinh/LiverpoolApp/docs/wireframes/auth-login.html` | Login — split-panel auth flow |

---

## Design Research Findings

**Style match:** "Vibrant & Block-based + Motion-Driven" (sports/club product type) aligned perfectly with Dark Stadium brief. Combined with OLED Dark Mode pattern for depth and contrast.

**Typography decision:** Bebas Neue (display) + Inter (body) + Barlow Condensed (labels/stats) — tri-font system balances stadium-print boldness with digital readability. No condensed-only approach; Inter grounds the UI for long-form content.

**Color rule enforced:** Gold (`#F6EB61`) limited to 1 use per section — stat highlights (Salah's 22 goals), "YNWA" watermark in login. Prevents visual cheapening of the trophy-connotation.

---

## Design System Summary

### Token Architecture
- 9 color tokens (black → surface → surface2 → red → red-dark → red-glow → gold → white → muted → border)
- 3 shadow utilities (`red-glow`, `red-glow-lg`)
- 3 font families with explicit fallback stacks
- Bento grid: 12-column, 1rem gap, 5 named span presets

### Component Inventory
| Component | Key Pattern |
|-----------|------------|
| Navbar | Fixed, transparent → `#1A1A1A` on scroll, red active underline |
| Hero | Full-viewport, bottom-aligned content, 4-stop gradient overlay, right-side stat bar |
| Bento widgets | 12-col irregular grid, `span-3/4/5/6/7/8` presets |
| Player card | Jersey number as `opacity:4%` watermark, hover: red border + glow |
| Fixture row | Left-border colour coding (green/yellow/red), translateX hover |
| Standings row | Inline progress bar, LFC row has red tint + 3px left border |
| Auth form | Split panel (visual brand left, form right), 3px red top accent |

---

## Page-by-Page Notes

### Homepage
- Bento layout: 12-column with spans 5+7 (match+standings), 3+3+6 (form+news+squad)
- Live match banner between hero and bento — persistent red bottom border signals priority
- Hero stat bar floats right at `bottom:5rem` — avoids CTA competition
- Stats section full-bleed `#1A1A1A` strip breaks page rhythm

### Squad
- Page hero watermark "SQUAD" text at `opacity:3%` — removes need for hero image
- Position groups use `::after` rule to auto-extend divider line
- Jersey number watermarks positioned `absolute bottom-right` at `font-size:7rem`
- Gold accent on Salah's goals stat only (top scorer treatment)
- Captain badge (C) uses gold on black — 2 chars, zero ambiguity
- Injury badge uses red-900/90 for urgency without competing with brand red

### Fixtures
- Timeline uses `border-left` on `.month-matches` container, not individual cards
- Left-border stripe on cards encodes result: green/yellow/red/transparent(upcoming)/red(next)
- Sidebar sticky with 3 panels: Form (last 10), Season Stats, Top Scorers
- Competition badges color-coded: purple=PL, blue=UCL, gold=FAC

### Standings
- Progress bar width = `(pts / 75) * 100%` — 75 as theoretical max at MD29 proxy
- Qualification zone rows use left-border colour only (no background) for subtlety
- LFC row gets `background: rgba(200,16,46,0.07)` — just enough to pop
- Sidebar title probability bar uses `linear-gradient(red → #FF4060)` for energy
- "Points Gap" sidebar uses negative numbers in red to communicate urgency

### Auth Login
- Split-panel pattern: visual brand left (desktop only), form right (480px fixed)
- 3px red top gradient on right panel anchors brand colour without full header
- 3 OAuth options (Google, Twitter, Discord) — football audience skews social-heavy
- "Remember me" pre-checked — reduces friction for return visitors
- Fan perks section below form converts auth page into light marketing surface
- Mobile: left panel hidden, right panel full-width

---

## Animation Plan (Framer Motion)

| Element | Animation | Trigger |
|---------|-----------|---------|
| Hero title words | `slideInLeft` stagger | Page load |
| Stat numbers | CountUp (0 → value) | `whileInView` |
| Player cards | `fadeUp` stagger 80ms | `whileInView` |
| Progress bars | `width: 0 → target%` | `whileInView` |
| Live badge dot | `pulse-red` infinite | Always |
| Nav background | opacity transition | `useScrollY > 50` |
| Fixture card hover | `translateX(4px)` | `onHover` |
| Player card hover | border + shadow | CSS transition 250ms |

---

## Accessibility Checklist

- All body text: `#FFFFFF` on `#1A1A1A` → contrast ratio ~13:1 (AAA)
- Red on black: `#C8102E` on `#0D0D0D` → 4.6:1 (AA pass for large text)
- All form inputs: visible focus ring `rgba(200,16,46,0.15)` box-shadow
- `prefers-reduced-motion` block documented in guidelines
- Touch targets: all cards and buttons min 44px height
- Jersey number watermarks: `pointer-events:none; user-select:none` — screen-reader neutral
- OAuth icons: SVG only, no emoji

---

## Implementation Notes for Developers

1. **Fonts** — Load via `next/font/google` with `display: 'swap'`. Subset: `latin`. Bebas Neue only has regular weight, no need for `weight` array.

2. **Tailwind** — Extend theme with `lfc` color namespace and `shadow-red-glow` utilities. Use `fontFamily.display/body/stats` keys.

3. **Animation** — `useScrollY` hook + Framer Motion `animate` prop for navbar. `whileInView` + `viewport={{ once: true }}` for all content entrance animations.

4. **Bento grid** — Use CSS Grid with named template areas per breakpoint. Mobile: single column. Tablet: 2-col. Desktop: 12-col custom.

5. **Live badge** — Pulse dot should be CSS-only (`animate-pulse`), not JS-driven, for performance.

6. **Progress bars** — Animate via `initial: { width: 0 }` → `whileInView: { width: '..%' }` with staggered delay per row.

7. **Player photos** — Use `next/image` with `objectPosition: 'top'` to frame faces. Aspect ratio `3/4` enforced via `aspect-ratio` CSS.

---

## Unresolved Questions

1. Will the project use a real football data API (e.g., TheSportsDB, football-data.org) or a local JSON mock for dev? This affects real-time score display feasibility.
2. Squad photos — sourced from LFC official CDN, player image API, or manual upload? Affects `next/image` domain whitelist config.
3. Is the "Fan Community" feature (comments, polls) in scope for V1? Auth complexity differs significantly between read-only and social features.
4. Confirm: is the site purely dark-mode with no light-mode toggle, or should a toggle be included for accessibility?
