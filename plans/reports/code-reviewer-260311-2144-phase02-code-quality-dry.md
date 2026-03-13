# Code Review — Phase 02: Code Quality & DRY

**Date:** 2026-03-11
**Score: 7.5 / 10**

---

## Scope

- Files reviewed: 11 (10 changed + 1 deleted)
- Lines analyzed: ~2,116
- Review focus: Phase 02 changes (DRY refactor, sync pipeline, source detection, dead code removal)
- TypeScript: `tsc --noEmit` → **0 errors**
- Updated plans: none (no plan file provided)

---

## Overall Assessment

Phase 02 delivers meaningful consolidation: duplicate sync logic is gone, `LFC_KEYWORDS` has one canonical definition, and `detectSource()` is unified. The circular dependency concern between `sync.ts ↔ db.ts` is confirmed **not present** — `sync.ts` does not import `db.ts`. No security regressions introduced.

However, `pushUnique()` was **not applied consistently** — 6+ call sites in high-traffic extractors still use `paragraphs.push()` without dedup, which was the core fix claim of C5. Also, `getServiceClient()` is now tripled across files, a new DRY violation created by Phase 02 itself.

---

## Critical Issues

None.

---

## High Priority Findings

### H1 — `pushUnique()` inconsistently applied (C5 not fully resolved)

**Impact:** Duplicate paragraphs still possible in `extractGuardian`, `extractBongdaplus`, `extractVietnamese`, `extractWordPress`, `extractGenericEnglish`, and the Readability path.

Evidence — extractors still calling raw `paragraphs.push()`:
- `extractGuardian` (line 267): `paragraphs.push(text)` — no `seen` set
- `extractGuardian` (line 272): `!images.includes(src)` — explicit O(n) check that `pushUnique` was supposed to replace
- `extractBongdaplus` (lines 381, 397): raw `paragraphs.push(text)`; `images.push(src)`
- `extractVietnamese` (lines 444, 458): raw push, no seen set
- `extractWordPress` (lines 495, 501): raw push, no seen set
- `extractGenericEnglish` (line 576): raw push
- Readability path (lines 837, 842-844): raw push

`pushUnique` is used in BBC, Bongda, LiverpoolEcho, Znews, VnExpress, and `extractVietnameseGeneric` — roughly half the call sites. The remaining half are the un-migrated ones.

**Fix:** Add `seenP`/`seenI` sets to each remaining extractor and replace `push` with `pushUnique`. Guardian's `!images.includes(src)` on line 272 is specifically the O(n) pattern C5 targeted.

---

### H2 — `getServiceClient()` tripled across `sync.ts`, `db.ts`, `article-extractor.ts`

`sync.ts` line 11-16 and `db.ts` line 57-62 are identical 6-line functions. `article-extractor.ts` has a third copy named `getCacheClient()` (lines 40-45), functionally identical.

Phase 02 fixed one form of duplication but created another. Extract to `src/lib/news/supabase-service.ts`:

```ts
// src/lib/news/supabase-service.ts
import "server-only";
import { createClient } from "@supabase/supabase-js";

export function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key);
}
```

---

## Medium Priority Improvements

### M1 — `skysports.com` in extractor map but removed from `NewsSource` type

`article-extractor.ts` line 138: `"skysports.com": extractGenericEnglish` — `skysports` was removed from `NewsSource` in `types.ts` as part of M2 cleanup, but the extractor entry remains. No adapter feeds Sky, so no articles will have `source: "sky"`, but the routing entry is dead weight. Low risk; remove for cleanliness.

### M2 — `extractVietnamese` uses inline `url.includes("24h")` branching for `sourceName`

Lines 462–466 in `extractVietnamese`:
```ts
const sourceName = url.includes("24h")
  ? "24h.com.vn"
  : url.includes("bongdaplus")
    ? "Bongdaplus.vn"
    : "News";
```
This is exactly what `detectSource(url).name` is for. The `bongdaplus` branch is also unreachable — `bongdaplus.vn` maps to `extractBongdaplus`, not `extractVietnamese`. Replace with `detectSource(url).name`.

### M3 — `SOURCE_CONFIG` duplicated in `src/lib/news/config.ts` (server) and `src/lib/news-config.ts` (client)

Both export `SOURCE_CONFIG` keyed on `NewsSource`. `news/config.ts` includes a `language` field; `news-config.ts` omits it. Client components (`article-sidebar.tsx`, `saved-articles-list.tsx`) import from `news-config.ts`. Server adapters use `news/config.ts`.

Phase 02 removed `tia`/`sky` from both, which is correct. But the duplication itself remains. It predates Phase 02 and arguably requires a Phase 03 item.

### M4 — `CRON_SECRET` guard allows open access when env var unset

`route.ts` line 10:
```ts
if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
```
When `CRON_SECRET` is not set (`undefined`), the first clause is `true` → blocks all requests — this is actually **safe** behavior. Noting it as a medium concern only because in dev where the env is not set, manual sync via the route is impossible without knowing to set the var. Not a security issue.

### M5 — `eotk` color inconsistency between `news-config.ts` and `news/config.ts`

- `news-config.ts` line 25: `"bg-yellow-700 text-yellow-100"`
- `news/config.ts` line 38: `"bg-red-800 text-red-100"`

Minor UI inconsistency; client components use `news-config.ts` (yellow), so that's what renders. But the divergence is a maintenance trap.

---

## Low Priority Suggestions

### L1 — `detectSource()` fallback `return { id: "bbc", name: new URL(url).hostname }`

`source-detect.ts` line 33: using `bbc` as the fallback `id` for unknown domains is semantically wrong — articles from unknown domains will be tagged as BBC. The `name` uses the actual hostname (correct), but `id` will misroute rendering. Consider: `id: "lfc" as NewsSource` (or better, add `"unknown"` to the `NewsSource` type) for unrecognized domains.

### L2 — `extractGeneric` (line 782) uses `new URL(url).hostname` for `sourceName` but no fallback for malformed URLs

Throws on invalid URL. Not guarded. Low risk since URLs come from trusted DB, but worth a `try/catch`.

### L3 — Readability path (lines 829–868) does not call `pushUnique`

Paragraphs assembled at line 837 via raw `paragraphs.push` — no dedup. Not critical since Readability output is already parsed/clean, but inconsistent with the stated goal of C5.

### L4 — `sync.ts` enrichment loop (lines 119–127) issues N individual `UPDATE` statements sequentially

The outer loop batches 10 URLs with `Promise.allSettled`, then does single-row updates serially. For 30 articles that's 30 round trips. Could batch-update with `IN` clause. Low priority — fire-and-forget, not on critical path.

---

## Positive Observations

- **No circular dependency** between `sync.ts ↔ db.ts` — confirmed clean.
- **`LFC_KEYWORDS_WEIGHTED` single source** correctly used: `config.ts` defines, `relevance.ts` imports weighted, adapters import flat `LFC_KEYWORDS`. Clean derivation.
- **`source-detect.ts`** is minimal and correct. `SOURCE_MAP` covers all active sources including both `znews.vn` and `zingnews.vn` (M6 fix confirmed).
- **`VI_SOURCES` set** correctly used in `page.tsx` — `VI_SOURCES.has(source)` called 3× without reimplementing the check.
- **TypeScript compiles clean** — 0 errors.
- **`validation.ts` fully deleted** — no stale imports found.
- **`tia`/`sky` removed** from `types.ts`, `relevance.ts`, and `news-config.ts` — no broken imports.
- **`syncPipeline()` correctly shared** — `db.ts` and `route.ts` both call it; no code duplication.
- **`extractVietnameseGeneric`** is a good DRY abstraction used cleanly by dantri, vietnamnet, tuoitre, thanhnien.
- **Retry logic** in `sync.ts` batch upsert is pragmatic (1 retry, 2s delay, HTML-in-error-body detection).

---

## Recommended Actions

1. **(High)** Complete `pushUnique` migration in `extractGuardian`, `extractBongdaplus`, `extractVietnamese`, `extractWordPress`, `extractGenericEnglish` — add `seenP`/`seenI` sets and replace `push` + `includes` with `pushUnique`.
2. **(High)** Extract `getServiceClient()` to a shared `src/lib/news/supabase-service.ts` and update the 3 call sites.
3. **(Medium)** Fix `detectSource()` fallback `id` — `"bbc"` is wrong for unknown domains.
4. **(Medium)** Remove dead `"skysports.com"` entry from extractor map (line 138).
5. **(Medium)** Replace `extractVietnamese` inline `sourceName` logic (lines 462–466) with `detectSource(url).name`.
6. **(Low)** Reconcile `eotk` color between `news/config.ts` and `news-config.ts`.

---

## Metrics

- Type Coverage: TypeScript strict — 0 compile errors
- Test Coverage: not measured in this review
- Linting Issues: 0 (tsc clean)
- `pushUnique` adoption: ~10/16 push call sites (63%) — incomplete

---

## Unresolved Questions

1. **`SOURCE_CONFIG` duplication** (server vs client) — is eliminating this in scope for Phase 03, or intentional split?
2. **`extractVietnamese` mapped to `24h.com.vn` only** (line 133) but contains dead `bongdaplus` branch — was there a prior mapping for `bongdaplus.vn → extractVietnamese` that was already removed? If so, the dead branch in `extractVietnamese` should be cleaned up.
3. **`webthethao`** has no dedicated extractor — falls through to `extractGeneric`. Is thin-content acceptable for this source, or does it need a proper extractor?
