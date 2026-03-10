# Phase 2: Content Pipeline — Sources, Relevance, Dedup

## Context
- [plan.md](./plan.md) | Depends on [Phase 1](./phase-1-architecture.md)
- After Phase 1, `src/lib/news/` exists with adapter pattern
- Current sources: LFC, BBC, Guardian, Bongda, 24h, Bongdaplus (6 total)
- Current dedup: URL normalization only

## Overview
Add 4 new English RSS sources, implement Zod validation for feed items, Jaccard near-duplicate detection, rule-based article categorization, Liverpool relevance scoring, and freshness-weighted sorting.

## Key Insights
- This Is Anfield (`thisisanfield.com/feed`) — dedicated LFC blog, high relevance, free RSS
- Liverpool Echo (`liverpoolecho.co.uk/all-about/liverpool-fc/?service=rss`) — local paper, frequent updates
- Sky Sports (`skysports.com/rss/12040` — PL feed) — needs `liverpool` keyword filter
- Anfield Watch (`anfieldwatch.co.uk/feed`) — LFC aggregator
- Jaccard similarity on first 60 chars of title catches cross-source dupes ("Liverpool beat Arsenal" from BBC + Guardian)
- Categories derivable from title keywords: "Match Report" if score pattern, "Transfer" if transfer/signing/deal, etc.

## Requirements
1. Add 4 new RSS sources as `RssAdapter` instances in config
2. Extend `NewsSource` type + `SOURCE_CONFIG` for new sources
3. Implement Zod schema for RSS item validation (reject malformed items)
4. Implement Jaccard title-prefix dedup (threshold 0.6) alongside URL dedup
5. Implement `ArticleCategory` enum + rule-based tagger
6. Implement relevance scoring: keyword match + source priority + freshness decay
7. Update pipeline to: validate → dedup (URL + Jaccard) → score → sort → slice

## Architecture

### New Source Configs
```typescript
// additions to config.ts RSS_FEEDS array
{ url: "https://www.thisisanfield.com/feed", source: "tia", language: "en" },
{ url: "https://www.liverpoolecho.co.uk/all-about/liverpool-fc/?service=rss", source: "echo", language: "en" },
{ url: "https://feeds.skysports.com/feeds/rss/12040.xml", source: "sky", language: "en", filter: "liverpool" },
{ url: "https://www.anfieldwatch.co.uk/feed", source: "anfield-watch", language: "en" },
```

### Extended Types
```typescript
// types.ts additions
export type NewsSource = "lfc" | "bbc" | "guardian" | "bongda" | "24h" | "bongdaplus"
  | "tia" | "echo" | "sky" | "anfield-watch";

export type ArticleCategory =
  | "match-report" | "transfer" | "injury" | "opinion"
  | "team-news" | "analysis" | "general";

export interface NewsArticle {
  // ... existing fields ...
  category?: ArticleCategory;
  relevanceScore?: number;
}
```

### Zod Validation Schema
```typescript
// src/lib/news/validation.ts
import { z } from "zod";

export const RawFeedItemSchema = z.object({
  title: z.string().min(5),
  link: z.string().url(),
  pubDate: z.string().optional(),
  contentSnippet: z.string().optional().default(""),
  // thumbnail validated separately
});

export function validateFeedItems(items: unknown[]): z.infer<typeof RawFeedItemSchema>[] {
  return items
    .map((item) => RawFeedItemSchema.safeParse(item))
    .filter((r) => r.success)
    .map((r) => r.data);
}
```

### Jaccard Dedup
```typescript
// dedup.ts additions
function tokenize(text: string): Set<string> {
  return new Set(
    text.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(Boolean)
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  const intersection = new Set([...a].filter((x) => b.has(x)));
  const union = new Set([...a, ...b]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

export function deduplicateArticles(articles: NewsArticle[]): NewsArticle[] {
  const seen = new Set<string>(); // URL dedup
  const titleTokens: { tokens: Set<string>; article: NewsArticle }[] = [];
  const result: NewsArticle[] = [];

  for (const a of articles) {
    // 1. URL dedup (existing)
    const urlKey = normalizeUrl(a.link);
    if (seen.has(urlKey)) continue;
    seen.add(urlKey);

    // 2. Jaccard title dedup (first 60 chars)
    const prefix = a.title.slice(0, 60);
    const tokens = tokenize(prefix);
    const isDupe = titleTokens.some(
      (existing) => jaccardSimilarity(tokens, existing.tokens) > 0.6
    );
    if (isDupe) continue;

    titleTokens.push({ tokens, article: a });
    result.push(a);
  }
  return result;
}
```

### Relevance Scoring
```typescript
// src/lib/news/relevance.ts
const LFC_KEYWORDS = [
  { term: "liverpool", weight: 3 },
  { term: "anfield", weight: 3 },
  { term: "salah", weight: 2 }, { term: "van dijk", weight: 2 },
  { term: "slot", weight: 2 }, { term: "the kop", weight: 2 },
  { term: "arne slot", weight: 2 },
  { term: "premier league", weight: 1 },
  { term: "champions league", weight: 1 },
];

const SOURCE_PRIORITY: Record<NewsSource, number> = {
  lfc: 10, tia: 8, "anfield-watch": 8, echo: 7,
  bbc: 6, guardian: 6, sky: 5,
  bongda: 4, "24h": 3, bongdaplus: 3,
};

export function scoreArticle(article: NewsArticle): number {
  const text = `${article.title} ${article.contentSnippet}`.toLowerCase();

  // Keyword relevance (0-10)
  let keywordScore = 0;
  for (const { term, weight } of LFC_KEYWORDS) {
    if (text.includes(term)) keywordScore += weight;
  }
  keywordScore = Math.min(keywordScore, 10);

  // Source priority (0-10)
  const srcScore = SOURCE_PRIORITY[article.source] ?? 3;

  // Freshness decay: full score within 2h, halved at 24h, near-zero at 7d
  const ageHours = (Date.now() - new Date(article.pubDate).getTime()) / 3600000;
  const freshnessScore = Math.max(0, 10 * Math.exp(-ageHours / 24));

  return keywordScore * 0.3 + srcScore * 0.3 + freshnessScore * 0.4;
}
```

### Category Tagging
```typescript
// src/lib/news/categories.ts
import type { ArticleCategory, NewsArticle } from "./types";

const RULES: { pattern: RegExp; category: ArticleCategory }[] = [
  { pattern: /\d+\s*[-–]\s*\d+|match report|post[- ]match/i, category: "match-report" },
  { pattern: /transfer|sign(s|ed|ing)|deal|bid|fee|target|swap/i, category: "transfer" },
  { pattern: /injur(y|ed|ies)|out for|ruled out|sidelined|hamstring|knee/i, category: "injury" },
  { pattern: /opinion|column|analysis|tactical|breakdown/i, category: "opinion" },
  { pattern: /team news|lineup|line-up|squad|starting xi|confirmed/i, category: "team-news" },
  { pattern: /preview|predicted|expect/i, category: "analysis" },
];

export function categorizeArticle(article: NewsArticle): ArticleCategory {
  const text = `${article.title} ${article.contentSnippet}`;
  for (const { pattern, category } of RULES) {
    if (pattern.test(text)) return category;
  }
  return "general";
}
```

### Updated Pipeline
```typescript
// pipeline.ts — updated
export async function fetchAllNews(adapters: FeedAdapter[], limit: number): Promise<NewsArticle[]> {
  const results = await Promise.allSettled(adapters.map((a) => a.fetch()));
  const all: NewsArticle[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") all.push(...r.value);
  }
  if (all.length === 0) return [];

  // Dedup (URL + Jaccard)
  const unique = deduplicateArticles(all);

  // Categorize + score
  for (const a of unique) {
    a.category = categorizeArticle(a);
    a.relevanceScore = scoreArticle(a);
  }

  // Sort by relevance score desc
  unique.sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));

  const sliced = unique.slice(0, limit);
  await enrichArticleMeta(sliced, 7);
  return sliced;
}
```

## Related Code Files
- `src/lib/news/types.ts` — extend NewsSource, add ArticleCategory
- `src/lib/news/config.ts` — add 4 new RSS_FEEDS entries + SOURCE_CONFIG entries
- `src/lib/news/dedup.ts` — add Jaccard alongside URL dedup
- `src/lib/news/pipeline.ts` — integrate validation, scoring, categorization
- `src/lib/news/index.ts` — register new adapters
- `src/lib/news-config.ts` — add new source colors for client components
- `src/app/news/page.tsx` — update attribution footer for new sources

## Implementation Steps

### Step 1: Install `zod`
```bash
npm install zod
```

### Step 2: Create `src/lib/news/validation.ts`
- Zod schema for `RawFeedItem`
- `validateFeedItems()` function
- Integrate into `RssAdapter.fetch()` — validate before mapping to `NewsArticle`

### Step 3: Extend types
- Add new source literals to `NewsSource`
- Add `ArticleCategory` type
- Add optional `category`, `relevanceScore` fields to `NewsArticle`

### Step 4: Add new sources to `config.ts`
- 4 new entries in `RSS_FEEDS`
- 4 new entries in `SOURCE_CONFIG`
- Verify RSS feed URLs are accessible (curl test)

### Step 5: Update `news-config.ts` (client-safe)
- Add matching `SOURCE_CONFIG` entries for tia, echo, sky, anfield-watch

### Step 6: Create `src/lib/news/relevance.ts`
- `scoreArticle()` with keyword + source + freshness weighting

### Step 7: Create `src/lib/news/categories.ts`
- Rule-based `categorizeArticle()` with regex patterns

### Step 8: Enhance `src/lib/news/dedup.ts`
- Add `tokenize()`, `jaccardSimilarity()` helper functions
- Integrate title-prefix Jaccard (threshold 0.6) into `deduplicateArticles()`

### Step 9: Update `pipeline.ts`
- Add Zod validation step (or inside adapter)
- Add categorization + scoring steps
- Change sort from date-only to relevance-score

### Step 10: Register new adapters in `index.ts`
- Instantiate 4 new `RssAdapter(config)` instances

### Step 11: Update `news/page.tsx` attribution
- Add links for This Is Anfield, Liverpool Echo, Sky Sports, Anfield Watch

### Step 12: Verify
- `npm run build` passes
- `/news` shows articles from new sources
- No duplicate articles from same story across sources

## Todo List
- [ ] Install zod
- [ ] Create `validation.ts` with Zod schema
- [ ] Extend `NewsSource` type with 4 new sources
- [ ] Add `ArticleCategory` type + optional fields to `NewsArticle`
- [ ] Add 4 RSS feed configs
- [ ] Add 4 SOURCE_CONFIG entries (server + client)
- [ ] Create `relevance.ts` with scoring function
- [ ] Create `categories.ts` with rule-based tagger
- [ ] Enhance `dedup.ts` with Jaccard similarity
- [ ] Update `pipeline.ts` with full pipeline
- [ ] Register adapters in `index.ts`
- [ ] Update page attribution
- [ ] curl-test all new RSS feed URLs
- [ ] Build + smoke test

## Success Criteria
- 10 sources active (6 existing + 4 new)
- Cross-source dupes eliminated (same story from BBC + Guardian shows once)
- Articles tagged with categories
- Relevance-sorted feed shows LFC-specific content first
- Malformed RSS items silently skipped (Zod validation)

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| New RSS feed URL changes/breaks | Medium | Low | Graceful per-adapter failure (Promise.allSettled) |
| Jaccard threshold too aggressive (removes non-dupes) | Low | Medium | Tune threshold; use 0.6 initially, adjustable |
| Sky Sports RSS has too many non-LFC articles | Low | Low | Keyword filter already applied in RssAdapter |
| Zod rejects valid items due to edge cases | Low | Medium | Permissive schema; `.optional()` on non-critical fields |

## Security Considerations
- New RSS feed URLs are hardcoded — no user input
- Zod validation prevents injection via malformed RSS data
- `sanitizeUrl()` applied to all new source thumbnails

## Next Steps
Phase 3 uses the category system to determine extraction strategy and enriches articles with full content via `@mozilla/readability`.
