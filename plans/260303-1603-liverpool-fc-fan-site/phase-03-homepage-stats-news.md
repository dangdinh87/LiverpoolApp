# Phase 03 -- Homepage, Stats & News

## Context
- [plan.md](./plan.md) | Phase 3 of 5 | Effort: 4h
- Depends on: Phase 02 (api-football client, types, squad/fixture data)

## Overview
Build the homepage (Hero + Bento widgets), `/stats` page with animated count-up numbers and recharts, `/news` page with RSS parsing, and add Framer Motion animations throughout.

## Key Insights
- Bento layout uses CSS grid with `grid-template-areas` for responsive asymmetric cards
- Count-up animation: Framer Motion `useMotionValue` + `useTransform` + `useInView` trigger
- RSS feeds (BBC Sport, Sky Sports) parsed server-side; articles cached 30min via ISR
- recharts `BarChart` / `ResponsiveContainer` for top scorers / assists visualization

## Requirements
- Phase 02 complete (api-football client returns squad, fixtures, standings data)
- Anfield hero image: use Unsplash URL or place in `/public/images/anfield-hero.jpg`
- RSS feed URLs: `https://feeds.bbci.co.uk/sport/football/teams/liverpool/rss.xml`

## Architecture
- Homepage is a server component that fetches multiple data sources in parallel via `Promise.all`
- Each Bento widget is a self-contained client component receiving props
- `/stats` page: server component fetches top scorers/assists, client wrapper for animations
- `/news` page: server component parses RSS with `rss-parser`, renders article cards
- `src/lib/rss-parser.ts`: wrapper around `rss-parser` package with typed output

## Related Code Files
- `src/app/page.tsx` -- homepage server component
- `src/components/home/hero.tsx` -- full-viewport hero with gradient
- `src/components/home/bento-grid.tsx` -- bento layout container
- `src/components/home/next-match-widget.tsx` -- upcoming match display
- `src/components/home/standings-preview.tsx` -- top 5 PL standings
- `src/components/home/form-widget.tsx` -- W/D/L last 5 colored circles
- `src/components/home/squad-carousel.tsx` -- horizontal scroll of player cards
- `src/components/home/latest-news-widget.tsx` -- 3 recent news cards
- `src/app/stats/page.tsx` -- stats page
- `src/components/stats/stat-number.tsx` -- animated count-up component
- `src/components/stats/stat-chart.tsx` -- recharts bar chart wrapper
- `src/app/news/page.tsx` -- news feed page
- `src/lib/rss-parser.ts` -- RSS fetch + parse helper

## Implementation Steps

### 1. Build Hero component (30min)
- Full viewport height (`h-screen`), Anfield background image via `next/image` (fill, priority, object-cover)
- Gradient overlay: `bg-gradient-to-t from-stadium-bg via-stadium-bg/70 to-transparent` layered on top
- Content: centered "You'll Never Walk Alone" in Bebas Neue, subtitle "Liverpool Football Club | Est. 1892"
- Framer Motion `motion.div` fade-up on mount with `initial={{ opacity: 0, y: 30 }}` `animate={{ opacity: 1, y: 0 }}`
- Scroll indicator arrow at bottom with bounce animation

### 2. Build Bento Grid + Widgets (60min)
- **BentoGrid**: CSS grid, desktop `grid-cols-4 grid-rows-3` with `grid-template-areas`, mobile stacks 1 column
- **NextMatchWidget**: glass card, shows opponent logo + name, date/time, competition, venue. Data from first fixture where `status.short === 'NS'`
- **StandingsPreview**: top 5 teams in mini table, Liverpool highlighted. Data from `getStandings()` sliced to 5
- **FormWidget**: last 5 results as colored circles (W=green, D=yellow, L=red). Parse from standings `form` string
- **SquadCarousel**: horizontal scroll of 8-10 key player mini-cards. Use `overflow-x-auto snap-x` or Framer Motion drag
- **LatestNewsWidget**: 3 most recent RSS articles as cards with title + date

### 3. Wire homepage (`src/app/page.tsx`) (20min)
- Server component, parallel fetch: `Promise.all([getFixtures(), getStandings(), getSquad(), getNews()])`
- ISR: use shortest revalidation -- `revalidate: 1800` (30min, driven by news)
- Pass data as props to Hero (static) + BentoGrid widgets

### 4. Build RSS parser (`src/lib/rss-parser.ts`) (20min)
- Import `Parser` from `rss-parser`
- `getNews(limit = 20)`: fetch BBC Sport Liverpool RSS, parse, return typed `NewsArticle[]` (title, link, pubDate, contentSnippet, thumbnail)
- Handle fetch errors gracefully, return empty array on failure
- Add `import 'server-only'`

### 5. Build `/news` page (30min)
- Server component, call `getNews(20)` with `revalidate: 1800`
- Grid of article cards (2 cols desktop, 1 mobile): title, snippet (truncated 120 chars), date, "Read more" external link
- Glass card styling, hover scale animation via Framer Motion `whileHover={{ scale: 1.02 }}`

### 6. Build animated count-up component (`stat-number.tsx`) (30min)
- Client component using Framer Motion
- Props: `value: number`, `suffix?: string` (e.g., "goals"), `label: string`
- Use `useInView` to trigger animation only when scrolled into viewport
- `useMotionValue(0)` animated to target value over 2s with `useSpring`
- Display in Bebas Neue, large size (`text-6xl md:text-8xl`), liverpool-red color for key stats

### 7. Build `/stats` page (40min)
- Server component, fetch top scorers from API-Football: `/players/topscorers?league=39&season=2024` with `revalidate: 21600`
- Also fetch top assists: `/players/topassists?league=39&season=2024`
- Top section: 3 stat-number cards (total goals, total assists, clean sheets) with count-up
- Charts section: recharts `BarChart` for top 10 scorers, `BarChart` for top 10 assists
- `StatChart` wrapper: `ResponsiveContainer`, custom bar color `#C8102E` for Liverpool players, `#525252` for others
- Filter: Liverpool only vs All PL

## Todo List
- [ ] Build Hero component with Anfield bg + gradient + Framer Motion fade
- [ ] Build BentoGrid layout container
- [ ] Build NextMatchWidget, StandingsPreview, FormWidget
- [ ] Build SquadCarousel (horizontal scroll)
- [ ] Build LatestNewsWidget
- [ ] Wire homepage with parallel data fetching
- [ ] Build rss-parser.ts helper
- [ ] Build /news page with article cards
- [ ] Build stat-number.tsx count-up animation
- [ ] Build StatChart recharts wrapper
- [ ] Build /stats page with scorers + assists charts

## Success Criteria
- Homepage loads with full-screen hero, smooth fade-up, all 5 bento widgets populated
- `/stats` shows animated count-up numbers on scroll, bar charts render correctly
- `/news` displays RSS articles with working external links
- All animations are subtle and performant (no layout shifts)

## Risk Assessment
- **RSS feed unavailability**: `try/catch` with fallback "News temporarily unavailable" message
- **recharts SSR**: wrap in `'use client'`, use `dynamic` import with `ssr: false` if hydration issues
- **Hero image LCP**: Use `priority` on `next/image`; test with Lighthouse

## Security Considerations
- RSS URLs hardcoded server-side; no user-supplied URLs. External links use `rel="noopener noreferrer"`

## Next Steps
Proceed to [Phase 04](./phase-04-auth-profile.md) -- Auth & User Profile
