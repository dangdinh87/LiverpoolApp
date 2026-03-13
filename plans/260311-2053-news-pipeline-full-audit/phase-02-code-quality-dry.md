# Phase 02 — Code Quality & DRY

**Date:** 2026-03-11 | **Priority:** HIGH | **Effort:** 3h (COMPLETED)
**Implementation status:** DONE (2026-03-11) | **Review status:** PASSED

## Overview

Eliminate duplicated code, dead code, and config inconsistencies. Seven issues addressed: duplicate sync logic (C2), O(n) paragraph dedup (C5), keywords in 2 files (H2), detectSource in 2 files (H4), dead validation code (M1), stale source configs (M2), znews URL bug (M6).

## Context Links

- Brainstorm: `plans/reports/brainstorm-260311-2053-news-pipeline-audit-and-ai-digest.md`
- Phase 01: `phase-01-critical-performance.md` (depends on)

## Key Insights

1. `db.ts:syncArticles()` and `api/news/sync/route.ts:GET()` both build adapters, call `fetchAllNews(300)`, map to rows, upsert in batches of 50 — nearly identical code that will drift.
2. `config.ts:LFC_KEYWORDS` (flat strings) and `relevance.ts:LFC_KEYWORDS` (weighted objects) contain same player names. Adding a new player requires editing both.
3. `article-extractor.ts:detectSourceName()` returns display name; `[...slug]/page.tsx:detectSource()` returns `NewsSource` ID. Both map URL → source with different URL checks.
4. `[...slug]/page.tsx:detectSource()` checks `zingnews.vn` but actual RSS URLs are `znews.vn` — missed detection.
5. `validation.ts:validateFeedItems()` is never called anywhere.
6. `SOURCE_CONFIG` includes `tia` and `sky` but no feeds produce articles for these.
7. 6+ extractors use `paragraphs.includes(text)` for dedup — O(n) per check on arrays.

## Requirements

### C2: Shared sync pipeline (1h)
Extract common sync logic into reusable `syncPipeline()` function.

### C5: Set-based paragraph dedup (15m)
Replace `paragraphs.includes()` with `Set<string>` in extractors.

### H2: Unify LFC_KEYWORDS (30m)
Single keyword definition with weights. Flat list derived automatically.

### H4 + M6: Unify detectSource (30m)
Single `detectSource(url)` helper returning `{ id: NewsSource, name: string }`. Fix `znews.vn`.

### M1: Remove dead validation code (15m)
Delete `validation.ts` or integrate into `RssAdapter`.

### M2: Clean up stale SOURCE_CONFIG (15m)
Remove or mark `tia`/`sky` as disabled.

## Architecture

### C2: Shared syncPipeline

Extract to `src/lib/news/sync.ts`:
```
syncPipeline(opts?) → adapters → fetchAllNews → upsert → sync_logs → re-enrich
```

Both `db.ts:syncArticles()` and `sync/route.ts:GET()` call this shared function. Route adds auth + HTTP response wrapper.

### H2: Single keyword source

```
config.ts:LFC_KEYWORDS_WEIGHTED = [{ term, weight }, ...]
config.ts:LFC_KEYWORDS = LFC_KEYWORDS_WEIGHTED.map(k => k.term)  // derived
relevance.ts: import { LFC_KEYWORDS_WEIGHTED } from "./config"
```

### H4: Unified detectSource

```
src/lib/news/source-detect.ts:
  detectSource(url): { id: NewsSource, name: string }
```

Single URL → source map used by both `article-extractor.ts` and `[...slug]/page.tsx`.

## Related Code Files

| File | Role | Changes |
|------|------|---------|
| `src/lib/news/sync.ts` | **NEW** — shared sync pipeline | C2: extract from db.ts + sync/route.ts |
| `src/lib/news/db.ts` | DB queries + sync | C2: call syncPipeline() instead of inline sync |
| `src/app/api/news/sync/route.ts` | Cron sync endpoint | C2: call syncPipeline() + add HTTP wrapper |
| `src/lib/news/config.ts` | Feed + keyword config | H2: add weighted keywords, derive flat list |
| `src/lib/news/relevance.ts` | Scoring | H2: import from config.ts instead of local def |
| `src/lib/news/source-detect.ts` | **NEW** — URL → source | H4+M6: unified detectSource |
| `src/lib/news/enrichers/article-extractor.ts` | Extractors | H4: import detectSource; C5: use Set for dedup |
| `src/app/news/[...slug]/page.tsx` | Article detail | H4: import from source-detect.ts |
| `src/lib/news/validation.ts` | Dead code | M1: delete or integrate |
| `src/lib/news/config.ts` | Source config | M2: mark tia/sky disabled |
| `src/lib/news-config.ts` | Client-side source config | M2: mark tia/sky disabled |

## Implementation Steps

### C2: Shared sync pipeline (1h)

1. **Create `src/lib/news/sync.ts`**:
```typescript
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { fetchAllNews } from "./pipeline";
import { RssAdapter } from "./adapters/rss-adapter";
import { LfcAdapter } from "./adapters/lfc-adapter";
import { BongdaplusAdapter } from "./adapters/bongdaplus-adapter";
import { RSS_FEEDS } from "./config";
import { fetchOgMeta } from "./enrichers/og-meta";
import type { NewsArticle } from "./types";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key);
}

export interface SyncResult {
  total: number;
  upserted: number;
  failed: number;
  enriched: number;
  durationMs: number;
  errors: { url: string; error: string }[];
}

export async function syncPipeline(): Promise<SyncResult> {
  const start = Date.now();
  const adapters = [
    new LfcAdapter(),
    ...RSS_FEEDS.map((cfg) => new RssAdapter(cfg)),
    new BongdaplusAdapter(),
  ];

  const articles = await fetchAllNews(adapters, 300);
  const supabase = getServiceClient();

  let upserted = 0;
  let failed = 0;
  const errors: { url: string; error: string }[] = [];

  // Upsert in batches of 50
  const batchSize = 50;
  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);
    const rows = batch.map(articleToRow);

    let retries = 1;
    for (let attempt = 0; attempt <= retries; attempt++) {
      const { data, error } = await supabase
        .from("articles")
        .upsert(rows, { onConflict: "url", ignoreDuplicates: false })
        .select("url");

      if (!error) { upserted += data?.length ?? 0; break; }

      const msg = error.message?.includes("<!DOCTYPE")
        ? "HTTP error (likely 502/503)" : error.message;

      if (attempt < retries) {
        console.warn(`[sync] Batch ${i} failed (${msg}), retrying...`);
        await new Promise((r) => setTimeout(r, 2000));
      } else {
        failed += batch.length;
        errors.push({ url: `batch-${i}`, error: msg });
      }
    }
  }

  // Re-enrich thumbnails
  let enriched = 0;
  const { data: noThumb } = await supabase
    .from("articles")
    .select("url")
    .is("thumbnail", null)
    .eq("is_active", true)
    .order("fetched_at", { ascending: false })
    .limit(30);

  if (noThumb?.length) {
    const BATCH = 10;
    for (let i = 0; i < noThumb.length; i += BATCH) {
      const batch = noThumb.slice(i, i + BATCH);
      const results = await Promise.allSettled(batch.map((r) => fetchOgMeta(r.url)));
      for (let j = 0; j < results.length; j++) {
        const r = results[j];
        if (r.status === "fulfilled" && r.value.image) {
          await supabase.from("articles")
            .update({ thumbnail: r.value.image, hero_image: r.value.image })
            .eq("url", batch[j].url);
          enriched++;
        }
      }
    }
  }

  const durationMs = Date.now() - start;

  // Log sync result
  await supabase.from("sync_logs").insert({
    inserted: upserted, updated: 0, failed,
    duration_ms: durationMs,
    errors: errors.length > 0 ? errors : null,
  });

  return { total: articles.length, upserted, failed, enriched, durationMs, errors };
}

function articleToRow(a: NewsArticle) {
  return {
    url: a.link, title: a.title, snippet: a.contentSnippet || "",
    thumbnail: a.thumbnail || null, source: a.source,
    language: a.language, category: a.category || "general",
    relevance: a.relevanceScore ?? 0,
    published_at: a.pubDate ? new Date(a.pubDate).toISOString() : null,
    author: a.author || null,
    hero_image: a.heroImage || a.thumbnail || null,
    word_count: a.wordCount || null,
    tags: a.tags || [],
    updated_at: new Date().toISOString(),
  };
}
```

2. **`src/lib/news/db.ts`** — replace inline `syncArticles()`:
   - Remove `syncArticles()` function
   - Remove adapter imports (RssAdapter, LfcAdapter, BongdaplusAdapter, RSS_FEEDS)
   - Import `syncPipeline` from `./sync`
   - In `syncIfStale()`, call `await syncPipeline()` instead of `await syncArticles()`

3. **`src/app/api/news/sync/route.ts`** — simplify to wrapper:
   - Remove inline adapter construction, row mapping, batch logic
   - Import `syncPipeline` from `@/lib/news/sync`
   - Keep auth check, call `syncPipeline()`, return result as JSON

### C5: Set-based paragraph dedup (15m)

In `article-extractor.ts`, every extractor that uses `!paragraphs.includes(text)` should use a `Set`:

**Pattern to apply in each extractor** (BBC, Bongda, LiverpoolEcho, Znews, VnExpress, extractVietnameseGeneric):
```typescript
// Before:
const paragraphs: string[] = [];
// ... inner loop:
if (text.length > 20 && !paragraphs.includes(text)) paragraphs.push(text);

// After:
const paragraphs: string[] = [];
const seen = new Set<string>();
// ... inner loop:
if (text.length > 20 && !seen.has(text)) { seen.add(text); paragraphs.push(text); }
```

Files with `paragraphs.includes()`: extractBBC, extractBongda, extractLiverpoolEcho, extractZnews, extractVnexpress, extractVietnameseGeneric. Also `images.includes()` in BBC, Bongda, LiverpoolEcho, extractVietnameseGeneric.

### H2: Unify LFC_KEYWORDS (30m)

1. **`src/lib/news/config.ts`** — rename to weighted + derive flat:
```typescript
export const LFC_KEYWORDS_WEIGHTED: { term: string; weight: number }[] = [
  { term: "liverpool", weight: 3 },
  { term: "anfield", weight: 3 },
  { term: "lfc", weight: 3 },
  { term: "the kop", weight: 2.5 },
  { term: "lữ đoàn đỏ", weight: 2.5 },
  { term: "arne slot", weight: 2.5 },
  { term: "salah", weight: 2.5 },
  { term: "van dijk", weight: 2.5 },
  { term: "virgil", weight: 2 },
  { term: "florian wirtz", weight: 3 },
  { term: "alexander isak", weight: 3 },
  // ... all remaining entries with weights
];

// Flat list for RSS keyword filtering (derived automatically)
export const LFC_KEYWORDS = LFC_KEYWORDS_WEIGHTED.map((k) => k.term);
```

2. **`src/lib/news/relevance.ts`** — remove local `LFC_KEYWORDS`, import from config:
```typescript
import { LFC_KEYWORDS_WEIGHTED } from "./config";

export function scoreArticle(article: NewsArticle): number {
  const text = `${article.title} ${article.contentSnippet}`.toLowerCase();
  let keywordScore = 0;
  for (const { term, weight } of LFC_KEYWORDS_WEIGHTED) {
    if (text.includes(term)) keywordScore += weight;
  }
  // ... rest unchanged
}
```

### H4 + M6: Unify detectSource (30m)

1. **Create `src/lib/news/source-detect.ts`**:
```typescript
import type { NewsSource } from "./types";

const SOURCE_MAP: [string, NewsSource, string][] = [
  ["liverpoolfc.com", "lfc", "LiverpoolFC.com"],
  ["bbc.com", "bbc", "BBC Sport"],
  ["bbc.co.uk", "bbc", "BBC Sport"],
  ["theguardian.com", "guardian", "The Guardian"],
  ["thisisanfield.com", "tia", "This Is Anfield"],
  ["liverpoolecho.co.uk", "echo", "Liverpool Echo"],
  ["skysports.com", "sky", "Sky Sports"],
  ["anfieldwatch.co.uk", "anfield-watch", "Anfield Watch"],
  ["empireofthekop.com", "eotk", "Empire of the Kop"],
  ["bongda.com.vn", "bongda", "Bongda.com.vn"],
  ["24h.com.vn", "24h", "24h.com.vn"],
  ["bongdaplus.vn", "bongdaplus", "Bongdaplus.vn"],
  ["znews.vn", "zingnews", "ZNews"],       // M6 fix: was missing
  ["zingnews.vn", "zingnews", "ZNews"],     // legacy domain
  ["vnexpress.net", "vnexpress", "VnExpress"],
  ["dantri.com.vn", "dantri", "Dân Trí"],
  ["vietnamnet.vn", "vietnamnet", "VietNamNet"],
  ["tuoitre.vn", "tuoitre", "Tuổi Trẻ"],
  ["thanhnien.vn", "thanhnien", "Thanh Niên"],
  ["webthethao.vn", "webthethao", "Webthethao"],
];

export function detectSource(url: string): { id: NewsSource; name: string } {
  for (const [domain, id, name] of SOURCE_MAP) {
    if (url.includes(domain)) return { id, name };
  }
  return { id: "bbc", name: new URL(url).hostname };
}
```

2. **`src/lib/news/enrichers/article-extractor.ts`**:
   - Remove local `detectSourceName()` function
   - Import `detectSource` from `../source-detect`
   - Replace all `detectSourceName(url)` calls with `detectSource(url).name`

3. **`src/app/news/[...slug]/page.tsx`**:
   - Remove local `detectSource()` function
   - Import `detectSource` from `@/lib/news/source-detect`
   - Replace `detectSource(url)` with `detectSource(url).id`

### M1: Remove dead validation code (15m)

- Delete `src/lib/news/validation.ts`
- Or alternatively, integrate `validateFeedItems` into `RssAdapter.fetch()` to validate RSS items before processing. Prefer deletion (YAGNI) since current pipeline works without it.

### M2: Clean up stale SOURCE_CONFIG (15m)

1. **`src/lib/news/config.ts`** — remove `tia` and `sky` entries or mark disabled:
   - The `tia` feed is already commented out; remove from `SOURCE_CONFIG`
   - `sky` has no RSS feed entry; remove from `SOURCE_CONFIG`
   - Add comment explaining why removed

2. **`src/lib/news-config.ts`** (client-safe) — remove `tia` and `sky` entries

3. **`src/lib/news/types.ts`** — remove `tia` and `sky` from `NewsSource` union type

4. **`src/lib/news/relevance.ts`** — remove `tia` and `sky` from `SOURCE_PRIORITY`

5. **`src/lib/news/source-detect.ts`** — keep entries (safe fallback for old URLs in DB)

## Todo

- [x] C2: Create `src/lib/news/sync.ts` with `syncPipeline()` — **DONE**
- [x] C2: Simplify `db.ts` to call `syncPipeline()` — **DONE**
- [x] C2: Simplify `sync/route.ts` to call `syncPipeline()` — **DONE** (shared sync across db + route)
- [x] C5: Replace `paragraphs.includes()` with `Set<string>` in 6 extractors — **DONE** (all extractors updated)
- [x] C5: Replace `images.includes()` with `Set<string>` in 4 extractors — **DONE** (BBC, Bongda, Echo, Vietnamese)
- [x] H2: Move weighted keywords to `config.ts`, derive flat list — **DONE** (unified LFC_KEYWORDS)
- [x] H2: Update `relevance.ts` to import from `config.ts` — **DONE** (uses weighted keywords from config)
- [x] H4: Create `src/lib/news/source-detect.ts` — **DONE** (unified detectSource helper)
- [x] H4: Update `article-extractor.ts` to use shared `detectSource` — **DONE** (removed duplicate detectSourceName)
- [x] H4: Update `[...slug]/page.tsx` to use shared `detectSource` — **DONE** (unified detection)
- [x] M6: Add `znews.vn` to source map (included in H4) — **DONE** (znews.vn + legacy support)
- [x] M1: Delete `validation.ts` — **DONE** (removed dead code)
- [x] M2: Remove `tia`/`sky` from all config maps — **DONE** (cleaned SOURCE_CONFIG, types, relevance)

## Success Criteria

- [x] Zero duplicated sync logic — single `syncPipeline()` called from 2 places ✅
- [x] Zero duplicated keyword lists — single source in `config.ts` ✅
- [x] Zero duplicated detectSource — single helper in `source-detect.ts` ✅
- [x] `znews.vn` URLs correctly detected as `zingnews` source ✅
- [x] No dead code files (`validation.ts` deleted) ✅
- [x] TypeScript compiles without errors after all changes ✅
- [x] All extractors use Set-based dedup for O(1) membership checks ✅
- [x] Extracted `supabase-service.ts` for service role client reuse ✅
- [x] All source configs consistent across server + client ✅

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Breaking sync behavior during extraction | Medium | High | Test sync route manually before/after |
| Removing tia/sky breaks existing DB articles | Low | Low | Articles already in DB keep source field; UI gracefully handles unknown source |
| Set dedup changes paragraph ordering | None | None | Set only used for membership check; array preserves order |

## Security Considerations

- `sync.ts` uses service role key — same as existing code; no new surface
- `source-detect.ts` is pure logic, no auth concerns
- Removing dead code (validation.ts) reduces attack surface

## Completion Summary (2026-03-11)

### Issues Resolved
| Issue | Component | Status |
|-------|-----------|--------|
| C2 | Shared sync logic (`syncPipeline()`) | ✅ Extracted to `src/lib/news/sync.ts` |
| C5 | Set-based dedup (`paragraphs`, `images`) | ✅ All 6 extractors using O(1) Set checks |
| H2 | Unified LFC_KEYWORDS | ✅ Single weighted source in config.ts, derived flat list |
| H4 | Unified detectSource() | ✅ Single helper in source-detect.ts |
| M1 | Dead validation.ts | ✅ Deleted |
| M2 | Disabled sources (tia/sky) | ✅ Removed from SOURCE_CONFIG + types |
| M6 | znews.vn URL detection | ✅ Fixed in unified detectSource() |

### Additional Improvements
- Extracted `supabase-service.ts` for service role client reuse (reduces duplication across sync endpoints)
- Implemented `pushUnique()` pattern across all extractors for consistency
- Verified all TypeScript compilation passes

### Files Modified
- `src/lib/news/sync.ts` (NEW)
- `src/lib/news/source-detect.ts` (NEW)
- `src/lib/news/db.ts` (simplified)
- `src/app/api/news/sync/route.ts` (simplified)
- `src/lib/news/config.ts` (unified keywords + removed tia/sky)
- `src/lib/news/types.ts` (removed tia/sky from NewsSource union)
- `src/lib/news/relevance.ts` (import from config)
- `src/lib/news/enrichers/article-extractor.ts` (Set dedup + unified detectSource)
- `src/app/news/[...slug]/page.tsx` (unified detectSource)
- `src/lib/news/validation.ts` (DELETED)

## Next Steps

Phase 03 adds monitoring, health stats, and DB cleanup to the now-consolidated pipeline.
