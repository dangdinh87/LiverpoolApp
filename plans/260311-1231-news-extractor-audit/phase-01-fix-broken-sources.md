# Phase 1: Fix Broken Sources (45min)

## Context
- [Plan overview](./plan.md)
- [EN sources audit](../260311-1150-news-extractor-audit/research/researcher-en-sources-audit.md)

## Objective
Fix thisisanfield.com redirect loop, harden timeout handling for slow sources (BBC, Liverpool Echo), add webthethao.vn extractor.

## Current State
- thisisanfield.com feed already commented out in `config.ts` line 10
- thisisanfield.com already removed from extractors map (line 104 comment)
- BBC extractor exists but CSR-heavy -- cheerio gets empty `<article>` on many URLs
- Liverpool Echo has dedicated `extractLiverpoolEcho` with Reach CMS selectors
- Fetch timeout hardcoded to 10s (`setTimeout(() => controller.abort(), 10000)`)
- webthethao.vn has RSS feed (line 26 of config.ts) but NO extractor in registry

## Implementation Steps

### 1.1 Increase timeout for slow sources
In `scrapeArticle()` (~line 758), replace hardcoded 10s with per-source logic:
```typescript
// Slow sources need more time (Reach CMS, CSR-heavy)
const SLOW_HOSTS = ["liverpoolecho.co.uk", "bbc.com", "bbc.co.uk"];
const hostname = new URL(url).hostname;
const timeout = SLOW_HOSTS.some(h => hostname.includes(h)) ? 15000 : 10000;
const timeoutId = setTimeout(() => controller.abort(), timeout);
```

### 1.2 Add webthethao.vn extractor
webthethao.vn is a standard Vietnamese sports portal. Use `extractVietnameseGeneric` helper.
```typescript
// In extractors map:
"webthethao.vn": extractWebthethao,

// New function:
function extractWebthethao($: cheerio.CheerioAPI, url: string): ArticleContent {
  return extractVietnameseGeneric($, url,
    ".detail-content, .article-content, article, [role=main]",
    "Webthethao"
  );
}
```
Also add to `detectSourceName()`:
```typescript
if (url.includes("webthethao.vn")) return "Webthethao";
```

### 1.3 Harden BBC error handling
BBC is CSR; Readability usually handles it. Add specific logging when cheerio fallback also fails:
```typescript
// In extractBBC, after container.find("p") loop:
if (paragraphs.length === 0) {
  console.warn(`[extractor] BBC article empty (CSR likely): ${url}`);
}
```

### 1.4 Verify thisisanfield.com disabled
- Confirm feed commented out in `config.ts` (already done)
- Confirm no `thisisanfield.com` key in `extractors` map (already done)
- No further action needed

## Files to Modify
| File | Change |
|------|--------|
| `src/lib/news/enrichers/article-extractor.ts` | Timeout logic, webthethao extractor, BBC logging |

## Success Criteria
- [ ] Slow sources (BBC, Echo) use 15s timeout
- [ ] webthethao.vn articles extract >3 paragraphs
- [ ] BBC logs a warning when cheerio fallback yields 0 paragraphs
- [ ] No regression on existing extractors

## Risk Assessment
- **BBC CSR (LOW):** Readability handles BBC well; cheerio is just a fallback. Timeout increase helps with slow responses.
- **webthethao selector drift (LOW):** Standard Vietnamese CMS structure. `extractVietnameseGeneric` has wide selector fallbacks.
- **Timeout increase perf impact (LOW):** Only affects 2 slow hosts; most sources still use 10s.
