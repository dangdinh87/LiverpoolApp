# SEO Implementation

## Tong quan

SEO toan dien cho trang fan Liverpool FC song ngu (VI/EN). Dung cookie-based i18n — cung 1 URL phuc vu ca 2 ngon ngu, hreflang alternates tro cung URL.

## Ha tang (`src/lib/seo.ts`)

### Exports

| Ham | Muc dich |
|-----|----------|
| `getCanonical(path)` | URL canonical day du tu path |
| `getHreflangAlternates(path)` | `{ canonical, languages: { vi, en, x-default } }` |
| `makePageMeta(title, desc, opts?)` | OG + Twitter + canonical + hreflang (tuong thich nguoc) |
| `buildBreadcrumbJsonLd(items)` | Schema BreadcrumbList |
| `buildNewsArticleJsonLd(article)` | Schema NewsArticle |
| `buildSportsEventJsonLd(event)` | Schema SportsEvent |
| `buildPersonJsonLd(player)` | Schema Person |
| `buildImageGalleryJsonLd(images)` | Schema ImageGallery |
| `buildFaqJsonLd(items)` | Schema FAQPage |

### JsonLd Component (`src/components/seo/json-ld.tsx`)

Server component, chong XSS (escape `<`, `>`, `&`). Render rieng biet cac `<script type="application/ld+json">` cho moi schema.

## Metadata tung trang

Tat ca trang dung `makePageMeta(title, desc, { path })` de tu dong them:
- Canonical URL
- Hreflang alternates (vi, en, x-default)
- OG + Twitter card

Trang `/chat` co `robots: { index: false, follow: false }`.

## Structured Data (JSON-LD)

### Root Layout (toan trang)
- `WebSite` voi SearchAction
- `SportsTeam` (Liverpool FC)
- `Organization` (trang fan)

### Tung trang

| Trang | Schemas |
|-------|---------|
| 8 trang section | BreadcrumbList |
| `/news/[...slug]` | BreadcrumbList + NewsArticle |
| `/news/digest/[date]` | BreadcrumbList + NewsArticle |
| `/player/[id]` | BreadcrumbList + Person |
| `/fixtures/[id]` | BreadcrumbList + SportsEvent |
| `/gallery` | BreadcrumbList + ImageGallery |

## Sitemap (`src/app/sitemap.xml/route.ts`)

XML sitemap dong voi ~620 URLs:
- 10 route tinh
- ~30 trang cau thu
- ~500 bai bao (90 ngay gan nhat)
- ~30 trang digest
- ~50 trang tran dau

Tinh nang: hreflang, lastmod thuc te, Promise.allSettled, Cache-Control 1h.

## Robots.txt

Block: `/profile`, `/api/`, `/auth/`, `/chat`, `/*?*` (query params).

## Validation

- Google Rich Results Test
- Schema.org Validator
- Google Search Console
- 19 unit tests (`src/lib/__tests__/seo.test.ts`)
