# Code Review: Phase 01 — Critical Performance Fixes

**Score: 8/10**

---

## Scope

- Files reviewed: `src/lib/news/db.ts`, `src/lib/news/enrichers/article-extractor.ts`, `src/app/news/page.tsx`, `src/app/news/actions.ts`, `src/components/news/news-feed.tsx`, `src/lib/news/index.ts`, `src/messages/en.json`, `src/messages/vi.json`
- Lines analyzed: ~1,200 (changed files only)
- Review focus: C1 (non-blocking sync), C3 (content cache), C4 (pagination)
- Plan: `/Users/nguyendangdinh/LiverpoolApp/plans/260311-2053-news-pipeline-full-audit/phase-01-critical-performance.md`
- Updated plans: `phase-01-critical-performance.md` (Todo updated)

---

## Overall Assessment

All three critical requirements (C1, C3, C4) are correctly implemented and match the plan spec. The DB-level stale check solves the fundamental serverless cold-start regression. Content cache lookup is correct. Pagination is functional. Four issues found; none are blockers.

---

## Critical Issues

None.

---

## High Priority Findings

### H1 — `getNewsPaginated` off-by-one: range includes limit+1 items but `hasMore` check is correct, query boundary is wrong

**Where:** `db.ts` line 299

Plan spec says `.range(offset, offset + limit)` but Supabase `range()` is inclusive on both ends. `.range(0, 20)` returns 21 rows (0–20 inclusive). The code fetches `limit+1` rows correctly (to probe `hasMore`) but the intent comment says "fetch limit+1 to check hasMore" yet the boundary is `offset + limit` not `offset + limit` — this actually IS correct for Supabase: `.range(offset, offset + limit)` returns `limit + 1` rows (0-indexed, inclusive). **Rechecked:** `.range(0, 20)` = rows 0..20 = 21 rows, then `hasMore = rows.length > limit` (rows.length 21 > 20 = true). The math is correct.

But the comment on line 299 says "fetch limit+1 to check hasMore" — that's accurate. **No bug. Marking resolved.**

### H2 — `isDbFresh()` uses `{ count: "exact", head: false }` but then checks `count` — the `count` field from this query is unreliable for stale check

**Where:** `db.ts` lines 135–142

`head: false` means the response body is returned (not a HEAD request), so `count: "exact"` will count all matching rows. However, `.limit(1)` only returns 1 row — **the `count` in the response is still the total count** of all matching rows (Supabase returns it as a separate header). This is correct behavior.

But: if `fetched_at` column has no index and the table has 10k+ rows, `count: "exact"` triggers a full table scan. The `articles` table has `idx_articles_published` on `published_at DESC`, not `fetched_at`. So `ORDER BY fetched_at DESC LIMIT 1` with `count: "exact"` scans the whole table on every page load.

**Fix:** Either add `CREATE INDEX idx_articles_fetched ON articles (fetched_at DESC)` or — simpler — drop the `count` check entirely. Use `.maybeSingle()` and treat `data === null` as empty:

```typescript
async function isDbFresh(): Promise<{ fresh: boolean; empty: boolean }> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("articles")
    .select("fetched_at")
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return { fresh: false, empty: true };
  const age = Date.now() - new Date(data.fetched_at).getTime();
  return { fresh: age < STALE_MS, empty: false };
}
```

This runs a single-row scan (O(1) with index) vs. a full count scan. Add index on `fetched_at` to the migration.

---

## Medium Priority Improvements

### M1 — `getCacheClient()` in `article-extractor.ts` duplicates `getServiceClient()` in `db.ts`

**Where:** `article-extractor.ts` lines 39–44 vs `db.ts` lines 61–66

Identical implementation, different name. Phase 02 (C2/H4) plans to extract this to a shared util — this is a pre-existing DRY violation now present in two files. The plan acknowledges it ("extract to shared util in Phase 02"). **Acceptable as-is; track in Phase 02.**

### M2 — `loadMoreNews` server action is a trivial wrapper with no added value

**Where:** `src/app/news/actions.ts` lines 6–12

`loadMoreNews` does nothing except call `getNewsPaginated` directly. The `"use server"` directive is the reason it exists (can't import server-only modules from client components). This is correct architecture for Next.js App Router. KISS-compliant. **No action needed.**

### M3 — `visibleCount` counter drift when `langFilter` changes mid-pagination

**Where:** `news-feed.tsx` lines 393–394, 614–621

When user has loaded extra articles via server action (appending to `extraArticles`) and then changes `langFilter`, the `extraArticles` array still holds all languages — the `allLocal`/`allGlobal` memos re-filter them correctly. But the `loadMoreNews` call on line 618 passes `langFilter === "local" ? "vi" : ...` which assumes only one language per filter. This is correct for pure local/global, but `langFilter === "all"` passes `undefined` to `getNewsPaginated`, which returns a mix. The `currentTotal` offset calculation (line 615) counts `localArticles.length + globalArticles.length + extraArticles.length` — this doesn't account for the active filter, so the offset passed to the server could skip articles if the filter changes between loads.

**Impact:** Low — user would need to change filter then click Load More. Not a crash, just potentially skipped articles. Acceptable for now; note in Phase 02.

### M4 — `serverHasMore` initialized to `true` — shows "Load More" button even when DB has exactly 30 articles

**Where:** `news-feed.tsx` line 398

`const [serverHasMore, setServerHasMore] = useState(true)` — if DB returns exactly 30 articles and there are no more, `hasMore` button shows until the user clicks it and `loadMoreNews` returns `{ articles: [], hasMore: false }`. Minor UX regression; acceptable.

---

## Low Priority Suggestions

### L1 — Migration not in a versioned file

The plan describes the migration as:
```sql
ALTER TABLE articles ADD COLUMN content_en jsonb;
ALTER TABLE articles ADD COLUMN content_scraped_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_articles_content_scraped ON articles (url) WHERE content_en IS NOT NULL;
```

No `005_content_cache.sql` file exists in `supabase/migrations/`. The columns may have been applied directly. Without a migration file, schema drift is invisible to other environments and CI. **Add migration file.**

### L2 — `cacheContent()` swallows errors silently at call sites

**Where:** `article-extractor.ts` lines 870, 903

```typescript
cacheContent(url, result).catch(() => {});
```

The empty catch hides failures. The function itself logs on error (line 74), so this is fine. But `cacheContent` also has its own try-catch — the outer `.catch(() => {})` is redundant. Minor.

### L3 — `React.cache()` on `getNewsFromDB` still wraps `triggerSyncIfNeeded`

**Where:** `db.ts` line 183

`React.cache()` deduplicates calls within a single render pass. `triggerSyncIfNeeded()` creates a new Supabase client on each call. If `getNewsFromDB` is called twice in the same render (e.g., homepage + news page in the same SSR pass), `React.cache()` prevents the second `isDbFresh()` call. This is correct behavior — no issue.

---

## Task Completeness Verification

Against `phase-01-critical-performance.md` Todo:

| Task | Status |
|------|--------|
| C1: Remove `await` from `syncIfStale()` in `getNewsFromDB()` | DONE — replaced with `triggerSyncIfNeeded()` |
| C1: Add empty-DB bootstrap guard | DONE — `if (empty)` blocks sync once |
| C3: Run Supabase migration (content_en + content_scraped_at) | PARTIAL — columns added, but no migration file in `supabase/migrations/` |
| C3: Add `getCachedContent()` + `cacheContent()` helpers | DONE |
| C3: Wrap `scrapeArticle()` with cache lookup | DONE |
| C4: Change default limit to 30 in `getNewsFromDB()` | DONE |
| C4: Add `getNewsPaginated()` function to db.ts | DONE |
| C4: Create `src/app/news/actions.ts` server action | DONE |
| C4: Update `NewsFeed` to use server action for load-more | DONE |
| Verify: test cold start with empty DB | NOT DONE |
| Verify: test article detail page loads from cache | NOT DONE |
| Verify: test load-more pagination with filter combinations | NOT DONE |

---

## Positive Observations

- `triggerSyncIfNeeded()` fire-and-forget pattern is correct and solves the root cause (serverless cold-start guard reset). Background sync failure is logged but doesn't crash the request.
- Empty-DB bootstrap (blocking once only) is the right tradeoff — first-ever deploy has unavoidable wait; all subsequent requests are fast.
- Content cache TTL (24h) is appropriate — article content rarely changes after publication.
- `cacheContent()` is fire-and-forget at call site — article loads never block on cache write.
- `loadMoreNews` server action is minimal and correct; no auth needed for a public feed.
- `langFiltered` useMemo fix is correct — dependency array now includes `allLocal`, `allGlobal` instead of raw props.
- `useTransition` in `news-feed.tsx` is the right primitive for non-urgent server action calls; `isPending` state drives the loading indicator.
- `getNewsPaginated` has its own try-catch with graceful fallback — consistent with db.ts error handling pattern.
- `server-only` import in `db.ts` and `article-extractor.ts` — prevents accidental client import.
- Balanced bilingual fetch in `getNewsFromDB` (parallel EN+VI queries) is a sound approach to prevent relevance score imbalance suppressing VI articles.

---

## Recommended Actions

1. **(High)** Add `CREATE INDEX idx_articles_fetched ON articles (fetched_at DESC)` to a new migration file `005_content_cache.sql`. Drop `count: "exact"` from `isDbFresh()` and use `.maybeSingle()` to avoid full table scan on every page load.
2. **(Medium)** Add `supabase/migrations/005_content_cache.sql` with the `content_en`/`content_scraped_at` columns and index. The columns appear to have been applied directly without a migration file.
3. **(Low)** Run the three verification tests listed in the Todo before closing Phase 01. Particularly: cold start with empty DB and load-more with active lang filter.
4. **(Low)** Note `M3` (offset drift on filter change mid-pagination) in Phase 02 backlog.

---

## Plan File Updates

The following Todo items should be updated in `phase-01-critical-performance.md`:

```
- [x] C1: Remove `await` from `syncIfStale()` in `getNewsFromDB()`
- [x] C1: Add empty-DB bootstrap guard
- [~] C3: Run Supabase migration (content_en + content_scraped_at) — columns applied, migration file missing (005_content_cache.sql)
- [x] C3: Add `getCachedContent()` + `cacheContent()` helpers
- [x] C3: Wrap `scrapeArticle()` with cache lookup
- [x] C4: Change default limit to 30 in `getNewsFromDB()`
- [x] C4: Add `getNewsPaginated()` function to db.ts
- [x] C4: Create `src/app/news/actions.ts` server action
- [x] C4: Update `NewsFeed` to use server action for load-more
- [ ] Verify: test cold start with empty DB
- [ ] Verify: test article detail page loads from cache
- [ ] Verify: test load-more pagination with filter combinations
- [ ] Add 005_content_cache.sql migration file with fetched_at index
```

---

## Metrics

- Security issues: 0
- Type issues: 0
- Critical bugs: 0
- High: 1 (missing index on `fetched_at` — potential full table scan in `isDbFresh()`)
- Medium: 2 actionable (migration file missing; offset drift on filter change)
- Low: 3
- Test coverage: manual only — 3 verification tests from plan not yet run

---

## Unresolved Questions

- Were the `content_en` and `content_scraped_at` columns applied via Supabase dashboard or CLI? If via dashboard only, other environments (local dev, preview branches) won't have them — need the migration file.
- `getNewsFromDB` is wrapped in `React.cache()` but `triggerSyncIfNeeded()` creates a new Supabase client per call. If the Supabase client factory is expensive, this could add latency. Not an issue at current scale, but worth confirming `createClient()` is lightweight (it is — just constructs a client object).
- Homepage (`src/app/page.tsx`) still calls `getNewsFromDB(40)` — does it also benefit from the non-blocking sync, or does it use the old `syncIfStale()` path? Not checked in this review (not in changed file list).
