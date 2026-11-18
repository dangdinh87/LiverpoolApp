# SEO & AI Discovery

SEO, OpenGraph, structured data, and AI-crawler attribution architecture for **Anfield Daily** (`https://anfielddaily.com`).

---

## 1. Canonical & Hreflang Architecture (`src/lib/seo.ts`)

Because English lives at `/` and Vietnamese lives under `/vi` (`src/i18n/routing.ts`), every indexable page declares self-consistent canonical and `hreflang` URLs via `getHreflangAlternates(path, locale, locales)`:

- `en` → `https://anfielddaily.com<path>`
- `vi` → `https://anfielddaily.com/vi<path>`
- `x-default` → `https://anfielddaily.com<path>`
- `og:locale` → `en_GB` on English pages, `vi_VN` on Vietnamese pages

Both page `<head>` metadata (`makePageMeta` / `generateMetadata`) and `src/app/sitemap.xml/route.ts` call `getHreflangAlternates()`, guaranteeing `<head>` and `sitemap.xml` never drift apart. `getSiteUrl()` reads `NEXT_PUBLIC_SITE_URL` lazily via `getEnv()` and strips trailing slashes for Cloudflare Workers safety.

---

## 2. Indexing Policy: Original Writing vs Publisher Mirrors

| Route Group | Indexing Policy | Why |
|---|---|---|
| `/`, `/news`, `/analysis`, `/analysis/[slug]`, `/news/digest/[date]`, `/fixtures`, `/fixtures/[id]`, `/standings`, `/predictions`, `/squad`, `/player/[id]`, `/stats`, `/stats/[season]`, `/season?season=<past>`, `/history`, `/gallery`, `/about`, `/legal` | `index: true, follow: true` + listed in `sitemap.xml` | Original Anfield Daily pages, data views, briefings, and fact-validated match analysis |
| `/news/[...slug]` (scraped article reader) | `index: false, follow: true` + **excluded** from `sitemap.xml` + no ads | Full-article mirrors of external publishers' reporting; credit and link out, never compete in search |
| `/profile`, `/auth/*` | `X-Robots-Tag: noindex, nofollow` + disallowed in `robots.txt` | Private / authentication flows |

---

## 3. Structured Data Graph (`JSON-LD`)

Site-wide entities are declared once in `<StructuredData />` (`src/components/analytics/structured-data.tsx`) with stable `@id`s (`SCHEMA_IDS.publisher`, `SCHEMA_IDS.website`, `SCHEMA_IDS.club`), and page-level schemas reference those `@id` nodes:

| Scope | Schema Types |
|---|---|
| Root localised layout | `Organization` (`#publisher`), `WebSite` (`#website`), `SportsTeam` (`#club`) |
| Section & detail pages | `BreadcrumbList` (`src/lib/seo-breadcrumbs.ts`) |
| `/analysis/[slug]` & `/news/digest/[date]` | `BreadcrumbList` + `NewsArticle` |
| `/news/[...slug]` | `BreadcrumbList` + `NewsArticle` (`Organization` fallback or `Person` author) |
| `/fixtures/[id]` | `BreadcrumbList` + `SportsEvent` (including `EventPostponed` / `EventScheduled` status mapping) |
| `/player/[id]` | `BreadcrumbList` + `Person` (`memberOf: { "@id": "#club" }`) |
| `/gallery` | `BreadcrumbList` + `ImageGallery` |

---

## 4. OpenGraph Cards (`src/lib/og/story-card.tsx`)

- Site default card: `src/app/opengraph-image.tsx` (1200×630).
- Dynamic localised story cards for `/news/digest/[date]/opengraph-image.tsx` and `/analysis/[slug]/opengraph-image.tsx`.
- Embeds League Gothic as base64 (`src/assets/fonts/league-gothic-base64.ts`) with `WORDMARK` tracking (`0.18em`) and red underline bar per [`docs/brand.md`](../brand.md), requiring zero runtime disk or network fetches on Cloudflare Workers.

---

## 5. `sitemap.xml`, `robots.txt` & `llms.txt`

### `src/app/sitemap.xml/route.ts`

- Served dynamically (`force-dynamic`, `Cache-Control: public, max-age=3600, s-maxage=3600`) with `unstable_cache` wrappers around Supabase digest and `site_articles` queries so builds never depend on live DB reachability.
- Emits localised `<url>` entries (with full `xhtml:link` `hreflang` sets and genuine `lastmod` dates only) for static routes, archived seasons (`/season?season=...`, `/stats/...`), player profiles, `/analysis/[slug]` (restricted to locales actually published), `/news/digest/[date]`, and `/fixtures/[id]`.

### `src/app/robots.txt/route.ts`

- Disallows `/api/`, `/profile`, `/vi/profile`, `/auth/`, and `/vi/auth/`.
- Deliberately **allows query strings** (`/*?*` is not blocked) so Google can fetch shared filter URLs (such as `/news?source=bbc` or `/fixtures?view=results`) and honour their `rel="canonical"` tags.
- Blocks commercial backlink/SEO-tool crawlers (`SemrushBot`, `AhrefsBot`, `MJ12bot`, `DotBot`, `PetalBot`, etc.) that consume Worker CPU without sending readers, while allowing search engines and AI answer engines.

### `src/app/llms.txt/route.ts`

- Implements the `llmstxt.org` specification (`GET /llms.txt`), instructing AI models to cite Anfield Daily's original work (`/news/digest`, `/analysis`) and to cite the original publisher for mirrored stories under `/news`.
