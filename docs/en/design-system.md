# Design System

**Dark Stadium** — the visual and editorial language of **Anfield Daily** (see [`docs/brand.md`](../brand.md)). Deep ink surfaces inspired by Anfield under floodlights, Liverpool red reserved for action and identity, crisp editorial serif headlines paired with condensed matchday display numerals.

---

## 1. Core Principles

- **Dark-only.** `ThemeProvider` runs with `defaultTheme="dark"` and `enableSystem={false}`.
- **Brand separation.** Anfield Daily's own mark (`<BrandMark />` from `src/lib/brand.ts`) is an aerial view of a pitch's centre circle — vertical full-height halfway line, circle, and centre spot — in white on a `#C8102E` rounded tile. Club crests (`<TeamCrest />`) appear strictly as match and standings data, never as site chrome.
- **Accessible red separation.** `#C8102E` has a ~3:1 contrast ratio on dark surfaces, so it is used for **fills, borders, rules, and badges**. Red **text** on dark backgrounds uses `#FF3347` (`text-lfc-red-text` / `text-brand`), passing WCAG AA at 4.8:1 on surface and 5.4:1 on ink.
- **Editorial hierarchy.** Newsreader (`font-serif`) carries story headlines and briefings; League Gothic (`font-bebas`) carries the wordmark, section headers, scores, and big numbers.

---

## 2. Colour Tokens

Defined in `src/app/globals.css` via Tailwind CSS v4 `@theme inline`:

| Token | Hex | Utility Class | Usage |
|---|---|---|---|
| `--color-stadium-bg` | `#0D0D0D` | `bg-stadium-bg` | Page background (Ink) |
| `--color-stadium-surface` | `#1A1A1A` | `bg-stadium-surface` | Cards, header, modals, sheets |
| `--color-stadium-surface2` | `#252525` | `bg-stadium-surface2` | Raised surfaces, hover states, inputs |
| `--color-stadium-border` | `#2A2A2A` | `border-stadium-border` | Hairline dividers and card borders |
| `--color-stadium-muted` | `#A0A0A0` | `text-stadium-muted` | Secondary metadata, timestamps, captions |
| `--color-lfc-red` | `#C8102E` | `bg-lfc-red` / `border-lfc-red` | Mark tile, primary buttons, active rules, live strip |
| `--color-lfc-red-dark` | `#A00E24` | `hover:bg-lfc-red-dark` | Primary button hover fill |
| `--color-lfc-red-text` | `#FF3347` | `text-lfc-red-text` / `text-brand` | WCAG AA red text links & kickers on dark surfaces |
| `--color-lfc-gold` | `#F6EB61` | `text-lfc-gold` / `bg-lfc-gold` | Sparse trophy and match highlights |

---

## 3. Typography

Four Google Fonts are loaded in the root layout and mapped to CSS variables:

| Typeface | Variable | Tailwind Class | Role |
|---|---|---|---|
| **League Gothic** | `--font-bebas` | `font-bebas` | `ANFIELD DAILY` wordmark, section titles, scorelines, big stat numerals |
| **Newsreader** | `--font-newsreader` | `font-serif` | Homepage strapline, daily briefing, article & analysis headlines |
| **Inter** | `--font-inter` | `font-inter` | Body prose, forms, comments, general UI copy |
| **Barlow Condensed** | `--font-barlow` | `font-barlow` | Uppercase kickers, competition tags, buttons, table headers |

### Numeric & Editorial Rules

- Add `tabular-nums` whenever rendering scores, kick-off times, league tables, player ratings, or counters.
- Use proper en-dashes (`–`) in scorelines and year ranges (`2–1`, `2026/27`).
- Do not mix `font-bebas` and `font-barlow` inside the same inline phrase.

---

## 4. `shadcn/ui` & Shared Primitives

Configured in `components.json` (`style: "new-york"`, `rsc: true`, `cssVariables: true`, unified `radix-ui` package, `lucide-react` icons).

### Installed Primitives (`src/components/ui/`)

`accordion`, `alert-dialog`, `badge`, `button`, `dialog`, `dropdown-menu`, `popover`, `sheet`, `skeleton`, `slider`, `switch`, `table`, `tooltip`

### Domain UI Helpers (`src/components/ui/`)

- `page-hero.tsx` & `section-header.tsx` — consistent editorial headers
- `team-crest.tsx` — crest renderer with safe neutral shield fallback
- `local-time.tsx` — client-hydrated kick-off time in the viewer's local time zone
- `form-badge.tsx` — `W` / `D` / `L` match form pills
- `empty-state.tsx` & `error-boundary.tsx` — graceful empty/error cards
- `toast-notification.tsx` — primitive-selector Zustand toast banner
- `scroll-to-top.tsx` — reduced-motion-aware scroll helper

Install additional primitives via CLI:

```bash
npx shadcn@latest add <component-name>
```

---

## 5. Layout, Motion & Accessibility

### Responsive Containers & Overflow Discipline

- Zero horizontal overflow across `320px`, `390px`, `768px`, `1280px`, and `1440px` viewports (enforced by `e2e/responsive-overflow.spec.ts`).
- Compact mobile controls stack cleanly below `sm` (e.g. score prediction steppers and match headers on `/fixtures/[id]`) and reserve skeleton height to keep `CLS < 0.05`.

### Purposeful Motion

- **Properties:** Animate `transform` and `opacity` only — never animate layout properties such as `width`, `height`, or `top`.
- **Timing:** `140–200ms` (`ease-out`) for buttons/hovers with tactile `active:scale-[0.97]`; `<= 260ms` for dialogs, mobile sheets, and drawers.
- **Reduced Motion:** `<MotionConfig reducedMotion="user">` wraps the app alongside a `@media (prefers-reduced-motion: reduce)` rule in `src/app/globals.css`.

### Accessibility Standards (100/100 Lighthouse A11y)

- **Contrast:** White `#F5F5F5` on `#1A1A1A` (~13:1 AAA); red text `#FF3347` on `#1A1A1A` (4.8:1 AA); muted text `#A0A0A0` used without low-opacity modifiers on body labels.
- **Tap Targets:** Minimum `44×44px` (`min-h-11 min-w-11` / `tap-target`) on mobile interactive elements.
- **Keyboard & Screen Readers:** Visible `focus-visible` rings, `<SkipLink />` to `#main-content`, roving `tabIndex` on tablists, localised `aria-label` attributes on icon buttons, and `AlertDialog` confirmations instead of blocking `window.confirm`.
- **Spoiler-Free Compatibility:** Match scores, W/D/L badges, and goal summaries respect `html[data-spoiler-free]` rules defined in `src/app/globals.css`.
