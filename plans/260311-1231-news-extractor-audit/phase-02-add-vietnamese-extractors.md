# Phase 2: Add Vietnamese Extractors & htmlContent (1.5h)

## Context
- [Plan overview](./plan.md)
- [VI sources audit](../260311-1150-news-extractor-audit/research/researcher-vi-sources-audit.md)

## Objective
Fill remaining gaps in Vietnamese extractor coverage. Add `htmlContent` support to Vietnamese extractors that have rich figure/img structures for inline image rendering.

## Current State
Code already has dedicated extractors for all 8 Vietnamese sources:
- `extractVietnamese` (24h) -- working, basic `<p>` + `<img>`
- `extractBongdaplus` -- working, `isThinContent` flag for CSR
- `extractBongda` -- working, `htmlContent` for `section.contentDetail`
- `extractZnews` -- working, `htmlContent` when figures present
- `extractVnexpress` -- working, `.fck_detail` container, NO htmlContent
- `extractDantri` -- working via `extractVietnameseGeneric`, NO htmlContent
- `extractVietnamnet` -- working via `extractVietnameseGeneric`, NO htmlContent
- `extractTuoitre` -- working via `extractVietnameseGeneric`, NO htmlContent
- `extractThanhnien` -- working via `extractVietnameseGeneric`, NO htmlContent
- **webthethao.vn** -- MISSING (addressed in Phase 1)

## Gaps to Close

### 2.1 Add htmlContent to `extractVietnameseGeneric`
Currently the DRY helper returns only `paragraphs[]` + `images[]`. Most Vietnamese sites have `<figure>` elements with captions that render better as inline HTML.

Modify `extractVietnameseGeneric` to optionally build htmlContent:
```typescript
function extractVietnameseGeneric(
  $: cheerio.CheerioAPI,
  url: string,
  containerSelectors: string,
  sourceName: string,
  opts?: { sapoSelector?: string; htmlContent?: boolean }
): ArticleContent {
  // ... existing code ...

  // Build htmlContent when figures present and opted in
  let htmlContent: string | undefined;
  if (opts?.htmlContent !== false) {
    const figureCount = container.find("figure").length;
    if (figureCount > 0) {
      htmlContent = sanitize(container.html() || "", ARTICLE_SANITIZE_OPTS);
    }
  }

  return {
    // ... existing fields ...
    htmlContent,
  };
}
```

Update callers (extractDantri, extractVietnamnet, extractTuoitre, extractThanhnien) -- no changes needed since `htmlContent` defaults to auto-detect.

### 2.2 Add htmlContent to `extractVnexpress`
VnExpress has `<figure>` tags with `<figcaption>` photo captions. Add htmlContent logic:
```typescript
// After images loop in extractVnexpress:
const figureCount = container.find("figure").length;
const htmlContent = figureCount > 0
  ? sanitize(container.html() || "", ARTICLE_SANITIZE_OPTS)
  : undefined;
```

### 2.3 Improve 24h extractor with figcaption support
The `extractVietnamese` function (used for 24h) only extracts `<p>` tags. 24h articles often have `<figcaption>` with article text embedded.

Update to also extract figcaptions:
```typescript
// Change: container.find("p").each(...)
// To:     container.find("p, figcaption").each(...)
```

### 2.4 Handle lazy-load images consistently
Ensure all Vietnamese extractors check `data-original` in addition to `data-src`. The `extractVietnameseGeneric` already does this. Verify VnExpress and ZNews also do.

Check list:
- `extractVietnameseGeneric`: checks `src | data-src | data-original` -- OK
- `extractVnexpress`: checks `src | data-src` -- ADD `data-original`
- `extractZnews`: checks `src | data-src` -- ADD `data-original`
- `extractBongda`: checks `src | data-src` -- ADD `data-original`
- `extractVietnamese` (24h): checks `src | data-src | data-original` -- OK

## Files to Modify
| File | Change |
|------|--------|
| `src/lib/news/enrichers/article-extractor.ts` | htmlContent in generic helper, VnExpress htmlContent, 24h figcaption, lazy-load consistency |

## Implementation Order
1. Update `extractVietnameseGeneric` with auto htmlContent
2. Add htmlContent to `extractVnexpress`
3. Add figcaption to `extractVietnamese` (24h)
4. Add `data-original` to VnExpress, ZNews, Bongda image extraction
5. Verify no regression via console logging

## Success Criteria
- [ ] Vietnamese articles with `<figure>` tags render inline images via htmlContent
- [ ] VnExpress articles show inline images
- [ ] 24h articles extract figcaption text
- [ ] All Vietnamese extractors handle `data-original` lazy-load attribute
- [ ] No regression on existing extraction (paragraphs count unchanged)

## Risk Assessment
- **htmlContent sanitization (MEDIUM):** Ensure `ARTICLE_SANITIZE_OPTS` strips scripts/iframes from Vietnamese CMS output. Already configured; low actual risk.
- **figcaption duplication (LOW):** Some paragraphs may duplicate figcaption text. Mitigated by `!paragraphs.includes(text)` dedup check.
- **htmlContent size (LOW):** Large articles may produce big HTML strings. `sanitize-html` strips non-essential tags; acceptable.
