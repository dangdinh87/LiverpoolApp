# Code Review: Phase 04 — AI Daily Digest

**Date:** 2026-03-11
**Reviewer:** code-reviewer subagent
**Score: 8.5/10**

---

## Scope

- Files reviewed: 8 (4 new, 4 modified)
- Lines analyzed: ~400
- Review focus: Phase 04 changes only (digest generation, cron endpoint, card component, detail page, news page integration, i18n, vercel.json)
- Build result: PASS (tsc --noEmit clean, `npm run build` clean)

---

## Overall Assessment

Solid implementation. Clean architecture, proper server-only guards, parallel fetches where it counts. Three issues worth addressing before production, none blocking a deploy.

---

## Critical Issues

None.

---

## High Priority Findings

### 1. `sectionCount` prop accepted but never rendered
`DigestCard` accepts `sectionCount: number` (line 12, 22) but the JSX never uses it. Either remove the prop (YAGNI) or render it (e.g. "{sectionCount} topics"). Passing dead props is confusing and inflates the interface.

**Fix:** Remove from `DigestProps` and destructuring, remove from call site in `news/page.tsx`.

### 2. Unvalidated `date` path param — reflected into `new Date()`
`/news/digest/[date]/page.tsx` line 64 does `new Date(date)` where `date` comes directly from `params`. An attacker cannot inject code here (it's server-rendered, value goes to `toLocaleDateString`), but an invalid date string (e.g. `../../../etc`) will silently produce `Invalid Date` displayed in the UI. The Supabase `.eq("digest_date", date)` call also passes raw user input — Supabase parameterizes it, so SQL injection is not a risk, but a deliberate non-ISO-8601 string wastes a DB round-trip before `notFound()`.

**Fix:** Add a one-liner guard before both calls:
```ts
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();
```

### 3. `getServiceClient()` creates a new Supabase client on every call
`supabase-service.ts` instantiates `createClient(url, key)` every time `getServiceClient()` is called. In the cron route, it is called twice (once inside `generateDailyDigest()` and once directly in the route handler). Two clients, two connection pool entries per request.

**Fix:** Module-level singleton:
```ts
let _client: ReturnType<typeof createClient> | null = null;
export function getServiceClient() {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Missing Supabase env vars");
    _client = createClient(url, key);
  }
  return _client;
}
```
(This pattern is already used in similar projects; no architectural change needed.)

---

## Medium Priority Improvements

### 4. Rate limiting not applied to `/api/news/digest/generate`
The sync and translate endpoints reference `src/lib/rate-limit.ts`. The digest endpoint has cron-secret auth but no rate limiting. A leaked `CRON_SECRET` allows unlimited Groq API calls. Since `maxDuration = 60` and Groq is billed, add at minimum a daily idempotency check before calling Groq:

```ts
// Before calling generateDailyDigest():
const { data: existing } = await supabase
  .from("news_digests")
  .select("id")
  .eq("digest_date", today)
  .maybeSingle();
if (existing) {
  return NextResponse.json({ ok: true, skipped: true, date: today });
}
```
The current code uses `upsert` so it won't duplicate data, but it will still burn Groq tokens on a second call for the same day.

### 5. `article_ids` stores URLs, not IDs
In `route.ts` line 35: `article_ids: digest.sections.flatMap((s) => s.articleUrls)`. The column is named `article_ids` but it receives article URLs. If the `news_digests` schema expects UUIDs or integer IDs, this will silently store the wrong type. If the column is `text[]`, it works but the naming is misleading. Verify against the actual DB schema; rename to `article_urls` in schema + code if URLs are intended.

### 6. JSON parse error leaks partial AI output
`digest.ts` line 125: the error message includes `result.text.slice(0, 200)`. This could surface raw AI-generated content in logs/error responses visible in Vercel logs or the `500` response body. Low risk here (not a user-facing string for the UI, since the 500 response goes to the cron caller), but worth noting for compliance/log hygiene.

---

## Low Priority Suggestions

### 7. `generateMetadata` in digest detail page double-fetches
`generateMetadata` calls `getDigestByDate(date)` and then `DigestPage` calls it again. Next.js App Router does not deduplicate these automatically (unlike `React.cache()` for RSC). Wrapping `getDigestByDate` with `React.cache()` in `digest.ts` would collapse the two DB reads into one per request.

```ts
import { cache } from "react";
export const getDigestByDate = cache(async (date: string) => { ... });
```

### 8. Hard-coded `"vi-VN"` locale in detail page
`page.tsx` line 64 uses `"vi-VN"` hard-coded for date formatting regardless of user locale. Inconsistent — `news/page.tsx` reads locale from `getLocale()`. Minor, but the English locale would show the date in Vietnamese format.

### 9. Cron schedule `0 0 * * *` runs at UTC midnight
No issue per se, but for Vietnamese users (UTC+7) this generates the digest at 7:00 AM local time, which is reasonable. Worth a comment in `vercel.json` for maintainability.

---

## Positive Observations

- `"server-only"` import in `digest.ts` — correct, prevents accidental client bundle inclusion
- Parallel fetch `Promise.all([getNewsFromDB(), getLatestDigest()])` in `news/page.tsx` — good
- `Promise.all([getDigestByDate(date), getTranslations(...)])` in detail page — good
- `maybeSingle()` used correctly (no throw on null)
- `CRON_SECRET` validated via both query param and `Authorization: Bearer` header — supports both manual testing and Vercel Cron
- `GROQ_API_KEY` presence checked in the route before calling Groq — good early return
- `maxDuration = 60` set appropriately for AI generation
- i18n keys complete and consistent between `en.json` and `vi.json` for all 8 `News.digest.*` keys
- `DigestCard` localStorage dismiss key scoped to `date` — correct, prevents stale dismissals across days
- `notFound()` used correctly for missing digests
- Type interfaces exported cleanly from `digest.ts`

---

## Recommended Actions

1. **[Medium]** Remove unused `sectionCount` prop from `DigestCard` (#1)
2. **[High]** Add date format validation guard in detail page (#2): `if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();`
3. **[High]** Add idempotency skip before Groq call in cron route (#4)
4. **[Medium]** Verify `article_ids` column type vs stored URLs (#5)
5. **[Low]** Add `React.cache()` to `getDigestByDate` to deduplicate double-fetch (#7)
6. **[Low]** Make date locale dynamic in detail page (#8)
7. **[Optional]** Singleton `getServiceClient()` for connection efficiency (#3)

---

## Metrics

- TypeScript errors: 0
- Build errors: 0
- i18n key parity (en/vi): PASS — all 8 `News.digest.*` keys present in both files
- Dead code: `sectionCount` prop (1 instance)
- Security concerns: 1 medium (missing idempotency/rate guard on cron)

---

## Unresolved Questions

- What is the actual Postgres type of `news_digests.article_ids`? If `uuid[]` or `int[]`, the current URL-storing code is a silent bug.
- Is there a migration file for `news_digests` table? Not reviewed (not in scope list). RLS policy (public read) mentioned in brief but not verified.
