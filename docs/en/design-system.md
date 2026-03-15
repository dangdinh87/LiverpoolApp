# Design System

**Dark Stadium** — the visual language of LiverpoolApp. Deep black environment inspired by Anfield at night, Liverpool red as energy, gold reserved for achievement. Bold condensed type channels match-day print culture.

---

## 1. Philosophy

- **Dark-only.** No light mode. `ThemeProvider` is configured with `defaultTheme="dark"` and `enableSystem={false}`.
- **Intentional scarcity.** Gold (`#F6EB61`) appears at most once per visual section — trophies, live badges, score highlights.
- **Typography-first.** Large display text does the heavy lifting; let League Gothic / Bebas fill space before reaching for decorative elements.
- **Red means action.** Every CTA, active state, and interactive affordance is `#C8102E`.

---

## 2. Color Tokens

All tokens are CSS custom properties in `src/app/globals.css`, mapped into Tailwind via `@theme inline`.

| Token | Hex | Tailwind class | Usage |
|-------|-----|----------------|-------|
| `--stadium-bg` | `#0D0D0D` | `bg-stadium-bg` | Page background |
| `--stadium-surface` | `#1A1A1A` | `bg-stadium-surface` | Cards, navbar (scrolled), modals |
| `--stadium-surface2` | `#252525` | `bg-stadium-surface2` | Card hover, input focus bg |
| `--lfc-red` | `#C8102E` | `bg-lfc-red` / `text-lfc-red` | Primary actions, active states, highlights |
| `--lfc-red-dark` | `#A00E24` | `bg-lfc-red-dark` | Hover state on red buttons |
| `--lfc-gold` | `#F6EB61` | `bg-lfc-gold` / `text-lfc-gold` | Trophies, scores, achievements |
| `--stadium-muted` | `#A0A0A0` | `text-stadium-muted` | Secondary text, labels, placeholders |
| `--stadium-border` | `#2A2A2A` | `border-stadium-border` | Card borders, dividers, inputs |

### Additional utilities

```css
/* Red glow — used on card hover and button shadow */
box-shadow: 0 0 24px rgba(200, 16, 46, 0.25);   /* shadow-red-glow */
box-shadow: 0 0 48px rgba(200, 16, 46, 0.35);   /* shadow-red-glow-lg */

/* Semi-transparent red overlay (badge backgrounds, Liverpool row in table) */
background: rgba(200, 16, 46, 0.10);            /* bg-lfc-red/10 */
```

---

## 3. Typography

Three fonts loaded in `src/app/layout.tsx` via `next/font/google`.

| Font | Variable | Tailwind class | Role |
|------|----------|----------------|------|
| League Gothic | `--font-bebas` | `font-bebas` | Hero headlines, stat numbers, player names |
| Inter | `--font-inter` | `font-inter` | Body text, UI, forms, nav links |
| Barlow Condensed | `--font-barlow` | `font-barlow` | Sub-headlines, stat labels, position badges, uppercase caps |

### Type scale

```css
/* Display — Bebas/League Gothic */
font-bebas text-[clamp(4rem,12vw,10rem)] tracking-wide   /* hero title */
font-bebas text-[clamp(3rem,8vw,7rem)]                   /* section header */
font-bebas text-[clamp(2rem,5vw,4rem)]                   /* card headline */
font-bebas text-6xl                                       /* stat number */

/* Labels — Barlow Condensed */
font-barlow text-xs font-semibold uppercase tracking-widest  /* position badge, metadata */
font-barlow text-sm font-semibold uppercase tracking-wide    /* section label */

/* Body — Inter */
font-inter text-base leading-relaxed    /* article body */
font-inter text-sm leading-normal       /* UI text, buttons */
font-inter text-xs                      /* helper text, timestamps */
```

### Usage rules

- Player names, section headings, stat numbers → `font-bebas`
- All uppercase labels (position, competition, date) → `font-barlow`
- Navigation, forms, body copy, tooltips → `font-inter`
- Never mix `font-bebas` and `font-barlow` in the same line element

---

## 4. shadcn/ui Components

Style: `new-york`. Icon library: `lucide`. Base color: `neutral`. Config in `components.json`.

### Currently installed (`src/components/ui/`)

`alert-dialog`, `avatar`, `badge`, `button`, `dialog`, `dropdown-menu`, `input`, `popover`, `scroll-area`, `select`, `sheet`, `skeleton`, `tabs`, `tooltip`

Custom additions: `error-boundary`, `lfc-loader`, `toast-notification`

### Adding a new component

```bash
npx shadcn@latest add card
npx shadcn@latest add table accordion separator
```

This writes the component source into `src/components/ui/`. Do not install manually — always use the CLI so variant config and imports stay consistent.

Import pattern:

```typescript
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
```

---

## 5. Component Patterns

### Buttons

Always use the shadcn `Button` component as the base. Override via `className` + `cn()` for custom variants.

```tsx
// Primary — Liverpool Red (default variant override)
<Button className="bg-lfc-red hover:bg-lfc-red-dark text-white font-barlow uppercase tracking-widest hover:shadow-red-glow active:scale-95">
  Join The Kop
</Button>

// Ghost / secondary
<Button variant="ghost" className="border border-stadium-border text-stadium-muted hover:border-lfc-red hover:text-white font-barlow uppercase tracking-widest">
  View Squad
</Button>

// Icon button — always add aria-label
<Button variant="ghost" size="icon" aria-label="Open menu">
  <Menu className="w-5 h-5" />
</Button>
```

### Cards

```tsx
<div className="relative bg-stadium-surface border border-stadium-border rounded-lg overflow-hidden
                hover:border-lfc-red hover:shadow-red-glow transition-all duration-300 cursor-pointer group">
  {/* Jersey number watermark */}
  <span className="absolute right-2 bottom-2 font-bebas text-[8rem] leading-none text-white/5 select-none pointer-events-none">
    {number}
  </span>
  <div className="relative z-10 p-4">
    {/* content */}
  </div>
</div>
```

### Badges

```tsx
// Live match
<span className="inline-flex items-center gap-1.5 bg-lfc-red/20 border border-lfc-red text-lfc-red font-barlow text-xs uppercase tracking-widest px-3 py-1 rounded-full">
  <span className="w-1.5 h-1.5 rounded-full bg-lfc-red animate-pulse" />
  Live
</span>

// Match result
<span className={cn(
  'font-barlow font-semibold text-xs px-2 py-0.5 rounded',
  result === 'W' && 'bg-green-500/20 text-green-400',
  result === 'D' && 'bg-yellow-500/20 text-yellow-400',
  result === 'L' && 'bg-red-500/20 text-red-400',
)}>{result}</span>
```

### Form inputs

```tsx
<Input
  className="bg-stadium-surface border-stadium-border text-white placeholder:text-stadium-muted
             focus:border-lfc-red focus:ring-2 focus:ring-lfc-red/15 transition-all"
  placeholder="Email address"
/>
```

### Navbar (scroll behaviour)

```tsx
// Transparent → stadium-surface on scroll (Framer Motion)
<motion.nav
  className="fixed top-0 w-full z-50"
  animate={{ backgroundColor: scrollY > 50 ? '#1A1A1A' : 'transparent' }}
  transition={{ duration: 0.3 }}
>
```

Active link underline:

```tsx
<Link className="relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-lfc-red after:scale-x-0 data-[active]:after:scale-x-100 after:transition-transform" />
```

---

## 6. Spacing & Layout

### Container widths

| Name | Value | Usage |
|------|-------|-------|
| `max-w-[1440px]` | 1440px | Outer wrapper |
| `max-w-[1280px]` | 1280px | Content container |
| `max-w-[960px]` | 960px | Narrow (articles, auth) |

### Section padding

```tsx
<section className="py-20">   {/* standard section */}
<section className="py-32">   {/* hero / feature section */}
```

### Bento grid (homepage)

12-column grid, 1rem gap. Preset span classes:

```css
.bento-2x2 { grid-column: span 6; grid-row: span 2; }
.bento-1x2 { grid-column: span 3; grid-row: span 2; }
.bento-2x1 { grid-column: span 6; grid-row: span 1; }
.bento-1x1 { grid-column: span 3; grid-row: span 1; }
/* Mobile: all widgets full-width */
@media (max-width: 768px) { .bento-grid > * { grid-column: span 12; } }
```

### Page templates

| Page | Layout |
|------|--------|
| Homepage | Hero → BentoGrid widgets → Stats bar → Footer |
| Squad | Position filter tabs → 3-col player grid (desktop) / 2 (tablet) / 1 (mobile) |
| Fixtures | Filter tabs → vertical timeline list |
| Standings | League selector → full table with inline progress bars |
| Auth | Full-page centered card → logo → form |

---

## 7. Animation Presets

Define variants in `src/lib/animation-variants.ts` (or inline for one-offs). Always pass `viewport={{ once: true }}` on scroll-triggered animations.

```typescript
export const fadeUp = {
  hidden:  { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

export const cardHover = {
  rest:  { scale: 1 },
  hover: { scale: 1.02, transition: { duration: 0.2 } },
};

export const slideInLeft = {
  hidden:  { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] } },
};
```

### CSS keyframes (Tailwind)

| Class | Effect | Use case |
|-------|--------|----------|
| `animate-pulse` | Fade in/out opacity | Live badge dot |
| `animate-pulse-red` | LFC red pulse | Live indicator, alert |
| `animate-score-flash` | Gold flash → white | Goal scored |

---

## 8. Dark Mode Only

This site is dark-only. `ThemeProvider` config:

```tsx
// src/app/layout.tsx
<ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
  {children}
</ThemeProvider>
```

Never add light-mode conditional classes (no `dark:` prefix variants needed — everything is dark by default). If a component from shadcn uses `dark:` prefixes, verify it renders correctly in the stadium theme.

### Background layering

```
Page:    bg-stadium-bg (#0D0D0D)
Cards:   bg-stadium-surface (#1A1A1A) + border-stadium-border
Hover:   bg-stadium-surface2 (#252525)
Modals:  bg-stadium-surface + backdrop-blur-md
```

---

## 9. Icons

Use **Lucide React** exclusively. No emoji as icons. No other icon libraries.

```typescript
import { ChevronRight, Trophy, Calendar, Users, BarChart2, Heart } from 'lucide-react';
```

Standard sizes:

| Context | Size class |
|---------|-----------|
| Navbar | `w-5 h-5` |
| Card icons | `w-4 h-4` |
| Hero / feature | `w-6 h-6` |
| Stat cards | `w-8 h-8` |

---

## 10. Hero Background

```css
/* Gradient overlay on hero image */
background: linear-gradient(
  to top,
  #0D0D0D 0%,
  rgba(13, 13, 13, 0.75) 40%,
  rgba(13, 13, 13, 0.3) 70%,
  transparent 100%
);
```

---

## 11. Accessibility

| Rule | Implementation |
|------|---------------|
| Color contrast | White `#FFFFFF` on `#1A1A1A` = ~13:1 (AAA). Red `#C8102E` on dark for large text = 4.6:1 (AA). |
| Focus rings | `focus-visible:ring-2 focus-visible:ring-lfc-red focus-visible:ring-offset-2 focus-visible:ring-offset-stadium-bg` |
| Touch targets | Min 44×44px on all interactive elements |
| Icon buttons | Always include `aria-label` |
| Skip link | `<a href="#main" className="sr-only focus:not-sr-only">Skip to content</a>` in layout |
| Reduced motion | Global CSS override; Framer Motion honours `prefers-reduced-motion` |
| Semantic HTML | `<button>`, `<nav>`, `<main>`, `<article>`, `<section>` — never `<div onClick>` |
