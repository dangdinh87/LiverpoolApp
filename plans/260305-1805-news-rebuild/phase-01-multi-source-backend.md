# Phase 01: Multi-Source Backend (RSS + Scraping)

## Context
- Parent plan: [plan.md](./plan.md)
- Current: `src/lib/rss-parser.ts` — single BBC RSS, `rss-parser` package, `React.cache()`
- Need: 5 sources (3 RSS, 1 RSS+filter, 1 scraping), EN+VN, images, language badge

## Overview
- Date: 2026-03-05
- Priority: High
- Status: Complete (reviewed 2026-03-05)
- Effort: 2h

## Key Insights
- Bongda.com.vn has LFC-specific RSS: `bongda.com.vn/liverpool.rss`
- 24h.com.vn has general football RSS — filter by "Liverpool" keyword
- Bongdaplus.vn has no RSS — need HTML scraping (cheerio)
- BBC: `media:thumbnail` tag (sometimes). Sky/Guardian: `enclosure`/`media:content` (reliable)
- VN RSS feeds may use different image tag formats — need defensive extraction

## Requirements
1. Fetch 5 sources in parallel via `Promise.allSettled`
2. RSS: BBC, Guardian, Bongda.com.vn, 24h.com.vn (filtered)
3. Scraping: Bongdaplus.vn Liverpool page
4. Extract images from RSS media tags + scraping
5. Add `source`, `language` fields to `NewsArticle`
6. Deduplicate by URL
7. Sort by pubDate descending
8. Graceful per-source failure
9. Keep mock fallback

## Architecture

### Updated NewsArticle Type
```typescript
export type NewsSource = 'bbc' | 'guardian' | 'bongda' | '24h' | 'bongdaplus';
export type NewsLanguage = 'en' | 'vi';

export interface NewsArticle {
  title: string;
  link: string;
  pubDate: string;
  contentSnippet: string;
  thumbnail?: string;
  source: NewsSource;
  language: NewsLanguage;
}

export const SOURCE_CONFIG: Record<NewsSource, { label: string; color: string; language: NewsLanguage }> = {
  bbc: { label: 'BBC', color: 'bg-[#BB1919]/20 text-[#FF6B6B]', language: 'en' },
  guardian: { label: 'Guardian', color: 'bg-[#052962]/20 text-[#6B9AFF]', language: 'en' },
  bongda: { label: 'Bongda', color: 'bg-emerald-500/20 text-emerald-400', language: 'vi' },
  '24h': { label: '24h', color: 'bg-orange-500/20 text-orange-400', language: 'vi' },
  bongdaplus: { label: 'BĐ+', color: 'bg-sky-500/20 text-sky-400', language: 'vi' },
};
```

### Feed Configuration
```typescript
const RSS_FEEDS: { url: string; source: NewsSource; language: NewsLanguage; filter?: string }[] = [
  { url: 'https://feeds.bbci.co.uk/sport/football/teams/liverpool/rss.xml', source: 'bbc', language: 'en' },
  { url: 'https://www.theguardian.com/football/liverpool/rss', source: 'guardian', language: 'en' },
  { url: 'https://bongda.com.vn/liverpool.rss', source: 'bongda', language: 'vi' },
  { url: 'https://cdn.24h.com.vn/upload/rss/bongda.rss', source: '24h', language: 'vi', filter: 'liverpool' },
];
```

### Scraping: Bongdaplus.vn
```typescript
// Fetch HTML from bongdaplus.vn/liverpool, parse with cheerio
// Extract: title, link, thumbnail, date from article list
// cheerio is lightweight, no browser needed
// Fallback: return [] on any error
```

## Related Files

| File | Action | Notes |
|------|--------|-------|
| `src/lib/rss-parser.ts` | **Rewrite** | Multi-source fetch, new types, image extraction, scraping |
| `next.config.ts` | **Modify** | Add image domains for all sources |
| `package.json` | **Modify** | Add `cheerio` for HTML scraping |

## Implementation Steps

### Step 1: Install cheerio
- `npm install cheerio` (lightweight HTML parser, ~200KB)
- Add types: `@types/cheerio` if needed (cheerio v1.0+ has built-in types)

### Step 2: Update NewsArticle type + constants
- Add `NewsSource`, `NewsLanguage` types
- Add `source`, `language` to `NewsArticle`
- Export `SOURCE_CONFIG` map for UI consumption
- Define `RSS_FEEDS` config array

### Step 3: Multi-format image extraction
- `extractImage(item)` checks: `media:thumbnail` → `enclosure` → `media:content`
- Add `customFields` to rss-parser for all 3 tag types
- VN sites may use different tags — defensive extraction with type guards

### Step 4: RSS fetch helper
- `fetchRssFeed(config)`: fetch one RSS feed, map to `NewsArticle[]`
- Apply optional `filter` (24h: only keep articles with "liverpool" in title)
- Per-source try/catch, log warning on failure

### Step 5: Bongdaplus scraper
- `scrapeBongdaplus()`: fetch HTML, parse with cheerio
- Extract article list: `.article-item` or similar selector (verify at runtime)
- Map to `NewsArticle[]` with source='bongdaplus', language='vi'
- Fallback: return [] on any error (fragile by nature)

### Step 6: Merge, dedup, sort
- `getNews(limit)`: `Promise.allSettled` on all RSS feeds + scraper
- Flatten results, dedup by normalized URL
- Sort by `pubDate` descending, slice to limit

### Step 7: Update mock fallback
- Add `source` and `language` fields to mock articles
- Mix EN and VN mock data

### Step 8: Update next.config.ts
- Add remote patterns: `ichef.bbci.co.uk`, `i.guim.co.uk`, `media.guim.co.uk`
- Add VN domains: `bongda.com.vn`, `cdn.24h.com.vn`, `bongdaplus.vn`, `image.bongdaplus.vn`

## Success Criteria
- `getNews()` returns articles from multiple sources
- Each article has `source` and `language` populated
- Images extracted where available
- Single source failure doesn't break everything
- Bongdaplus scraping works (or gracefully returns [])
- 24h articles filtered to Liverpool-related only
- Build passes, no TypeScript errors

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Bongdaplus HTML structure changes | Medium | try/catch, return [], log warning |
| Bongda.com.vn RSS format unexpected | Low | Standard rss-parser handles most formats |
| 24h filter misses articles | Low | Acceptable — supplement, not primary |
| cheerio adds bundle size | Low | Server-only, no client impact |
| VN image URLs blocked by next/image | Medium | Add domains; fallback to unoptimized |
