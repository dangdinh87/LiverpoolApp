# Technical SEO & Core Web Vitals Research — Next.js 16 App Router
**Date:** 2026-03-15 | **Context:** Liverpool FC VN, Vercel Hobby, EN/VI bilingual

---

## 1. CORE WEB VITALS 2025-2026

### Current Thresholds (Unchanged Since 2024)
| Metric | Target | 75th Percentile |
|--------|--------|-----------------|
| **LCP** (Largest Contentful Paint) | ≤2.5s | Full HTML render |
| **INP** (Interaction to Next Paint) | ≤200ms | Replaced FID (Mar 2024) |
| **CLS** (Cumulative Layout Shift) | ≤0.1 | Visual stability |

**Pass Rate (Jan 2026 CrUX):** 68.3% LCP, 87.1% INP, 80.9% CLS. Only 55.7% pass all three—recommend target 55%+ globally for competitive edge.

**Action:** Audit current Performance → ensure streaming SSR doesn't delay LCP. Monitor squad/stats pages (highest visual complexity).

---

## 2. NEXT.JS APP ROUTER SEO ARCHITECTURE

### Static vs. Dynamic Rendering
- **Use `generateStaticParams` + `revalidate`** for dynamic routes (`/player/[id]`, `/news/[...slug]`, `/fixtures/[id]`) → pre-render at build time, revalidate 6-12h (ISR).
- **Static metadata object** for non-parametric pages (homepage, about, legal).
- **`generateMetadata` function** only for dynamic data (article titles, player names). Memoized requests deduplicate across segments.

### Rendering Strategy
- Homepage (`/`) — SSG + ISR 30min (BentoGrid + fixture previews).
- Squad/Standings — SSG + ISR 6h (football data, expensive).
- News feed — SSR (articles revalidate via cron `/api/news/sync`).
- Player detail — SSG + ISR 24h (`generateStaticParams` → precompile all players).
- Fixtures — SSR + ISR 2h (live match data).

**Action:** Add `metadata.robots = { index: true, follow: true }` to layout. Export `robots()` handler for dynamic rules.

### Canonical URLs & Pagination
- Bilingual pages: Use `hreflang` alternate links in `generateMetadata` (e.g., `/en/squad` ↔ `/vi/squad`).
- Paginated routes: Add `rel="next"` / `rel="prev"` in metadata + self-canonicalize.
- Query params (filters) disallow in `robots.txt` (`Disallow: /*?*`).

---

## 3. IMAGE OPTIMIZATION FOR SEO & LCP

### Format Strategy
- **next/image priority:** Apply `priority={true}` to hero image (stadium, match photo).
- **Automatic formats:** next/image auto-serves WebP/AVIF (25–70% smaller than JPEG).
- **Width/Height predefined:** Prevents CLS shift (critical for stats charts, player cards).

### Cloudinary Integration
- Cloudinary CDN reduces bandwidth 50–80% via compression + format negotiation.
- Set `loading="lazy"` for below-fold images (news feed, gallery).
- Lazy-load gallery lightbox images (only render when modal opens).

**Action:** Audit `/gallery` and `/news` — ensure images have explicit width/height. Add `priority` to hero/featured images only (LCP candidates).

---

## 4. BUNDLE & FONT OPTIMIZATION

### Code Splitting (Automatic)
- Next.js 16 with Turbopack auto-splits by page. Use `next/dynamic` for modular components (chat, modals, charts).
- Tree-shake unused shadcn/ui components (import only used primitives).

### Font Strategy
- **next/font/local** for League Gothic (headlines), Barlow Condensed (labels).
- **Subset to Latin-only** (exclude CJK unless VI copy contains diacritics—likely not).
- **font-display: swap** (default) → text renders before font loads (SEO-friendly).

**Action:** Profile bundle with `@next/bundle-analyzer`. Target <180kB JS (Hobby plan). Lazy-load Recharts only on `/stats`.

---

## 5. CRAWLABILITY & INDEXATION

### robots.txt Best Practices
```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /profile/  # Protected route
Disallow: /*?*       # Query params waste crawl budget
Allow: /*.json       # Sitemap, feed
```

### XML Sitemap
- Generate `sitemap.xml` with 500+ pages (squad, player detail, news, history, fixtures).
- Prioritize high-traffic routes (`<priority>0.8</priority>` for `/squad`, `/standings`).
- Update on cron when news articles published (add to `/api/news/sync`).

### JavaScript Rendering
- **Two-phase indexing:** Googlebot renders JS but may delay. Ship critical content in HTML (SSR/SSG).
- Feed JSON-LD structured data in root layout (WebSite, SportsTeam, NewsArticle on `/news`).

### Canonical URLs
- Self-canonicalize each page (CLAUDE.md already implements).
- Bilingual: Use `hreflang="x-default"` for language selection page.

**Action:** Validate crawlability with Google Search Console. Monitor Core Web Vitals report.

---

## KEY RECOMMENDATIONS FOR LIVERPOOL APP

1. **LCP Priority:** Profile squad/stats pages. If >2.5s, defer non-critical Recharts/Cloudinary galleries.
2. **ISR Tuning:** Squad (6h), standings (6h), news (sync cron), player detail (24h).
3. **Image Audit:** Add `priority` to hero/featured; ensure all images have width/height.
4. **Bundle Profiling:** Use `@next/bundle-analyzer`, target <180kB JS (Hobby limit).
5. **Crawlability:** Export `robots()` handler; update `sitemap.xml` on news sync; monitor GSC.

---

## SOURCES
- [Google Core Web Vitals](https://developers.google.com/search/docs/appearance/core-web-vitals)
- [Web.dev Core Web Vitals Thresholds](https://web.dev/articles/defining-core-web-vitals-thresholds)
- [Next.js generateMetadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- [Next.js Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)
- [Strapi Next.js SEO Guide](https://strapi.io/blog/nextjs-seo)
- [DebugBear Image Optimization](https://www.debugbear.com/blog/nextjs-image-optimization)
- [Google robots.txt Specification](https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt)
- [NitroPack CWV 2026](https://nitropack.io/blog/most-important-core-web-vitals-metrics/)

**Unresolved Questions:**
- Current Lighthouse score on Hobby plan? (Need performance trace.)
- Is Cloudinary CDN being fully leveraged for gallery images?
- Are all `generateStaticParams` functions exhaustive for high-traffic routes?
