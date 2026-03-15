# Phase 05 — Core Web Vitals & Performance

> [<- Phase 04](./phase-04-sitemap-robots-hreflang.md) | [plan.md](./plan.md)

## Overview
| Field | Value |
|-------|-------|
| Date | 2026-03-15 |
| Priority | P2 |
| Effort | 2h |
| Status | pending |
| Review | - |
| Depends on | None (independent of other phases) |

Optimize Core Web Vitals (LCP, INP, CLS) as Google ranking signals. Focus on image optimization, lazy loading, bundle size, and render-blocking resources. Site is SSR/SSG on Vercel — likely already decent, but needs audit and targeted fixes.

## Key Insights
- CWV thresholds: LCP <= 2.5s, INP <= 200ms, CLS <= 0.1
- Only 55.7% of sites pass all three (Jan 2026 CrUX) — passing gives competitive edge
- Fonts already use `display: swap` + latin+vietnamese subsets — good
- `next/image` used throughout but need to verify `priority` on LCP elements
- Recharts (stats page) + Framer Motion (animations) are heavy client bundles — lazy load
- Cloudinary images should use responsive transforms for gallery
- Several pages use `dynamic = "force-dynamic"` — prevents static optimization. Review necessity

## Requirements
1. LCP < 2.5s on homepage, squad, news pages (most-visited)
2. CLS < 0.1 — all images have explicit width/height or aspect-ratio
3. INP < 200ms — no heavy JS blocking interaction
4. Bundle size audit — target < 200kB initial JS
5. Image alt text strategy for SEO image search

## Related Code Files
- `src/app/page.tsx` — homepage, likely LCP target
- `src/components/home/hero.tsx` — hero image (LCP candidate)
- `src/app/stats/page.tsx` — Recharts heavy client bundle
- `src/app/gallery/page.tsx` — Cloudinary images
- `src/components/gallery/gallery-page.tsx` — image rendering
- `src/components/squad/player-card.tsx` — player photos in grid
- `src/components/news/news-feed.tsx` — news card images
- `src/components/chat/global-chat.tsx` — floating chat widget
- `next.config.ts` — image domains, bundle config
- `package.json` — for dependency audit

## Implementation Steps

### 1. Audit current Lighthouse scores
Run Lighthouse on key pages before making changes (baseline):
- Homepage (`/`)
- Squad (`/squad`)
- News (`/news`)
- Player detail (`/player/mohamed-salah`)
- Stats (`/stats`)

Record: Performance score, LCP, INP, CLS, Total Blocking Time, bundle sizes.

### 2. Image optimization audit

**a) LCP images — add `priority`**
- Homepage hero: verify `<Image priority>` is set on the main hero image
- News article hero: already has `priority` (verified in `/news/[...slug]`)
- Player detail hero: already has `priority` (verified)

**b) Below-fold images — ensure `loading="lazy"`**
- News feed cards: verify `loading="lazy"` (next/image default)
- Squad player cards: verify `loading="lazy"`
- Gallery grid: verify lazy loading
- Related articles: verify lazy loading

**c) Explicit dimensions**
- Audit all `<Image>` usage for explicit `width`/`height` or `fill` + `sizes`
- Check `<img>` tags (if any) for missing dimensions → CLS risk
- Background images via `style={{ backgroundImage }}` — ensure container has fixed height (`min-h-[320px]` etc.)

**d) Image alt text strategy**
- Player cards: `alt={player.name}` — good
- Gallery images: `alt={img.alt}` — verify alt text quality in gallery data
- News hero images: currently `alt={content.title}` — good
- Trophy images: verify descriptive alt text
- Decorative images: use `alt=""` + `aria-hidden="true"` (stadium backgrounds)

### 3. Lazy-load heavy client components

**a) Recharts on `/stats`**
```tsx
import dynamic from "next/dynamic";
const StatChart = dynamic(() => import("@/components/stats/stat-chart"), { ssr: false });
const GoalsByMonthChart = dynamic(() => import("@/components/stats/goals-by-month-chart"), { ssr: false });
const HomeAwayChart = dynamic(() => import("@/components/stats/home-away-chart"), { ssr: false });
```
This prevents Recharts (~60kB) from loading on non-stats pages.

**b) GlobalChat component**
Already rendered in layout — check if it uses `dynamic()` import. If not, wrap:
```tsx
const GlobalChat = dynamic(() => import("@/components/chat/global-chat").then(m => ({ default: m.GlobalChat })), { ssr: false });
```
Chat is only used when clicked — no need to load JS upfront.

**c) Framer Motion**
- Check if `framer-motion` is tree-shaken properly
- Use `LazyMotion` + `domAnimation` feature bundle instead of full `motion` import where possible:
```tsx
import { LazyMotion, domAnimation, m } from "framer-motion";
```
This reduces framer-motion bundle from ~30kB to ~5kB.

### 4. Review `force-dynamic` usage

Pages currently using `dynamic = "force-dynamic"`:
- `/fixtures` — needed (live data)
- `/standings` — could use `revalidate = 21600` (6h) instead
- `/stats` — could use `revalidate = 3600` (1h) instead
- `/history` — should be fully static, `force-dynamic` unnecessary
- `/news` — needed (fresh from DB)
- `/news/[...slug]` — needed (scrapes on demand)

**Action:** Remove `force-dynamic` from `/history` (pure static JSON). Change `/standings` and `/stats` to ISR with appropriate `revalidate`.

### 5. Bundle size audit

```bash
npm run build
# Check .next/analyze/ output or use:
npx @next/bundle-analyzer
```

Targets:
- First Load JS < 200kB
- Per-page JS delta < 50kB for content pages
- Identify any duplicate dependencies

### 6. Font optimization
- Fonts already optimized (`display: swap`, google fonts with subset)
- Verify only needed weights are loaded (Inter: 300-700 = 5 weights — consider dropping 300 if unused)
- Check if Barlow Condensed loads Vietnamese subset (it should for diacritics in labels)

### 7. Preconnect hints
Add to `src/app/layout.tsx` `<head>`:
```tsx
<link rel="preconnect" href="https://res.cloudinary.com" />
<link rel="dns-prefetch" href="https://res.cloudinary.com" />
```
Cloudinary images are loaded on many pages — preconnect speeds up first image load.

## Todo
- [ ] Run Lighthouse baseline on 5 key pages, record scores
- [ ] Audit all `<Image>` components for `priority` / `loading` / dimensions
- [ ] Lazy-load Recharts components on `/stats` via `next/dynamic`
- [ ] Lazy-load GlobalChat if not already dynamic
- [ ] Review Framer Motion imports — switch to `LazyMotion` where possible
- [ ] Remove `force-dynamic` from `/history`, use ISR for `/standings` + `/stats`
- [ ] Run bundle analyzer, identify oversized chunks
- [ ] Add Cloudinary preconnect hint to layout
- [ ] Audit image alt text quality across the site
- [ ] Re-run Lighthouse after changes, compare to baseline

## Success Criteria
- Lighthouse Performance >= 90 on homepage and content pages
- LCP < 2.5s on mobile (3G throttled)
- CLS < 0.1 — no layout shifts from images, fonts, or dynamic content
- INP < 200ms — no blocking JS on interaction
- First Load JS < 200kB for content pages
- All images have meaningful alt text (not empty, not generic)

## Risk Assessment
- **Low-Medium.** Lazy loading changes could affect UX if loading states aren't handled (skeleton/fallback needed)
- Removing `force-dynamic` from history page is safe (pure static data)
- Changing standings/stats to ISR could show stale data briefly — acceptable for 1-6h revalidation
- Bundle analyzer may reveal unexpected large dependencies — may need deeper investigation

## Security Considerations
- None. Performance optimizations don't affect security surface
- Preconnect hints are to trusted CDN (Cloudinary)

## Unresolved Questions
- Current Lighthouse score baseline? (Need to run before implementing)
- Is Cloudinary CDN fully leveraged for responsive image transforms (`f_auto,q_auto,w_{size}`)?
- Are there any third-party scripts (analytics, ads) affecting CWV? Need to check
- Is `@next/bundle-analyzer` already installed as dev dependency?
