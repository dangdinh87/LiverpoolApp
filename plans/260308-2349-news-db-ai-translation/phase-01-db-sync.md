# Phase 01: DB Schema + Sync Pipeline

## Context
- [Plan overview](./plan.md)
- [News architecture doc](../../docs/news-feature.md)
- Existing pipeline: `src/lib/news/pipeline.ts` (fetchAllNews)
- Existing Supabase: `src/lib/supabase-server.ts` (createServerSupabaseClient)

## Overview

Create `articles` table in Supabase, build `/api/news/sync` route that reuses existing pipeline and UPSERTs results into DB. Modify news pages to read from DB with realtime fallback.

## Key Insights

- Existing `fetchAllNews()` already returns fully processed `NewsArticle[]` (deduped, categorized, scored, enriched). We just add an UPSERT layer on top.
- `createServerSupabaseClient()` uses cookie-based auth — for API route with CRON_SECRET we need a service role client instead.
- News pages currently call `getNews(200)` which runs the full pipeline. Replace with `getNewsFromDB()` + fallback.
- Homepage components (`NewsSection`, `LatestNewsWidget`) receive articles as props from their parent pages — the parent page just needs to switch data source.

## Requirements

1. `articles` table with URL as unique constraint
2. Sync endpoint protected by CRON_SECRET header
3. DB read helper with relevance-based ordering (VI articles first for VI locale)
4. Graceful fallback: if DB returns 0 rows, fall back to realtime `getNews()`

## Architecture

### DB Schema

```sql
CREATE TABLE articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  snippet TEXT DEFAULT '',
  thumbnail TEXT,
  source TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  category TEXT DEFAULT 'general',
  relevance FLOAT DEFAULT 0,
  published_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  title_vi TEXT,        -- Phase 02: AI-translated title
  snippet_vi TEXT,      -- Phase 02: AI-translated snippet
  is_active BOOLEAN DEFAULT true
);

-- Performance indexes
CREATE INDEX idx_articles_relevance ON articles(relevance DESC);
CREATE INDEX idx_articles_language ON articles(language);
CREATE INDEX idx_articles_source ON articles(source);
CREATE INDEX idx_articles_fetched_at ON articles(fetched_at DESC);
```

RLS: Disable for this table (public read, server-only write via service role).

### Sync Route (`/api/news/sync`)

```
GET /api/news/sync
Headers: { Authorization: Bearer <CRON_SECRET> }

Flow:
1. Validate CRON_SECRET
2. Import adapters + fetchAllNews from existing pipeline
3. const articles = await fetchAllNews(adapters, 200)
4. UPSERT each article into DB (ON CONFLICT url DO UPDATE)
5. Return { synced: articles.length, timestamp }
```

Important: This route CANNOT use `createServerSupabaseClient()` (cookie-based). Must use `createClient()` from `@supabase/supabase-js` with `SUPABASE_SERVICE_ROLE_KEY` for server-to-server write.

### DB Read Helper (`src/lib/news/db.ts`)

```typescript
import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function getNewsFromDB(limit = 50, locale = "en") {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("is_active", true)
    .order("relevance", { ascending: false })
    .limit(limit);

  if (error || !data || data.length === 0) return null; // signal fallback
  return mapToNewsArticles(data);
}
```

Returns `null` when empty -> caller falls back to `getNews()`.

## Related Code Files

| File | Role | Change |
|------|------|--------|
| `src/lib/news/pipeline.ts` | fetchAllNews orchestrator | No change (reused by sync route) |
| `src/lib/news/index.ts` | Entry point + exports | Add getNewsFromDB export |
| `src/app/news/page.tsx` | News listing page | Switch to getNewsFromDB + fallback |
| `src/app/page.tsx` | Homepage | Check if it passes articles to NewsSection |
| `src/components/home/news-section.tsx` | Homepage news | No change (receives props) |
| `src/components/home/latest-news-widget.tsx` | Bento grid widget | No change (receives props) |
| `supabase/migrations/001_initial.sql` | Existing schema | Reference only |
| `.env.example` | Env vars | Add CRON_SECRET |

## Implementation Steps

### Step 1: Create migration file
- File: `supabase/migrations/002_articles.sql`
- Create `articles` table with schema above
- Add indexes for relevance, language, source, fetched_at
- No RLS (public read, service role write)
- Run migration via Supabase Dashboard SQL Editor

### Step 2: Create service role Supabase helper
- In `src/app/api/news/sync/route.ts`, create inline service role client:
  ```typescript
  import { createClient } from "@supabase/supabase-js";
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  ```
- Do NOT add this to `supabase-server.ts` (that file uses cookies for user-scoped auth)

### Step 3: Build sync route
- File: `src/app/api/news/sync/route.ts`
- GET handler with CRON_SECRET validation via `Authorization: Bearer <token>`
- Import adapters list from `src/lib/news/index.ts` (need to export adapters or rebuild inline)
- Actually: build adapters inline in sync route to avoid circular deps
- Call `fetchAllNews(adapters, 200)`
- Map `NewsArticle[]` to DB rows, UPSERT with `onConflict: 'url'`
- Return JSON response with count

### Step 4: Create DB read helper
- File: `src/lib/news/db.ts`
- `getNewsFromDB(limit, locale)` — SELECT from articles, map back to `NewsArticle` type
- `server-only` guard
- `React.cache()` wrapper for request dedup

### Step 5: Modify news page
- File: `src/app/news/page.tsx`
- Replace `await getNews(200)` with:
  ```typescript
  let allArticles = await getNewsFromDB(200, userLang);
  if (!allArticles) {
    allArticles = await getNews(200); // fallback
  }
  ```
- Rest of page logic unchanged (category filter, locale split, etc.)

### Step 6: Check homepage data flow
- `src/app/page.tsx` likely calls `getNews()` and passes to `NewsSection`
- Switch that call to `getNewsFromDB()` + fallback too
- `LatestNewsWidget` and `NewsSection` receive props — no changes needed

### Step 7: Update .env.example
- Add `CRON_SECRET=your-random-secret-here`

## Todo

- [ ] Create `supabase/migrations/002_articles.sql`
- [ ] Create `src/app/api/news/sync/route.ts`
- [ ] Create `src/lib/news/db.ts`
- [ ] Modify `src/app/news/page.tsx` to use DB
- [ ] Modify `src/app/page.tsx` homepage data source
- [ ] Export `getNewsFromDB` from `src/lib/news/index.ts`
- [ ] Add CRON_SECRET to `.env.example`
- [ ] Run migration in Supabase Dashboard
- [ ] Test: call `/api/news/sync` manually, verify DB populated
- [ ] Test: news page loads from DB, fallback works when DB empty

## Success Criteria

1. `GET /api/news/sync` with valid CRON_SECRET returns 200 + synced article count
2. `articles` table populated with ~50-150 articles after sync
3. `/news` page renders from DB data, visually identical to current
4. Homepage news section renders from DB data
5. When DB is empty, pages gracefully fall back to realtime fetch
6. Unauthorized sync requests return 401

## Risk Assessment

- **Service role key exposure**: Only used server-side in API route, never in NEXT_PUBLIC. Low risk.
- **Pipeline import in API route**: fetchAllNews uses `server-only` imports — API route is server-side, so OK.
- **UPSERT race condition**: Two cron runs at same time? UNIQUE on URL + UPSERT = safe, last write wins.
- **Migration rollback**: Simple `DROP TABLE articles;` if needed.

## Security Considerations

- CRON_SECRET validated via Authorization Bearer header
- Service role key only in API route (server-side)
- articles table: no RLS needed (public read data, no user PII)
- No user input reaches SQL (Supabase client handles parameterization)

## Next Steps

After Phase 01 is complete, proceed to [Phase 02: AI Translation](./phase-02-ai-translation.md).
