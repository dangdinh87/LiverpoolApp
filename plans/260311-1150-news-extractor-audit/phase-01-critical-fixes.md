# Phase 1: Critical Fixes

## Context
- [Plan overview](./plan.md)
- [EN sources audit](./research/researcher-en-sources-audit.md)
- [VI sources audit](./research/researcher-vi-sources-audit.md)

## Overview
Fix the 3 most broken/high-impact sources: znews.vn (CSR-heavy, ~35% Readability success), vnexpress.net (high traffic, no dedicated extractor), and thisisanfield.com (redirect loop).

## Key Insights
- znews.vn uses CSR; SSR HTML often has minimal content. Selectors: `.the-article-body`, `.article-content`, `.content-news`
- vnexpress.net is SSR/CSR hybrid; Readability works ~80% but misses images. Selectors: `.article-content`, `.the-article-body`, `.fck_detail`
- thisisanfield.com returns `ERR_TOO_MANY_REDIRECTS`; site may block scrapers or be permanently changed

## Requirements
1. Add `extractZnews` dedicated extractor in `article-extractor.ts`
2. Add `extractVnexpress` dedicated extractor in `article-extractor.ts`
3. Disable or fix thisisanfield.com RSS feed
4. Register new extractors in the `extractors` Record

## Related Code Files
- `src/lib/news/enrichers/article-extractor.ts` (lines 68-81: extractor registry)
- `src/lib/news/config.ts` (line 9: thisisanfield feed)

## Implementation Steps

### 1.1 Add `extractZnews` (znews.vn)
In `article-extractor.ts`, add before `extractGeneric`:

```typescript
function extractZnews($: cheerio.CheerioAPI, url: string): ArticleContent {
  const title = $("h1").first().text().trim() ||
    $('meta[property="og:title"]').attr("content") || "Article";
  const heroImage = $('meta[property="og:image"]').attr("content");
  const description = $('meta[property="og:description"]').attr("content");

  // znews uses .the-article-body as primary container
  const container = $(
    ".the-article-body, .article-content, .content-news, article, [role=main]"
  ).first();
  const paragraphs: string[] = [];
  const images: string[] = [];

  container.find("p").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 20) paragraphs.push(text);
  });

  container.find("img, figure img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src");
    if (src && src.startsWith("http") && !src.includes("logo") && !src.includes("icon")) {
      if (!images.includes(src)) images.push(src);
    }
  });

  // Build htmlContent for rich inline rendering if container has figures
  const figureCount = container.find("figure").length;
  const htmlContent = figureCount > 0
    ? sanitize(container.html() || "", ARTICLE_SANITIZE_OPTS)
    : undefined;

  return {
    title, heroImage, description,
    publishedAt: extractPublishedAt($),
    author: extractAuthor($),
    paragraphs, htmlContent, images,
    sourceUrl: url,
    sourceName: "ZNews",
    // Mark thin if very few paragraphs (CSR site may not render full content)
    isThinContent: paragraphs.length <= 2,
  };
}
```

### 1.2 Add `extractVnexpress` (vnexpress.net)
```typescript
function extractVnexpress($: cheerio.CheerioAPI, url: string): ArticleContent {
  const title = $("h1").first().text().trim() ||
    $('meta[property="og:title"]').attr("content") || "Article";
  const heroImage = $('meta[property="og:image"]').attr("content");
  const description = $('meta[property="og:description"]').attr("content") ||
    $(".description").first().text().trim();

  // VnExpress uses .fck_detail as primary, .article-content as fallback
  const container = $(
    ".fck_detail, .article-content, .the-article-body, article, [role=main]"
  ).first();
  const paragraphs: string[] = [];
  const images: string[] = [];

  // Extract lead/sapo text
  const sapo = $(".description, p.description").first().text().trim();
  if (sapo && sapo.length > 20 && sapo !== description) {
    paragraphs.push(sapo);
  }

  container.find("p").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 20 && !paragraphs.includes(text)) paragraphs.push(text);
  });

  container.find("img, figure img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src");
    if (src && src.startsWith("http") && !src.includes("logo") && !src.includes("icon")) {
      if (!images.includes(src)) images.push(src);
    }
  });

  return {
    title, heroImage, description,
    publishedAt: extractPublishedAt($),
    author: extractAuthor($),
    paragraphs, images,
    sourceUrl: url,
    sourceName: "VnExpress",
  };
}
```

### 1.3 Register extractors
Add to the `extractors` Record (line ~68):
```typescript
"znews.vn": extractZnews,
"vnexpress.net": extractVnexpress,
```

### 1.4 Fix thisisanfield.com
Two options (pick one based on live testing):

**Option A -- Disable feed:** Comment out in `config.ts` line 9 and add a code comment explaining the redirect loop. Remove `"thisisanfield.com": extractWordPress` from extractors.

**Option B -- Fix redirect:** Add `redirect: "follow"` and a cookie header to the fetch in `scrapeArticle()` specifically for thisisanfield.com. Only if live testing confirms the site is actually reachable with correct headers.

Recommended: **Option A** (disable) unless manual browser testing proves the site works.

## Todo
- [x] Live-test znews.vn article URL to confirm selectors (`.the-article-body` vs alternatives) — confirmed via DevTools: 13p/1fig/11img
- [x] Live-test vnexpress.net sport article to confirm `.fck_detail` selector — confirmed: 17p/2fig/49img
- [x] Test thisisanfield.com manually in browser to determine if redirect is permanent — confirmed ERR_TOO_MANY_REDIRECTS
- [x] Add extractors to registry — both `znews.vn` and `vnexpress.net` registered
- [x] Verify Readability still runs first (new extractors are fallback only) — code path unchanged
- [x] Code review completed — 8.5/10 score, no critical issues

## Phase 1 Status: COMPLETE ✅
Code review: `/Users/nguyendangdinh/LiverpoolApp/plans/reports/code-reviewer-260311-1245-phase01-critical-fixes.md`
Score: 8.5/10 — No critical issues. 1 high (O(n) dedup scan, low actual impact). All tasks done.

### Deviations from spec (intentional)
- VnExpress: `p.description` used instead of `.description` (stricter, avoids nav matches)
- ZNews: `.content-news` omitted from selector chain (YAGNI — `.the-article-body` verified working)

## Success Criteria
- znews.vn articles extract >3 paragraphs on test URLs
- vnexpress.net articles extract full content with images
- thisisanfield.com no longer causes errors in logs
- No regression on existing working extractors

## Risk Assessment
- **znews.vn CSR risk (HIGH):** If site renders content purely client-side, cheerio extractor will also fail. Mitigation: `isThinContent` flag + "read original" link. Consider future headless browser integration if critical.
- **Selector drift (MEDIUM):** Sites may change HTML structure. Mitigation: test script (Phase 4) catches regressions.
- **thisisanfield removal (LOW):** Losing one feed source. Acceptable -- site is currently broken anyway.
