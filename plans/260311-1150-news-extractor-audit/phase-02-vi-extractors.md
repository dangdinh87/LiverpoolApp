# Phase 2: Vietnamese Extractor Coverage

## Context
- [Plan overview](./plan.md)
- [VI sources audit](./research/researcher-vi-sources-audit.md)
- Depends on Phase 1 completion (znews + vnexpress already handled)

## Overview
Add dedicated cheerio extractors for the 4 remaining Vietnamese sources without extractors: dantri.com.vn, vietnamnet.vn, tuoitre.vn, thanhnien.vn. All are SSR sites with predictable DOM structure. Follow the established pattern: container selector chain -> `<p>` extraction -> image extraction -> optional `htmlContent`.

## Key Insights
- All 4 sites use Vietnamese news portal conventions: `.the-article-body`, `.detail-content`, `.article-body` containers
- All have good `<p>` tag structure and OG metadata
- Readability already works 75-85% for these; dedicated extractors raise this to ~95%+
- Common pattern: lead paragraph in `.sapo` or `.description` div, then `<p>` tags in content container
- Image lazy-loading via `data-src` is common across Vietnamese sites

## Requirements
1. Add `extractDantri` for dantri.com.vn
2. Add `extractVietnamnet` for vietnamnet.vn
3. Add `extractTuoitre` for tuoitre.vn
4. Add `extractThanhnien` for thanhnien.vn
5. Register all 4 in `extractors` Record
6. Update `detectSourceName()` for new sources

## Related Code Files
- `src/lib/news/enrichers/article-extractor.ts` -- extractor registry + `detectSourceName()`
- `src/lib/news/config.ts` -- feeds already configured (lines 22-24)

## Implementation Steps

### 2.1 Shared Vietnamese extractor helper
To avoid repeating boilerplate across 4 similar extractors, create a shared helper:

```typescript
function extractVietnameseGeneric(
  $: cheerio.CheerioAPI,
  url: string,
  containerSelectors: string,
  sourceName: string,
  opts?: { sapoSelector?: string; cdnFilter?: string }
): ArticleContent {
  const title = $("h1").first().text().trim() ||
    $('meta[property="og:title"]').attr("content") || "Article";
  const heroImage = $('meta[property="og:image"]').attr("content");
  const description = $('meta[property="og:description"]').attr("content");

  const container = $(containerSelectors).first();
  const paragraphs: string[] = [];
  const images: string[] = [];

  // Extract sapo/lead text if selector provided
  if (opts?.sapoSelector) {
    const sapo = $(opts.sapoSelector).first().text().trim();
    if (sapo && sapo.length > 20) paragraphs.push(sapo);
  }

  container.find("p").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 20 && !paragraphs.includes(text)) paragraphs.push(text);
  });

  container.find("img, figure img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-original");
    if (
      src && src.startsWith("http") &&
      !src.includes("logo") && !src.includes("icon") &&
      (!opts?.cdnFilter || src.includes(opts.cdnFilter))
    ) {
      if (!images.includes(src)) images.push(src);
    }
  });

  return {
    title, heroImage, description,
    publishedAt: extractPublishedAt($),
    author: extractAuthor($),
    paragraphs, images,
    sourceUrl: url,
    sourceName,
  };
}
```

### 2.2 Add `extractDantri` (dantri.com.vn)
```typescript
function extractDantri($: cheerio.CheerioAPI, url: string): ArticleContent {
  return extractVietnameseGeneric(
    $, url,
    ".singular-content, .e-magazine__body, article .dt-news__body, article, [role=main]",
    "Dan Tri",
    { sapoSelector: ".singular-sapo, h2.e-magazine__sapo" }
  );
}
```
Known selectors: `.singular-content` (main articles), `.e-magazine__body` (long-form), `.dt-news__body` (older articles).

### 2.3 Add `extractVietnamnet` (vietnamnet.vn)
```typescript
function extractVietnamnet($: cheerio.CheerioAPI, url: string): ArticleContent {
  return extractVietnameseGeneric(
    $, url,
    ".maincontent, .content-detail, .article-detail, article, [role=main]",
    "VietNamNet",
    { sapoSelector: ".content-detail .sapo, .ArticleLead" }
  );
}
```
Known selectors: `.maincontent` (primary), `.content-detail` (article wrapper).

### 2.4 Add `extractTuoitre` (tuoitre.vn)
```typescript
function extractTuoitre($: cheerio.CheerioAPI, url: string): ArticleContent {
  return extractVietnameseGeneric(
    $, url,
    ".detail-cmain, .detail-content, article, [role=main]",
    "Tuoi Tre",
    { sapoSelector: ".detail-sapo, h2.detail-sapo" }
  );
}
```
Known selectors: `.detail-cmain` (current layout), `.detail-content` (fallback).

### 2.5 Add `extractThanhnien` (thanhnien.vn)
```typescript
function extractThanhnien($: cheerio.CheerioAPI, url: string): ArticleContent {
  return extractVietnameseGeneric(
    $, url,
    ".detail__content, .detail-content, .article-body, article, [role=main]",
    "Thanh Nien",
    { sapoSelector: ".detail__summary, .sapo" }
  );
}
```
Known selectors: `.detail__content` (current layout), `.detail-content` (legacy).

### 2.6 Register all extractors
Add to the `extractors` Record:
```typescript
"dantri.com.vn": extractDantri,
"vietnamnet.vn": extractVietnamnet,
"tuoitre.vn": extractTuoitre,
"thanhnien.vn": extractThanhnien,
```

### 2.7 Update `detectSourceName()`
Add cases for the 4 new sources:
```typescript
if (url.includes("dantri.com.vn")) return "Dan Tri";
if (url.includes("vietnamnet.vn")) return "VietNamNet";
if (url.includes("tuoitre.vn")) return "Tuoi Tre";
if (url.includes("thanhnien.vn")) return "Thanh Nien";
```

## Todo
- [ ] Live-test dantri.com.vn sport article to confirm `.singular-content` selector
- [ ] Live-test vietnamnet.vn sport article to confirm `.maincontent` selector
- [ ] Live-test tuoitre.vn sport article to confirm `.detail-cmain` selector
- [ ] Live-test thanhnien.vn sport article to confirm `.detail__content` selector
- [ ] Implement `extractVietnameseGeneric` helper
- [ ] Implement 4 source-specific extractors
- [ ] Register in extractors Record
- [ ] Update detectSourceName()
- [ ] Verify no duplicate paragraphs with sapo extraction

## Success Criteria
- All 4 sources extract >5 paragraphs on test article URLs
- Image extraction works (at least heroImage from OG tag)
- No regression on existing 24h/bongdaplus/bongda extractors
- Sapo/lead text included as first paragraph when available

## Risk Assessment
- **Selector accuracy (MEDIUM):** Selectors are based on audit + common Vietnamese patterns. Live testing required before merge. Mitigation: broad fallback chain (`article, [role=main]`).
- **DRY violation if not using helper (LOW):** 4 extractors with nearly identical logic. `extractVietnameseGeneric` helper prevents this.
- **Readability preemption (LOW):** Since Readability runs first and works 75-85% for these sites, the cheerio extractors only activate when Readability fails. They serve as a safety net. This is the correct behavior -- no change needed.
