# Phase 02: News Page UI Redesign

## Context
- Parent plan: [plan.md](./plan.md)
- Depends on: Phase 01 (multi-source backend)
- Current: `src/app/news/page.tsx` — server component, hero banner, 2-col text-only grid

## Overview
- Date: 2026-03-05
- Priority: High
- Status: Pending
- Effort: 2h

## Key Insights
- User chose: Hero + Grid + Compact List layout, NO category filtering
- Need language badges (EN/VN) and source badges on each card
- Image fallback: LFC gradient placeholder when no thumbnail
- Client component for rendering (server fetches data)
- Same pattern as squad-tabs: server fetches → client renders

## Requirements
1. Hero article: full-width, image with gradient overlay, title, source+language badge
2. Medium cards: thumbnail + title + source badge + language badge + time (2-col grid)
3. Compact list: older articles, no image, title + source + time
4. Source badges with color coding per source
5. Language badges: 🇬🇧 EN / 🇻🇳 VN (or text badges)
6. Responsive: 1-col mobile, 2-col tablet+
7. Image fallback gradient when no thumbnail
8. Updated loading skeleton
9. All links open new tab (external)
10. NO category/source filtering tabs

## Architecture

### Component Split
```
src/app/news/page.tsx            (Server) — fetch getNews(), render shell + NewsFeed
src/components/news/news-feed.tsx (Client) — receives articles[], renders cards
src/app/news/loading.tsx          (Server) — updated skeleton
```

### Layout Structure
```
Hero Banner (background image, title "Latest News")
│
News Feed
├── Hero Article (first article, full-width, image overlay)
├── Secondary Grid (next 6 articles, 2-col, medium cards with thumbnails)
├── Compact List (remaining articles, no images)
└── Attribution footer (lists all sources)
```

### Card Variants (inline in news-feed.tsx, not separate files)

**Hero Card** — first article
```
┌─────────────────────────────────────────┐
│ [Image 16:9, gradient overlay]          │
│                                         │
│  🇬🇧 BBC · 2h ago                      │
│  Article Title (2xl, white, bold)       │
│  Snippet (sm, muted, line-clamp-2)     │
└─────────────────────────────────────────┘
```

**Medium Card** — articles 2-7
```
┌───────────────────────────┐
│ [Thumbnail 16:9]          │
│ 🇻🇳 Bongda · 3h ago       │
│ Title (sm, semibold)       │
└───────────────────────────┘
```

**Compact Item** — articles 8+
```
🇬🇧 BBC · Title truncated to one line · 2d ago  →
```

### Image Fallback
```tsx
// When no thumbnail
<div className="w-full aspect-video bg-gradient-to-br from-lfc-red/20 to-stadium-bg
  flex items-center justify-center">
  <Newspaper className="w-8 h-8 text-stadium-muted" />
</div>
```

### Source + Language Badge
```tsx
function ArticleBadge({ source, language }: { source: NewsSource; language: NewsLanguage }) {
  const cfg = SOURCE_CONFIG[source];
  return (
    <span className={`font-barlow text-[10px] uppercase tracking-wider px-1.5 py-0.5 ${cfg.color}`}>
      {language === 'vi' ? '🇻🇳' : '🇬🇧'} {cfg.label}
    </span>
  );
}
```

## Related Files

| File | Action | Notes |
|------|--------|-------|
| `src/app/news/page.tsx` | **Modify** | Simplify to server shell + NewsFeed |
| `src/app/news/loading.tsx` | **Modify** | Update skeleton for new layout |
| `src/components/news/news-feed.tsx` | **Create** | Client component: card rendering |

## Implementation Steps

### Step 1: Create `src/components/news/news-feed.tsx`
- `'use client'` directive
- Import types from `@/lib/rss-parser`
- Import `Image`, `ExternalLink`, `Clock`, `Newspaper` from lucide-react
- Props: `{ articles: NewsArticle[] }`

### Step 2: Implement card variants
- HeroArticleCard: `aspect-video`, `next/image` fill if thumbnail, gradient fallback
- MediumCard: thumbnail top, title + badge below
- CompactItem: horizontal row, badge + title + time + arrow icon
- All wrapped in `<a target="_blank">`

### Step 3: Implement layout logic
- `articles[0]` → Hero card (full-width)
- `articles.slice(1, 7)` → 2-col grid of medium cards
- `articles.slice(7)` → compact list
- Empty state when no articles

### Step 4: Update `src/app/news/page.tsx`
- Keep hero banner (background + title)
- Replace inline article rendering with `<NewsFeed articles={articles} />`
- Update attribution to list all sources

### Step 5: Update `src/app/news/loading.tsx`
- Skeleton: hero card (full-width aspect-video) + 2-col grid (6 cards) + list rows (4)

## Success Criteria
- Hero article displays with image or gradient fallback
- Source + language badges on every card
- Images render from multiple sources
- Responsive: 1-col mobile, 2-col desktop
- All links open new tab
- Loading skeleton matches layout
- Build passes

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| RSS images blocked by next/image | Medium | Add domains in Phase 01; unoptimized fallback |
| Too few articles from VN sources | Low | Mix with EN sources, hero picks most recent regardless |
| Image loading slow for VN CDNs | Low | `loading="lazy"` on non-hero images |
