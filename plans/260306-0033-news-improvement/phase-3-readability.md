# Phase 3: Article Reading — Readability + Sanitization

## Context
- [plan.md](./plan.md) | Depends on [Phase 1](./phase-1-architecture.md), [Phase 2](./phase-2-pipeline.md)
- Current: 6 per-site cheerio extractors in `article-extractor.ts` (from Phase 1 move)
- Bongdaplus: client-rendered, minimal content extractable without headless browser

## Overview
Replace brittle per-site cheerio extractors with `@mozilla/readability` as primary content extraction engine. Keep cheerio extractors as per-site fallbacks. Add `sanitize-html` to strip unsafe tags from extracted content. Improve Bongdaplus handling with OG-meta-only extraction and redirect banner.

## Key Insights
- `@mozilla/readability` uses Firefox's article extraction algorithm — handles most English news sites well
- Requires `jsdom` to create a DOM from HTML string (Node.js only, fine for server components)
- Vietnamese sites may need cheerio fallback (Readability trained primarily on English content)
- `sanitize-html` strips `<script>`, `<iframe>`, `<style>`, event handlers — essential since we render extracted HTML
- Bongdaplus content is client-rendered JS — Readability won't help. Accept OG-meta-only, show redirect banner.
- Current extractors return `paragraphs: string[]` (plain text). Readability returns HTML. Decision: keep `paragraphs` as plain text, add optional `htmlContent` for rich rendering.

## Requirements
1. Install `@mozilla/readability`, `jsdom`, `sanitize-html` + types
2. Create `enrichers/readability.ts` — primary content extractor using Readability
3. Refactor `enrichers/article-extractor.ts` extraction flow: Readability first → cheerio fallback
4. Add `sanitize-html` pass on all extracted content
5. Add `htmlContent?: string` field to `ArticleContent` for rich rendering
6. Improve Bongdaplus: detect thin content, show redirect banner
7. Add reading time estimation to `ArticleContent`

## Architecture

### Extraction Flow (per article)
```
fetch HTML
    ↓
Readability parse (via jsdom)
    ↓ success?
   YES → sanitize-html → ArticleContent (htmlContent + paragraphs)
   NO  → cheerio per-site extractor → sanitize-html → ArticleContent
    ↓
OG meta fallback for missing fields (heroImage, publishedAt)
    ↓
Reading time calculation
```

### Readability Enricher
```typescript
// src/lib/news/enrichers/readability.ts
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import sanitize from "sanitize-html";

const SANITIZE_OPTS: sanitize.IOptions = {
  allowedTags: sanitize.defaults.allowedTags.concat(["img", "figure", "figcaption"]),
  allowedAttributes: {
    ...sanitize.defaults.allowedAttributes,
    img: ["src", "alt", "width", "height", "loading"],
  },
  allowedSchemes: ["https", "http"],
};

interface ReadabilityResult {
  title: string;
  htmlContent: string;
  textContent: string;
  excerpt: string;
  byline: string | null;
  length: number;
}

export function extractWithReadability(html: string, url: string): ReadabilityResult | null {
  try {
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    if (!article || article.length < 200) return null; // too short = bad extraction

    return {
      title: article.title,
      htmlContent: sanitize(article.content, SANITIZE_OPTS),
      textContent: article.textContent,
      excerpt: article.excerpt ?? "",
      byline: article.byline,
      length: article.length,
    };
  } catch {
    return null;
  }
}

export function estimateReadingTime(text: string): number {
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200)); // 200 wpm
}
```

### Updated ArticleContent Type
```typescript
// types.ts — additions to ArticleContent
export interface ArticleContent {
  title: string;
  heroImage?: string;
  description?: string;
  publishedAt?: string;
  author?: string;
  paragraphs: string[];       // plain text (backward compat)
  htmlContent?: string;        // NEW: sanitized HTML from Readability
  images: string[];
  sourceUrl: string;
  sourceName: string;
  readingTime?: number;        // NEW: estimated minutes
  isThinContent?: boolean;     // NEW: flag for redirect banner
}
```

### Updated Article Extractor Flow
```typescript
// enrichers/article-extractor.ts — updated scrapeArticle()
export const scrapeArticle = cache(async (url: string): Promise<ArticleContent | null> => {
  // ... fetch HTML (unchanged) ...
  const html = await res.text();

  // 1. Try Readability first
  const readable = extractWithReadability(html, url);
  if (readable && readable.length > 300) {
    const $ = cheerio.load(html);
    return {
      title: readable.title,
      heroImage: $('meta[property="og:image"]').attr("content"),
      description: readable.excerpt,
      publishedAt: extractPublishedAt($),
      author: readable.byline ?? extractAuthor($),
      paragraphs: readable.textContent.split(/\n\n+/).filter((p) => p.trim().length > 20),
      htmlContent: readable.htmlContent,
      images: [],
      sourceUrl: url,
      sourceName: detectSourceName(url),
      readingTime: estimateReadingTime(readable.textContent),
    };
  }

  // 2. Fallback: per-site cheerio extractor (existing logic)
  const $ = cheerio.load(html); // already loaded above, reuse
  const extractor = findExtractor(url);
  const content = extractor($, url);
  content.readingTime = estimateReadingTime(content.paragraphs.join(" "));

  // 3. Sanitize paragraphs (plain text — strip any HTML that leaked through)
  content.paragraphs = content.paragraphs.map((p) => sanitize(p, { allowedTags: [] }));

  // 4. Detect thin content
  if (content.paragraphs.length <= 1) {
    content.isThinContent = true;
  }

  return content;
});
```

### Bongdaplus Handling
```typescript
// In article-extractor.ts — Bongdaplus-specific logic
function extractBongdaplus($: cheerio.CheerioAPI, url: string): ArticleContent {
  // Keep existing extraction attempt...
  const content = /* existing logic */;

  // Always flag as thin content — client-rendered site
  content.isThinContent = true;
  return content;
}
```

### Article Detail Page Update (thin content)
The existing thin-content banner in `news/[slug]/page.tsx` (lines 237-251) already handles `paragraphs.length <= 2`. After this phase, additionally check `isThinContent` flag:
```tsx
{(content.isThinContent || content.paragraphs.length <= 2) && (
  <RedirectBanner url={url} sourceName={content.sourceName} />
)}
```

## Related Code Files
- `src/lib/news/enrichers/article-extractor.ts` — refactor extraction flow
- `src/lib/news/enrichers/readability.ts` — NEW: Readability wrapper
- `src/lib/news/types.ts` — add `htmlContent`, `readingTime`, `isThinContent`
- `src/app/news/[slug]/page.tsx` — render `htmlContent` when available, show reading time
- `package.json` — new deps

## Implementation Steps

### Step 1: Install dependencies
```bash
npm install @mozilla/readability jsdom sanitize-html
npm install -D @types/jsdom @types/sanitize-html
```

### Step 2: Create `src/lib/news/enrichers/readability.ts`
- `extractWithReadability(html, url)` — JSDOM + Readability + sanitize-html
- `estimateReadingTime(text)` — word count / 200 wpm
- Export sanitize-html config for reuse

### Step 3: Update `src/lib/news/types.ts`
- Add `htmlContent?: string`, `readingTime?: number`, `isThinContent?: boolean` to `ArticleContent`

### Step 4: Refactor `src/lib/news/enrichers/article-extractor.ts`
- Import `extractWithReadability`, `estimateReadingTime`
- In `scrapeArticle()`: try Readability first, fall back to per-site cheerio
- Sanitize all paragraphs (strip leaked HTML)
- Set `isThinContent` flag for Bongdaplus and other thin extractors
- Keep existing per-site extractors unchanged (they're fallbacks now)

### Step 5: Update `src/app/news/[slug]/page.tsx`
- Show reading time badge next to publish date
- When `htmlContent` available, render it via `dangerouslySetInnerHTML` with proper CSS
- Add article prose styles (`.prose` class or custom Tailwind)
- Update thin-content banner to check `isThinContent` flag

### Step 6: Build + test
- `npm run build`
- Test article rendering for each source: LFC, BBC, Guardian, Bongda, 24h, Bongdaplus
- Verify Bongdaplus shows redirect banner
- Verify Readability output is clean (no script tags, no iframes)

## Todo List
- [ ] Install `@mozilla/readability`, `jsdom`, `sanitize-html` + types
- [ ] Create `enrichers/readability.ts`
- [ ] Add new fields to `ArticleContent` type
- [ ] Refactor `article-extractor.ts` extraction flow
- [ ] Add reading time estimation
- [ ] Add `isThinContent` flag for Bongdaplus
- [ ] Update `[slug]/page.tsx` for `htmlContent` rendering
- [ ] Add article prose styles
- [ ] Update thin-content banner
- [ ] Build + test all source types

## Success Criteria
- Readability extracts clean content from BBC, Guardian, LFC, new English sources
- Cheerio fallback activates for Vietnamese sites where Readability fails
- All extracted content passes through sanitize-html (no XSS vectors)
- Bongdaplus articles show redirect banner
- Reading time displayed on article pages
- `htmlContent` renders with proper typography (headings, lists, blockquotes preserved)

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `jsdom` adds bundle size / cold start latency | Medium | Medium | Only imported in server components; tree-shaken from client. Monitor Vercel cold starts. |
| Readability extracts nav/sidebar text | Low | Medium | Length check (>300 chars); fallback to cheerio if too short |
| `sanitize-html` strips needed content | Low | Low | Allowlist includes `img`, `figure`, common formatting tags |
| Vietnamese sites extract poorly with Readability | Medium | Low | Cheerio fallback handles this; Readability only primary for English |

## Security Considerations
- **Critical**: `htmlContent` rendered via `dangerouslySetInnerHTML` — `sanitize-html` MUST run before storage
- Sanitize config: no `<script>`, `<iframe>`, `<object>`, `<embed>`, `<form>`, no `on*` event attributes
- Only `https://` and `http://` schemes allowed in `<img src>` and `<a href>`
- CSP headers should be maintained (existing Next.js config)

## Next Steps
Phase 4 uses `category` and `readingTime` fields in the UI: category filter tabs, enhanced card designs, and bookmark functionality.
