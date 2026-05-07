# Scout Report: Pre-Scrape Implementation Files

**Date:** 2026-05-07 11:24  
**Task:** Locate & summarize files for pre-scrape article cron plan  
**Status:** Complete with critical findings

---

## Findings

### 1. `vercel.json` — Cron Schedules
**Path:** [/Users/nguyendangdinh/LiverpoolApp/vercel.json](vercel.json)

```json
{
  "crons": [
    { "path": "/api/news/sync", "schedule": "0 6 * * *" },
    { "path": "/api/news/cleanup", "schedule": "0 3 * * *" },
    { "path": "/api/news/digest/generate", "schedule": "0 0 * * *" }
  ]
}
```

**Summary:** Three cron jobs, no `maxDuration` config (inherits default 300s). No pre-scrape job yet.

---

### 2. `src/lib/news/enrichers/article-extractor.ts` — Scraping API
**Path:** [/Users/nguyendangdinh/LiverpoolApp/src/lib/news/enrichers/article-extractor.ts](src/lib/news/enrichers/article-extractor.ts)

**Public API (line 1361):**
```typescript
export const scrapeArticle = cache(
  async (url: string): Promise<ArticleContent | null>
);
```

**Returns:** `ArticleContent` shape (lines 32–46, types.ts):
```typescript
interface ArticleContent {
  title: string;
  heroImage?: string;
  description?: string;
  publishedAt?: string;
  author?: string;
  paragraphs: string[];
  htmlContent?: string;
  images: string[];
  sourceUrl: string;
  sourceName: string;
  readingTime?: number;
  isThinContent?: boolean;
  videoUrl?: string;
}
```

**Cache Behavior (line 1365):**
- Checks DB cache first: `getCachedContent(url)` → queries `content_en, content_scraped_at` (24h TTL)
- Falls back to Readability, then per-site cheerio extractors
- Caches result via `cacheContent(url, content)` (fire-and-forget)

---

### 3. `src/app/api/news/sync/route.ts` — Sync Handler
**Path:** [/Users/nguyendangdinh/LiverpoolApp/src/app/api/news/sync/route.ts](src/app/api/news/sync/route.ts)

```typescript
export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const GET = withCronAuth(async () => {...});
```

**Summary:** 60s maxDuration, uses `withCronAuth` helper (line 4), calls `syncPipeline()`.

---

### 4. `src/app/api/news/cleanup/route.ts` — Cleanup Logic
**Path:** [/Users/nguyendangdinh/LiverpoolApp/src/app/api/news/cleanup/route.ts](src/app/api/news/cleanup/route.ts)

**Soft-delete (line 12):** Articles >30 days old → `is_active: false`  
**Hard-delete (line 20):** Deactivated articles >60 days old **AND** `content_en IS NULL`  
**Bonus:** Also deletes `sync_logs` >30 days (line 28)

---

### 5. `src/app/news/[...slug]/page.tsx` — Article Page
**Path:** [/Users/nguyendangdinh/LiverpoolApp/src/app/news/[...slug]/page.tsx](src/app/news/[...slug]/page.tsx)

**`scrapeArticle()` call:** Line 136
```typescript
const [content, allArticles, fixtures, t] = await Promise.all([
  scrapeArticle(url),
  getNewsFromDB(100),
  getFixtures(),
  getTranslations("News.article"),
]);
```

**Fallback logic (lines 147–175):** If `!content || content.paragraphs.length === 0`, shows error page with "Read Original" link to source URL.

**DB reads:** Uses `getNewsFromDB(100)` for related articles, does NOT query articles table for content.

---

### 6. `src/lib/news/types.ts` — ArticleContent Shape
**Path:** [/Users/nguyendangdinh/LiverpoolApp/src/lib/news/types.ts](src/lib/news/types.ts)

Full shape confirmed (lines 32–46):
```typescript
export interface ArticleContent {
  title: string;
  heroImage?: string;
  description?: string;
  publishedAt?: string;
  author?: string;
  paragraphs: string[];
  htmlContent?: string;
  images: string[];
  sourceUrl: string;
  sourceName: string;
  readingTime?: number;
  isThinContent?: boolean;
  videoUrl?: string;
}
```

---

### 7. `src/lib/news/db.ts` — DB Helpers
**Path:** [/Users/nguyendangdinh/LiverpoolApp/src/lib/news/db.ts](src/lib/news/db.ts)

**Public exports:** `getNewsFromDB`, `searchArticles`, `getNewsPaginated`, `getArticleTitlesByUrls`

**No helper for query-by-URL found.** Code checks `fetched_at` age but does NOT query articles by URL for pre-scraping decisions.

---

### 8. `supabase/migrations/002_articles.sql` — Schema
**Path:** [/Users/nguyendangdinh/LiverpoolApp/supabase/migrations/002_articles.sql](supabase/migrations/002_articles.sql)

**Current columns:** `url`, `title`, `snippet`, `source`, `language`, `category`, `published_at`, `fetched_at`, `author`, `hero_image`, `word_count`, `tags`, `title_vi`, `snippet_vi`, `content_vi`, `is_active`

**CRITICAL ISSUE:** Schema lacks `content_en` and `content_scraped_at` columns that are actively used in `article-extractor.ts` (lines 47–48, 67–68).

**Note:** `content_vi` exists (line 32) but `content_en` does not.

---

### 9. GitHub Actions Workflows
**Result:** No `.github/workflows/` directory found. No existing CI/CD workflows.

---

### 10. `src/lib/cron.ts` — Auth Helper
**Path:** [/Users/nguyendangdinh/LiverpoolApp/src/lib/cron.ts](src/lib/cron.ts)

```typescript
export function withCronAuth(
  handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: any[]) => {
    if (!verifyCronRequest(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return handler(req, ...args);
  };
}

function verifyCronRequest(req: NextRequest): boolean {
  const secret = req.nextUrl.searchParams.get("key") ||
    req.headers.get("authorization")?.replace("Bearer ", "");
  return secret === process.env.CRON_SECRET;
}
```

**Summary:** Helper is ready. Verifies `key=` query param or `Bearer` header against `CRON_SECRET`.

---

## Critical Issues Flagged

1. **Missing schema columns:** `content_en` and `content_scraped_at` are referenced in article-extractor.ts but do NOT exist in `002_articles.sql` migration.
   - `content_vi` exists but `content_en` does not
   - Hard-delete cleanup (line 24 of cleanup/route.ts) checks `.is("content_en", null)` which will fail until columns are added
   
2. **No pre-scrape query helper:** db.ts lacks a function to get article URLs needing scrapes. Plan must add `getArticlesNeedingContent()` or similar.

3. **maxDuration not in vercel.json:** Sync and cleanup routes have inline `maxDuration` but it's not propagated via config. Pre-scrape route will need one too.

---

## Summary Table

| File | Lines | Purpose | Ready? |
|------|-------|---------|--------|
| vercel.json | 7 | Cron schedules | ⚠ No pre-scrape job |
| article-extractor.ts | 1361+ | Public scraping API + cache logic | ✅ Ready |
| sync/route.ts | 30 | Auth + sync orchestration | ✅ Ready |
| cleanup/route.ts | 40 | Soft/hard delete logic | ⚠ Refs missing columns |
| [...]slug]/page.tsx | 136, 147 | Scrape on article render + fallback | ✅ Ready |
| types.ts | 32–46 | ArticleContent shape | ✅ Ready |
| db.ts | 123+ | DB query helpers | ⚠ Missing URL-based query |
| 002_articles.sql | 4–72 | **CRITICAL:** Missing `content_en`, `content_scraped_at` | ❌ BROKEN |
| .github/workflows/ | — | CI/CD workflows | ❌ None found |
| cron.ts | 15–24 | Auth check helper | ✅ Ready |

