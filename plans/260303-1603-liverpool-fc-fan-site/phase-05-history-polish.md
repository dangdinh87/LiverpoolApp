# Phase 05 -- History, Polish & Deploy

## Context
- [plan.md](./plan.md) | Phase 5 of 5 | Effort: 2h
- Depends on: All previous phases complete

## Overview
Build `/history` page from static JSON data, add dark mode toggle, perform performance audit, add SEO metadata, finalize all animations, add error boundaries and loading states, and do final production deployment.

## Key Insights
- History page is fully static (no API calls) -- fastest page, good for SEO
- `next-themes` with `forcedTheme` can start dark-only; toggle enables light mode later
- Error boundaries per route segment prevent full-app crashes from API failures
- Loading states via `loading.tsx` convention give instant feedback during ISR revalidation

## Requirements
- All 4 prior phases complete and functional
- Static JSON data files authored: `history.json`, `trophies.json`, `legends.json`

## Architecture
- `/data/*.json` imported directly in server components (no fetch needed)
- `next-themes` ThemeProvider wraps app in root layout; toggle in Navbar
- `error.tsx` + `loading.tsx` files in each route segment
- `generateMetadata()` exports in every page for SEO

## Related Code Files
- `src/data/history.json` -- key club moments array [{year, title, description, image?}]
- `src/data/trophies.json` -- trophy cabinet [{name, count, years[], icon}]
- `src/data/legends.json` -- legendary players [{name, position, years, bio, photo}]
- `src/app/history/page.tsx` -- history page
- `src/components/history/trophy-cabinet.tsx` -- trophy grid display
- `src/components/history/timeline.tsx` -- historical moments timeline
- `src/components/history/legend-card.tsx` -- legend player card
- `src/app/*/loading.tsx` -- loading skeletons per route
- `src/app/*/error.tsx` -- error boundaries per route

## Implementation Steps

### 1. Author static JSON data files (30min)
- **`src/data/trophies.json`**: League titles (19x), Champions League (6x), FA Cup (8x), League Cup (10x), etc. Each entry: `{ "name": "Champions League", "count": 6, "years": ["1977","1978","1981","1984","2005","2019"], "emoji": "star" }`
- **`src/data/history.json`**: 10-15 key moments: founding 1892, first league title, Shankly era, Paisley dynasty, Hillsborough 1989, Istanbul 2005, Klopp era, 2019-20 PL title. Each: `{ "year": 2005, "title": "Miracle of Istanbul", "description": "..." }`
- **`src/data/legends.json`**: 10-12 legends: Dalglish, Gerrard, Rush, Fowler, Shankly, Paisley, etc. Each: `{ "name": "Steven Gerrard", "position": "Midfielder", "years": "1998-2015", "caps": 710, "goals": 186, "bio": "..." }`

### 2. Build `/history` page (30min)
- Three sections: Trophy Cabinet, Club Timeline, Legends
- **TrophyCabinet**: grid of trophy cards, each shows trophy name + count in Bebas Neue big number + list of years. Gold accent (`text-liverpool-gold`) for count
- **Timeline**: vertical timeline with alternating left/right items (desktop), year label on line, description beside. Similar to fixtures timeline but with richer content
- **LegendCard**: glass card with player photo placeholder (or silhouette), name in Bebas Neue, position, years active, short bio
- Framer Motion: stagger children on scroll with `staggerChildren: 0.1` in parent variant

### 3. Add dark mode toggle (15min)
- Wrap root layout `<body>` children in `<ThemeProvider attribute="class" defaultTheme="dark">`
- Add theme toggle button in Navbar (sun/moon icon from lucide-react)
- For now, the site is designed dark-first; light theme is a bonus -- define light overrides in `globals.css` under `.light` class if time permits, otherwise keep `forcedTheme="dark"`

### 4. Add loading states (15min)
- Create `loading.tsx` in: `squad/`, `player/[id]/`, `fixtures/`, `standings/`, `stats/`, `news/`, `profile/`
- Each shows skeleton matching page layout: use shadcn `Skeleton` component
- Squad loading: grid of skeleton cards. Fixtures: skeleton timeline items. Standings: skeleton table rows
- Keep skeletons consistent with final layout dimensions to avoid layout shift

### 5. Add error boundaries (15min)
- Create `error.tsx` in same route segments as loading
- Each: `'use client'`, display error message in glass card + "Try again" button calling `reset()`
- Style: centered, red accent border, friendly message ("Failed to load squad data. Please try again.")

### 6. Add SEO metadata (15min)
- Export `generateMetadata()` or `metadata` object from every `page.tsx`
- Homepage: title "Liverpool FC Fan Hub", description with keywords
- Dynamic pages (`/player/[id]`): title includes player name
- Open Graph: `og:title`, `og:description`, `og:image` (Anfield hero for homepage, player photo for player pages)
- Add `robots.txt` and `sitemap.xml` (static file in `/public` or generated)

### 7. Performance + animation polish (20min)
- Run Lighthouse audit; target 90+ performance score
- Ensure all images use `next/image` with appropriate `sizes` prop
- Lazy load below-fold components with `dynamic(() => import(...), { ssr: false })` where needed
- Review all Framer Motion: ensure `layout` animations don't trigger reflows, use `will-change: transform` where appropriate
- Add `prefers-reduced-motion` media query respect: wrap motion variants in check

### 8. Final Vercel deployment (10min)
- Push all changes, verify Vercel build succeeds
- Test all routes on production URL
- Verify ISR revalidation works (check response headers for `x-vercel-cache`)
- Confirm Supabase Auth works on production domain (update redirect URLs)

## Todo List
- [ ] Author trophies.json, history.json, legends.json
- [ ] Build TrophyCabinet, Timeline, LegendCard components
- [ ] Build /history page with 3 sections
- [ ] Add ThemeProvider + dark mode toggle in Navbar
- [ ] Create loading.tsx skeletons for all route segments
- [ ] Create error.tsx boundaries for all route segments
- [ ] Add generateMetadata to all pages + robots.txt + sitemap
- [ ] Lighthouse audit + image optimization pass
- [ ] Final animation polish + reduced motion support
- [ ] Production deploy + verify all routes

## Success Criteria
- `/history` renders trophies, timeline, legends from static data
- Loading skeletons appear during navigation/revalidation
- Error boundaries catch API failures gracefully with retry option
- All pages have proper `<title>` and Open Graph tags
- Lighthouse performance score >= 90 on production
- Dark mode toggle works (or forced dark if light theme deferred)

## Risk Assessment
- **Light theme time sink**: Keep `forcedTheme="dark"` if light CSS overrides take too long; dark-first is the design spec
- **Lighthouse images**: Unsplash hero may hurt LCP; consider self-hosting optimized hero image in `/public`
- **Sitemap staleness**: Static sitemap is fine since pages are fixed; dynamic generation not needed

## Security Considerations
- Static JSON data has no security surface
- `robots.txt` should disallow `/profile` and `/api/` paths
- Open Graph images should not leak any user data

## Unresolved Questions
- Light theme: build full light theme or keep dark-only for v1?
- Hero image: use Unsplash hotlink or download + self-host for reliability?
- RSS feeds: add Sky Sports RSS as secondary source, or BBC only for v1?
