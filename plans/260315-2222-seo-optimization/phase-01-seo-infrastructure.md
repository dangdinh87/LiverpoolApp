# Phase 01 — SEO Infrastructure

> [plan.md](./plan.md) | [Phase 02 ->](./phase-02-metadata-optimization.md)

## Overview
| Field | Value |
|-------|-------|
| Date | 2026-03-15 |
| Priority | P1 |
| Effort | 2h |
| Status | done |
| Review | 8.5/10 → approved |

Expand `src/lib/seo.ts` from a 9-line OG helper into the SEO utility layer: JSON-LD builders, breadcrumb generator, hreflang helper, and canonical URL builder. All downstream phases depend on this.

## Key Insights
- Current `makePageMeta()` only returns OG + Twitter card — no structured data, no alternates
- Site uses `next-intl` with cookie-based locale detection, NOT path-based (`/en/`, `/vi/`). Hreflang must handle same-path pages with `?locale=` or accept that content serves both locales on same URL
- JSON-LD should be injected per-page via `<script type="application/ld+json">` in page components, NOT all crammed into root layout
- Root layout already has site-wide JSON-LD (WebSite, SportsTeam, Organization) — keep those, add page-specific schemas alongside

## Requirements
1. JSON-LD builder functions for: `NewsArticle`, `SportsEvent`, `Person`, `BreadcrumbList`, `ImageGallery`, `FAQPage`
2. Breadcrumb path generator that maps route segments to labels
3. Hreflang alternates generator for metadata
4. Canonical URL builder that respects `NEXT_PUBLIC_SITE_URL`
5. Reusable `JsonLd` component for injecting structured data in pages
6. Type-safe — all builders accept typed inputs, return `WithContext<Thing>` objects

## Architecture

### File: `src/lib/seo.ts` (expand existing)

```
Export structure:
- makePageMeta(title, desc, options?)     // enhanced: adds canonical, alternates
- buildNewsArticleJsonLd(article)         // NewsArticle schema
- buildSportsEventJsonLd(fixture)         // SportsEvent schema
- buildPersonJsonLd(player)              // Person schema
- buildBreadcrumbJsonLd(items)           // BreadcrumbList schema
- buildImageGalleryJsonLd(images)        // ImageGallery schema
- buildFaqJsonLd(items)                  // FAQPage schema
- getCanonical(path)                     // full URL from path
- getHreflangAlternates(path)            // { vi, en, x-default }
```

### File: `src/components/seo/json-ld.tsx` (new)

Thin wrapper component:
```tsx
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
```

## Related Code Files
- `src/lib/seo.ts` — primary target, currently 9 lines
- `src/app/layout.tsx` — root JSON-LD (keep as-is, but reference for pattern)
- `src/lib/types/football.ts` — `Fixture` type for SportsEvent builder
- `src/lib/squad-data.ts` — `LfcPlayer` type for Person builder
- `src/lib/news/types.ts` — `NewsArticle` type for article builder

## Implementation Steps

### 1. Create `JsonLd` component
- New file: `src/components/seo/json-ld.tsx`
- Server component (no `"use client"`)
- Accepts `data: object | object[]`, renders `<script type="application/ld+json">`

### 2. Enhance `makePageMeta()` in `src/lib/seo.ts`
- Add optional `options` param: `{ path?: string; image?: string; type?: string; publishedTime?: string; modifiedTime?: string }`
- Auto-generate `canonical` from path
- Auto-generate `alternates.languages` with hreflang (vi, en)
- Keep backward-compatible (existing callers pass title + desc only)

### 3. Add `getCanonical(path: string): string`
- Returns `${SITE_URL}${path}` with normalized trailing slash

### 4. Add `getHreflangAlternates(path: string)`
- Returns `{ canonical: url, languages: { vi: url, en: url, "x-default": url } }`
- Since site uses cookie-based i18n (not path prefixes), all point to same URL with language meta
- This is correct per Google's guidance for cookie-based locale sites

### 5. Add JSON-LD builder: `buildBreadcrumbJsonLd(items: { name: string; url: string }[])`
- Returns `BreadcrumbList` with `ListItem` array
- Each item gets `position`, `name`, `item` (URL)

### 6. Add JSON-LD builder: `buildNewsArticleJsonLd(article)`
- Input: `{ title, description, url, image?, author?, publishedAt?, modifiedAt?, sourceName? }`
- Returns `NewsArticle` with `headline`, `description`, `image`, `datePublished`, `dateModified`, `author`, `publisher`
- Publisher = Liverpool FC Fan Site org

### 7. Add JSON-LD builder: `buildSportsEventJsonLd(fixture)`
- Input: Fixture type from `src/lib/types/football.ts`
- Returns `SportsEvent` with `name`, `startDate`, `location` (venue), `homeTeam`, `awayTeam`, `sport: "Football"`

### 8. Add JSON-LD builder: `buildPersonJsonLd(player)`
- Input: `LfcPlayer` from squad-data
- Returns `Person` with `name`, `birthDate`, `nationality`, `image`, `url`, `memberOf` (SportsTeam)

### 9. Add JSON-LD builder: `buildImageGalleryJsonLd(images)`
- Input: `{ src, alt, width?, height? }[]`
- Returns `ImageGallery` with `ImageObject` array

### 10. Add JSON-LD builder: `buildFaqJsonLd(items)`
- Input: `{ question: string; answer: string }[]`
- Returns `FAQPage` with `mainEntity` array of `Question` objects

## Todo
- [ ] Create `src/components/seo/json-ld.tsx`
- [ ] Expand `src/lib/seo.ts` with all builders
- [ ] Add `getCanonical()` and `getHreflangAlternates()`
- [ ] Enhance `makePageMeta()` with canonical + alternates
- [ ] Verify all builders output valid JSON-LD (test with Google Rich Results validator)
- [ ] Ensure backward compatibility — existing `makePageMeta(title, desc)` calls still work

## Success Criteria
- `seo.ts` exports all 8+ utility functions
- `JsonLd` component renders valid `<script type="application/ld+json">`
- Existing pages using `makePageMeta()` continue to work without changes
- Each builder produces valid schema.org JSON-LD (verifiable via https://validator.schema.org/)

## Risk Assessment
- **Low risk.** Pure utility code, no runtime changes to existing pages
- Hreflang for cookie-based i18n: Google may not fully distinguish locales without path prefixes. Acceptable tradeoff — path-based i18n refactor is out of scope (YAGNI)

## Security Considerations
- JSON-LD content is serialized via `JSON.stringify()` — safe against XSS
- No user input flows into structured data unescaped

## Next Steps
Phase 02 uses `makePageMeta()` enhancements. Phase 03 uses all JSON-LD builders + `JsonLd` component.
