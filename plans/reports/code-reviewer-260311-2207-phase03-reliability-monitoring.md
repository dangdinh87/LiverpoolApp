# Code Review — Phase 03: Reliability & Monitoring

**Date:** 2026-03-11 | **Score: 7.5/10**
**Plan:** `/Users/nguyendangdinh/LiverpoolApp/plans/260311-2053-news-pipeline-full-audit/phase-03-reliability-monitoring.md`

---

## Scope

- Files reviewed: 12 (pipeline.ts, sync.ts, og-meta.ts, article-extractor.ts, cleanup/route.ts, rate-limit.ts, translate/route.ts, like/route.ts, comments/route.ts, news/[...slug]/page.tsx, news/index.ts, pipeline.test.ts)
- Lines analyzed: ~1,100
- Review focus: Phase 03 changes only (H1, H3, H5, H6, M4, M5)

---

## Overall Assessment

Solid delivery. All 6 requirements implemented correctly in principle. TypeScript passes clean (0 errors). 7 of 7 tests pass. Three concrete bugs and one missing deliverable detailed below.

---

## Critical Issues

None.

---

## High Priority Findings

### H1: Cleanup route `count` always returns `null`

**File:** `/Users/nguyendangdinh/LiverpoolApp/src/app/api/news/cleanup/route.ts` lines 17–33

Supabase `.update()` and `.delete()` without `{ count: 'exact' }` option return `count: null`. The response always shows `{ deactivated: 0, deleted: 0, logsDeleted: 0 }` regardless of actual rows affected — logging is silently broken.

Fix:
```typescript
const { count: deactivated } = await supabase
  .from("articles")
  .update({ is_active: false }, { count: "exact" })   // add count option
  .eq("is_active", true)
  .lt("published_at", thirtyDaysAgo);

const { count: deleted } = await supabase
  .from("articles")
  .delete({ count: "exact" })                         // add count option
  .lt("published_at", sixtyDaysAgo);

const { count: logsDeleted } = await supabase
  .from("sync_logs")
  .delete({ count: "exact" })
  .lt("created_at", thirtyDaysAgo);
```

### H2: Hard-delete doesn't scope to `is_active = false`

**File:** `/Users/nguyendangdinh/LiverpoolApp/src/app/api/news/cleanup/route.ts` line 24–28

Hard-delete on articles >60 days is unscoped — will delete rows that were soft-deleted at 30 days AND any active articles between 30–60 days that haven't been soft-deleted yet (e.g., if cleanup ran late). Safe by luck (both windows are independent), but logically inconsistent with the intent of the two-stage delete. Plan says _"no content cache worth keeping"_ — should at minimum match the stated architecture.

Suggested:
```typescript
const { count: deleted } = await supabase
  .from("articles")
  .delete({ count: "exact" })
  .eq("is_active", false)              // only deactivated rows
  .lt("published_at", sixtyDaysAgo);
```

### H3: `vercel.json` cron schedule missing (incomplete deliverable)

Plan item `H6: Add cron schedule to vercel.json` is not done — file doesn't exist. Without it, the cleanup route is never called automatically and the feature provides no operational value until manually wired.

---

## Medium Priority Findings

### M1: `reader.cancel()` inconsistency — `getOgImage` vs `fetchOgMeta`

**Files:** `og-meta.ts:39` vs `article-extractor.ts:944`

`fetchOgMeta` correctly wraps `reader.cancel()` in `.catch(() => {})` inside a `finally` block. `getOgImage` in `article-extractor.ts` calls `reader.cancel()` bare (no `.catch()`). `ReadableStreamDefaultReader.cancel()` returns a Promise; if the underlying stream throws, it's an unhandled rejection.

Fix in `article-extractor.ts`:
```typescript
reader.cancel().catch(() => {});
```

### M2: Rate limit 429 responses lack `Retry-After` header

**Files:** translate/like/comments routes

429 responses without `Retry-After` force clients to guess retry timing. RFC 6585 recommends it. The `checkRateLimit` function returns `remaining` but not `resetAt` — callers can't compute the header even if they wanted to.

The plan spec included `resetAt` in the return type but the implementation dropped it. Low friction to add:

In `rate-limit.ts` — return value already could include `resetAt` from `entry.resetAt`.
In routes — add header:
```typescript
const { allowed, resetAt } = checkRateLimit(...);
if (!allowed) {
  return NextResponse.json(
    { error: "Rate limit exceeded" },
    { status: 429, headers: { "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)) } }
  );
}
```

### M3: `SourceStats.avgParagraphs` dropped without schema note

Plan specified `avgParagraphs` in `SourceStats`. It was removed (YAGNI — fine), but the `sync_logs.source_stats` JSONB schema is now different from what the plan documents. Not a bug, but if a dashboard ever queries this column expecting `avgParagraphs`, it'll get `undefined`. Worth a one-line comment on the interface marking it intentionally omitted.

### M4: `isFakeDate` 2-minute window is fragile

**File:** `og-meta.ts:62-65`

```typescript
export function isFakeDate(dateStr: string): boolean {
  const diff = Date.now() - new Date(dateStr).getTime();
  return diff >= 0 && diff < 120_000;
}
```

This flags any article published within the last 2 minutes as fake. Fast-breaking news articles syndicated seconds after publication will have their dates overwritten with OG meta dates (or discarded). The original intent — detect scrapers using `new Date()` as fallback — is correct but the signal is imprecise. A 5-second window or a stricter check (e.g., seconds-precision match against `Date.now()`) would be safer.

---

## Low Priority Suggestions

### L1: `FeedAdapter` uses `name` — plan said `source`

Plan step said to add `source` property to `FeedAdapter`. Implementation reuses the existing `name` property instead — pragmatic (avoids adapter breakage) and YAGNI-compliant. No issue, but the plan's risk table mentions this as a potential breakage; update the plan to note the resolution.

### L2: `checkRateLimit` return type drops `resetAt`

Plan spec returned `{ allowed, remaining, resetAt }`. Implementation returns only `{ allowed, remaining }`. Callers can't compute `Retry-After` without `resetAt`. Tie-in to M2 above.

### L3: No Supabase migration file in `supabase/migrations/`

Migration `add_source_stats_to_sync_logs` was "applied manually" (per context) but no `.sql` file exists in `/supabase/migrations/`. Schema drift from codebase; future `supabase db push` or new env setup will miss the column.

### L4: `setInterval` guard is good but `.unref?.()` is optional chaining on non-optional

```typescript
setInterval(() => { ... }, 60_000).unref?.();
```

`.unref()` is a Node.js-only method. The optional chain `?.()` is correct for environments where it may not exist (edge runtime), but `typeof setInterval !== "undefined"` guard already ensures this only runs in Node. Minor style point.

### L5: `extractWebthethao` not tested

`extractVietnameseGeneric` is used for 4 existing sources and is well-proven, but there's no test or comment confirming webthethao selectors were verified via DevTools (unlike dantri, tuoitre, etc. which have explicit DevTools verification comments). The plan's test step ("if Readability returns >3 paragraphs...") was skipped in favor of directly adding the extractor.

---

## Positive Observations

- `fetchOgMeta` streaming rewrite is clean — `try/finally` for `reader.cancel()` is correct defensive pattern.
- `pipeline.ts` architecture is elegant: `Promise.allSettled` + per-source stat collection in a single loop, O(1) complexity.
- `rate-limit.ts` `setInterval(...).unref?.()` is a thoughtful Node.js best practice (won't keep process alive).
- DRY win: `translate/route.ts` now uses `getServiceClient()` — plan's bonus item delivered.
- Test coverage updated correctly: `{ articles, stats }` destructuring and stats assertions work; 7/7 pass.
- `extractVietnameseGeneric` helper is genuinely DRY — 5 extractors share it with minimal boilerplate.
- `enrichArticleMeta` in `pipeline.ts` correctly passes `50` (not the previous `10`) as `maxFetches`.

---

## Recommended Actions

1. **[Bug — fix before next sync run]** Add `{ count: "exact" }` to cleanup route `.update()` / `.delete()` calls — currently logging zeros.
2. **[Bug — architecture]** Scope hard-delete to `is_active = false` rows only.
3. **[Incomplete deliverable]** Create `vercel.json` with cleanup cron schedule (e.g., `"0 3 * * *"`).
4. **[Minor bug]** Fix `reader.cancel()` in `article-extractor.ts:getOgImage` to `.catch(() => {})`.
5. **[Nice-to-have]** Add `resetAt` back to `checkRateLimit` return + `Retry-After` header on 429s.
6. **[Schema hygiene]** Add `supabase/migrations/005_source_stats.sql` with `ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS source_stats jsonb;`.
7. **[Low]** Widen `isFakeDate` window or tighten detection logic.

---

## Metrics

- Type Coverage: 100% (tsc --noEmit: 0 errors)
- Test Coverage: 7/7 pipeline tests pass
- Linting Issues: 0
- Tasks Complete: 10/12 todo items (H6 vercel.json missing; count bug in cleanup)

---

## Unresolved Questions

1. Was webthethao.vn actually tested with a real article URL before the extractor was added, or was it added blind based on the generic VN selector pattern?
2. Is `CRON_SECRET` documented in `.env.example`? The cleanup route requires it but it's a new env var not in the original project memory.
3. The hard-delete at 60 days has no guard for articles with cached `content_en` (content users may have read). Plan originally said `DELETE ... WHERE content_en IS NULL`. Was this intentionally dropped?
