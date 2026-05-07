# Phase 01 — Sync Pipeline Scrape Phase

## Context

- Parent plan: [plan.md](plan.md)
- Brainstorm: [brainstorm-260507-1113-prescrape-articles-from-cron.md](../reports/brainstorm-260507-1113-prescrape-articles-from-cron.md)
- Research (concurrency): [research/researcher-01-concurrency-patterns.md](research/researcher-01-concurrency-patterns.md)
- Scout: [scout/scout-01-relevant-files.md](scout/scout-01-relevant-files.md)

## Overview

- **Date:** 2026-05-07
- **Description:** Add a third phase to `syncPipeline()` after the og:image enrichment block: identify articles missing fresh `content_en` (or > 24h old), scrape them via existing `scrapeArticle()`, in `Promise.allSettled` batches of 5 with 8s per-fetch timeout. Track count in `SyncResult.scraped` and persist to `sync_logs`.
- **Priority:** P2
- **Implementation status:** pending
- **Review status:** pending

## Key Insights

- `scrapeArticle()` already writes to DB cache internally (lines 1436, 1469 in article-extractor.ts) and short-circuits on a 24h DB cache hit (line 1365). Simply calling it for each missing-content URL is sufficient — no new "scrapeNoCache" needed (overrides brainstorm 5.4 suggestion). YAGNI.
- The 24h cache is the right floor: articles already scraped in this window are cheap no-ops; we still log them as `scraped` count if they round-tripped.
- Concurrency = 5 (research-01 says 8 is fine but pool=5 is more polite to 17 sources). 50 articles ÷ 5 = 10 waves × 8s ≈ 80s peak — well inside the new 300s function budget.
- `React.cache` wraps `scrapeArticle` — within one request invocation, repeat calls dedupe automatically. Safe to call from sync without extra coordination.
- Use `AbortController` with 8s timeout per fetch (research-01); but since `scrapeArticle` already has its own internal 10s `AbortController`, **we keep it as-is** and instead enforce a wave-level timeout via `Promise.race` only if needed. KISS: trust the existing 10s.

## Requirements

- Function: `scrapeContentForRecentArticles(supabase): Promise<{ scraped: number; failed: number }>`
- Query articles where `content_en IS NULL OR content_scraped_at < NOW() - INTERVAL '24 hours'`, ordered by `published_at DESC`, limit 50.
- Batch size 5, `Promise.allSettled`, ignore errors per article (log and continue).
- Reuse `scrapeArticle()` — do NOT duplicate fetch/parse logic.
- Update `SyncResult` interface: add `scraped: number`.
- Persist `scraped` count to `sync_logs.source_stats.scraped` or a new column (use `source_stats` JSON for KISS — no migration).

## Architecture

```
syncPipeline()
├─ fetchAllNews(adapters, 300)        // existing
├─ bulkUpsertArticles(...)            // existing
├─ og:image enrichment (BATCH=10)     // existing — sync.ts:146-180
├─ NEW: scrapeContentForRecentArticles
│   ├─ SELECT url FROM articles
│   │  WHERE content_en IS NULL
│   │     OR content_scraped_at < (now - 24h)
│   │  ORDER BY published_at DESC LIMIT 50
│   ├─ for each batch of 5:
│   │     await Promise.allSettled(batch.map(a => scrapeArticle(a.url)))
│   │     // scrapeArticle handles own DB cache + cacheContent write
│   └─ return { scraped, failed }
└─ sync_logs insert (now includes scraped via source_stats)
```

## Related code files

- [src/lib/news/sync.ts](../../src/lib/news/sync.ts) — pipeline + `SyncResult` type (lines 12–19, insert new phase before line 182)
- [src/lib/news/enrichers/article-extractor.ts](../../src/lib/news/enrichers/article-extractor.ts) — `scrapeArticle` (line 1361), `getCachedContent` (line 42), `cacheContent` (line 62)
- [src/lib/news/supabase-service.ts](../../src/lib/news/supabase-service.ts) — `getServiceClient`
- [src/app/api/news/sync/route.ts](../../src/app/api/news/sync/route.ts) — caller of `syncPipeline()`

## Implementation Steps

1. **Edit `SyncResult`** in [sync.ts](../../src/lib/news/sync.ts) lines 12–19: add `scraped: number`.
2. **Add helper** in same file, above `syncPipeline`:
   ```ts
   const SCRAPE_BATCH = 5;
   const SCRAPE_LIMIT = 50;
   const STALE_THRESHOLD_MS = 24 * 3600 * 1000;

   async function scrapeContentForRecentArticles(
     supabase: SupabaseClient<any, "public", any>
   ): Promise<{ scraped: number; failed: number }> {
     const staleCutoff = new Date(Date.now() - STALE_THRESHOLD_MS).toISOString();

     // PostgREST: filter rows where content_en is NULL OR content_scraped_at < cutoff
     const { data, error } = await supabase
       .from("articles")
       .select("url")
       .eq("is_active", true)
       .or(`content_en.is.null,content_scraped_at.lt.${staleCutoff}`)
       .order("published_at", { ascending: false })
       .limit(SCRAPE_LIMIT);

     if (error || !data?.length) {
       if (error) console.error(`[sync] scrape query failed: ${error.message}`);
       return { scraped: 0, failed: 0 };
     }

     let scraped = 0;
     let failed = 0;
     for (let i = 0; i < data.length; i += SCRAPE_BATCH) {
       const batch = data.slice(i, i + SCRAPE_BATCH);
       const results = await Promise.allSettled(
         batch.map((row) => scrapeArticle(row.url))
       );
       for (const r of results) {
         if (r.status === "fulfilled" && r.value) scraped++;
         else failed++;
       }
     }

     console.log(`[sync] Pre-scraped ${scraped}/${data.length} articles (${failed} failed)`);
     return { scraped, failed };
   }
   ```
3. **Import** at top of file: `import { scrapeArticle } from "./enrichers/article-extractor";`
4. **Call** new helper in `syncPipeline()` after the og:image block (after line 180, before `durationMs` calc):
   ```ts
   const { scraped, failed: scrapeFailed } = await scrapeContentForRecentArticles(supabase);
   ```
5. **Update sync_logs insert** (line 185–192) to include `scraped`:
   ```ts
   source_stats: { ...sourceStats, scraped, scrapeFailed },
   ```
6. **Update return** at line 195: `return { total: articles.length, upserted, failed, enriched, scraped, durationMs, errors };`
7. **Verify type**: `SyncResult` matches `{ ..., scraped: number }`. Update any consumer of `SyncResult` (likely just route.ts spread; no change needed since spread carries new field).
8. **Manual smoke test**: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/news/sync` and inspect log line `[sync] Pre-scraped X/Y articles`.

## Todo

- [ ] Add `scraped: number` to `SyncResult` interface
- [ ] Implement `scrapeContentForRecentArticles()` helper
- [ ] Wire helper into `syncPipeline()` after og:image enrichment
- [ ] Persist `scraped` in `sync_logs.source_stats`
- [ ] Update `SyncResult` return statement
- [ ] Local smoke test via cURL
- [ ] Verify no regression in existing og:image enrichment count

## Success Criteria

- `[sync] Pre-scraped X/Y articles` log line appears on every sync.
- After first run, > 80% of articles published in last 24h have non-null `content_en`.
- `sync_logs.source_stats.scraped` populated.
- Function execution time < 200s on prod (sample 5 runs).

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Source rate-limit (429) | Low | Per-article fail logged, batch continues | `scrapeArticle` returns null on non-2xx; pool=5 across 17 domains is gentle |
| Scrape exceeds 300s budget | Low | Function timeout | 50 × 8s ÷ 5 = 80s ceiling; far below |
| `content_en` shape drift | Low | Page render fail | `ArticleContent` interface stable; `ArticleHtmlBody` already handles |
| `Promise.allSettled` swallows real bugs | Medium | Silent regressions | Log per-failure URL via `console.warn` (already in extractor) |
| Repeated calls within same request (React.cache) | None | dedup is feature | Confirmed safe |

## Security Considerations

- `scrapeArticle` uses outbound `fetch` to public source URLs only (RSS-listed). No SSRF risk — URLs vetted at upsert.
- Service-role Supabase client limited to `articles` rows; RLS bypassed by design (cron context).
- No new env vars or secrets added in this phase.

## Next steps

→ Phase 02: read `content_en` from DB first in article page so users hit the warmed cache. After that, the on-demand `scrapeArticle` becomes a rare fallback.
