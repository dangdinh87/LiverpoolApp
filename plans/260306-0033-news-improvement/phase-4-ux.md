# Phase 4: UX Enhancements

## Context
- [plan.md](./plan.md) | Depends on [Phase 1](./phase-1-architecture.md), [Phase 2](./phase-2-pipeline.md), [Phase 3](./phase-3-readability.md)
- Current UX: flat list of 20 articles (hero + 6 medium + compact), no pagination, no filtering, no sharing
- Phase 2 adds `category` field; Phase 3 adds `readingTime`

## Overview
Add Load More pagination, category filter tabs via URL searchParams, Web Share API, reading time display, improved keyword-based related articles, article bookmarks via Supabase, and enhanced news card design.

## Key Insights
- Load More > infinite scroll: simpler, SEO-friendly, works without JS (initial render is SSR)
- Category filter via URL params (`/news?category=transfer`) — shareable, SSR-compatible
- Web Share API available on mobile + modern desktop; fallback to copy-to-clipboard
- Bookmarks require auth — reuse existing Supabase RLS pattern from `favourite_players` table
- Related articles: current implementation just takes next 4 articles. Keyword overlap is cheap to compute on server

## Requirements
1. Load More: initial 12 articles, +8 per click, server action or client-side slice
2. Category filter tabs: All, Match Reports, Transfers, Injuries, Team News, Analysis
3. Web Share API + copy link fallback on article detail page
4. Reading time badge on article cards and detail page
5. Keyword-based related articles (title word overlap scoring)
6. Article bookmarks (Supabase `bookmarked_articles` table + RLS)
7. Enhanced news card: category badge, reading time, subtle hover animations

## Architecture

### Load More Strategy
Server-fetch all articles (up to 50), pass to client component. Client manages visible count via `useState`. No extra API calls.

```typescript
// news/page.tsx — fetch more upfront
const articles = await getNews(50); // up from 20

// news-feed.tsx — client-side pagination
const [visibleCount, setVisibleCount] = useState(12);
const visible = articles.slice(0, visibleCount);
const hasMore = visibleCount < articles.length;
```

### Category Filter
```
/news                    → all articles
/news?category=transfer  → only transfer articles
/news?category=injury    → only injury articles
```

Server component reads searchParams, passes filtered articles to client:
```typescript
// news/page.tsx
type SearchParams = Promise<{ category?: string }>;

export default async function NewsPage({ searchParams }: { searchParams: SearchParams }) {
  const { category } = await searchParams;
  let articles = await getNews(50);

  if (category && category !== "all") {
    articles = articles.filter((a) => a.category === category);
  }

  return <NewsFeed articles={articles} activeCategory={category ?? "all"} />;
}
```

Category tabs (client component):
```typescript
// components/news/category-tabs.tsx
const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "match-report", label: "Match Reports" },
  { value: "transfer", label: "Transfers" },
  { value: "injury", label: "Injuries" },
  { value: "team-news", label: "Team News" },
  { value: "analysis", label: "Analysis" },
  { value: "opinion", label: "Opinion" },
];

export function CategoryTabs({ active }: { active: string }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {CATEGORIES.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => {
            const params = new URLSearchParams();
            if (value !== "all") params.set("category", value);
            router.push(`${pathname}?${params.toString()}`);
          }}
          className={cn(
            "font-barlow text-xs uppercase tracking-wider px-3 py-1.5 whitespace-nowrap border transition-colors",
            active === value
              ? "border-lfc-red text-lfc-red bg-lfc-red/10"
              : "border-stadium-border text-stadium-muted hover:border-lfc-red/40"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
```

### Web Share API
```typescript
// components/news/share-button.tsx
"use client";

export function ShareButton({ title, url }: { title: string; url: string }) {
  const fullUrl = `${process.env.NEXT_PUBLIC_SITE_URL}${url}`;

  async function handleShare() {
    if (navigator.share) {
      await navigator.share({ title, url: fullUrl });
    } else {
      await navigator.clipboard.writeText(fullUrl);
      // toast: "Link copied!"
    }
  }

  return (
    <button onClick={handleShare} className="...">
      <Share2 className="w-4 h-4" /> Share
    </button>
  );
}
```

### Bookmarks — Supabase Table
```sql
-- Supabase migration
CREATE TABLE bookmarked_articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  article_url TEXT NOT NULL,
  article_title TEXT NOT NULL,
  article_thumbnail TEXT,
  article_source TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE bookmarked_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own bookmarks" ON bookmarked_articles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own bookmarks" ON bookmarked_articles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own bookmarks" ON bookmarked_articles
  FOR DELETE USING (auth.uid() = user_id);

-- Index
CREATE INDEX idx_bookmarks_user ON bookmarked_articles(user_id);

-- Unique constraint (no double-bookmarks)
CREATE UNIQUE INDEX idx_bookmarks_unique ON bookmarked_articles(user_id, article_url);
```

### Bookmark Button Component
Reuse pattern from `FavouriteButton` component:
```typescript
// components/news/bookmark-button.tsx
"use client";

export function BookmarkButton({ articleUrl, articleTitle, ... }: Props) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  // Check if bookmarked on mount (supabase query)
  // Toggle on click (insert/delete)
  // Optimistic UI update
}
```

### Related Articles (keyword-based)
```typescript
// In news/[slug]/page.tsx or utility function
function getRelatedArticles(current: NewsArticle, all: NewsArticle[], count = 4): NewsArticle[] {
  const currentWords = new Set(
    current.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
  );

  return all
    .filter((a) => a.link !== current.link)
    .map((a) => {
      const words = a.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      const overlap = words.filter((w) => currentWords.has(w)).length;
      return { article: a, score: overlap };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((r) => r.article);
}
```

### Enhanced Card Design
- Add category badge (small colored chip) to MediumCard and HeroCard
- Add reading time next to date ("3 min read")
- Subtle red left-border accent on hover for CompactItem
- Lazy-load images with blur placeholder

## Related Code Files
- `src/app/news/page.tsx` — add searchParams, pass category filter
- `src/app/news/[slug]/page.tsx` — share button, bookmark button, reading time, related articles
- `src/components/news/news-feed.tsx` — Load More, category tabs, enhanced cards
- `src/components/news/category-tabs.tsx` — NEW
- `src/components/news/share-button.tsx` — NEW
- `src/components/news/bookmark-button.tsx` — NEW
- `src/lib/news/types.ts` — ensure category + readingTime exported
- `src/lib/news-config.ts` — add category label/color config
- Supabase migration: `bookmarked_articles` table

## Implementation Steps

### Step 1: Load More pagination
- Update `news/page.tsx`: `getNews(50)` instead of `getNews(20)`
- Update `news-feed.tsx`: add `visibleCount` state, `Load More` button
- Style button consistent with design system

### Step 2: Category filter tabs
- Create `components/news/category-tabs.tsx`
- Update `news/page.tsx` to read `searchParams.category`
- Add `category` label config to `news-config.ts` (client-safe)
- Server-side filter articles before passing to feed

### Step 3: Web Share API
- Create `components/news/share-button.tsx`
- Add to `news/[slug]/page.tsx` header area (near source badge)
- Clipboard fallback with toast notification (reuse shadcn toast or simple state)

### Step 4: Reading time display
- Add `readingTime` to card components (MediumCard, HeroCard badges)
- Add reading time badge to article detail page header
- Format: "3 min read"

### Step 5: Enhanced news cards
- Add category badge to MediumCard (small chip below source badge)
- Update HeroCard overlay with category + reading time
- CompactItem: add subtle left-border accent on hover
- Use `blur` placeholder for lazy images where supported

### Step 6: Keyword-based related articles
- Replace current `articles.filter().slice(0, 4)` with word-overlap scoring
- Extract helper function for reuse

### Step 7: Bookmarks (Supabase)
- Create Supabase migration (SQL above)
- Create `components/news/bookmark-button.tsx` following `FavouriteButton` pattern
- Add to article detail page header area
- Add bookmarks list to `/profile` page (alongside favourite players)
- Query bookmarks on profile page via Supabase client

### Step 8: Build + verify
- `npm run build`
- Test: Load More, category filtering, share, bookmarks
- Test: logged out users see share but not bookmark
- Mobile test: Web Share API triggers native share sheet

## Todo List
- [ ] Implement Load More pagination in news-feed.tsx
- [ ] Create category-tabs.tsx component
- [ ] Add searchParams category filter to news/page.tsx
- [ ] Create share-button.tsx with Web Share API
- [ ] Add reading time to cards + detail page
- [ ] Enhance card designs (category badge, hover effects)
- [ ] Implement keyword-based related articles
- [ ] Create Supabase `bookmarked_articles` table + RLS
- [ ] Create bookmark-button.tsx component
- [ ] Add bookmarks section to /profile page
- [ ] Build + cross-browser test

## Success Criteria
- Load More button appears after 12 articles, loads 8 more per click
- Category tabs filter articles; URL is shareable (`/news?category=transfer`)
- Share button works on mobile (native sheet) and desktop (clipboard)
- Reading time shown on cards and detail page
- Related articles are contextually relevant (keyword overlap > random)
- Bookmarks persist per user; visible on profile page
- All animations smooth (no layout shift)

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| 50 articles = slow ISR build | Low | Medium | ISR only fetches RSS feeds + OG meta for top 7; no full scrape |
| Category filter reduces results to 0 | Medium | Low | Show "No articles in this category" empty state |
| Supabase free tier storage for bookmarks | Low | Low | Minimal data per row (~200 bytes); thousands of users fine |
| Web Share API not available on older browsers | Low | Low | Clipboard fallback always works |

## Security Considerations
- Bookmark `article_url` is user-influenced (from base64 slug) — validate URL format before insert
- RLS ensures users only see/modify own bookmarks
- Share button uses `NEXT_PUBLIC_SITE_URL` (not user input)
- No XSS risk in category tabs (values are hardcoded enum)

## Next Steps
Phase 5 adds unit tests for pipeline components (dedup, relevance, categories) and snapshot tests for UI components.
