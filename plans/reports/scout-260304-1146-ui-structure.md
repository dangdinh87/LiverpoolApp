# LiverpoolApp UI Structure Scout Report
**Date**: 2026-03-04 | **Time**: 11:46

## Overview
LiverpoolApp is a Liverpool FC fan site built with **Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui** with Supabase backend. The UI follows a **Dark Stadium** theme with Liverpool red (#c8102e) and gold (#f6eb61) accents.

---

## 1. ROOT LAYOUT & STYLING

### Layout Structure: `/Users/nguyendangdinh/LiverpoolApp/src/app/layout.tsx`
- **Root layout** with `ThemeProvider` (next-themes) wrapping all content
- **Font imports**: 
  - Bebas Neue (headlines, jersey watermarks, stats)
  - Inter (body text, UI labels, forms)
  - Barlow Condensed (sub-headlines, stat labels)
- **Structure**: `<html>` → `<ThemeProvider>` → `<NavbarAuth />` → `<main>{children}</main>` → `<Footer />`
- **Default theme**: Dark (no light mode by default, but light mode CSS included for toggle)
- **Metadata**: SEO setup with metadataBase, title template, OG images, robots index

### Global Styles: `/Users/nguyendangdinh/LiverpoolApp/src/app/globals.css`
**Import stack**:
- `@import "tailwindcss"` — Tailwind CSS v4 with new @theme syntax
- `@import "tw-animate-css"` — Animation utilities
- `@import "shadcn/tailwind.css"` — shadcn/ui color system

**Design Tokens (Dark Stadium)**:
```
--color-stadium-bg: #0d0d0d (body background)
--color-stadium-surface: #1a1a1a (cards, overlays)
--color-stadium-surface2: #252525 (interactive elements)
--color-stadium-border: #2a2a2a (borders)
--color-stadium-muted: #a0a0a0 (secondary text)
--color-lfc-red: #c8102e (primary accent)
--color-lfc-red-dark: #a00e24 (hover state)
--color-lfc-gold: #f6eb61 (highlight accent)
```

**Custom Utilities**:
- `.glass` — Glassmorphism (rgba white blur + border)
- `.glow-red` — Liverpool red glow shadow effect
- `.text-gradient-red` — Red-to-gold gradient text
- `.font-bebas`, `.font-inter`, `.font-barlow` — Font family utilities

**Animations**:
- `@keyframes pulse-red` — Red pulsing glow (2s infinite)
- `@keyframes shimmer` — Skeleton loading shimmer (1.5s infinite)

**Theme Support**:
- `:root` — Dark mode variables (default)
- `.light` — Light mode override (inverted colors, lighter backgrounds)

---

## 2. LAYOUT COMPONENTS

### NavbarAuth: `/Users/nguyendangdinh/LiverpoolApp/src/components/layout/navbar-auth.tsx`
**Server component** that:
- Fetches auth state from Supabase (`createServerSupabaseClient`)
- Queries user profile from `user_profiles` table
- Passes auth data to `NavbarClient` (client component)
- Gracefully falls back if Supabase not configured

### NavbarClient: `/Users/nguyendangdinh/LiverpoolApp/src/components/layout/navbar-client.tsx`
**Client component** with:
- **Fixed header** (z-50) with scroll-triggered blur + border effect
- **Logo**: LFC badge (red circle) + "Liverpool FC" text (Bebas font)
- **Desktop nav** (hidden on mobile): 8 links
  - Home, Squad, Fixtures, Standings, Stats, News, History, About
  - Active link indicator (red underline)
  - Hover color transition to white
- **Theme toggle**: Sun/Moon icon (lucide-react)
- **Auth UI**:
  - **Logged in**: Avatar (8x8px) with dropdown menu
    - Username + email display
    - Profile link
    - Sign Out button
  - **Not logged in**: Login button (red bg)
- **Mobile menu** (Sheet/Drawer):
  - Hamburger icon (hidden on md+)
  - Full nav links + auth UI in right sidebar
  - All links close drawer on click
- **Avatar dropdown**: Auto-closes on outside click, pulls from user profile

**Navigation Links**:
```
const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/squad", label: "Squad" },
  { href: "/fixtures", label: "Fixtures" },
  { href: "/standings", label: "Standings" },
  { href: "/stats", label: "Stats" },
  { href: "/news", label: "News" },
  { href: "/history", label: "History" },
  { href: "/about", label: "About" },
];
```

### Footer: `/Users/nguyendangdinh/LiverpoolApp/src/components/layout/footer.tsx`
**Static server component**:
- **3-column grid** (1 col mobile, 3 col md+):
  - **Brand**: LFC logo + name + disclaimer text (fan-made, unofficial)
  - **Quick Links**: Squad, Fixtures, Standings, Stats, News, History
  - **About**: Data sources, news feeds, register link
- **Bottom bar**: Copyright year + "You'll Never Walk Alone" motto
- **Styling**: stadium-surface bg, stadium-border top, stadium-muted text

---

## 3. HOMEPAGE

### Page: `/Users/nguyendangdinh/LiverpoolApp/src/app/page.tsx`
- **Revalidate**: 30 min (ISR, driven by news feed)
- **Async data fetching**:
  ```typescript
  const [fixtures, standings, squad, news] = await Promise.all([
    getFixtures(),
    getStandings(),
    getSquad(),
    getNews(6),
  ]);
  ```
- **Finds next upcoming match** (status "NS" = Not Started)
- **Renders**: `<Hero />` + `<BentoGrid />` with match/standings/players/news

### Hero: `/Users/nguyendangdinh/LiverpoolApp/src/components/home/hero.tsx`
- Full-width hero banner with background image
- Headline + CTA buttons
- Anfield/stadium aesthetic

### BentoGrid: `/Users/nguyendangdinh/LiverpoolApp/src/components/home/bento-grid.tsx`
**Layout**: Responsive grid displaying:
1. **NextMatchWidget** — Upcoming fixture card
2. **StandingsPreview** — Current PL table snippet
3. **FormWidget** — Recent form (W/D/L)
4. **SquadCarousel** — Player slider
5. **LatestNewsWidget** — RSS feed items
6. **Other widgets** — TBD

---

## 4. UI COMPONENT LIBRARY (shadcn/ui)

### Button: `/Users/nguyendangdinh/LiverpoolApp/src/components/ui/button.tsx`
- shadcn/ui Button with CVA (class-variance-authority)
- Variants: default, primary, ghost, outline, destructive
- Sizes: sm, md, lg

### Badge: `/Users/nguyendangdinh/LiverpoolApp/src/components/ui/badge.tsx`
- Status badges (default, secondary, danger, success)
- Position/role labels

### Sheet: `/Users/nguyendangdinh/LiverpoolApp/src/components/ui/sheet.tsx`
- Radix UI Sheet (drawer) for mobile nav
- Supports side variants (left, right, top, bottom)

### Dialog: `/Users/nguyendangdinh/LiverpoolApp/src/components/ui/dialog.tsx`
- Radix UI Dialog for modals
- Close button, header, body, footer

### Skeleton: `/Users/nguyendangdinh/LiverpoolApp/src/components/ui/skeleton.tsx`
- Shimmer animation skeleton for loading states

### ErrorBoundary: `/Users/nguyendangdinh/LiverpoolApp/src/components/ui/error-boundary.tsx`
- React error boundary for graceful error handling

---

## 5. FEATURE COMPONENTS

### Squad
- **SquadGrid** — Responsive player grid with position filtering
- **PlayerCard** — Individual player card (photo, name, position, stats preview)
- **InjuryWidget** — Injury status indicator (NEW, pending)

### Fixtures
- **MatchCard** — Single fixture card (date, teams, score, status)
- **FixtureTimeline** — Chronological match list with timeline

### Standings
- **StandingsTable** — PL table with rank, W/D/L, points, form

### Stats
- **StatNumber** — Count-up animated number display
- **StatChart** — recharts visualization (top scorers, assists, etc.)

### Auth
- **LoginForm** — Email/password login
- **RegisterForm** — Email/password/username registration

### Profile
- **ProfileForm** — Username, email, bio edit
- **AvatarUpload** — Image upload to Supabase Storage
- **FavouriteButton** — Toggle player favorite (heart icon)
- **FavouriteList** — Display user's favorite players

### History
- **TrophyCabinet** — Trophy/title card grid
- **ClubTimeline** — Historical milestones
- **LegendCard** — Former player/manager showcase

---

## 6. DATA TYPES

### Football Types: `/Users/nguyendangdinh/LiverpoolApp/src/lib/types/football.ts`

**Player**:
- id, name, firstname, lastname, age
- number, position (Goalkeeper|Defender|Midfielder|Attacker)
- photo, nationality, height, weight, injured

**PlayerStats**:
- Deeply nested: games, substitutes, goals, assists, passes, tackles, duels, dribbles, fouls, cards, shots, penalty

**Fixture**:
- fixture (id, date, venue, status)
- league, teams (home/away), goals, score (halftime/fulltime/extratime/penalty)
- **Helper**: `getMatchResult(fixture)` → "W" | "D" | "L" | "NS"

**Standing**:
- rank, team, points, goalsDiff, form, all/home/away stats

**Injury**:
- player, team, fixture, league

**Coach**:
- id, name, age, birth, nationality, photo, team, career history

**FixtureLineup**, **FixtureEvent**, **FixtureTeamStats**:
- Lineup with formation, startXI, substitutes, coach
- Event log (goals, cards, subs)
- Match statistics (shots, possession, passes)

---

## 7. PUBLIC ASSETS

Located in `/Users/nguyendangdinh/LiverpoolApp/public/`:

**Liverpool Branding**:
- `assets/liverpool/logo-mark.svg` — LFC badge circle
- `assets/liverpool/logo-wordmark.svg` — LFC text logo
- `assets/liverpool/pattern-grid.svg` — Grid pattern texture
- `assets/liverpool/pattern-diagonal.svg` — Diagonal stripe pattern

**Default SVGs** (Next.js template):
- `next.svg`, `vercel.svg`, `globe.svg`, `window.svg`, `file.svg`

**Image Remotes** (configured in next.config.ts):
- `media.api-sports.io` — Player/team photos
- `media.api-sports.com` — Alternate sports media
- `images.unsplash.com` — Hero backgrounds
- `*.supabase.co`, `*.supabase.in` — User avatars

---

## 8. CONFIGURATION & BUILD

### Package.json: Key Dependencies
- **Next.js 16.1.6** — App Router, SSR, ISR
- **React 19.2.3** — Latest React
- **TypeScript 5** — Type safety
- **Tailwind CSS 4** with `@tailwindcss/postcss`
- **shadcn/ui** via `shadcn` CLI
- **Supabase** (`@supabase/supabase-js`, `@supabase/ssr`)
- **UI/Motion**: `lucide-react`, `framer-motion`, `recharts`
- **Utils**: `class-variance-authority`, `clsx`, `tailwind-merge`

### Next.config.ts
- Image remotes for API-Football, Unsplash, Supabase Storage
- No custom middleware or rewrites

---

## 9. RESPONSIVE DESIGN BREAKPOINTS

**Tailwind CSS v4 defaults** (inherited):
- `sm` — 640px
- `md` — 768px (main desktop breakpoint for navbar)
- `lg` — 1024px
- `xl` — 1280px
- `2xl` — 1536px

**Key responsive patterns**:
- Navbar: Desktop links hidden below `md`, hamburger visible
- Footer: 1-col mobile → 3-col at `md+`
- Grids: Auto-responsive with Tailwind grid classes

---

## 10. COLOR PALETTE QUICK REFERENCE

| Token | Hex | Usage |
|-------|-----|-------|
| Stadium BG | `#0d0d0d` | Body background |
| Stadium Surface | `#1a1a1a` | Cards, nav |
| Stadium Surface 2 | `#252525` | Buttons, inputs |
| Stadium Border | `#2a2a2a` | Borders |
| Stadium Muted | `#a0a0a0` | Secondary text |
| LFC Red | `#c8102e` | Primary accent, buttons |
| LFC Red Dark | `#a00e24` | Hover state |
| LFC Gold | `#f6eb61` | Highlight, gradients |
| White | `#ffffff` | Primary text |

---

## FILES INVENTORY

### Layout & Config
- `/Users/nguyendangdinh/LiverpoolApp/src/app/layout.tsx`
- `/Users/nguyendangdinh/LiverpoolApp/src/app/globals.css`
- `/Users/nguyendangdinh/LiverpoolApp/next.config.ts`
- `/Users/nguyendangdinh/LiverpoolApp/package.json`

### Layout Components (src/components/layout/)
- `navbar-auth.tsx` (Server)
- `navbar-client.tsx` (Client)
- `footer.tsx` (Server)
- `navbar.tsx` (Legacy, check if unused)

### UI Components (src/components/ui/)
- `button.tsx`
- `badge.tsx`
- `sheet.tsx`
- `dialog.tsx`
- `skeleton.tsx`
- `error-boundary.tsx`

### Home Page
- `src/app/page.tsx`
- `src/components/home/hero.tsx`
- `src/components/home/bento-grid.tsx`
- `src/components/home/next-match-widget.tsx`
- `src/components/home/standings-preview.tsx`
- `src/components/home/form-widget.tsx`
- `src/components/home/squad-carousel.tsx`
- `src/components/home/latest-news-widget.tsx`

### Feature Components
- `src/components/squad/squad-grid.tsx`
- `src/components/squad/player-card.tsx`
- `src/components/squad/injury-widget.tsx`
- `src/components/fixtures/match-card.tsx`
- `src/components/fixtures/fixture-timeline.tsx`
- `src/components/standings/standings-table.tsx`
- `src/components/stats/stat-number.tsx`
- `src/components/stats/stat-chart.tsx`
- `src/components/auth/login-form.tsx`
- `src/components/auth/register-form.tsx`
- `src/components/profile/profile-form.tsx`
- `src/components/profile/avatar-upload.tsx`
- `src/components/profile/favourite-button.tsx`
- `src/components/profile/favourite-list.tsx`
- `src/components/history/trophy-cabinet.tsx`
- `src/components/history/club-timeline.tsx`
- `src/components/history/legend-card.tsx`

### Data Types
- `src/lib/types/football.ts`

### Public Assets
- `public/assets/liverpool/logo-mark.svg`
- `public/assets/liverpool/logo-wordmark.svg`
- `public/assets/liverpool/pattern-grid.svg`
- `public/assets/liverpool/pattern-diagonal.svg`

---

## KEY INSIGHTS

1. **Architecture**: Clean separation of server (NavbarAuth) and client (NavbarClient) components
2. **Styling**: Tailwind CSS v4 with custom design tokens — extremely maintainable
3. **Responsive**: Mobile-first approach with `md` breakpoint for desktop
4. **Theming**: Dark mode by default with light mode fallback via next-themes
5. **Component Library**: shadcn/ui provides accessible base, Tailwind handles all styling
6. **Animations**: Framer Motion + CSS keyframes for smooth interactions
7. **Data Fetching**: Server-side caching with `React.cache()` on all API calls (see supabase-server.ts)
8. **Mobile UX**: Hamburger drawer navigation, touch-friendly spacing

---

## UNRESOLVED QUESTIONS

- Is `src/components/layout/navbar.tsx` still in use, or is it legacy?
- Are there page-specific layouts beyond root layout (e.g., `/squad/layout.tsx`)?
- Do any routes use dynamic layouts (e.g., `/player/[id]/layout.tsx`)?
