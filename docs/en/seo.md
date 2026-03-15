# SEO Implementation

## Overview

Comprehensive SEO optimization for bilingual (VI/EN) Liverpool FC fan site. Cookie-based i18n — same URL serves both locales, hreflang alternates point to same URL.

## Infrastructure (`src/lib/seo.ts`)

### Exports

| Function | Purpose |
|----------|---------|
| `getCanonical(path)` | Full canonical URL from path |
| `getHreflangAlternates(path)` | `{ canonical, languages: { vi, en, x-default } }` |
| `makePageMeta(title, desc, opts?)` | OG + Twitter + canonical + hreflang (backward-compatible) |
| `buildBreadcrumbJsonLd(items)` | BreadcrumbList schema |
| `buildNewsArticleJsonLd(article)` | NewsArticle schema |
| `buildSportsEventJsonLd(event)` | SportsEvent schema |
| `buildPersonJsonLd(player)` | Person schema |
| `buildImageGalleryJsonLd(images)` | ImageGallery schema |
| `buildFaqJsonLd(items)` | FAQPage schema |

### JsonLd Component (`src/components/seo/json-ld.tsx`)

Server component, XSS-safe (escapes `<`, `>`, `&` in JSON). Renders separate `<script type="application/ld+json">` blocks per schema.

```tsx
import { JsonLd } from "@/components/seo/json-ld";
<JsonLd data={buildBreadcrumbJsonLd([...])} />
<JsonLd data={[schema1, schema2]} /> // renders 2 separate <script> blocks
```

## Per-Page Metadata

All pages use `makePageMeta(title, desc, { path })` for:
- Canonical URL (`<link rel="canonical">`)
- Hreflang alternates (vi, en, x-default)
- OG + Twitter card metadata

Dynamic pages (`/player/[id]`, `/news/[...slug]`, `/fixtures/[id]`) use `generateMetadata` with `getHreflangAlternates()`.

Chat page (`/chat`) has `robots: { index: false, follow: false }`.

## Structured Data (JSON-LD)

### Root Layout (site-wide)
- `WebSite` with SearchAction
- `SportsTeam` (Liverpool FC)
- `Organization` (fan site)

### Per-Page Schemas

| Page | Schemas |
|------|---------|
| Section pages (8) | BreadcrumbList |
| `/news/[...slug]` | BreadcrumbList + NewsArticle |
| `/news/digest/[date]` | BreadcrumbList + NewsArticle |
| `/player/[id]` | BreadcrumbList + Person |
| `/fixtures/[id]` | BreadcrumbList + SportsEvent |
| `/gallery` | BreadcrumbList + ImageGallery |

## Sitemap (`src/app/sitemap.xml/route.ts`)

Dynamic XML sitemap with ~620 URLs:
- 10 static routes (homepage, squad, fixtures, etc.)
- ~30 player pages (`/player/{slug}`)
- ~500 article pages (`/news/{slug}`) — last 90 days
- ~30 digest pages (`/news/digest/{date}`)
- ~50 fixture pages (`/fixtures/{id}`)

Features:
- `xhtml:link` hreflang on every URL (vi, en, x-default)
- Actual `lastmod` from data (published_at, fixture date)
- `Promise.allSettled` for graceful DB failure
- `Cache-Control: public, max-age=3600`

Data sources: `getArticleSitemapData()` (news/db.ts), `getAllDigestDates()` (news/digest.ts), `getFixtures()` (football API), `getAllPlayers()` (squad-data.ts).

## Robots.txt (`src/app/robots.txt/route.ts`)

```
User-agent: *
Allow: /
Disallow: /profile
Disallow: /profile/
Disallow: /api/
Disallow: /auth/
Disallow: /chat
Disallow: /*?*
Sitemap: {SITE_URL}/sitemap.xml
```

## Validation

- Google Rich Results Test: validate per-page structured data
- Schema.org Validator: full compliance check
- Google Search Console: submit sitemap, monitor indexing
- 19 unit tests in `src/lib/__tests__/seo.test.ts`
