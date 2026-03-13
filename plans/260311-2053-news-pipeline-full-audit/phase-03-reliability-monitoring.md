# Phase 03 — Reliability & Monitoring

**Date:** 2026-03-11 | **Priority:** HIGH | **Effort:** 4h
**Implementation status:** DONE (2026-03-11 16:20) | **Review status:** Reviewed 2026-03-11 (score 7.5/10)

## Overview

Add observability, improve extraction reliability, and automate DB maintenance. Six issues: health monitoring (H1), webthethao extractor (H3), fetchOgMeta streaming (H5), DB cleanup (H6), related articles pool (M4), API rate limiting (M5).

## Context Links

- Brainstorm: `plans/reports/brainstorm-260311-2053-news-pipeline-audit-and-ai-digest.md`
- Phase 02: `phase-02-code-quality-dry.md` (depends on — uses shared `syncPipeline()`)

## Key Insights

1. No structured monitoring — only `console.log`. Can't tell which sources are failing, success rates, or extraction quality trends.
2. `webthethao` has RSS feed in config but no entry in `extractors` map. Falls back to Readability which may work but untested.
3. `fetchOgMeta` in `og-meta.ts:27` calls `res.text()` downloading full page body (can be MBs), then truncates. `getOgImage` below it correctly uses streaming reader.
4. Articles accumulate forever. No pruning of old articles > 30 days.
5. Related articles on `[...slug]/page.tsx:146` uses `getNewsFromDB(20)` — tiny pool for keyword matching.
6. `/api/news/translate`, `/api/news/like`, `/api/news/comments` have no rate limiting.

## Requirements

### H1: Extraction health monitoring (1.5h)
Track per-source stats: fetched, parsed, failed, thin, avgParagraphs. Store in `sync_logs`.

### H3: Verify webthethao extraction (30m)
Test Readability on webthethao URLs. Add extractor if insufficient.

### H5: Fix fetchOgMeta streaming (30m)
Use streaming reader like `getOgImage` to avoid downloading full body.

### H6: DB cleanup cron (30m)
Cron job to deactivate articles older than 30 days.

### M4: Increase related articles pool (15m)
Change `getNewsFromDB(20)` to `getNewsFromDB(100)` for related article matching.

### M5: API rate limiting (45m)
Add simple rate limiting on translate, like, comments API routes.

## Architecture

### H1: Extraction stats

Extend `sync_logs` or add `extraction_stats` JSONB column:
```sql
ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS source_stats jsonb;
-- { "bbc": { fetched: 5, parsed: 5, failed: 0, thin: 1 }, ... }
```

Pipeline modification: `fetchAllNews()` returns stats alongside articles; `syncPipeline()` logs them.

### H5: Streaming fetchOgMeta

Replace `res.text()` with streaming reader (same pattern as `getOgImage`):
```
res.body.getReader() → read chunks → stop at </head> or 50KB
```

### H6: Cleanup strategy

Vercel Cron or manual endpoint:
```
GET /api/news/cleanup?key=CRON_SECRET
  → UPDATE articles SET is_active = false WHERE published_at < now() - 30d
  → DELETE FROM articles WHERE published_at < now() - 60d AND content_en IS NULL
```

### M5: Rate limit approach

Simple in-memory rate limiter (no Redis needed for this scale):
```typescript
// src/lib/rate-limit.ts
const store = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}
```

## Related Code Files

| File | Role | Changes |
|------|------|---------|
| `src/lib/news/pipeline.ts` | Pipeline orchestration | H1: return per-source stats |
| `src/lib/news/sync.ts` | Sync pipeline (from Phase 02) | H1: save source_stats to sync_logs |
| `src/lib/news/enrichers/article-extractor.ts` | Extractors | H3: verify/add webthethao |
| `src/lib/news/enrichers/og-meta.ts` | OG meta fetching | H5: streaming reader |
| `src/app/api/news/cleanup/route.ts` | **NEW** — cleanup endpoint | H6: deactivate + delete old |
| `src/app/news/[...slug]/page.tsx` | Article detail | M4: increase pool |
| `src/lib/rate-limit.ts` | **NEW** — in-memory rate limiter | M5: shared rate limit util |
| `src/app/api/news/translate/route.ts` | Translation API | M5: add rate limit |
| `src/app/api/news/like/route.ts` | Like API | M5: add rate limit |
| `src/app/api/news/comments/route.ts` | Comments API | M5: add rate limit |
| Supabase migration | Schema | H1: add source_stats column to sync_logs |

## Implementation Steps

### H1: Extraction health monitoring (1.5h)

1. **`src/lib/news/pipeline.ts`** — extend `fetchAllNews()` to return stats:

```typescript
export interface SourceStats {
  fetched: number;
  parsed: number;
  failed: number;
  thin: number;
  avgParagraphs: number;
}

export interface PipelineResult {
  articles: NewsArticle[];
  stats: Record<string, SourceStats>;
}

export async function fetchAllNews(
  adapters: FeedAdapter[],
  limit: number
): Promise<PipelineResult> {
  const stats: Record<string, SourceStats> = {};
  const results = await Promise.allSettled(adapters.map((a) => a.fetch()));

  const all: NewsArticle[] = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const source = adapters[i].source; // need to add 'source' to FeedAdapter interface
    if (r.status === "fulfilled") {
      stats[source] = {
        fetched: r.value.length,
        parsed: r.value.length,
        failed: 0,
        thin: r.value.filter((a) => (a.wordCount ?? 0) < 50).length,
        avgParagraphs: 0, // calculated later if needed
      };
      all.push(...r.value);
    } else {
      stats[source] = { fetched: 0, parsed: 0, failed: 1, thin: 0, avgParagraphs: 0 };
      console.error(`[pipeline] ${source} failed:`, r.reason);
    }
  }

  // ... dedup, categorize, score, enrich (unchanged)

  return { articles: sliced, stats };
}
```

2. **`src/lib/news/adapters/base.ts`** — add `source` property to `FeedAdapter`:
```typescript
export abstract class FeedAdapter {
  abstract source: string;
  abstract fetch(): Promise<NewsArticle[]>;
}
```

3. **`src/lib/news/sync.ts`** — save stats:
```typescript
const { articles, stats } = await fetchAllNews(adapters, 300);
// ... upsert logic ...
await supabase.from("sync_logs").insert({
  inserted: upserted, updated: 0, failed,
  duration_ms: durationMs,
  errors: errors.length > 0 ? errors : null,
  source_stats: stats,  // NEW
});
```

4. **Supabase migration**:
```sql
ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS source_stats jsonb;
```

### H3: Verify webthethao extraction (30m)

1. Test with a real webthethao article URL using Readability:
   - If Readability returns >3 paragraphs → Readability fallback is sufficient, no custom extractor needed
   - If Readability returns <3 paragraphs → add extractor

2. If needed, add entry to `extractors` map in `article-extractor.ts`:
```typescript
"webthethao.vn": extractVietnameseGeneric(
  $, url,
  ".detail-content, .article-body, article, [role=main]",
  "Webthethao"
),
```

More likely: create a thin wrapper calling `extractVietnameseGeneric` since that helper already handles common VN site patterns.

### H5: Fix fetchOgMeta streaming (30m)

**`src/lib/news/enrichers/og-meta.ts`** — replace `res.text()` with streaming:

```typescript
export async function fetchOgMeta(url: string): Promise<OgMeta> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LiverpoolApp/1.0)",
        Accept: "text/html",
      },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return {};

    // Stream only the <head> section (max 50KB) instead of full body
    const reader = res.body?.getReader();
    if (!reader) return {};

    let html = "";
    const decoder = new TextDecoder();
    while (html.length < 50000) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      if (html.includes("</head>")) break;
    }
    reader.cancel();

    const imgMatch =
      html.match(/property="og:image"[^>]*content="([^"]+)"/) ||
      html.match(/content="([^"]+)"[^>]*property="og:image"/);

    const dateMatch =
      html.match(/property="article:published_time"[^>]*content="([^"]+)"/) ||
      html.match(/content="([^"]+)"[^>]*property="article:published_time"/) ||
      html.match(/name="pubdate"[^>]*content="([^"]+)"/) ||
      html.match(/name="date"[^>]*content="([^"]+)"/);

    return {
      image: sanitizeUrl(imgMatch?.[1]),
      publishedAt: dateMatch?.[1],
    };
  } catch {
    return {};
  }
}
```

### H6: DB cleanup cron (30m)

1. **Create `src/app/api/news/cleanup/route.ts`**:
```typescript
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("key");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000).toISOString();

  // Soft-delete: deactivate articles >30 days old
  const { count: deactivated } = await supabase
    .from("articles")
    .update({ is_active: false })
    .eq("is_active", true)
    .lt("published_at", thirtyDaysAgo);

  // Hard-delete: remove articles >60 days (no content cache worth keeping)
  const { count: deleted } = await supabase
    .from("articles")
    .delete()
    .lt("published_at", sixtyDaysAgo);

  // Cleanup old sync_logs >30 days
  const { count: logsDeleted } = await supabase
    .from("sync_logs")
    .delete()
    .lt("created_at", thirtyDaysAgo);

  return NextResponse.json({
    ok: true,
    deactivated: deactivated ?? 0,
    deleted: deleted ?? 0,
    logsDeleted: logsDeleted ?? 0,
  });
}
```

2. **`vercel.json`** — add cron schedule (if not present):
```json
{
  "crons": [
    { "path": "/api/news/sync?key=$CRON_SECRET", "schedule": "*/15 * * * *" },
    { "path": "/api/news/cleanup?key=$CRON_SECRET", "schedule": "0 3 * * *" }
  ]
}
```

### M4: Increase related articles pool (15m)

**`src/app/news/[...slug]/page.tsx`** line 146:
```typescript
// Before:
allArticles, getNewsFromDB(20),

// After:
allArticles, getNewsFromDB(100),
```

Note: After Phase 01 changes, default limit is 30 and sync is non-blocking, so increasing to 100 is safe — it's a pure DB query.

### M5: API rate limiting (45m)

1. **Create `src/lib/rate-limit.ts`**:
```typescript
const store = new Map<string, { count: number; resetAt: number }>();

// Clean up expired entries periodically (avoid memory leak)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 60000);

export function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || now > entry.resetAt) {
    store.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}
```

2. **Apply to API routes** — extract IP from request headers:

```typescript
// Helper to get client IP
function getClientIP(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown";
}
```

3. **`src/app/api/news/translate/route.ts`** — add at top of POST handler:
```typescript
import { checkRateLimit } from "@/lib/rate-limit";

// 10 translations per hour per IP
const ip = getClientIP(req);
const { allowed } = checkRateLimit(`translate:${ip}`, 10, 3600000);
if (!allowed) {
  return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
}
```

4. **`src/app/api/news/like/route.ts`** — 30 likes per hour per IP
5. **`src/app/api/news/comments/route.ts`** — 20 comments per hour per IP

## Todo

- [x] H1: Add `source_stats` JSONB column to `sync_logs` (migration applied manually)
- [x] H1: `FeedAdapter` already has `name` property — used instead of `source` (pragmatic, no interface break)
- [x] H1: `fetchAllNews()` returns `PipelineResult { articles, stats }` — `SourceStats` has fetched/parsed/failed/thin (avgParagraphs dropped — YAGNI)
- [x] H1: `syncPipeline()` saves `source_stats: sourceStats` in sync_logs insert
- [x] H3: `extractWebthethao` added to extractors map using `extractVietnameseGeneric`
- [x] H5: `fetchOgMeta` now uses streaming reader (max 50KB, stops at `</head>`), wrapped in try/finally for cancel
- [x] H6: `/api/news/cleanup` route created, secret-protected
- [x] H6: `vercel.json` cron schedule added with sync + cleanup crons
- [x] M4: Related articles pool increased to `getNewsFromDB(100)`
- [x] M5: `src/lib/rate-limit.ts` created with in-memory store + 60s cleanup interval
- [x] M5: Rate limiting applied — translate (10/h), like (30/h), comments (20/h)
- [x] Verify: sync_logs source_stats populated during live sync runs
- [x] Verify: cleanup route count return values correct (Supabase API bug patched in subsequent runs)
- [x] Bonus: translate route DRY refactored — shared getClientIP helper
- [x] Bonus: Vercel cron auth header support verified (`?key=$CRON_SECRET` works)

## Success Criteria

- `sync_logs.source_stats` populated after each sync with per-source breakdown
- `fetchOgMeta` reads max 50KB per URL (not full body)
- Articles >30 days auto-deactivated, >60 days deleted
- Related articles draw from pool of 100 (not 20)
- API routes return 429 when rate limit exceeded

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| FeedAdapter interface change breaks adapters | Low | Medium | `source` is a simple string property; update all 3 adapters |
| In-memory rate limit resets on serverless cold start | Medium | Low | Acceptable for this scale; upgrade to Redis if needed |
| Cleanup deletes articles users might revisit | Low | Low | 30d soft-delete window; users unlikely to revisit articles >60d old |
| Pipeline return type change breaks callers | Low | Medium | Update all callers: db.ts sync, sync/route.ts (both via syncPipeline) |

## Security Considerations

- Cleanup route protected by `CRON_SECRET` — same pattern as sync route
- Rate limiter uses IP address — respects privacy (no user tracking), rate limit is per-endpoint
- `setInterval` for cleanup runs only in server processes; no client exposure

## Next Steps

Phase 04 builds the AI Daily Digest feature on top of the now-monitored and reliable pipeline.
