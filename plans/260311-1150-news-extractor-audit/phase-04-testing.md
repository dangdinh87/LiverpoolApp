# Phase 4: Testing & Monitoring

## Context
- [Plan overview](./plan.md)
- Depends on Phases 1-3 completion

## Overview
Create a test script that validates extraction quality across all 16 sources using real article URLs. Add structured logging to `scrapeArticle()` for monitoring extraction success rates in production.

## Key Insights
- No automated tests exist for extractors; breakage is only discovered when users see empty articles
- Each source needs at least 1 test URL (ideally 2-3) to validate selectors
- Logging extraction method (Readability vs cheerio) + paragraph count enables monitoring without extra infrastructure
- Test script should be runnable locally via `npx tsx` -- no test framework dependency needed

## Requirements
1. Create `scripts/test-extractors.ts` -- validates extraction on sample URLs
2. Add structured console logging to `scrapeArticle()` for extraction method + quality
3. Document selector patterns per source in a reference table

## Related Code Files
- `src/lib/news/enrichers/article-extractor.ts` (lines 500-596: `scrapeArticle`)
- `src/lib/news/config.ts` (RSS feed URLs for finding test articles)

## Implementation Steps

### 4.1 Create test script
Create `scripts/test-extractors.ts`:

```typescript
/**
 * Test extractor quality on real article URLs.
 * Usage: npx tsx scripts/test-extractors.ts
 *
 * Fetches one article per source and reports extraction quality.
 */

// Test URLs -- update periodically with fresh articles
const TEST_URLS: Record<string, string> = {
  "liverpoolfc.com": "https://www.liverpoolfc.com/news/...",  // fill with real URL
  "bbc.com": "https://www.bbc.com/sport/football/...",
  "theguardian.com": "https://www.theguardian.com/football/...",
  "anfieldwatch.co.uk": "https://www.anfieldwatch.co.uk/...",
  "empireofthekop.com": "https://www.empireofthekop.com/...",
  "liverpoolecho.co.uk": "https://www.liverpoolecho.co.uk/...",
  "bongda.com.vn": "https://bongda.com.vn/...",
  "24h.com.vn": "https://www.24h.com.vn/...",
  "bongdaplus.vn": "https://bongdaplus.vn/...",
  "vnexpress.net": "https://vnexpress.net/...",
  "tuoitre.vn": "https://tuoitre.vn/...",
  "thanhnien.vn": "https://thanhnien.vn/...",
  "dantri.com.vn": "https://dantri.com.vn/...",
  "znews.vn": "https://znews.vn/...",
  "vietnamnet.vn": "https://vietnamnet.vn/...",
};

interface TestResult {
  source: string;
  url: string;
  status: "pass" | "fail" | "thin" | "error";
  paragraphs: number;
  images: number;
  hasTitle: boolean;
  hasHeroImage: boolean;
  method: string; // "readability" | "cheerio" | "unknown"
  error?: string;
}

async function testUrl(source: string, url: string): Promise<TestResult> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ...",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) {
      return { source, url, status: "error", paragraphs: 0, images: 0,
               hasTitle: false, hasHeroImage: false, method: "unknown",
               error: `HTTP ${res.status}` };
    }
    // Would need to import scrapeArticle -- this is pseudocode
    // In practice, import from the actual module
    // const content = await scrapeArticle(url);
    // Report results based on content
    return { source, url, status: "pass", paragraphs: 0, images: 0,
             hasTitle: true, hasHeroImage: true, method: "unknown" };
  } catch (err) {
    return { source, url, status: "error", paragraphs: 0, images: 0,
             hasTitle: false, hasHeroImage: false, method: "unknown",
             error: String(err) };
  }
}

async function main() {
  console.log("Testing extractors...\n");
  const results: TestResult[] = [];
  for (const [source, url] of Object.entries(TEST_URLS)) {
    const result = await testUrl(source, url);
    results.push(result);
    const icon = result.status === "pass" ? "OK" : result.status === "thin" ? "THIN" : "FAIL";
    console.log(`[${icon}] ${source}: ${result.paragraphs}p, ${result.images}img`);
  }
  // Summary
  const passed = results.filter(r => r.status === "pass").length;
  const total = results.length;
  console.log(`\n${passed}/${total} sources passing`);
}

main();
```

**Note:** The script above is a skeleton. Implementation needs to:
1. Handle the `"server-only"` import guard (either strip it for the test script or create a test-specific entry point)
2. Import `scrapeArticle` logic without Next.js cache wrapper
3. Fill in real test URLs from current RSS feeds

Recommended approach: Create a standalone extraction function (no `cache()` wrapper, no `"server-only"`) that both `scrapeArticle` and the test script can use.

### 4.2 Add extraction logging to `scrapeArticle()`
Add structured logging after extraction completes (before return):

```typescript
// Inside scrapeArticle, after Readability succeeds:
console.log(
  `[extractor] ${detectSourceName(url)} | method=readability | paragraphs=${paragraphs.length} | len=${readable.length}`
);

// Inside scrapeArticle, after cheerio fallback:
console.log(
  `[extractor] ${content.sourceName} | method=cheerio | paragraphs=${content.paragraphs.length} | thin=${content.isThinContent ?? false}`
);
```

This gives production visibility into which extraction path runs and content quality per source.

### 4.3 Selector reference table
Add as a code comment block at the top of `article-extractor.ts`:

```typescript
/**
 * Extractor Selector Reference
 * ┌─────────────────────┬──────────────────────────────────────────┐
 * │ Source               │ Container Selectors (priority order)     │
 * ├─────────────────────┼──────────────────────────────────────────┤
 * │ liverpoolfc.com      │ #__NEXT_DATA__ (JSON) / article, main   │
 * │ bbc.com              │ [data-component=text-block], article     │
 * │ theguardian.com      │ article                                  │
 * │ empireofthekop.com   │ .entry-content, article                  │
 * │ anfieldwatch.co.uk   │ .entry-content, article                  │
 * │ liverpoolecho.co.uk  │ [data-article-body], .article-body       │
 * │ bongda.com.vn        │ section.contentDetail, article           │
 * │ 24h.com.vn           │ article, .detail-content, .cms-body      │
 * │ bongdaplus.vn        │ .news-detail, .detail-body, .content-news│
 * │ vnexpress.net        │ .fck_detail, .article-content             │
 * │ tuoitre.vn           │ .detail-cmain, .detail-content            │
 * │ thanhnien.vn         │ .detail__content, .article-body           │
 * │ dantri.com.vn        │ .singular-content, .e-magazine__body      │
 * │ znews.vn             │ .the-article-body, .article-content       │
 * │ vietnamnet.vn        │ .maincontent, .content-detail              │
 * └─────────────────────┴──────────────────────────────────────────┘
 */
```

## Todo
- [ ] Decide on test script architecture (standalone extraction fn vs mocking server-only)
- [ ] Collect real test URLs from current RSS feeds (1 per source)
- [ ] Implement test script skeleton
- [ ] Add console.log extraction logging to `scrapeArticle()`
- [ ] Add selector reference comment block
- [ ] Run test script and record baseline pass rate

## Success Criteria
- Test script runs via `npx tsx scripts/test-extractors.ts` without errors
- Script reports pass/fail per source with paragraph count
- Extraction logging appears in server console on article page load
- Selector reference table documents all 15 sources

## Risk Assessment
- **`"server-only"` import guard (MEDIUM):** Test script cannot import from modules guarded by `"server-only"`. Solution: extract core extraction logic into a shared module without the guard, or use a test-specific build config.
- **Test URL staleness (LOW):** Article URLs may become 404 over time. Mitigation: use recent articles; update URLs periodically. Could auto-fetch from RSS to get fresh URLs.
- **Logging noise (LOW):** Console logs in production may be excessive. Mitigation: use structured format, easy to grep/filter.
