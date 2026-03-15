# Code Review — Phase 03: Structured Data / JSON-LD
**Date:** 2026-03-15
**Score: 8.5/10**

---

## Scope
- Files reviewed: 12 page files + `src/lib/seo.ts` + `src/components/seo/json-ld.tsx`
- Lines analyzed: ~2,000
- Review focus: Schema.org compliance, breadcrumb hierarchy, data-availability at insertion point, duplicate schemas, KISS/DRY

---

## Overall Assessment

Solid, consistent implementation. Pattern is uniform across all 12 pages — the same import pair (`JsonLd` + builder functions from `@/lib/seo`), same placement (first child inside container `<div>`). No regressions found. Three medium issues and several minor points listed below.

---

## Critical Issues

None.

---

## High Priority Findings

### H1 — `JsonLd` outputs an array into a single `<script>` tag for multi-schema pages

**Files:** `gallery/page.tsx`, `news/[...slug]/page.tsx`, `news/digest/[date]/page.tsx`, `player/[id]/page.tsx`, `fixtures/[id]/page.tsx`

When `data` is an array (e.g. `[BreadcrumbList, NewsArticle]`), `safeJsonStringify` serializes it as a JSON array inside one `<script type="application/ld+json">`. Google's structured data documentation recommends either:
- Separate `<script>` blocks per schema, **or**
- A single `@graph` array (with one shared `@context`)

A raw JSON array of top-level objects (each with its own `"@context"`) is technically valid per JSON-LD spec and Google currently accepts it, but it is non-standard and could silently degrade in future parser updates.

**Recommended fix** (minimal, backward-compatible): split array into multiple `<script>` tags in `JsonLd`:

```tsx
export function JsonLd({ data }: { data: object | object[] }) {
  const items = Array.isArray(data) ? data : [data];
  return (
    <>
      {items.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonStringify(item) }}
        />
      ))}
    </>
  );
}
```

---

## Medium Priority Findings

### M1 — `NewsArticle` on digest page omits `author` / `image`; may not qualify for News carousel

**File:** `src/app/news/digest/[date]/page.tsx` lines 71–76

`buildNewsArticleJsonLd` is called without `image` or `author`. Google's News carousel requires `image` (min 696px wide) and `author` for eligibility. The root-layout `Organization` is used as fallback publisher, which is fine, but `author` defaults to `SITE_NAME` string only when `sourceName` is also absent — that resolves to `"Liverpool FC Việt Nam"` which is acceptable.

The missing `image` is the real gap — the digest has no hero image so the schema will never satisfy News carousel image requirements.

**Options:**
- Accept as intentional (digest is editorial content, not a scraped article)
- Add a static fallback OG image to the digest schema (`/assets/lfc/og-default.jpg` or equivalent)

### M2 — `Person` schema uses `jobTitle: "Football goalkeeper"` etc. — non-standard for athletes

**File:** `src/lib/seo.ts` line 219, consumed by `player/[id]/page.tsx`

Schema.org recommends `Athlete` type (subtype of `Person`) with `sport` and `affiliation` for sports players. Using `jobTitle` on `Person` works but misses richer markup. This is a missed opportunity for Google's Knowledge Panel association, not a bug.

**Impact:** Low for fans site. Would matter more if indexing player pages was a priority.

### M3 — `SportsEvent` `result` field is a plain string, not a `Result` object

**File:** `src/lib/seo.ts` lines 190–192

Current output:
```json
"result": "Liverpool 2 - 1 Arsenal"
```

Schema.org `SportsEvent` expects `result` to be a `Thing` (typically omitted or structured). Google's event rich result does not currently use this field, so no breakage, but it's not a valid schema.org value type and could generate warnings in Rich Results Test.

**Fix:** Remove the `result` field entirely or wait until `EventStatusType` / score fields are officially supported.

---

## Low Priority Suggestions

### L1 — Breadcrumb item names are hardcoded English strings

All 12 pages pass `name: "Home"`, `name: "Squad"`, etc. as literal English strings, ignoring the active locale. For a bilingual site, Google recommends breadcrumb `name` match the visible page language.

Since `getCanonical` returns the same URL for both locales (cookie-based i18n), this is not a ranking issue — just consistency. Low effort to fix by passing translated names via `t("breadcrumb.home")` etc.

### L2 — `history/page.tsx` has `export const dynamic = "force-dynamic"` but data is fully static JSON

The forced dynamic rendering on the history page means the JSON-LD is regenerated on every request despite containing zero dynamic data. Not a JSON-LD issue per se, but the JSON-LD placement is inside a server component that shouldn't need to be dynamic — worth noting in context.

### L3 — `news/[...slug]/page.tsx` wraps `JsonLd` in `{content && ...}` — unnecessary

```tsx
{content && (
  <JsonLd data={[...]} />
)}
```

At this point in the render tree, `content` is guaranteed non-null (the function already returned early with a fallback UI if `!content || content.paragraphs.length === 0`). The conditional is dead code.

### L4 — Root layout uses `JSON.stringify` (XSS-unsafe) while page-level uses `safeJsonStringify`

**File:** `src/app/layout.tsx` line 89

The layout inlines three static schemas using raw `JSON.stringify`. For static strings (no user data) this is safe in practice, but inconsistent with the XSS-safe pattern used everywhere else. Low risk since the content is compile-time constant.

---

## Positive Observations

- XSS-safe serialization (`safeJsonStringify`) in `JsonLd` — correct escaping of `<`, `>`, `&`
- Consistent `getCanonical()` used for all URLs — no hardcoded domains
- `buildBreadcrumbJsonLd` hierarchy is correct on all 12 pages:
  - Home → Section (7 simple pages)
  - Home → News → Article title (article page)
  - Home → News → Daily Digest (digest page)
  - Home → Squad → Player name (player page)
  - Home → Fixtures → Match name (fixture detail)
  - Home → Gallery (gallery page)
- `buildPersonJsonLd` correctly includes `memberOf: SportsTeam` — good for Knowledge Panel
- `buildSportsEventJsonLd` includes `competitor` array — correct schema.org usage
- No duplicate schemas between root layout (WebSite, SportsTeam, Organization) and page-level schemas
- All JSON-LD placed before page content — technically irrelevant for `<script>` tags but demonstrates consistent discipline
- `buildImageGalleryJsonLd` caps at 20 images (`images.slice(0, 20)`) — avoids bloated payloads
- Tests: 58/58 passing, tsc clean (as reported, not re-verified here)

---

## Recommended Actions

1. **[Medium]** Fix `JsonLd` to emit separate `<script>` blocks per schema (H1) — 5-line change
2. **[Low]** Remove `result` string field from `buildSportsEventJsonLd` (M3) — prevents Rich Results Test warnings
3. **[Low]** Remove dead `{content && ...}` guard in `news/[...slug]/page.tsx` (L3)
4. **[Accept or defer]** Digest `NewsArticle` missing image (M1) — add static fallback image or document as accepted limitation
5. **[Defer]** Breadcrumb names localization (L1) — nice-to-have, not impactful
6. **[Defer]** Align layout.tsx to use `safeJsonStringify` (L4) — cosmetic consistency

---

## Metrics
- Schema types covered: BreadcrumbList (12), NewsArticle (2), Person (1), SportsEvent (1), ImageGallery (1)
- Root layout schemas: WebSite, SportsTeam, Organization (unchanged)
- Duplicate schemas: 0
- XSS vectors: 0 (page-level clean; layout uses static data only)
- Linting issues: 0 (tsc clean per context)

---

## Unresolved Questions

- Was `Athlete` schema type (`schema.org/Athlete`) considered vs `Person` for player pages? Player pages are likely indexed — `Athlete` would unlock richer Knowledge Panel association.
- Is the `news?q={search_term_string}` `SearchAction` in the root layout functional? If `/news` does not implement client-side query param search, this is misleading to Google.
