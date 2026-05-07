# Phase 02 — Article Page DB-First Read

## Context

- Parent plan: [plan.md](plan.md)
- Brainstorm: [brainstorm-260507-1113-prescrape-articles-from-cron.md](../reports/brainstorm-260507-1113-prescrape-articles-from-cron.md)
- Scout: [scout/scout-01-relevant-files.md](scout/scout-01-relevant-files.md)

## Overview

- **Date:** 2026-05-07
- **Description:** Inside the slug page server component, read `content_en` from `articles` table directly before falling back to `scrapeArticle()`. If fresh DB content exists (< 7 days old), render it immediately. Otherwise pass through to existing on-demand scrape (which itself has the 24h cache).
- **Priority:** P2
- **Implementation status:** pending
- **Review status:** pending

## Key Insights

- Phase 01 keeps `content_en` warm via cron, so 95%+ of clicks should hit DB. The fallback path is `scrapeArticle()` (unchanged) — same code as today.
- `scrapeArticle()` already does its own DB-cache check (24h TTL, line 1365). However, that helper still pays one extra Supabase round-trip even when it ends up returning the cached value. By inlining a direct `articles`-row read here, we **avoid one round-trip on the hot path** and gain TTFB headroom.
- 7-day "fresh" window for the fast path is intentionally longer than the extractor's internal 24h TTL: hot articles get refreshed each cron, but old archive articles still render fast even if cron skipped them. If schema drifts, on-demand scrape is the safety net.
- Page already uses `Promise.all` for fan-out fetches (line 135–140). Add a new `getArticleContentFromDB(url)` helper that returns either fresh content or null, then resolve `content` based on result.

## Requirements

- New helper `getArticleContentFromDB(url: string): Promise<ArticleContent | null>` (server-only).
- Helper returns `content_en` only if `content_scraped_at` is within 7 days.
- Article page resolves `content` via: `db result ?? await scrapeArticle(url)`.
- No change to error UI (lines 147–175) — same `!content` test still works.
- Must work for both EN and VI articles. (For VI articles, `scrapeArticle` reads `content_en` storing the same shape — confirm by inspection; if VI uses `content_vi`, branch by source.)

## Architecture

```
ArticlePage()
├─ const dbContent = await getArticleContentFromDB(url)   // NEW: fast path, ~50ms
├─ const content = dbContent ?? await scrapeArticle(url)  // fallback if DB miss/stale
├─ Promise.all([getNewsFromDB(100), getFixtures(), getTranslations(...)])
└─ render
```

Reorder: DB read first (cheap), then conditional scrape, then parallel fan-out for related/fixtures.

## Related code files

- [src/app/news/[...slug]/page.tsx](../../src/app/news/[...slug]/page.tsx) — line 135 has the existing `Promise.all`; refactor needed
- [src/lib/news/db.ts](../../src/lib/news/db.ts) — add new export here (centralize DB-by-URL queries)
- [src/lib/news/enrichers/article-extractor.ts](../../src/lib/news/enrichers/article-extractor.ts) — `getCachedContent` (line 42) is similar but private; mirror its logic
- [src/lib/news/types.ts](../../src/lib/news/types.ts) — `ArticleContent` shape

## Implementation Steps

1. **Add helper** in [db.ts](../../src/lib/news/db.ts):
   ```ts
   const FRESH_CONTENT_TTL_MS = 7 * 24 * 3600 * 1000; // 7 days

   export const getArticleContentFromDB = cache(
     async (url: string): Promise<ArticleContent | null> => {
       try {
         const supabase = getServiceClient();
         const { data } = await supabase
           .from("articles")
           .select("content_en, content_scraped_at")
           .eq("url", url)
           .maybeSingle();

         if (!data?.content_en || !data.content_scraped_at) return null;
         const age = Date.now() - new Date(data.content_scraped_at).getTime();
         if (age > FRESH_CONTENT_TTL_MS) return null;
         return data.content_en as ArticleContent;
       } catch {
         return null;
       }
     }
   );
   ```
2. **Re-export** from [src/lib/news/index.ts](../../src/lib/news/index.ts) (the barrel) so `@/lib/news` import in page works.
3. **Edit** [page.tsx](../../src/app/news/[...slug]/page.tsx) lines 135–140:
   ```ts
   // Fast path: read pre-scraped content from DB
   const dbContent = await getArticleContentFromDB(url);

   const [content, allArticles, fixtures, t] = await Promise.all([
     dbContent ? Promise.resolve(dbContent) : scrapeArticle(url),
     getNewsFromDB(100),
     getFixtures(),
     getTranslations("News.article"),
   ]);
   ```
4. **Update import** on line 5: `import { scrapeArticle, getNewsFromDB, getArticleContentFromDB } from "@/lib/news";`
5. **Verify** error fallback (lines 147–175) still triggers when both DB and scrape fail — `content` will be `null`, existing branch handles.
6. **Local test**: 
   - Hit a URL whose `content_en` is recent → confirm Vercel/dev log shows no `[extractor] Cache hit` (DB-first path bypasses extractor entirely).
   - Hit a URL with NULL `content_en` → confirm fallback: `[extractor] Cache hit` or fresh scrape log appears.

## Todo

- [ ] Add `getArticleContentFromDB()` helper to db.ts
- [ ] Export from `src/lib/news/index.ts` barrel
- [ ] Refactor article page to call DB helper first
- [ ] Verify error fallback unchanged
- [ ] Local test both cache-hit and cache-miss paths

## Success Criteria

- For pre-scraped articles, page renders without invoking `scrapeArticle()` (verify via removing/re-adding a console.log in `scrapeArticle`'s entry, or by network panel showing no outbound fetch).
- TTFB on recent articles drops from 5–15s to < 1s.
- VI articles still render correctly (verify on a Vietnamese-source URL).

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Stale DB content shown to user | Medium | Minor UX (older HTML) | 7-day TTL caps freshness; cron refreshes daily |
| `maybeSingle()` returns undefined silently | Low | Falls through to scrape (correct behavior) | Defensive `if (!data?.content_en)` |
| New helper imported in client code | Low | Build fail | Helper sits in db.ts which is server-only |
| Race between cron write & page read | Negligible | Stale-by-microseconds | Acceptable; next request gets fresh |

## Security Considerations

- Service-role client used (same as existing `getCachedContent` in extractor). RLS bypass intentional for read.
- URL is pre-validated by `decodeArticleSlug(slug)` (line 132) before query.
- No user input flows into raw SQL — Supabase JS client parameterizes.

## Next steps

→ Phase 03: extend cleanup cron to NULL out old `content_en` so storage stays bounded.
