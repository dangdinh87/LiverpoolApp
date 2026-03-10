# Liverpool FC Fan Site — Design Guidelines

## 1. Design Philosophy

**Dark Stadium** — The visual language evokes being inside Anfield at night: deep black environment, Liverpool red as the pulse of energy, gold used sparingly as trophy/achievement accent. Bold condensed typography channels match-day print culture. Every component should feel premium yet passionate.

---

## 2. Color Tokens

### CSS Custom Properties
```css
:root {
  --lfc-black:    #0D0D0D;
  --lfc-surface:  #1A1A1A;
  --lfc-surface2: #252525;
  --lfc-red:      #C8102E;
  --lfc-red-dark: #A00E24;
  --lfc-red-glow: rgba(200, 16, 46, 0.25);
  --lfc-gold:     #F6EB61;
  --lfc-white:    #FFFFFF;
  --lfc-muted:    #A0A0A0;
  --lfc-border:   #2A2A2A;
}
```

### Tailwind Config Snippet
```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        lfc: {
          black:    '#0D0D0D',
          surface:  '#1A1A1A',
          surface2: '#252525',
          red:      '#C8102E',
          'red-dark': '#A00E24',
          gold:     '#F6EB61',
          white:    '#FFFFFF',
          muted:    '#A0A0A0',
          border:   '#2A2A2A',
        },
      },
      boxShadow: {
        'red-glow': '0 0 24px rgba(200,16,46,0.25)',
        'red-glow-lg': '0 0 48px rgba(200,16,46,0.35)',
      },
    },
  },
}
```

### Color Usage Rules
| Token | Usage |
|-------|-------|
| `lfc-black` | Page background, darkest layer |
| `lfc-surface` | Cards, navbar (scrolled), modals |
| `lfc-surface2` | Hover state on cards, input focus backgrounds |
| `lfc-red` | Primary actions, active states, highlights |
| `lfc-red-dark` | Hover state on red buttons |
| `lfc-gold` | Trophies, achievements, star ratings — max 1 use per section |
| `lfc-white` | Primary text, headings |
| `lfc-muted` | Secondary text, labels, placeholders |
| `lfc-border` | Card borders, dividers, input borders |

---

## 3. Typography

### Font Stack
```css
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600;700&family=Barlow+Condensed:wght@400;500;600;700&display=swap');

:root {
  --font-display: 'Bebas Neue', Impact, sans-serif;
  --font-body:    'Inter', system-ui, sans-serif;
  --font-stats:   'Barlow Condensed', sans-serif;
}
```

### Type Scale
```css
/* Display — Hero headlines, section numbers */
.text-display-2xl { font-family: var(--font-display); font-size: clamp(4rem, 12vw, 10rem); letter-spacing: 0.02em; }
.text-display-xl  { font-family: var(--font-display); font-size: clamp(3rem, 8vw, 7rem); letter-spacing: 0.02em; }
.text-display-lg  { font-family: var(--font-display); font-size: clamp(2rem, 5vw, 4rem); letter-spacing: 0.02em; }

/* Stats — Large animated numbers */
.text-stat-hero   { font-family: var(--font-display); font-size: 6rem; line-height: 1; }

/* Barlow Condensed — Labels, sub-headlines */
.text-label-lg    { font-family: var(--font-stats); font-size: 1rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; }
.text-label-sm    { font-family: var(--font-stats); font-size: 0.75rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; }

/* Inter — Body, UI */
.text-body-lg     { font-family: var(--font-body); font-size: 1.125rem; line-height: 1.6; }
.text-body        { font-family: var(--font-body); font-size: 1rem; line-height: 1.6; }
.text-body-sm     { font-family: var(--font-body); font-size: 0.875rem; line-height: 1.5; }
```

### Tailwind Config
```js
fontFamily: {
  display: ['Bebas Neue', 'Impact', 'sans-serif'],
  body:    ['Inter', 'system-ui', 'sans-serif'],
  stats:   ['Barlow Condensed', 'sans-serif'],
},
fontSize: {
  'display-2xl': ['clamp(4rem,12vw,10rem)', { lineHeight: '1', letterSpacing: '0.02em' }],
  'display-xl':  ['clamp(3rem,8vw,7rem)',   { lineHeight: '1', letterSpacing: '0.02em' }],
  'display-lg':  ['clamp(2rem,5vw,4rem)',   { lineHeight: '1.1', letterSpacing: '0.02em' }],
  'stat-hero':   ['6rem',  { lineHeight: '1' }],
  'stat-lg':     ['4rem',  { lineHeight: '1' }],
},
```

---

## 4. Spacing & Grid

```js
// Container
maxWidth: { site: '1440px', content: '1280px', narrow: '960px' }

// Section padding
padding: {
  'section': '5rem 0',      // py-20
  'section-lg': '8rem 0',   // py-32
}
```

### Bento Grid System
```css
.bento-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 1rem; /* 16px */
}
/* Widget size presets */
.bento-2x2  { grid-column: span 6; grid-row: span 2; }
.bento-1x2  { grid-column: span 3; grid-row: span 2; }
.bento-2x1  { grid-column: span 6; grid-row: span 1; }
.bento-1x1  { grid-column: span 3; grid-row: span 1; }
/* Mobile: all full-width */
@media (max-width: 768px) { .bento-grid > * { grid-column: span 12; } }
```

---

## 5. Component Patterns

### 5.1 Buttons
```tsx
// Primary — Liverpool Red
<button className="bg-lfc-red hover:bg-lfc-red-dark text-white font-stats font-700 uppercase tracking-widest px-8 py-3 transition-all duration-200 hover:shadow-red-glow active:scale-95">
  Join The Kop
</button>

// Secondary — Ghost
<button className="border border-lfc-border text-lfc-muted hover:border-lfc-red hover:text-white font-stats uppercase tracking-widest px-8 py-3 transition-all duration-200">
  View Squad
</button>

// Icon + Text
<button className="flex items-center gap-2 bg-lfc-red ...">
  <svg>...</svg> Watch Highlights
</button>
```

### 5.2 Cards — Player Squad Card
```tsx
<div className="relative bg-lfc-surface border border-lfc-border rounded-lg overflow-hidden
                hover:border-lfc-red hover:shadow-red-glow transition-all duration-300 cursor-pointer group">
  {/* Jersey number watermark */}
  <span className="absolute right-2 bottom-2 font-display text-[8rem] leading-none text-white/5 select-none">
    {number}
  </span>
  {/* Content */}
  <div className="relative z-10 p-4">
    <img src={photo} alt={name} className="w-full aspect-[3/4] object-cover object-top" />
    <div className="mt-3">
      <p className="font-stats text-xs tracking-widest text-lfc-red uppercase">{position}</p>
      <h3 className="font-display text-2xl text-white mt-1">{name}</h3>
      <div className="flex gap-4 mt-2">
        <Stat label="Goals" value={goals} />
        <Stat label="Assists" value={assists} />
      </div>
    </div>
  </div>
</div>
```

### 5.3 Navbar
```tsx
// Transparent → Solid on scroll
// useScrollY + Framer Motion
<motion.nav
  className="fixed top-0 w-full z-50"
  animate={{ backgroundColor: scrollY > 50 ? '#1A1A1A' : 'transparent' }}
  transition={{ duration: 0.3 }}
>
  {/* Left: LFC Crest SVG */}
  {/* Center: Navigation links */}
  {/* Right: Login CTA */}
</motion.nav>

// Active link style
<Link className="relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-lfc-red" />
```

### 5.4 Badges
```tsx
// Live match badge
<span className="flex items-center gap-1.5 bg-lfc-red/20 border border-lfc-red text-lfc-red font-stats text-xs uppercase tracking-widest px-3 py-1 rounded-full">
  <span className="w-1.5 h-1.5 rounded-full bg-lfc-red animate-pulse" />
  Live
</span>

// Result badge
<span className={`font-stats font-700 text-xs px-2 py-0.5 rounded ${
  result === 'W' ? 'bg-green-500/20 text-green-400' :
  result === 'D' ? 'bg-yellow-500/20 text-yellow-400' :
                   'bg-red-500/20 text-red-400'
}`}>{result}</span>
```

### 5.5 Fixture Timeline Card
```tsx
<div className="relative pl-8 border-l border-lfc-border">
  {/* Timeline dot */}
  <span className="absolute -left-2 top-4 w-4 h-4 rounded-full border-2 border-lfc-red bg-lfc-black" />
  <div className="bg-lfc-surface border border-lfc-border rounded-lg p-4 hover:border-lfc-surface2 transition-colors">
    <p className="font-stats text-xs text-lfc-muted tracking-widest">{date} · {competition}</p>
    <div className="flex items-center justify-between mt-2">
      <span className="font-display text-xl text-white">LIVERPOOL</span>
      <span className="font-display text-2xl text-lfc-gold">{score}</span>
      <span className="font-display text-xl text-lfc-muted">{opponent}</span>
    </div>
  </div>
</div>
```

### 5.6 Standings Row
```tsx
<div className={`flex items-center gap-4 p-3 rounded ${isLiverpool ? 'bg-lfc-red/10 border border-lfc-red/30' : 'hover:bg-lfc-surface2'}`}>
  <span className="font-display text-2xl w-8 text-center">{position}</span>
  <span className="font-body text-sm flex-1">{team}</span>
  <div className="w-32">
    <div className="h-1.5 bg-lfc-border rounded-full overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${isLiverpool ? 'bg-lfc-red' : 'bg-lfc-muted/40'}`}
        initial={{ width: 0 }}
        whileInView={{ width: `${(points / maxPoints) * 100}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  </div>
  <span className="font-stats font-700 w-8 text-center">{points}</span>
</div>
```

### 5.7 Stat Counter
```tsx
// Count-up animation on scroll
<motion.div
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
>
  <CountUp
    end={value}
    duration={2}
    className="font-display text-[6rem] leading-none text-white"
  />
  <p className="font-stats text-lfc-red uppercase tracking-widest">{label}</p>
</motion.div>
```

### 5.8 Form Inputs (Auth)
```tsx
<div className="relative">
  <input
    className="w-full bg-lfc-surface border border-lfc-border text-white placeholder-lfc-muted
               font-body px-4 py-3 rounded-lg outline-none
               focus:border-lfc-red focus:shadow-[0_0_0_3px_rgba(200,16,46,0.15)]
               transition-all duration-200"
    placeholder="Email address"
  />
</div>
```

---

## 6. Animation Patterns

### Framer Motion Variants
```ts
// Fade up — standard entrance
export const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

// Stagger container
export const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
}

// Card hover
export const cardHover = {
  rest: { scale: 1, boxShadow: 'none' },
  hover: { scale: 1.02, boxShadow: '0 0 24px rgba(200,16,46,0.25)', transition: { duration: 0.2 } },
}

// Slide in from left
export const slideInLeft = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] } },
}
```

### CSS Keyframes (Tailwind extend)
```js
// tailwind.config.js
keyframes: {
  'pulse-red': {
    '0%, 100%': { opacity: 1 },
    '50%': { opacity: 0.3 },
  },
  'score-flash': {
    '0%': { color: '#F6EB61', textShadow: '0 0 20px rgba(246,235,97,0.8)' },
    '100%': { color: '#FFFFFF', textShadow: 'none' },
  },
  'stadium-shimmer': {
    '0%': { backgroundPosition: '-200% center' },
    '100%': { backgroundPosition: '200% center' },
  },
},
animation: {
  'pulse-red': 'pulse-red 2s ease-in-out infinite',
  'score-flash': 'score-flash 0.6s ease-out forwards',
},
```

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 7. Dark Mode

Implementation: `next-themes` with `class` strategy (`class="dark"` on `<html>`)

- **Default:** Dark mode (Dark Stadium is the primary theme)
- **Light mode:** optional toggle for accessibility
- **Toggle:** Moon/Sun icon in Navbar (top right)
- **Persistence:** localStorage via next-themes

```js
// tailwind.config.js
darkMode: 'class', // next-themes injects/removes 'dark' on <html>
```

```tsx
// _app.tsx / layout.tsx
import { ThemeProvider } from 'next-themes'
<ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
  {children}
</ThemeProvider>
```

### Background Layering (Dark — primary)
```
Page BG: #0D0D0D
Cards:   #1A1A1A (+ border #2A2A2A)
Hover:   #252525
Modals:  #1A1A1A + backdrop-blur
```

### Color Mapping — Dark ↔ Light
| Token | Light mode | Dark mode (default) |
|-------|-----------|---------------------|
| `bg` | `#F5F5F5` | `#0D0D0D` |
| `surface` | `#FFFFFF` | `#1A1A1A` |
| `text` | `#1A1A1A` | `#FFFFFF` |
| `muted` | `#666666` | `#A0A0A0` |
| `border` | `#E0E0E0` | `#2A2A2A` |

### Tailwind Snippet (light overrides)
```css
/* globals.css — only needed if light mode is implemented */
:root {
  --bg:      #F5F5F5;
  --surface: #FFFFFF;
  --text:    #1A1A1A;
  --muted:   #666666;
  --border:  #E0E0E0;
}
.dark {
  --bg:      #0D0D0D;
  --surface: #1A1A1A;
  --text:    #FFFFFF;
  --muted:   #A0A0A0;
  --border:  #2A2A2A;
}
```

### Moon/Sun Toggle (Navbar)
```tsx
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'

const { theme, setTheme } = useTheme()
<button
  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
  className="p-2 text-lfc-muted hover:text-white transition-colors"
  aria-label="Toggle colour scheme"
>
  {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
</button>
```

### Light Mode Contrast Rules
- Body text `#1A1A1A` on `#FFFFFF` → contrast 16:1 (AAA)
- Muted text `#666666` on `#F5F5F5` → contrast 4.7:1 (AA)
- LFC Red `#C8102E` on `#F5F5F5` → contrast 4.8:1 (AA for large text)
- Cards: use `shadow-sm border border-[#E0E0E0]` instead of surface elevation

---

## 8. Hero Pattern

```css
.hero-overlay {
  background: linear-gradient(
    to top,
    #0D0D0D 0%,
    rgba(13, 13, 13, 0.75) 40%,
    rgba(13, 13, 13, 0.3) 70%,
    transparent 100%
  );
}
```

---

## 9. Icon System

Use **Lucide React** for all UI icons. No emojis as icons.

```tsx
import { ChevronRight, Trophy, Calendar, Users, BarChart2, LogIn } from 'lucide-react'
```

Sizing convention:
- Nav icons: `w-5 h-5`
- Card icons: `w-4 h-4`
- Hero icons: `w-6 h-6`
- Stat icons: `w-8 h-8`

---

## 10. Accessibility

- Color contrast: all body text `#FFFFFF` on `#1A1A1A` passes WCAG AA (contrast ratio ~13:1)
- Red on black: `#C8102E` on `#0D0D0D` = 4.6:1 — passes AA for large text
- Focus rings: `focus-visible:ring-2 focus-visible:ring-lfc-red focus-visible:ring-offset-2 focus-visible:ring-offset-lfc-black`
- Touch targets: min 44×44px on all interactive elements
- Skip link: `<a href="#main" className="sr-only focus:not-sr-only">Skip to content</a>`
- `prefers-reduced-motion` respected in all animations
- ARIA labels on icon-only buttons

---

## 11. Page Templates

| Page | Key Sections |
|------|-------------|
| Homepage | Navbar → Hero → Live Match Banner → Bento Grid (NextMatch, Standings, Form, Squad Carousel, News) → Stats Bar → Footer |
| Squad | Navbar → Position Filter Tabs → Player Grid (3-col desktop, 2 tablet, 1 mobile) → Footer |
| Fixtures | Navbar → Filter Tabs (All/Home/Away/PL/UCL) → Timeline List → Footer |
| Standings | Navbar → League Selector → Full Table with Progress Bars → Footer |
| Login | Full-page centered card → Logo → Form → OAuth options |
