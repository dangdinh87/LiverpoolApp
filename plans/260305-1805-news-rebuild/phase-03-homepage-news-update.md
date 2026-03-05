# Phase 03: Homepage News Section Update

## Context
- Parent plan: [plan.md](./plan.md)
- Depends on: Phase 01 (types), Phase 02 (patterns)
- Current: `src/components/home/news-section.tsx` — 3-col title-only cards, framer-motion

## Overview
- Date: 2026-03-05
- Priority: Medium
- Status: Pending
- Effort: 1h

## Key Insights
- Component already `'use client'` with framer-motion — no architecture change
- Homepage calls `getNews(6)` — 6 articles, good for this section
- After Phase 01: articles have `source`, `language`, `thumbnail`
- Reuse badge pattern from Phase 02

## Requirements
1. Featured card (first article): span 2 cols, image, snippet
2. Remaining 5 cards: small thumbnail + title + source badge
3. Source + language badges on each card
4. Image fallback gradient
5. Keep framer-motion stagger animation
6. Keep "All News" link
7. Responsive: 1-col mobile, 2-col sm, 3-col lg

## Related Files

| File | Action | Notes |
|------|--------|-------|
| `src/components/home/news-section.tsx` | **Modify** | Add images, badges, featured layout |

## Implementation Steps

### Step 1: Update card layout
- First article: `lg:col-span-2`, `aspect-video` image area, gradient overlay
- Remaining: standard cards with thumbnail (aspect-video, ~120px height)
- `next/image` for thumbnails, gradient fallback div

### Step 2: Add badges
- Import `SOURCE_CONFIG` from `@/lib/rss-parser`
- Inline badge component (same pattern as Phase 02)
- Show below thumbnail, next to relative time

### Step 3: Update section header
- Change "BBC Sport" to "Latest News" (multi-source now)
- Keep "All News →" link

### Step 4: Verify animations preserved
- Keep `motion.div` / `motion.a` wrappers
- Stagger delay: `delay: i * 0.06`

## Success Criteria
- Featured card with image spans 2 cols on desktop
- All cards show source + language badge
- Thumbnails render or fallback gracefully
- Animations preserved
- Responsive layout works
- Build passes

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Featured card image missing | Low | Gradient fallback looks intentional |
| Image loading slows homepage LCP | Medium | `loading="lazy"` on non-featured, `sizes` prop |
