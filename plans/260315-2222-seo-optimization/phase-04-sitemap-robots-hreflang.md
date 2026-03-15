# Phase 04 — Sitemap + Robots + Hreflang

> [<- Phase 03](./phase-03-structured-data.md) | [plan.md](./plan.md) | [Phase 05 ->](./phase-05-performance-cwv.md)

## Overview
| Field | Value |
|-------|-------|
| Date | 2026-03-15 |
| Priority | P1 |
| Effort | 2.5h |
| Status | pending |
| Review | - |
| Depends on | Phase 01 (for `getCanonical()`) |

Complete rewrite of sitemap to cover all dynamic routes (news articles, fixtures, digests, gallery). Improve robots.txt. Add hreflang xhtml links in sitemap for bilingual indexing.

## Key Insights
- Current sitemap: ~20 URLs (10 static + ~30 players). Missing hundreds of news articles, fixture detail pages, digest pages, gallery
- Google discovers pages via sitemap + internal links. Missing sitemap URLs = slower/missed indexing
- Sitemap `lastmod` currently uses `today` for all entries — should use actual data timestamps
- robots.txt is too permissive — allows crawling query params, wasting crawl budget
- hreflang in sitemap (xhtml namespace) is preferred by Google over HTML head tags for scalability
- Since site uses cookie-based i18n (not `/en/`, `/vi/` paths), hreflang alternates point to same URL — Google uses this as signal that page serves both languages

## Requirements
1. Sitemap includes ALL indexable dynamic routes:
   - `/news/[...slug]` — all active articles from DB
   - `/news/digest/[date]` — all generated digests
   - `/fixtures/[id]` — all fixture detail pages
   - `/player/[id]` — all players (already exists)
   - `/gallery` — single page
   - `/players` — directory page
2. `lastmod` uses actual data timestamps (article `published_at`, fixture `date`)
3. Sitemap includes `xhtml:link` hreflang alternates per URL
4. robots.txt blocks query params + adds crawl-delay hint
5. Sitemap respects 50,000 URL / 50MB limit (use sitemap index if needed)

## Architecture

### Sitemap Strategy

Estimated URL count: ~10 static + ~30 players + ~500 articles + ~30 digests + ~50 fixtures = ~620 URLs. Well under 50K limit — single sitemap file sufficient.

### Data Sources for Dynamic URLs

| Route | Data Source | `lastmod` field |
|-------|-----------|-----------------|
| Static routes | hardcoded | build date |
| `/player/[id]` | `getAllPlayers()` from `squad-data.ts` | fixed (squad rarely changes) |
| `/news/[...slug]` | Supabase `articles` table | `published_at` column |
| `/news/digest/[date]` | Supabase `news_digests` table | `generated_at` column |
| `/fixtures/[id]` | `getFixtures()` from football API | `fixture.date` |

### File Structure
- `src/app/sitemap.xml/route.ts` — complete rewrite
- `src/app/robots.txt/route.ts` — enhanced rules

## Related Code Files
- `src/app/sitemap.xml/route.ts` — rewrite target (44 lines currently)
- `src/app/robots.txt/route.ts` — enhance target (14 lines currently)
- `src/lib/squad-data.ts` — `getAllPlayers()` for player URLs
- `src/lib/news/db.ts` — query for all article URLs + publish dates
- `src/lib/news/digest.ts` — query for all digest dates
- `src/lib/football/index.ts` — `getFixtures()` for fixture IDs
- `src/lib/news-config.ts` — `encodeArticleSlug()` for news URL encoding
- `src/lib/supabase-server.ts` — server-side DB queries for sitemap

## Implementation Steps

### 1. Create sitemap data fetcher functions

Add to `src/lib/news/db.ts` (or new `src/lib/sitemap-data.ts`):
```ts
// Get all active article URLs + published dates for sitemap
export async function getArticleSitemapData(): Promise<{ link: string; published_at: string }[]>
```

Add to `src/lib/news/digest.ts`:
```ts
// Get all digest dates for sitemap
export async function getAllDigestDates(): Promise<{ date: string; generated_at: string }[]>
```

These should be lightweight queries: only SELECT the columns needed (link, date).

### 2. Rewrite `src/app/sitemap.xml/route.ts`

Full rewrite with:

**a) XML header with xhtml namespace**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
```

**b) Static routes** — hardcoded list with appropriate `changefreq` and `priority`

**c) Player URLs** — from `getAllPlayers()`, `lastmod` = fixed date (squad update date)

**d) News article URLs** — from DB query:
- Encode each article's `link` via `encodeArticleSlug(link)` to get `/news/{encoded-slug}`
- `lastmod` = `published_at`
- Skip articles older than 90 days (configurable) to keep sitemap fresh
- `changefreq: "never"` (articles don't change)

**e) Digest URLs** — from DB query:
- Format as `/news/digest/{YYYY-MM-DD}`
- `lastmod` = `generated_at`

**f) Fixture URLs** — from `getFixtures()`:
- Format as `/fixtures/{fixture.id}`
- `lastmod` = `fixture.date`
- Only include fixtures from current season

**g) Hreflang** on every `<url>` entry:
```xml
<xhtml:link rel="alternate" hreflang="vi" href="{url}" />
<xhtml:link rel="alternate" hreflang="en" href="{url}" />
<xhtml:link rel="alternate" hreflang="x-default" href="{url}" />
```
(Same URL for all since cookie-based i18n)

### 3. Update `src/app/robots.txt/route.ts`

Enhanced rules:
```
User-agent: *
Allow: /
Disallow: /profile
Disallow: /profile/
Disallow: /api/
Disallow: /auth/
Disallow: /chat
Disallow: /*?*

User-agent: GPTBot
Disallow: /

User-agent: ChatGPT-User
Disallow: /

User-agent: CCBot
Disallow: /

Sitemap: {SITE_URL}/sitemap.xml
```

Changes:
- `Disallow: /*?*` — prevent crawling filtered/paginated views
- `Disallow: /chat` — AI chat page has no SEO value
- Block AI scrapers (GPTBot, ChatGPT-User, CCBot) — protect content
- Trailing slash consistency for `/profile/`

### 4. Add caching headers to sitemap response
```ts
return new Response(xml, {
  headers: {
    "Content-Type": "application/xml",
    "Cache-Control": "public, max-age=3600, s-maxage=3600",
  },
});
```
Cache for 1 hour — balances freshness with server load on Vercel Hobby.

### 5. Error handling
- Wrap DB queries in try/catch — if Supabase is down, still serve static + player URLs
- Log errors but don't fail the entire sitemap

## Todo
- [ ] Add `getArticleSitemapData()` query to news DB layer
- [ ] Add `getAllDigestDates()` query to digest module
- [ ] Rewrite `src/app/sitemap.xml/route.ts` with all dynamic routes
- [ ] Add xhtml:link hreflang to all sitemap URLs
- [ ] Add `lastmod` from actual data timestamps
- [ ] Update `src/app/robots.txt/route.ts` with query param block + AI bot blocks
- [ ] Add cache headers to sitemap response
- [ ] Test sitemap validity with https://www.xml-sitemaps.com/validate-xml-sitemap.html
- [ ] Submit updated sitemap to Google Search Console

## Success Criteria
- Sitemap contains 500+ URLs (static + players + articles + fixtures + digests)
- All URLs in sitemap return 200 status
- `lastmod` reflects actual content dates, not just "today"
- robots.txt blocks `/api/`, `/auth/`, `/profile`, `/chat`, query params
- Google Search Console accepts sitemap without errors
- hreflang present on all sitemap entries

## Risk Assessment
- **Medium.** DB queries in sitemap generation could be slow on Vercel Hobby (cold start + query time). Mitigation: cache headers + limit article count to 500 most recent
- `encodeArticleSlug()` for hundreds of articles adds processing time. Mitigation: keep slug encoding simple, no external API calls
- Fixture API rate limit (10 req/min on free tier). Mitigation: `getFixtures()` is `React.cache()`'d and ISR-cached — should hit cache, not fresh API call
- If article URLs in DB are malformed, sitemap could have bad `<loc>` entries. Mitigation: validate URLs before inclusion

## Security Considerations
- Sitemap exposes all public URLs — acceptable, these are meant to be indexed
- robots.txt AI bot blocks are advisory only — determined scrapers may ignore
- No auth tokens or secrets in sitemap/robots responses

## Next Steps
Phase 05 addresses Core Web Vitals for the performance ranking signal.
