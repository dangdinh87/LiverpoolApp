# Code Review: SEO Infrastructure Phase 01

**Date:** 2026-03-15
**Score: 8.5/10**

---

## Scope

- Files reviewed: `src/lib/seo.ts`, `src/components/seo/json-ld.tsx`, `src/lib/__tests__/seo.test.ts`
- Lines: ~264 + 13 + 217 = ~494
- Review focus: new SEO utility layer + structured data component + test suite

---

## Overall Assessment

Solid, well-structured implementation. Clean separation of concerns, good use of TypeScript, all 19 tests pass, no runtime errors in seo.ts itself. Three issues need attention: a security concern in `JsonLd`, TypeScript errors in the test file, and a dead field in `buildPersonJsonLd`.

---

## Critical Issues

None.

---

## High Priority Findings

### 1. XSS via `dangerouslySetInnerHTML` in `JsonLd` — unsanitized input

**File:** `src/components/seo/json-ld.tsx:10`

```tsx
dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
```

`JSON.stringify` does NOT escape HTML-special characters. If any string value in `data` contains `</script>`, browsers will terminate the script block early, allowing injection of arbitrary HTML/JS.

**PoC:** `buildNewsArticleJsonLd({ title: '</script><script>alert(1)</script>', ... })` → the rendered `<script>` tag breaks out of the JSON block.

**Fix:** Replace `JSON.stringify` with an HTML-safe serializer:

```tsx
function safeJsonStringify(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

// usage:
dangerouslySetInnerHTML={{ __html: safeJsonStringify(data) }}
```

This is the standard fix used by Next.js itself internally (see `next/dist/lib/utils.js`). The escaped Unicode sequences are valid JSON and parsed correctly by all JSON parsers.

**Note:** Risk is **low-to-medium in practice** because all current callers use static/trusted data from the server. But it is a latent vulnerability; any future caller passing user-supplied content (e.g., article titles from RSS) will be exploitable.

---

### 2. TypeScript errors in test file

**File:** `src/lib/__tests__/seo.test.ts`

`tsc --noEmit` reports 3 errors:

```
seo.test.ts(48,26): error TS2339: Property 'card' does not exist on type 'Twitter'.
seo.test.ts(59,5): error TS2578: Unused '@ts-expect-error' directive.
seo.test.ts(68,28): error TS2339: Property 'type' does not exist on type 'OpenGraph'.
```

- Line 48: `meta.twitter!.card` — Next.js `Twitter` type uses a discriminated union; `card` is only available after narrowing with `card: "summary_large_image"`. Cast or narrow: `(meta.twitter as { card: string }).card`.
- Line 59: `@ts-expect-error` is unused (no error on line 60). Remove it.
- Line 68: `meta.openGraph!.type` — same discriminated union issue on `OpenGraph`. Cast or narrow.

Tests pass via Vitest (which transpiles without type-checking), but `tsc` fails. Build would fail if `strict` tsconfig includes test files.

**Fix (line 48):**
```ts
expect((meta.twitter as { card: string }).card).toBe("summary_large_image");
```

**Fix (line 59):** remove the `@ts-expect-error` comment.

**Fix (line 68):**
```ts
expect((meta.openGraph as { type: string }).type).toBe("article");
```

---

## Medium Priority Improvements

### 3. `shirtNumber` declared but never used in `buildPersonJsonLd`

**File:** `src/lib/seo.ts:204`

`shirtNumber?: number` is in the input type but never appears in the output object. Either:
- Add it to output as `additionalProperty` (Schema.org pattern for custom fields), or
- Remove it from the type signature (YAGNI)

Given it's a fan site with player pages, adding it is justified:
```ts
...(player.shirtNumber != null && {
  additionalProperty: {
    "@type": "PropertyValue",
    name: "shirtNumber",
    value: player.shirtNumber,
  },
}),
```

---

### 4. `buildImageGalleryJsonLd` hardcodes `/gallery` path

**File:** `src/lib/seo.ts:237`

```ts
url: getCanonical("/gallery"),
```

The gallery URL is hardcoded inside the builder. Callers cannot reuse this for sub-galleries or alternate gallery routes. Minor YAGNI violation — fine for now, just note if gallery routing evolves.

---

### 5. `buildSportsEventJsonLd` — `result` field is not Schema.org standard

**File:** `src/lib/seo.ts:189-193`

`result` as a string like `"Liverpool 2 - 1 Manchester City"` is not a recognized Schema.org property for `SportsEvent`. The correct property is `subjectOf` pointing to a `Score` or you can use `homeScore`/`awayScore` as custom extensions. Google's rich result testing tool will likely ignore this field. Low SEO impact but worth knowing.

---

## Low Priority Suggestions

### 6. No `"use server"` / `"use client"` directive on `json-ld.tsx`

The file comment says "Server component" but Next.js App Router treats all `.tsx` without `"use client"` as RSC by default — so it is correct. The comment is fine but could be confusing to future maintainers if the component is accidentally co-located with client code. Acceptable as-is.

### 7. `getCanonical` doesn't handle paths starting without `/`

`getCanonical("squad")` → `"https://...squad"` (missing slash). Docs/callers always pass leading slash, so no real issue. A simple guard would be defensive:
```ts
const cleaned = path.startsWith("/") ? path : `/${path}`;
```

### 8. `makePageMeta` test at line 63-69 asserts `type` but doesn't assert `publishedTime`

The test verifies `type: "article"` but never asserts the `publishedTime` value was actually included. A complete test would also check `meta.openGraph!.publishedTime`.

---

## Positive Observations

- `PUBLISHER` constant eliminates repetition across 2 builders — good DRY.
- All optional fields use conditional spread (`...(x && { key: x })`) consistently — clean pattern.
- `getHreflangAlternates` design with same URL for all locales is correct per the cookie-based i18n approach and matches Google's guidance.
- `makePageMeta` is genuinely backward-compatible — verified against 9 existing callers, all pass `(title, desc)` with no options.
- `vi.stubEnv` before dynamic import in tests is the right pattern for module-level env constants.
- 19/19 tests pass, covering all builders including edge cases (null scores, minimal input, optional fields omitted).
- Clean code organization: constants at top, exported functions grouped by concern, JSDoc on every export.

---

## Recommended Actions

1. **Fix XSS in `JsonLd`** — replace `JSON.stringify` with HTML-safe serializer (5 min fix, high value).
2. **Fix 3 TypeScript errors in test file** — cast `meta.twitter` and `meta.openGraph` to narrow types, remove unused `@ts-expect-error`.
3. **Remove or implement `shirtNumber`** in `buildPersonJsonLd` — dead field.
4. Add `publishedTime` assertion to `makePageMeta` article test.

---

## Metrics

- Type Coverage: seo.ts — clean (0 errors). Test file — 3 TS errors.
- Test Coverage: 19/19 pass. All builders covered.
- Linting Issues (SEO files): 0 new issues introduced by these files. (Pre-existing 39 errors in unrelated files.)

---

## Unresolved Questions

- None.
