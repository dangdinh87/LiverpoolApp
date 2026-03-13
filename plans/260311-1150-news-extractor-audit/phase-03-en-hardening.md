# Phase 3: English Source Hardening

## Context
- [Plan overview](./plan.md)
- [EN sources audit](./research/researcher-en-sources-audit.md)

## Overview
Improve extraction reliability for 3 partial English sources (BBC, liverpoolecho, anfieldwatch) and add `htmlContent` support for Guardian's rich figure/img structure.

## Key Insights
- BBC and liverpoolecho are CSR-heavy; cheerio sees minimal HTML. Since we use server-side fetch (no headless browser), the cheerio extractor will always be limited. Readability is the primary path for these.
- Guardian has excellent SSR with `<figure>` elements containing images + captions; worth preserving via `htmlContent`
- anfieldwatch is WordPress; current `extractWordPress` extractor should work but is untested on real articles
- Current architecture: Readability runs FIRST. Cheerio extractors are fallback only. This means improving the cheerio fallback has less impact for sites where Readability already works well.

## Requirements
1. Improve BBC extractor with broader selectors and data attribute handling
2. Improve liverpoolecho extractor with Reach CMS selectors
3. Verify anfieldwatch extractor works (test, fix if needed)
4. Add `htmlContent` to Guardian extractor for rich figure rendering

## Related Code Files
- `src/lib/news/enrichers/article-extractor.ts` (lines 145-214: BBC + Guardian extractors)
- `src/app/globals.css` (lines 367-400: `.article-html-content` styles)

## Implementation Steps

### 3.1 Improve BBC extractor
BBC Sport uses a specific article structure. Update `extractBBC`:

```typescript
function extractBBC($: cheerio.CheerioAPI, url: string): ArticleContent {
  const title = $("h1").first().text().trim() ||
    $('meta[property="og:title"]').attr("content") || "Article";
  const heroImage = $('meta[property="og:image"]').attr("content");
  const description = $('meta[property="og:description"]').attr("content");

  // BBC Sport uses multiple container patterns
  const container = $(
    "article, [data-component='text-block'], #main-content, [role=main], main"
  ).first();
  const paragraphs: string[] = [];
  const images: string[] = [];

  // BBC uses data-component="text-block" for article paragraphs
  $("[data-component='text-block'] p, article p").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 20 && !paragraphs.includes(text)) paragraphs.push(text);
  });

  // Fallback: if no paragraphs from specific selectors, try container
  if (paragraphs.length === 0) {
    container.find("p").each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 20) paragraphs.push(text);
    });
  }

  container.find("img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src");
    if (src && src.startsWith("http") && !src.includes("placeholder") && !src.includes("logo")) {
      if (!images.includes(src)) images.push(src);
    }
  });

  return {
    title, heroImage, description,
    publishedAt: extractPublishedAt($),
    author: extractAuthor($),
    paragraphs, images,
    sourceUrl: url,
    sourceName: "BBC Sport",
  };
}
```

Key changes: added `data-component='text-block'` selector (BBC's article paragraph wrapper), deduplication, broader fallback chain.

### 3.2 Improve liverpoolecho extractor
Replace `extractGenericEnglish` mapping for liverpoolecho with a dedicated extractor:

```typescript
function extractLiverpoolEcho($: cheerio.CheerioAPI, url: string): ArticleContent {
  const title = $("h1").first().text().trim() ||
    $('meta[property="og:title"]').attr("content") || "Article";
  const heroImage = $('meta[property="og:image"]').attr("content");
  const description = $('meta[property="og:description"]').attr("content");

  // Liverpool Echo uses Reach CMS (shared with Mirror, Express, etc.)
  const container = $(
    "[data-article-body], .article-body, article, [role=main], main"
  ).first();
  const paragraphs: string[] = [];
  const images: string[] = [];

  container.find("p").each((_, el) => {
    const text = $(el).text().trim();
    if (
      text.length > 20 &&
      !text.includes("Sign up") &&
      !text.includes("newsletter") &&
      !text.includes("Follow us")
    ) {
      paragraphs.push(text);
    }
  });

  container.find("img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src");
    if (src && src.startsWith("http") && !src.includes("logo")) {
      if (!images.includes(src)) images.push(src);
    }
  });

  return {
    title, heroImage, description,
    publishedAt: extractPublishedAt($),
    author: extractAuthor($),
    paragraphs, images,
    sourceUrl: url,
    sourceName: "Liverpool Echo",
  };
}
```

Update registry: `"liverpoolecho.co.uk": extractLiverpoolEcho`.

### 3.3 Verify anfieldwatch extractor
Current `extractWordPress` should work for anfieldwatch (`.entry-content` selector). Steps:
1. Fetch a real anfieldwatch article URL from the RSS feed
2. Run extraction and check paragraph count
3. If <3 paragraphs, add site-specific selector overrides

No code change expected unless testing reveals issues. Document test results.

### 3.4 Add Guardian `htmlContent` support
Guardian has `<figure>` elements with `<img>` + `<figcaption>`. Preserve via `htmlContent`:

```typescript
function extractGuardian($: cheerio.CheerioAPI, url: string): ArticleContent {
  const title = $("h1").first().text().trim();
  const heroImage = $('meta[property="og:image"]').attr("content");
  const description = $('meta[property="og:description"]').attr("content");

  const container = $("article");
  const paragraphs: string[] = [];
  const images: string[] = [];

  container.find("p").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 20) paragraphs.push(text);
  });

  container.find("img[src*='guim']").each((_, el) => {
    const src = $(el).attr("src");
    if (src) images.push(src);
  });

  // Build htmlContent if Guardian article has figures (rich image+caption layout)
  const figureCount = container.find("figure").length;
  const htmlContent = figureCount >= 2
    ? sanitize(container.html() || "", ARTICLE_SANITIZE_OPTS)
    : undefined;

  return {
    title, heroImage, description,
    publishedAt: extractPublishedAt($),
    author: extractAuthor($),
    paragraphs, htmlContent, images,
    sourceUrl: url,
    sourceName: "The Guardian",
  };
}
```

**Note:** Guardian htmlContent only activates when Readability fails (Readability runs first and already provides htmlContent). This is a safety net for the cheerio fallback path.

## Todo
- [ ] Update `extractBBC` with `data-component` selectors
- [ ] Create `extractLiverpoolEcho` and update registry
- [ ] Test anfieldwatch with real article URL from RSS
- [ ] Add `htmlContent` to `extractGuardian`
- [ ] Test BBC article extraction (may need to find a direct article URL from RSS)
- [ ] Verify CSR sites still get `isThinContent` flag when content is minimal

## Success Criteria
- BBC cheerio fallback extracts >3 paragraphs on SSR-rendered articles
- liverpoolecho filters out newsletter/signup noise paragraphs
- anfieldwatch confirmed working or fixed
- Guardian preserves figure/figcaption structure in cheerio fallback path

## Risk Assessment
- **BBC CSR limitation (HIGH):** BBC Sport articles are heavily CSR. Cheerio will always be limited. Readability is the real extraction path. The cheerio fallback improvement has marginal impact. Mitigation: accept Readability as primary; cheerio is safety net only.
- **Guardian htmlContent size (LOW):** Sanitized `<article>` content could be large. Mitigation: only activate when figure count >= 2; sanitize strips scripts/styles.
- **liverpoolecho CMS changes (MEDIUM):** Reach CMS may update selectors. Mitigation: broad fallback chain + Phase 4 testing script.
