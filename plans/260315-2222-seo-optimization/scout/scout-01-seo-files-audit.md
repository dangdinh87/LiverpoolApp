# Scout Report: SEO Files Audit — LiverpoolApp

**Date:** March 15, 2026  
**Scope:** Complete SEO infrastructure audit  
**Status:** All SEO-related files identified and categorized

---

## 1. CORE METADATA & ROOT CONFIG

### ✅ `/src/app/layout.tsx` — Root Metadata + JSON-LD Schema
- **SEO Features:**
  - `export const metadata` with full template, description, keywords (EN + VI)
  - OpenGraph config (type, locale, alternateLocale, siteName)
  - Twitter card config (summary_large_image)
  - `robots: { index: true, follow: true }`
  - Canonical URL via `alternates.canonical`
  - **JSON-LD structured data:**
    - WebSite schema (inLanguage: ["vi", "en"], SearchAction)
    - SportsTeam schema (Liverpool FC, Anfield stadium, Premier League)
    - Organization schema (social links: Facebook, Twitter, Instagram, YouTube)
- **Issues/Gaps:**
  - No `alternates.languages` configured for hreflang tags (only in metadata)
  - OpenGraph `images` not set (no OG image for homepage)
  - No `robots.txt` link in metadata (should be discoverable)

### ✅ `/next.config.ts` — Image Optimization Config
- **SEO Features:**
  - Remote patterns whitelist for 30+ image domains (news sources, CDNs, Football-Data, Cloudinary, Supabase, Wikipedia, ESPN)
  - Image quality optimization: `qualities: [75, 85]`
  - Supports responsive image optimization via Next.js Image component
- **Issues/Gaps:**
  - No image size hints for responsive images
  - No placeholder blur strategy defined

---

## 2. SITEMAP & ROBOTS

### ✅ `/src/app/sitemap.xml/route.ts` — Dynamic Sitemap Handler
- **SEO Features:**
  - Generates XML sitemap with `<url>`, `<loc>`, `<lastmod>`, `<changefreq>`, `<priority>`
  - Static routes (18): homepage, news, squad, fixtures, standings, season, stats, history, about, chat
  - Dynamic player routes (auto-generated from `getAllPlayers()`)
  - Proper changefreq strategy: hourly (news, fixtures), daily (homepage, standings), weekly (squad, players), monthly (history, about)
  - Priority scale: 1.0 (home), 0.9 (news/squad/fixtures), 0.8 (standings/season), 0.7 (stats), 0.6 (history/players), 0.4 (about), 0.3 (chat)
- **Issues/Gaps:**
  - Missing dynamic news article URLs (no `/news/[...slug]` routes in sitemap)
  - Missing `/news/digest/[date]` routes
  - Missing `/fixtures/[id]` routes
  - Missing `/auth` and `/legal` routes (intentional—protected/legal pages)
  - No `lastmod` for player URLs (uses hardcoded `today`)
  - No support for Chinese/Vietnamese alternate slugs (i18n aware)

### ✅ `/src/app/robots.txt/route.ts` — Robots.txt Handler
- **SEO Features:**
  - User-agent: `*` (allows all crawlers)
  - Allow: `/` (public content)
  - Disallow: `/profile`, `/api/`, `/auth/` (protected/internal)
  - Sitemap reference: `${SITE_URL}/sitemap.xml`
- **Issues/Gaps:**
  - No rate limiting rules (Crawl-delay, Request-rate)
  - No guest-agent specific rules
  - No noindex for auth endpoints (relying on Disallow only)

---

## 3. SEO UTILITY LIBRARY

### ✅ `/src/lib/seo.ts` — Metadata Helper
- **SEO Features:**
  - `makePageMeta(title, description)` utility function
  - Returns partial Metadata object with:
    - OpenGraph: title, description, type: "website", siteName
    - Twitter: card: "summary_large_image", title, description
- **Issues/Gaps:**
  - Minimal—does not support:
    - Image metadata (og:image, twitter:image)
    - Article-specific fields (author, publishedTime, modifiedTime)
    - Canonical URL per-page
    - Alternate languages (hreflang)
  - Same function used for all page types (not specialized for articles, profiles, etc.)

---

## 4. PAGE METADATA — STATIC ROUTES

All pages listed below use either `export const metadata` (static) or `generateMetadata()` (dynamic).

### ✅ `/src/app/page.tsx` — Homepage
- **Metadata Type:** Static `export const metadata`
- **SEO Features:**
  - Custom title (EN + VI content)
  - Custom description
  - Uses `makePageMeta()` for OG + Twitter
  - `dynamic = "force-dynamic"` (no ISR cache—always fresh news)
- **Issues/Gaps:**
  - No JSON-LD markup specific to homepage (relies on root layout)
  - No OG image for homepage hero

### ✅ `/src/app/news/page.tsx` — News Archive
- **Metadata Type:** `generateMetadata()` (dynamic via i18n)
- **SEO Features:**
  - Title/description from i18n translations
  - Uses `makePageMeta()`
  - `dynamic = "force-dynamic"` (fresh feeds)
- **Issues/Gaps:**
  - No schema.org CollectionPage markup
  - No per-article metadata in list view

### ✅ `/src/app/news/[...slug]/page.tsx` — News Article Detail
- **Metadata Type:** `generateMetadata()` (dynamic from article content)
- **SEO Features:**
  - Title: article title
  - Description: article description + first paragraph fallback (160 chars)
  - Images: hero image (1200x630 OG size)
  - OpenGraph type: "article" (not "website")
  - Article-specific fields: `publishedTime`, `authors`
  - Twitter: card "summary_large_image" + image
  - `dynamic = "force-dynamic"` (scrapes live content)
- **Issues/Gaps:**
  - No article JSON-LD schema (NewsArticle, BlogPosting)
  - No modifiedTime/updatedTime tracking
  - No article tags/keywords in metadata
  - No canonical URL for article (important for syndicated content)
  - Multiple source URLs may cause duplicate content issues

### ✅ `/src/app/news/digest/[date]/page.tsx` — Daily Digest
- **Metadata Type:** `generateMetadata()` (from digest DB)
- **SEO Features:**
  - Title: digest title
  - Description: digest summary (160 char slice)
- **Issues/Gaps:**
  - Missing OG + Twitter metadata
  - No JSON-LD schema (CollectionPage for articles)
  - No `makePageMeta()` applied

### ✅ `/src/app/squad/page.tsx` — Squad Grid
- **Metadata Type:** `generateMetadata()` (dynamic via i18n)
- **SEO Features:**
  - Uses `makePageMeta()`
- **Issues/Gaps:**
  - No team roster schema (schema.org SportsTeam + athlete)
  - No player count or season info in metadata

### ✅ `/src/app/player/[id]/page.tsx` — Player Detail
- **Metadata Type:** `generateMetadata()` (dynamic, with `generateStaticParams`)
- **SEO Features:**
  - Static pre-generation: `generateStaticParams()` returns all player slugs (pre-builds 100+ pages)
  - Title: player name
  - Description: `player.metaDescription` (curated) or fallback: position + club
  - Images: player photo (400x400)
  - OpenGraph type: "profile" (not "website")
  - Twitter: summary_large_image + player photo
- **Issues/Gaps:**
  - No Person/Athlete JSON-LD schema (should include birthDate, nationality, position, goals/assists)
  - No agent/representative info
  - No statistics in metadata

### ✅ `/src/app/fixtures/page.tsx` — Fixtures List
- **Metadata Type:** `generateMetadata()` (dynamic via i18n)
- **SEO Features:**
  - Uses `makePageMeta()`
- **Issues/Gaps:**
  - No event schedule schema (Event, SportsEvent)

### ✅ `/src/app/fixtures/[id]/page.tsx` — Match Detail
- **Metadata Type:** `generateMetadata()` (dynamic from fixture data)
- **SEO Features:**
  - Title: "Home Team vs Away Team"
  - Description: league + round info
- **Issues/Gaps:**
  - No SportsEvent JSON-LD schema
  - Missing OG image (match photo/graphics)
  - Missing Twitter metadata
  - No match result/score in description

### ✅ `/src/app/standings/page.tsx` — League Table
- **Metadata Type:** `generateMetadata()` (dynamic via i18n)
- **SEO Features:**
  - Uses `makePageMeta()`
  - `dynamic = "force-dynamic"` (live table)
- **Issues/Gaps:**
  - No table schema (BreadcrumbList, Table)

### ✅ `/src/app/stats/page.tsx` — Statistics Dashboard
- **Metadata Type:** `generateMetadata()` (dynamic via i18n)
- **SEO Features:**
  - Uses `makePageMeta()`
- **Issues/Gaps:**
  - No statistics schema

### ✅ `/src/app/history/page.tsx` — Club History
- **Metadata Type:** `generateMetadata()` (dynamic via i18n)
- **SEO Features:**
  - Uses `makePageMeta()`
- **Issues/Gaps:**
  - No historical/timeline schema
  - Trophy/legend data not in metadata

### ✅ `/src/app/gallery/page.tsx` — Gallery / Photo Showcase
- **Metadata Type:** `generateMetadata()` (dynamic via i18n)
- **SEO Features:**
  - Uses `makePageMeta()`
  - `revalidate = 1800` (30-min ISR)
- **Issues/Gaps:**
  - No ImageGallery/CollectionPage schema
  - No image metadata (dimensions, alt text) in response

### ✅ `/src/app/about/page.tsx` — About Page
- **Metadata Type:** `generateMetadata()` (dynamic via i18n)
- **SEO Features:**
  - Uses `makePageMeta()`
  - `dynamic = "force-dynamic"` (likely for feature list)
- **Issues/Gaps:**
  - No Organization schema beyond root layout

### ✅ `/src/app/season/page.tsx` — Season Archive / Multi-Season Data
- **Metadata Type:** `generateMetadata()` (dynamic—includes season label in title/desc)
- **SEO Features:**
  - Includes season year in metadata title/description
  - Uses `makePageMeta()`
  - `dynamic = "force-dynamic"`
- **Issues/Gaps:**
  - Season parameter not in canonical URL slug

### ✅ `/src/app/auth/login/page.tsx` — Login Page
- **Metadata Type:** Static `export const metadata`
- **SEO Features:**
  - Title, description
- **Issues/Gaps:**
  - Intentionally minimal (protected route)
  - `noindex` not set—should block indexing

### ✅ `/src/app/legal/page.tsx` — Legal / Privacy
- **Metadata Type:** `generateMetadata()` (dynamic via i18n)
- **SEO Features:**
  - Title, description from i18n
- **Issues/Gaps:**
  - No schema markup (FAQPage, BreadcrumbList for sections)

### ✅ `/src/app/profile/page.tsx` — User Profile (Protected)
- **Metadata Type:** Static `export const metadata`
- **SEO Features:**
  - Title: "My Profile"
  - Description: "Manage your Liverpool FC fan profile"
- **Issues/Gaps:**
  - `noindex` not set—should block from SERPs (protected/personal content)
  - Relies on middleware redirect, not metadata noindex

### ✅ `/src/app/players/page.tsx` — Players Directory
- **Special:** Redirects to `/squad` (no metadata needed)

### ⚠️ `/src/app/chat/page.tsx` — AI Chat Page
- **Status:** No metadata found in glob results; should verify

---

## 5. IMAGE OPTIMIZATION & ALT TEXT

### ✅ 42 `next/image` imports detected across codebase

### ✅ Sample Alt Text Coverage:
- `/src/components/ui/lfc-loader.tsx`: "Liverpool FC", "Loading"
- `/src/components/home/live-match-banner.tsx`: league.name, team.name
- `/src/components/home/hero.tsx`: "Liverpool FC Crest"
- `/src/components/home/news-section.tsx`: featured.title, article.title
- `/src/components/home/squad-carousel.tsx`: player.name
- `/src/components/home/standings-preview.tsx`: s.team.name

### Issues/Gaps:
- **Inconsistent alt text:** Some images use entity names (good), others may have generic text
- **Dynamic alt text:** Most high-value images (player photos, article headers) use dynamic content (good)
- **Missing coverage:** Need full audit of all 42 Image components for consistency
- **Cloudinary images:** Gallery/news images served via Cloudinary—alt text stored in DB, not in component

---

## 6. INTERNATIONALIZATION (i18n) & HREFLANG

### ✅ `/next.config.ts` — i18n Setup
- **Features:** next-intl plugin enabled
- **Locales:** EN (en), VI (vi) — hardcoded in config

### ✅ Root Layout Metadata
- `alternates.canonical: SITE_URL` (root level, no per-page override)
- `locale: "vi_VN"`, `alternateLocale: "en_GB"` in OpenGraph

### Issues/Gaps:
- **No per-page hreflang:** Pages don't set `alternates.languages` in metadata
- **Hardcoded SITE_URL:** No automatic hreflang URL generation for localized pages
- **Middleware:** Uses cookie `NEXT_LOCALE` + Accept-Language header, but no canonical/hreflang adjustment
- **Static pages:** Player pages (100+) not localized; only translations differ

---

## 7. STRUCTURED DATA & JSON-LD

### ✅ Root Layout JSON-LD (3 schemas):
1. **WebSite** — search capability, inLanguage
2. **SportsTeam** — Liverpool FC (Anfield, Premier League, logo)
3. **Organization** — fan site info + social links

### ✅ Dynamic Article Schema:
- `/news/[...slug]` includes `publishedTime`, `authors`

### Issues/Gaps:
- **Missing Article Schema:** News articles should have NewsArticle or BlogPosting JSON-LD
- **Missing Event Schema:** Fixtures/matches should have SportsEvent schema
- **Missing Person Schema:** Players lack Athlete/Person schema with stats
- **Missing BreadcrumbList:** Multi-level pages lack breadcrumb schema
- **Missing Organization Extensions:** No aggregateRating, review, priceRange
- **No schema.org/Table:** League standings table not marked up

---

## 8. REVALIDATION & CACHE STRATEGY

### ISR (Incremental Static Regeneration) & Dynamic Rendering:

| Page | Strategy | Revalidate | Notes |
|------|----------|-----------|-------|
| `/` | force-dynamic | N/A | Always fresh (live news + fixtures) |
| `/news` | force-dynamic | N/A | Live feeds |
| `/news/[...slug]` | force-dynamic | N/A | Scrapes live content |
| `/news/digest/[date]` | force-dynamic | N/A | DB lookup |
| `/squad` | force-dynamic | N/A | Player stats fresh |
| `/player/[id]` | generateStaticParams | Pre-built | 100+ pages pre-rendered at build |
| `/fixtures` | force-dynamic | N/A | Live match data |
| `/fixtures/[id]` | force-dynamic | N/A | Live match stats |
| `/standings` | force-dynamic | N/A | Live table |
| `/stats` | force-dynamic | N/A | Live season stats |
| `/history` | force-dynamic | N/A | Static JSON data |
| `/gallery` | ISR | 1800s (30min) | DB images, periodic refresh |
| `/season` | force-dynamic | N/A | Multi-season fetch |
| `/about`, `/legal` | force-dynamic | N/A | i18n translations |

### Issues/Gaps:
- **Too much force-dynamic:** News/fixtures could use shorter ISR (10-30s) instead of always dynamic
- **No stale-while-revalidate:** Could improve TTFB with stale content while revalidating
- **Player pages:** Pre-built via `generateStaticParams`, but if players added mid-season, new pages won't exist until next build

---

## 9. MISSING SEO FEATURES

### High Priority:
1. **Canonical URLs:** No per-page canonical setup (news articles especially—syndicated content)
2. **Hreflang Tags:** No multilingual link relations in metadata
3. **JSON-LD Schemas:**
   - NewsArticle / BlogPosting (articles)
   - SportsEvent (fixtures)
   - Athlete/Person (players)
   - BreadcrumbList (navigation)
   - Table (standings)
4. **Meta Robots Tags:**
   - `noindex` for `/auth/*`, `/profile`, `/api/*`
   - `nofollow` for external article links
5. **OG Images:**
   - Homepage OG image missing
   - Fixture detail OG image missing
   - Digest OG image missing
6. **Article Metadata Gaps:**
   - No article tags/keywords
   - No updated/modified time
   - No author profile links
7. **News Sitemap:** Dynamic article URLs not in sitemap.xml

### Medium Priority:
1. **Image Optimization:**
   - Add blur placeholders for hero images
   - Responsive image sizes hints (`sizes` attribute)
2. **Performance Signals:**
   - No Web Vitals metadata (preload, prefetch hints)
3. **Rate Limiting:** robots.txt lacks Crawl-delay rules
4. **Duplicate Content Prevention:**
   - Article URLs may appear via multiple news sources (no canonical)
   - Season pages (`/stats?season=2024` vs `/season?season=2024`)

### Low Priority:
1. **Local Business Schema:** Not applicable (fan site, not business)
2. **AMP:** Next.js not AMP-first (not critical)
3. **Rich Snippets:** FAQPage/Faq schema not implemented

---

## 10. FILE SUMMARY TABLE

| File Path | Type | Metadata Method | JSON-LD | Schemas | Issues |
|-----------|------|---|---|---|---|
| `/src/app/layout.tsx` | Root | Static | ✅ WebSite, SportsTeam, Organization | Config-level | No per-page hreflang, no OG image |
| `/src/lib/seo.ts` | Util | N/A | N/A | N/A | Too minimal; lacks image + article support |
| `/src/app/sitemap.xml/route.ts` | Route | N/A | N/A | N/A | Missing article + digest + fixture URLs |
| `/src/app/robots.txt/route.ts` | Route | N/A | N/A | N/A | No rate limiting rules |
| `/src/app/page.tsx` | Page | Static | Relies on layout | Homepage | No OG image; force-dynamic not ideal for SEO |
| `/src/app/news/page.tsx` | Page | Dynamic | Relies on layout | News list | No CollectionPage schema |
| `/src/app/news/[...slug]/page.tsx` | Page | Dynamic | Article meta only | Article | No NewsArticle schema; no canonical |
| `/src/app/squad/page.tsx` | Page | Dynamic | Relies on layout | Squad list | No Team/athlete schema |
| `/src/app/player/[id]/page.tsx` | Page | Dynamic | Relies on layout | Player | No Athlete schema; static pre-build |
| `/src/app/fixtures/page.tsx` | Page | Dynamic | Relies on layout | Fixture list | No SportsEvent schema |
| `/src/app/fixtures/[id]/page.tsx` | Page | Dynamic | Relies on layout | Fixture detail | No SportsEvent schema; no OG image |
| `/src/app/standings/page.tsx` | Page | Dynamic | Relies on layout | Standings | No Table schema; force-dynamic cache |
| `/src/app/stats/page.tsx` | Page | Dynamic | Relies on layout | Stats | No schema |
| `/src/app/history/page.tsx` | Page | Dynamic | Relies on layout | History | No schema |
| `/src/app/gallery/page.tsx` | Page | Dynamic | Relies on layout | Gallery | No ImageGallery schema; ISR 30min good |
| `/src/app/season/page.tsx` | Page | Dynamic | Relies on layout | Season | Season in title is good; force-dynamic OK |
| `/src/app/about/page.tsx` | Page | Dynamic | Relies on layout | About | Standard |
| `/src/app/auth/login/page.tsx` | Page | Static | N/A | Auth | Should have `noindex` |
| `/src/app/profile/page.tsx` | Page | Static | N/A | Profile | Should have `noindex` + `nofollow` |
| `/src/app/legal/page.tsx` | Page | Dynamic | Relies on layout | Legal | No schema; sections could use FAQ schema |
| `/next.config.ts` | Config | N/A | N/A | N/A | Good image domain whitelist; no placeholder blur |

---

## 11. RECOMMENDATIONS SUMMARY

### Quick Wins (1-2 hours):
1. Add `noindex, nofollow` to `/auth/*` and `/profile` pages
2. Create extended `seo.ts` with variants for articles, profiles, events
3. Add OG images to homepage, fixtures, digest pages
4. Add hreflang config function in `seo.ts`

### Medium Lift (3-5 hours):
1. Add NewsArticle JSON-LD schema to `/news/[...slug]`
2. Add SportsEvent schema to `/fixtures/[id]`
3. Add Athlete schema to `/player/[id]`
4. Extend sitemap to include article + digest URLs
5. Add canonical URL override per page

### Larger Effort (6+ hours):
1. Implement per-page hreflang via middleware or metadata override
2. Add rate limiting + crawl rules to robots.txt
3. Add comprehensive alt text audit for all 42 Image components
4. Reduce force-dynamic usage where ISR (10-30s) would work
5. Add image blur placeholders for hero sections

---

## 12. UNRESOLVED QUESTIONS

1. **Article Duplicate Content:** Multiple news sources may syndicate the same article—should implement canonicalization strategy. How to handle?
2. **Season Parameters:** `/stats?season=2024` vs `/season?season=2024`—are both indexed? Should deduplicate via canonical.
3. **Player Photo URLs:** Player photos are served from multiple sources (FPL, local, Cloudinary)—are there duplicate image issues?
4. **Chat Page:** No metadata found for `/chat/page.tsx`—should verify and add if missing.
5. **Multilingual Sitemap:** Should sitemap include both EN + VI versions, or is single sitemap sufficient with hreflang?
6. **Image Optimization:** Cloudinary transformation URLs in `next/image` usage—are these optimized for Core Web Vitals?

---

**End of Report**
