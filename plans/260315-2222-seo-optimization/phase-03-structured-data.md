# Phase 03 — Structured Data (JSON-LD)

> [<- Phase 02](./phase-02-metadata-optimization.md) | [plan.md](./plan.md) | [Phase 04 ->](./phase-04-sitemap-robots-hreflang.md)

## Overview
| Field | Value |
|-------|-------|
| Date | 2026-03-15 |
| Priority | P1 |
| Effort | 3h |
| Status | done |
| Review | 8.5/10 → approved |
| Depends on | Phase 01 |

Add per-page JSON-LD structured data across all content pages. Highest SEO impact phase — enables Google Rich Results (news carousels, breadcrumbs, event snippets, knowledge panels).

## Key Insights
- Root layout already has WebSite + SportsTeam + Organization JSON-LD — these stay
- Per-page JSON-LD should be rendered inside each page component (not layout) so it's page-specific
- Google validates structured data at page level; multiple JSON-LD blocks per page are fine
- `NewsArticle` schema produces news carousel eligibility in Google SERP
- `BreadcrumbList` produces breadcrumb trail in SERP snippets
- `SportsEvent` produces event rich results with date/teams
- `Person` helps knowledge panel association for player pages

## Requirements
1. `BreadcrumbList` on ALL pages (except homepage)
2. `NewsArticle` on `/news/[...slug]` and `/news/digest/[date]`
3. `SportsEvent` on `/fixtures/[id]` (individual match detail)
4. `Person` on `/player/[id]`
5. `ImageGallery` on `/gallery`
6. All JSON-LD uses builders from Phase 01 + `JsonLd` component

## Architecture

Each page component adds `<JsonLd data={...} />` in its JSX tree. Data is built server-side using the builders.

### Breadcrumb Structure

| Page | Breadcrumb Path |
|------|----------------|
| `/squad` | Home > Squad |
| `/player/[id]` | Home > Squad > {Player Name} |
| `/fixtures` | Home > Fixtures |
| `/fixtures/[id]` | Home > Fixtures > {Home vs Away} |
| `/standings` | Home > Standings |
| `/news` | Home > News |
| `/news/[...slug]` | Home > News > {Article Title} |
| `/news/digest/[date]` | Home > News > Digest > {Date} |
| `/stats` | Home > Stats |
| `/history` | Home > History |
| `/gallery` | Home > Gallery |
| `/about` | Home > About |

## Related Code Files
- `src/components/seo/json-ld.tsx` — from Phase 01
- `src/lib/seo.ts` — all builder functions from Phase 01
- `src/app/news/[...slug]/page.tsx` — add NewsArticle + Breadcrumb
- `src/app/news/digest/[date]/page.tsx` — add NewsArticle + Breadcrumb
- `src/app/player/[id]/page.tsx` — add Person + Breadcrumb
- `src/app/fixtures/[id]/page.tsx` — add SportsEvent + Breadcrumb
- `src/app/gallery/page.tsx` — add ImageGallery + Breadcrumb
- `src/app/squad/page.tsx` — add Breadcrumb
- `src/app/fixtures/page.tsx` — add Breadcrumb
- `src/app/standings/page.tsx` — add Breadcrumb
- `src/app/news/page.tsx` — add Breadcrumb
- `src/app/stats/page.tsx` — add Breadcrumb
- `src/app/history/page.tsx` — add Breadcrumb
- `src/app/about/page.tsx` — add Breadcrumb

## Implementation Steps

### 1. BreadcrumbList on all section pages (8 pages)
Add to each page's JSX, right after `<div className="min-h-screen">`:
```tsx
import { JsonLd } from "@/components/seo/json-ld";
import { buildBreadcrumbJsonLd, getCanonical } from "@/lib/seo";

// Inside page component:
<JsonLd data={buildBreadcrumbJsonLd([
  { name: "Home", url: getCanonical("/") },
  { name: "Squad", url: getCanonical("/squad") },
])} />
```

Pages: `/squad`, `/fixtures`, `/standings`, `/news`, `/stats`, `/history`, `/gallery`, `/about`

### 2. NewsArticle on `/news/[...slug]/page.tsx`
After fetching `content` from `scrapeArticle(url)`:
```tsx
<JsonLd data={[
  buildBreadcrumbJsonLd([
    { name: "Home", url: getCanonical("/") },
    { name: "News", url: getCanonical("/news") },
    { name: content.title, url: getCanonical(`/news/${slug.join("/")}`) },
  ]),
  buildNewsArticleJsonLd({
    title: content.title,
    description: content.description || content.paragraphs[0]?.slice(0, 160),
    url: getCanonical(`/news/${slug.join("/")}`),
    image: content.heroImage,
    author: content.author,
    publishedAt: content.publishedAt,
    sourceName: content.sourceName,
  }),
]} />
```

### 3. NewsArticle on `/news/digest/[date]/page.tsx`
```tsx
<JsonLd data={[
  buildBreadcrumbJsonLd([
    { name: "Home", url: getCanonical("/") },
    { name: "News", url: getCanonical("/news") },
    { name: "Daily Digest", url: getCanonical(`/news/digest/${date}`) },
  ]),
  buildNewsArticleJsonLd({
    title: digest.title,
    description: digest.summary.slice(0, 160),
    url: getCanonical(`/news/digest/${date}`),
    publishedAt: digest.generated_at,
  }),
]} />
```

### 4. Person on `/player/[id]/page.tsx`
After fetching `player` data:
```tsx
<JsonLd data={[
  buildBreadcrumbJsonLd([
    { name: "Home", url: getCanonical("/") },
    { name: "Squad", url: getCanonical("/squad") },
    { name: player.name, url: getCanonical(`/player/${player.slug}`) },
  ]),
  buildPersonJsonLd({
    name: player.name,
    birthDate: player.dateOfBirth,
    nationality: player.nationality,
    image: player.photoLg,
    url: getCanonical(`/player/${player.slug}`),
    position: player.position,
    shirtNumber: player.shirtNumber,
  }),
]} />
```

### 5. SportsEvent on `/fixtures/[id]/page.tsx`
After fetching match data:
```tsx
<JsonLd data={[
  buildBreadcrumbJsonLd([
    { name: "Home", url: getCanonical("/") },
    { name: "Fixtures", url: getCanonical("/fixtures") },
    { name: `${match.teams.home.name} vs ${match.teams.away.name}`, url: getCanonical(`/fixtures/${id}`) },
  ]),
  buildSportsEventJsonLd({
    name: `${match.teams.home.name} vs ${match.teams.away.name}`,
    startDate: match.fixture.date,
    venue: match.fixture.venue?.name,
    venueCity: match.fixture.venue?.city,
    homeTeam: match.teams.home.name,
    awayTeam: match.teams.away.name,
    competition: match.league.name,
    homeScore: match.goals?.home,
    awayScore: match.goals?.away,
    status: match.fixture.status.short,
  }),
]} />
```

### 6. ImageGallery on `/gallery/page.tsx`
After fetching images:
```tsx
<JsonLd data={[
  buildBreadcrumbJsonLd([
    { name: "Home", url: getCanonical("/") },
    { name: "Gallery", url: getCanonical("/gallery") },
  ]),
  buildImageGalleryJsonLd(
    images.slice(0, 20).map(img => ({
      src: img.src,
      alt: img.alt,
      width: img.width,
      height: img.height,
    }))
  ),
]} />
```

### 7. Validate all structured data
- Use Google Rich Results Test (https://search.google.com/test/rich-results) on each page type
- Use Schema.org Validator (https://validator.schema.org/) for full compliance
- Check for warnings: missing recommended fields, invalid dates, etc.

## Todo
- [ ] Add BreadcrumbList to 8 section pages
- [ ] Add NewsArticle JSON-LD to `/news/[...slug]`
- [ ] Add NewsArticle JSON-LD to `/news/digest/[date]`
- [ ] Add Person JSON-LD to `/player/[id]`
- [ ] Add SportsEvent JSON-LD to `/fixtures/[id]`
- [ ] Add ImageGallery JSON-LD to `/gallery`
- [ ] Validate all schemas with Google Rich Results Test
- [ ] Verify no duplicate/conflicting JSON-LD between root layout and page-level

## Success Criteria
- Google Rich Results Test shows valid structured data for each page type
- NewsArticle eligible for Top Stories / News carousel
- BreadcrumbList renders breadcrumb trail in SERP for all pages
- SportsEvent shows match date/teams in search results
- Person schema associates player pages with knowledge graph
- Zero structured data errors in Google Search Console

## Risk Assessment
- **Low.** Additive JSON-LD blocks, no breaking changes
- `SportsEvent` may not trigger rich results for non-major leagues — acceptable
- News article scraper's `publishedAt` may be null — builders must handle gracefully with `undefined`
- Gallery images from Cloudinary should have proper `contentUrl` — verify Cloudinary URLs are accessible to Googlebot

## Security Considerations
- Article titles from RSS sources are user-generated content — `JSON.stringify()` handles escaping
- Cloudinary URLs are public — no auth tokens leak
- Player data from local JSON — trusted source

## Next Steps
Phase 04 expands the sitemap to include all dynamic URLs and adds hreflang support.
