# Code Review: Phase 01 — Multi-Source News Backend

## Scope
- Files reviewed: `src/lib/rss-parser.ts` (429 LOC), `next.config.ts`, `package.json`
- Consumers verified: `src/app/news/page.tsx`, `src/app/page.tsx`, `src/components/home/news-section.tsx`, `src/components/home/latest-news-widget.tsx`
- TypeScript: `npx tsc --noEmit` — 0 errors
- Review focus: security, performance, architecture, edge cases

## Score: 7.5 / 10

## Overall Assessment

Solid, well-structured implementation that meets all plan requirements. `Promise.allSettled` + per-source `try/catch` gives robust resilience. Type safety is good. Main gaps: missing fetch timeouts (can hang on slow external hosts), XSS-risk `link` values used as `href` without protocol validation, and minor DRY violation in dedup. News page copy is stale (still says "BBC Sport" everywhere despite multi-source backend).

---

## Critical Issues

None. No `dangerouslySetInnerHTML` usage, no exposed secrets, no server-only boundary violations confirmed.

---

## High Priority Findings

### 1. No fetch timeout — `scrapeBongdaplus` and RSS parser can hang indefinitely

`scrapeBongdaplus()` calls `fetch(BONGDAPLUS_URL, {...})` with no `AbortController`/`signal`. `rss-parser`'s `parseURL()` also has no timeout configured. On a slow or unresponsive host, this blocks the entire `Promise.allSettled` for as long as the OS TCP timeout (~75s), degrading every page load that hits a cold ISR.

Fix for scraper:
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s
const res = await fetch(BONGDAPLUS_URL, {
  headers: { "User-Agent": "..." },
  signal: controller.signal,
  next: { revalidate: 1800 },
});
clearTimeout(timeoutId);
```

Fix for RSS parser (rss-parser supports `requestOptions`):
```typescript
const parser = new Parser({
  timeout: 8000,  // ms
  customFields: { ... },
});
```

### 2. `link: item.link ?? "#"` — `href="#"` is a valid fallback but `javascript:` URLs from malicious RSS are not blocked

`extractUrl()` returns any string from a `media:thumbnail` / `enclosure` object without protocol validation. If a hostile RSS item has `<link>javascript:alert(1)</link>`, it ends up as `href={article.link}` in the news page — React renders it as a raw anchor, which is XSS in non-CSP environments.

Same risk applies to `thumbnail` URLs passed to `<img src>` or `<Image src>` — `data:` URIs can leak data.

Minimal fix in `fetchRssFeed` and `scrapeBongdaplus`:
```typescript
function sanitizeUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return "#";
}
// Then: link: sanitizeUrl(item.link ?? "#")
// And:  thumbnail: thumb ? sanitizeUrl(thumb) : undefined
```

---

## Medium Priority Improvements

### 3. Inline dedup inside `scrapeBongdaplus` fallback path is a DRY violation

Lines 258–263 perform the same Set-based dedup that `deduplicateArticles()` (line 308) already does for the global merge. The per-scraper dedup is harmless but redundant — `deduplicateArticles` at the merge step will catch duplicates anyway. Remove the inline dedup from `scrapeBongdaplus`.

### 4. `pubDate: new Date().toISOString()` for scraped articles poisons sort order

Bongdaplus articles don't expose a date in the scraped HTML, so they get `now` as `pubDate`. After sort-by-date-desc they will always appear at the top, displacing real BBC/Guardian articles with accurate timestamps. This is misleading UX, not just a cosmetic issue.

Better options (pick one):
- Assign a sentinel value (`pubDate: ""`) and render "Unknown date" in UI
- Sort scraped articles to the end when `pubDate` was synthesized (add `isDateSynthesized: boolean` flag)
- Accept the tradeoff and document it — but don't silently inject `now`

### 5. `SOURCE_CONFIG` label `"BD+"` deviates from plan spec `"BĐ+"`

Plan specifies Vietnamese label `"BĐ+"` (with Đ), implementation uses ASCII `"BD+"`. Minor but inconsistent with the Vietnamese branding intent.

### 6. `rss-parser` `parseURL` uses internal `got` HTTP — no User-Agent set for RSS feeds

The scraper correctly sets a User-Agent for Bongdaplus. The RSS parser (`parseURL`) uses its own HTTP stack (no custom headers). Some Vietnamese hosts (bongda.com.vn) may return 403 or serve bot-detection HTML if no UA is set. Use `parser.parseString()` after a manual `fetch` with headers, or configure `requestOptions` on the parser:
```typescript
const parser = new Parser({
  requestOptions: {
    rejectUnauthorized: false, // only if needed for VN certs
    headers: { "User-Agent": "Mozilla/5.0 (compatible; LiverpoolApp/1.0)" },
  },
  ...
});
```

---

## Low Priority Suggestions

### 7. `key={i}` index keys in news page

`src/app/news/page.tsx` lines 106/108 uses array index as React key. Use `article.link` instead — avoids reconciliation bugs if list order changes between renders.

### 8. Stale copy in `news/page.tsx` and `news-section.tsx`

- `metadata.description`: "Latest Liverpool FC news from BBC Sport." — should say "from multiple sources"
- Hero subtitle: "Liverpool FC news powered by BBC Sport RSS feed" — stale
- Attribution footer: only credits BBC Sport — should list all 5 sources
- `news-section.tsx` label: "BBC Sport" hardcoded — use `SOURCE_CONFIG` or generic "Latest News"

These are UI copy issues, not backend bugs, but they misrepresent what Phase 01 built.

### 9. No `next: { revalidate }` on RSS `parser.parseURL()` calls

The Bongdaplus `fetch` correctly sets `next: { revalidate: 1800 }` for Next.js ISR cache. The RSS feeds fetched via `parser.parseURL()` bypass Next.js fetch instrumentation entirely (rss-parser uses `got` internally), so Next.js cannot deduplicate or cache those requests. This is a known limitation — the ISR at page level still protects against per-request hammering, but worth noting. Consider fetching RSS URLs manually with `fetch()` + `res.text()` + `parser.parseString()` for unified cache control.

### 10. `cheerio` version `^1.2.0` — verify types are bundled

`cheerio@1.0+` ships its own TypeScript types; `@types/cheerio` is not needed. Confirmed correct in `package.json` (no `@types/cheerio`). Just noting this is intentionally clean.

---

## Positive Observations

- `Promise.allSettled` pattern: correct choice — a single RSS failure does not cascade
- Per-source `try/catch` with `console.warn` and `return []`: clean graceful degradation
- `extractUrl()` handles all three RSS media formats (`media:thumbnail`, `enclosure`, `media:content`) with proper type guards — defensive and thorough
- `deduplicateArticles` normalizes URL (strip protocol, www, trailing slash) before dedup — handles cross-protocol duplicates correctly
- `import "server-only"` at top of file — correct, prevents accidental client bundle inclusion
- `React.cache()` wrapping `getNews` — correct for request deduplication within a single render pass
- `filter` keyword on 24h feed is applied to both `title` AND `contentSnippet` — catches more relevant articles
- Scraper uses multiple CSS selector fallbacks + generic link fallback — resilient to site structure changes
- `cheerio` is server-only, adds zero client bundle weight
- `next.config.ts` uses precise hostnames (not `**` wildcards) for most entries — good security posture; wildcard `*.bongda.com.vn`, `*.24h.com.vn`, `*.bongdaplus.vn` are reasonable given CDN subdomain variance

---

## Recommended Actions

1. **[High]** Add fetch timeouts (8s) to both `scrapeBongdaplus` fetch and RSS parser
2. **[High]** Sanitize `link` and `thumbnail` URLs — reject non-`https?://` protocols
3. **[Medium]** Remove inline dedup inside `scrapeBongdaplus` fallback path (DRY)
4. **[Medium]** Address synthetic `pubDate: now` for Bongdaplus — flag or sort-to-end
5. **[Low]** Fix stale copy in `news/page.tsx`, `news-section.tsx` (metadata description, hero text, attribution)
6. **[Low]** Fix `key={i}` → `key={article.link}` in news page article list
7. **[Low]** Fix `"BD+"` → `"BĐ+"` label in `SOURCE_CONFIG` if Vietnamese branding is required

---

## Metrics

- TypeScript: 0 errors (`tsc --noEmit` clean)
- Linting: not run (no `type-check` script in package.json)
- Test coverage: 0% (no tests — consistent with project baseline)
- All 9 plan requirements: met
- Plan status updated: `phase-01-multi-source-backend.md` → Status: Complete

---

## Unresolved Questions

1. Does bongda.com.vn `/liverpool.rss` actually return Liverpool-specific content, or is it a full football feed that also needs keyword filtering? (Cannot verify at review time — runtime test needed.)
2. Will `parser.parseURL()` be blocked by bongda.com.vn / 24h.com.vn without a User-Agent header? No UA is sent for RSS feeds — needs runtime validation.
3. Phase 02 (news page redesign) is expected to consume `SOURCE_CONFIG` for source badges — confirm that is where the stale copy will be fixed, or fix it now in Phase 01.
