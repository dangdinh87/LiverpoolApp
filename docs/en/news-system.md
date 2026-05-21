# News System

Liverpool FC news aggregated from 17+ RSS sources (EN + VI), stored in Supabase, with AI translation and daily digest.

---

## Overview

```
RSS/Scraper Adapters (17+ sources)
        |
        v
   fetchAllNews()         -- parallel fetch, graceful per-source failure
        |
        v
  deduplicateArticles()   -- URL dedup + Jaccard title similarity
        |
        v
  categorizeArticle()     -- regex rules → category tag
  scoreArticle()          -- freshness + keywords + source priority
        |
        v
  Supabase articles table -- upsert, batches of 50
        |
        v
  enrichArticleMeta()     -- OG image fetch for articles missing thumbnails
        |
        v
  sync_logs               -- per-sync stats logged
```

**DB is the single source of truth.** Pages never call adapters directly; they read from `articles` via `getNewsFromDB()`.

---

## RSS Sources

### English (LFC-specific feeds)

| Source key | Label | Feed URL |
|---|---|---|
| `lfc` | Liverpool FC | `liverpoolfc.com` (custom adapter) |
| `bbc` | BBC Sport | `feeds.bbci.co.uk/sport/football/teams/liverpool/rss.xml` |
| `guardian` | The Guardian | `theguardian.com/football/liverpool/rss` |
| `echo` | Liverpool Echo | `liverpoolecho.co.uk/all-about/liverpool-fc/?service=rss` |
| `anfield-watch` | Anfield Watch | `anfieldwatch.co.uk/feed` |
| `eotk` | Empire of the Kop | `empireofthekop.com/feed/` |
| `goal` | GOAL | Google News RSS proxy (custom adapter) |

### Vietnamese (keyword-filtered feeds)

| Source key | Label | Filter |
|---|---|---|
| `bongda` | Bóng Đá | LFC-specific feed (no filter needed) |
| `bongdaplus` | Bóng Đá+ | Custom scraper (`bongdaplus.vn`) |
| `24h` | 24h | `lfc` keyword filter |
| `vnexpress` | VnExpress | `lfc` keyword filter |
| `tuoitre` | Tuổi Trẻ | `lfc` keyword filter |
| `thanhnien` | Thanh Niên | `lfc` keyword filter |
| `dantri` | Dân Trí | `lfc` keyword filter |
| `zingnews` | ZNews | `lfc` keyword filter |
| `vietnamnet` | VietNamNet | `lfc` keyword filter |
| `webthethao` | Webthethao | `lfc` keyword filter |

> Note: `thisisanfield.com` is disabled due to persistent redirect loops.

### Adapter Types

- **`LfcAdapter`** — LFC Official site scraper
- **`RssAdapter`** — generic RSS parser, applies `LFC_KEYWORDS` filter when `filter: "lfc"` is set in config
- **`BongdaplusAdapter`** — HTML scraper for `bongdaplus.vn` pages
- **`GoalAdapter`** — Google News RSS proxy for GOAL.com

---

## Sync Pipeline

### Entry Points

| Trigger | Location | Notes |
|---|---|---|
| GitHub Actions cron (hourly UTC) | `GET /api/news/sync` | Authorized via `CRON_SECRET` |
| Background auto-sync | `db.ts → triggerSyncIfNeeded()` | Fires when data is stale on page load |

### `syncPipeline()` — `src/lib/news/sync.ts`

```typescript
async function syncPipeline(): Promise<SyncResult> {
  // 1. Initialize adapters
  const adapters = [new LfcAdapter(), ...RSS_FEEDS.map(rssAdapter), new BongdaplusAdapter()];

  // 2. Fetch all sources in parallel
  const { articles, stats } = await fetchAllNews(adapters, 300);

  // 3. Upsert to Supabase in batches of 50 (1 retry on 502/503)
  await supabase.from("articles").upsert(rows, { onConflict: "url" });

  // 4. Re-enrich: fetch OG image for up to 30 articles missing thumbnails
  await fetchOgMeta(noThumbArticles);

  // 5. Pre-scrape article content_en with adaptive limit + time budget
  //    - low volume: 10-16
  //    - high volume / near match window: up to 36
  //    - hard stop after 90s scrape budget
  await scrapeContentForRecentArticles(...);

  // 6. Log result to sync_logs table
  await supabase.from("sync_logs").insert({ inserted, failed, duration_ms, source_stats });

  return { total, upserted, failed, enriched, durationMs, errors };
}
```

`source_stats` now also tracks pre-scrape telemetry (`scrapeMode`, `scrapeAttempted`, `scraped`, `scrapeFailed`, `scrapeBudgetStop`) so hourly runs can be tuned from real data.

### Three-Tier Sync Strategy (`triggerSyncIfNeeded`)

Called on every `/news` page load. Checks DB freshness to decide sync behavior:

| DB Age | Action |
|---|---|
| `< 15 min` | Skip — serve cached data |
| `15–30 min` | Fire-and-forget background sync, serve stale data immediately |
| `> 30 min` or empty | **Blocking sync** with 8s timeout, then serve |

The per-instance `syncInProgress` lock prevents duplicate syncs within the same serverless instance.

---

## Deduplication

**File:** `src/lib/news/dedup.ts`

Two-stage dedup applied before DB upsert:

1. **URL normalization** — strip protocol, `www.`, trailing slashes → check against `Set<string>`
2. **Jaccard title similarity** — tokenize first 60 chars of title, compute Jaccard on token sets, threshold `0.6`

```typescript
// Jaccard: intersection / union of token sets
// Threshold 0.6 → two titles sharing >60% tokens = duplicate
const JACCARD_THRESHOLD = 0.6;
```

Stopwords excluded from tokenization: `a, an, the, is, in, of, to, and, for, on, at, with, by, from, as, but, or, not, be, are, was`.

---

## Category Detection

**File:** `src/lib/news/categories.ts`

Regex rules applied to `title + snippet`. First match wins:

| Category | Trigger patterns |
|---|---|
| `match-report` | Score patterns (`2-1`), "highlights", "full-time", "kết quả", "tường thuật" |
| `transfer` | "sign", "deal", "bid", "fee", "contract", "chuyển nhượng", "ký hợp đồng" |
| `injury` | "injured", "ruled out", "hamstring", "chấn thương", "nghỉ thi đấu" |
| `team-news` | "lineup", "squad list", "starting xi", "đội hình", "danh sách" |
| `opinion` | "opinion", "ratings", "verdict", "pundit", "nhận định", "chấm điểm" |
| `analysis` | "preview", "predicted", "pre-match", "dự đoán", "trước trận" |
| `general` | fallback |

---

## Relevance Scoring

**File:** `src/lib/news/relevance.ts`

Score formula: `freshness × 0.4 + keywords × 0.3 + source_priority × 0.3`

**Keyword scoring** (`src/lib/news/config.ts` → `LFC_KEYWORDS_WEIGHTED`):
- Club identity: `liverpool` (3), `anfield` (3), `lfc` (3)
- Manager: `arne slot` (2.5)
- Star players: `salah` (2.5), `van dijk` (2.5)
- New signings: `florian wirtz` (3), `alexander isak` (3)
- Capped at 10

**Freshness**: `10 × e^(-ageHours / 24)` — full score within 2h, halved at ~17h, near-zero at 7 days

**Source priority** (0–10): `lfc:10`, `anfield-watch/eotk:8`, `echo:7`, `bbc/guardian:6`, VI sources: 3–4

---

## Database Schema

### `articles` table

| Column | Type | Notes |
|---|---|---|
| `url` | `text` | **Primary key** |
| `title` | `text` | |
| `snippet` | `text` | First ~200 chars of body |
| `author` | `text` | |
| `thumbnail` | `text` | Nullable |
| `hero_image` | `text` | Nullable |
| `source` | `text` | Source key (`bbc`, `lfc`, etc.) |
| `language` | `text` | `en` or `vi` |
| `category` | `text` | See categories above |
| `relevance` | `numeric` | Computed score 0–10 |
| `tags` | `text[]` | |
| `published_at` | `timestamptz` | |
| `fetched_at` | `timestamptz` | Set on upsert |
| `content_scraped_at` | `timestamptz` | Set when full content is scraped (24h cache) |
| `word_count` | `integer` | |
| `content_en` | `jsonb` | `{ paragraphs, description, htmlContent, videoUrl, images, readingTime, isThinContent }` — 24h cache |
| `content_vi` | `jsonb` | `{ paragraphs, description, translatedAt }` |
| `htmlContent` | `text` | NEW: Sanitized full HTML from article page (for rich formatting + embedded videos) |
| `videoUrl` | `text` | NEW: First detected video URL (HLS or MP4) |
| `title_vi` | `text` | AI-translated title |
| `snippet_vi` | `text` | AI-translated snippet |
| `is_active` | `boolean` | `false` = soft-deleted by cleanup cron |

**Indexes:** `(is_active, language, published_at)`, `(is_active, language, relevance, published_at)`, `fts` full-text search column.

### `sync_logs` table

Tracks per-run stats: `inserted`, `updated`, `failed`, `duration_ms`, `errors`, `source_stats` (JSONB per-source breakdown).

---

## Article URL Routing

**File:** `src/lib/news-config.ts`

Article URLs are encoded as readable slugs to avoid base64 blobs in the browser:

```
Original URL:   https://www.bbc.com/sport/football/liverpool/123456
In-app route:   /news/bbc/sport/football/liverpool/123456
```

```typescript
// Encode: article URL → slug
encodeArticleSlug(url: string): string
// Decode: Next.js [...slug] segments → original URL
decodeArticleSlug(segments: string[]): string | null
// Build full in-app URL
getArticleUrl(articleLink: string): string  // returns "/news/{slug}"
```

Each source has a registered hostname in `SOURCE_HOSTS`. If hostname is not recognized, falls back to base64url encoding (legacy support).

---

## Translation System

On-demand EN→VI translation of article content via Groq API.

**Endpoint:** `POST /api/news/translate`

**Flow:**
1. Check `articles.content_vi` in DB — return cached if found
2. Scrape full article content with `scrapeArticle(url)`
3. Filter junk paragraphs (social CTAs, newsletter promos)
4. Call Groq `llama-3.3-70b-versatile` with sports journalist system prompt
5. Parse `|||`-delimited response into `[title, description?, ...paragraphs]`
6. Save to DB: `title_vi`, `snippet_vi`, `content_vi` columns
7. Return to client

**Client cache:** `src/lib/news/translation-cache.ts` — localStorage cache with 7-day TTL, keyed by URL hash. Prevents repeat API calls within a browser session.

**Rate limit:** 10 translations per IP per hour.

**DB cache:** `content_vi` JSONB column persists across sessions. Once translated, subsequent requests return the cached version (`cached: true`).

---

## AI Daily Digest

**File:** `src/lib/news/digest.ts`

Automated daily Vietnamese news summary generated by Groq.

### Generation

```
Cron: daily at 00:00 UTC
  |
  v
GET /api/news/digest/generate?key=CRON_SECRET
  |
  v
generateDailyDigest()
  ├─ Query top 25 articles from last 24h (sorted by relevance)
  ├─ Build prompt: article list + Vietnamese date
  ├─ Call Groq model (fallback chain — see below)
  ├─ Parse JSON response → DigestResult
  └─ Upsert to news_digests (idempotent on digest_date)
```

**Model fallback chain** (tries each in order on rate limit):
1. `llama-3.3-70b-versatile` — best quality, 100K TPD
2. `qwen/qwen3-32b` — strong fallback, 500K TPD
3. `llama-3.1-8b-instant` — fast, 500K TPD
4. `openai/gpt-oss-20b` — last resort, 200K TPD

**Auto-generation:** `getLatestDigest()` also auto-generates if:
- No digest exists for today
- Digest is >2 hours old

Uses a 30s timestamp-based lock to prevent concurrent generation. If generation fails, returns the previous digest gracefully.

### `news_digests` Table

```sql
CREATE TABLE news_digests (
  id            UUID PRIMARY KEY,
  digest_date   DATE UNIQUE,
  title         TEXT,
  summary       TEXT,
  sections      JSONB,     -- DigestSection[]
  article_ids   TEXT[],
  article_count INTEGER,
  model         TEXT,
  tokens_used   INTEGER,
  generated_at  TIMESTAMP
);
```

### DigestSection Shape

```typescript
{
  category: "match-report" | "transfer" | "injury" | "team-news" | "opinion" | "analysis" | "general",
  categoryVi: string,     // e.g. "Kết Quả Trận Đấu"
  headline: string,       // Vietnamese headline
  body: string,           // 4–6 sentence Vietnamese summary
  articleUrls: string[]   // source article URLs
}
```

### Frontend

- **`/news`** — `getLatestDigest()` fetched in parallel with articles; `DigestCard` pinned above feed
- **`DigestCard`** — dismissable client component, collapse/expand state stored in localStorage
- **`/news/digest/[date]`** — full digest detail page; links back to source articles

---

## Frontend Components

### `/news` — News Listing Page

`src/app/news/page.tsx` — Server Component

- Calls `getNewsFromDB(limit, preferLang)` to fetch initial articles (default 30)
- Fetches `getLatestDigest()` in parallel
- Renders `DigestCard` + `NewsFeed` (client component for filtering/pagination)

**Filters:**
- Language: All / International (EN) / Vietnamese (VI)
- Category: All / Match Report / Transfer / Injury / Team News / Analysis / Opinion
- Sort: Latest / Trending (relevance)
- Source: dropdown of all active sources

### `/news/[...slug]` — Article Reader

`src/app/news/[...slug]/page.tsx` — Server Component

- Decodes `[...slug]` via `decodeArticleSlug()` to recover original URL
- Looks up article in DB by URL
- Scrapes full content via `scrapeArticle(url)` if `content_en` not cached
- Renders `ArticleReader` with:
  - Translation toggle (EN/VI) — calls `/api/news/translate` on first switch
  - Reading progress bar
  - Like/save actions
  - Comments section
  - Related articles sidebar

### Comments & Likes

- **Likes:** `POST /api/news/like` — upsert to `article_likes` table (auth required)
- **Comments:** `GET/POST/DELETE /api/news/comments` — CRUD on `article_comments` table (auth required to post/delete)
- Comment display: anonymous-safe — shows relative timestamps (just now / Xm ago / Xh ago / Xd ago)

### Saved Articles

- `POST/DELETE /api/saved-articles` — adds/removes from `saved_articles` table (auth required)
- Profile page lists saved articles with remove option
- Save state tracked client-side with optimistic update

---

## Content Extraction & Video Support

**File:** `src/lib/news/enrichers/article-extractor.ts`

### HTML Content Scraping

Per-source DOM selectors (verified 2026-03-11) extract full article HTML from publisher pages:

```
liverpoolfc.com      → #__NEXT_DATA__ (JSON) or article, main
bbc.com              → [data-component=text-block] or article, main
24h.com.vn           → article → .detail-content → .cms-body
bongdaplus.vn        → .news-detail → .detail-body → .content-news
vnexpress.net        → .fck_detail → .article-content
[...15+ more sources with verified selectors]
```

### Features

1. **24-hour cache** (CONTENT_CACHE_TTL_MS): Skips re-scraping recently extracted articles to reduce load and improve latency
2. **Junk filtering**: Removes generic "next match" widget HTML and social CTAs from articles
3. **Video detection**: Finds embedded video URLs (HLS streams, MP4 files) and inserts placeholder divs:
   ```html
   <div class="article-video-player"
        data-video-src="https://..."
        data-poster="https://..."
        data-source-url="..."
        data-source-name="...">
   </div>
   ```
4. **HTML sanitization**: Whitelist tags (p, h1–h4, img, figure, figcaption, a, em, strong, code, pre, ul, ol, li, blockquote, table)
5. **Image extraction**: Collects all `<img src>` from article body
6. **Reading time**: Word count ÷ 200
7. **Thin content detection**: Flags articles <400 words as `isThinContent: true`

### ArticleContent Type

```typescript
{
  title: string;
  heroImage?: string;
  description?: string;
  paragraphs: string[];
  htmlContent?: string;        // NEW: Raw sanitized HTML
  videoUrl?: string;           // NEW: First detected video URL
  images: string[];
  sourceUrl: string;
  readingTime?: number;
  isThinContent?: boolean;
}
```

### Article Rendering Components

**`ArticleHtmlBody`** (`src/components/news/article-html-body.tsx`):
- Renders `htmlContent` via dangerouslySetInnerHTML
- Hydrates video player placeholders with imperative React mounting (avoids re-render conflicts)
- Uses `createRoot()` to mount `ArticleVideoPlayer` components into `data-video-src` divs

**`ArticleVideoPlayer`** (`src/components/news/article-video-player.tsx`):
- Supports HLS streams (`.m3u8`) and MP4 files
- Uses HLS.js for cross-browser HLS support (Chrome, Firefox, Edge)
- Falls back to native HTML5 video on Safari
- Graceful error handling with link to original source
- Supports custom poster image + metadata (source name, URL)

---

## Cron Jobs

### Schedulers

Three concurrent schedulers hit the news endpoints. **The `/api/news/sync` route is currently triggered by BOTH GitHub Actions and Vercel cron** — pick one as primary; the other is redundant.

| Route | Scheduler | Schedule (UTC) | `maxDuration` | Purpose |
|---|---|---|---|---|
| `/api/news/sync` | GitHub Actions (`.github/workflows/news-sync.yml`) | `0 * * * *` (hourly) | 300s | RSS fetch → Supabase upsert → og:image enrich → content pre-scrape → ISR revalidate |
| `/api/news/sync` | Vercel cron (`vercel.json`) | `*/15 * * * *` (every 15 min) | 300s | Same route — duplicate trigger |
| `/api/news/cleanup` | Vercel cron | `0 3 * * *` (3 AM) | default | Soft-delete >30d; clear `content_en` >60d; hard-delete >60d inactive |
| `/api/news/digest/generate` | Vercel cron | `0 0 * * *` (midnight) | 60s | AI daily digest via Groq, skip if already generated |

**Auth:** All cron routes go through `withCronAuth()` ([src/lib/cron.ts](../../src/lib/cron.ts)). Accepts either:
- `Authorization: Bearer <CRON_SECRET>` header (Vercel cron sends automatically; GH Actions sets explicitly)
- `?key=<CRON_SECRET>` query param

Missing or wrong secret → HTTP 401 `{ "error": "Unauthorized" }`.

---

### GitHub Actions workflow detail (`/api/news/sync`)

**File:** [.github/workflows/news-sync.yml](../../.github/workflows/news-sync.yml)

**Trigger:**
- `schedule: "0 * * * *"` — every hour at minute :00 UTC (best-effort; see drift section)
- `workflow_dispatch: {}` — manual trigger, no inputs

**Step 1 — Trigger sync endpoint**
```bash
curl -X GET \
  -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
  -H "Content-Type: application/json" \
  "${{ secrets.SYNC_URL }}" \
  --max-time 300 \
  --retry 3 --retry-delay 10 --retry-connrefused \
  --silent --output "$TMP_RESPONSE" \
  --write-out "%{http_code}"
```
- `SYNC_URL` is stored as a repo secret (typically `https://www.liverpoolfcvn.blog/api/news/sync`)
- Response body written to a temp file; HTTP code captured separately
- `http_code` and `response` are pushed to `$GITHUB_OUTPUT` for downstream steps
- HTTP code outside `[200, 299]` → `::error::` + `exit 1`

**Step 2 — Parse JSON response (inline Node script)**

The response is parsed and individual fields are written to both `$GITHUB_OUTPUT` and `$GITHUB_STEP_SUMMARY`:

```
sync_ok=true
sync_total=380
sync_upserted=380
sync_failed=0
sync_enriched=15
sync_scraped=4
sync_scrape_attempted=28
sync_scrape_failed=24
sync_scrape_mode=normal
sync_scrape_budget_stop=false
sync_duration_ms=26821
sync_errors_count=0
sync_duration_sec=26.8
```

If `json.ok !== true` → `process.exit(1)` even though HTTP 200.

**Step 3 — Telegram notify**
- `if: success()` → sends `✅ Hourly News Sync success` with all metrics
- `if: failure()` → sends `❌ Hourly News Sync failed` with first 400 chars of response body
- Both are skipped silently if `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` secrets are missing

---

### `/api/news/sync` response shape

```jsonc
{
  "ok": true,                  // false → workflow exit 1
  "total": 380,                // articles fetched from all adapters
  "upserted": 380,             // rows passed to UPSERT (= INSERT + UPDATE combined; not new-only)
  "failed": 0,                 // batches whose upsert failed
  "enriched": 15,              // articles given an og:image thumbnail
  "scraped": 4,                // articles whose full content was pre-scraped
  "scrapeAttempted": 28,       // candidates picked for scraping
  "scrapeFailed": 24,          // scrape attempts that failed (timeout/404/selector miss)
  "scrapeMode": "normal",      // "low" | "normal" | "peak" — adaptive scrape budget
  "scrapeBudgetStop": false,   // true when 90s scrape time budget exhausted
  "durationMs": 26821,         // total pipeline duration
  "errors": []                 // per-batch upsert error details
}
```

Error shapes:
- Pipeline throws → HTTP 500 `{ "error": "<message>" }`
- Auth fail → HTTP 401 `{ "error": "Unauthorized" }`

---

### Important: `upserted` is NOT a freshness metric

Each RSS feed returns its latest N items (sliding window, typically 15-100). Sync fetches all of them every hour (capped at `FETCH_LIMIT_BASE = 380` in [sync.ts:38](../../src/lib/news/sync.ts#L38)). Most URLs overlap with the previous hour.

Postgres `ON CONFLICT (url) DO UPDATE` counts every returned row in `upserted`, regardless of whether it INSERTed a new row or UPDATEd an existing one. So `upserted: 380` mostly means "380 RSS items processed", not "380 fresh articles added".

Typical breakdown per run:
- ~376 URLs already in DB → UPDATE (idempotent, no user-facing change)
- ~4 URLs new → INSERT (the only ones that actually move the feed forward)

The `sync_logs.inserted` column is similarly misleading — its value is `upserted`, not true inserts.

**To track real freshness**, monitor `published_at` of the newest active row or instrument the pipeline to separate insert vs update counts.

---

### Pipeline internals (`syncPipeline()` — [src/lib/news/sync.ts:280](../../src/lib/news/sync.ts#L280))

```
fetchAllNews(adapters, FETCH_LIMIT_BASE=380)
  └─ 24 adapters in parallel: 1 LFC + 22 RSS + 1 Bongdaplus
  └─ per-adapter failures are swallowed (graceful degradation)

bulkUpsertArticles(articles, supabase)
  ├─ batch size 50, single retry on transient errors
  ├─ SELECT existing rows by URL → merge into existingMap
  ├─ For new rows: explicitly seed { is_active: true, read_count: 0, fetched_at: now }
  │    ↑ FIX as of d6125b1 — see "Known Pitfalls" below
  ├─ For existing rows: { ...old, ...row, fetched_at: old.fetched_at || now }
  ├─ UPSERT { onConflict: "url", ignoreDuplicates: false }
  └─ Strip generated columns (`fts`, `id`) before merge

Re-enrich thumbnails (30 articles, batch 10)
  └─ Query thumbnail IS NULL AND is_active = true
  └─ fetchOgMeta() parallel via Promise.allSettled
  └─ Upsert with new hero_image/thumbnail

getMatchTrafficMode() → "low" | "normal" | "peak"
  └─ Reads nearest fixture window
  └─ peak: ±36h around match; normal: within 120h; low: otherwise

scrapeContentForRecentArticles()
  ├─ Adaptive limit: 10-36 depending on upserted + traffic mode
  ├─ Query: content_en IS NULL OR content_scraped_at < 24h ago
  ├─ Sort: relevance DESC, published_at DESC
  ├─ Parallel scrape in batches of 4-5 (Promise.allSettled)
  └─ Stops early when 90s time budget hit

INSERT sync_logs { inserted, updated, failed, duration_ms, errors, source_stats }

(after return) revalidatePath("/") + revalidatePath("/news") when upserted > 0
```

---

### Schedule drift (observed)

GitHub Actions `schedule` is best-effort, not guaranteed. Measured over 5 days (69 runs in a 120h window):

| Metric | Value |
|---|---|
| Expected hourly runs | 121 |
| Actual runs | 69 |
| **Missing rate** | **43%** |
| Mean drift from :00 | 33.2 min |
| Max drift | 59 min |
| Runs at exactly :00 | 0 |
| Mean gap between runs | 106 min |
| Max gap | 272 min (~4.5h) |
| Gaps >90 min | 37 |
| Gaps >180 min | 10 |

**Why:** GitHub Actions throttles cron during platform contention; private/free repos see worse drift. For tight freshness SLOs, prefer the Vercel cron path or self-host a scheduler.

---

### Silent failure modes

The `ok: true` flag and Telegram success message **do not guarantee user-facing freshness**:

1. **`upserted: 380` masks zero inserts.** All 380 rows could be updates of existing articles; new bait still drips at <5/hr.
2. **Scrape failure rate not gated.** A run with `scraped: 4 / scrapeAttempted: 28` (86% scrape miss) returns `ok: true`. Article content quality degrades silently.
3. **Per-source failures swallowed.** If 5 of 22 RSS feeds error out, `fetchAllNews` still returns successfully; only the remaining 17 sources contribute. The error counts surface in `sync_logs.source_stats` but are not in the API response.

**Recommended alerts:**
- Inserted < 1 for 3 consecutive hours → "feeds stale"
- `scraped / scrapeAttempted < 0.5` → "scrape selectors broken"
- Run gap > 120 min → "scheduler skipped"

---

### Known pitfalls

**Bulk upsert nullifies column defaults** (fixed in [sync.ts:182-196](../../src/lib/news/sync.ts#L182-L196), commit `d6125b1`).
PostgREST serializes a bulk upsert payload using the *union* of keys across all rows. When new rows (with the slim ~14-key shape from `articleToRow`) are batched alongside existing-merged rows (~26 keys), keys missing on the new rows get serialized as `null` — bypassing column `DEFAULT`. This previously caused fresh articles to land with `is_active = NULL`, which the app filter `.eq("is_active", true)` then excluded.

The fix explicitly seeds `is_active: true` and `read_count: 0` on new rows. Any backfill of historical `is_active = NULL` rows needs a one-off migration.

**`SYNC_URL` secret hardcodes domain.** Production GH Actions hit `liverpoolfcvn.blog` directly — preview deployments cannot be sync-tested via the same workflow.

**No concurrency guard.** `schedule` + `workflow_dispatch` can overlap. Add:
```yaml
concurrency:
  group: news-sync
  cancel-in-progress: false
```

---

### Manual operations

```bash
# Trigger GH Actions sync manually
gh workflow run news-sync.yml

# Hit the endpoint directly (requires CRON_SECRET)
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://www.liverpoolfcvn.blog/api/news/sync

# View recent runs
gh run list --workflow=news-sync.yml --limit 10

# View last run log
gh run view --log $(gh run list --workflow=news-sync.yml --limit 1 --json databaseId -q '.[0].databaseId')
```

---

## Key Files Map

```
src/lib/news/
├── config.ts              # RSS_FEEDS list, SOURCE_CONFIG, LFC_KEYWORDS_WEIGHTED
├── types.ts               # NewsArticle, FeedConfig, NewsSource, ArticleCategory types
├── sync.ts                # syncPipeline() — shared entry point for all sync operations
├── db.ts                  # getNewsFromDB(), getNewsPaginated(), searchArticles()
├── pipeline.ts            # fetchAllNews() — parallel fetch, dedup, categorize, score
├── dedup.ts               # deduplicateArticles() — URL + Jaccard dedup
├── categories.ts          # categorizeArticle() — regex category detection
├── relevance.ts           # scoreArticle() — freshness + keyword + source scoring
├── digest.ts              # generateDailyDigest(), getLatestDigest(), getDigestByDate()
├── translation-cache.ts   # Client localStorage cache for translations (7d TTL)
├── source-detect.ts       # detectSource(url), VI_SOURCES set
├── supabase-service.ts    # getServiceClient() — service role client (bypasses RLS)
├── index.ts               # Barrel: exports scrapeArticle, getNews
├── adapters/
│   ├── base.ts            # FeedAdapter interface
│   ├── lfc-adapter.ts     # LFC Official site adapter
│   ├── rss-adapter.ts     # Generic RSS adapter (rss-parser)
│   ├── bongdaplus-adapter.ts  # HTML scraper for bongdaplus.vn
│   ├── goal-adapter.ts    # Google News RSS proxy for GOAL.com
│   └── vietnamvn-adapter.ts   # Scraper for vietnam.vn
├── enrichers/
│   ├── og-meta.ts         # fetchOgMeta() — OG image/date enrichment
│   ├── article-extractor.ts   # Full article content scraper (Cheerio) + video detection
│   └── readability.ts     # Mozilla Readability wrapper
└── __tests__/
    ├── categories.test.ts
    ├── dedup.test.ts
    ├── relevance.test.ts
    └── pipeline.test.ts

src/lib/news-config.ts     # Client-safe: SOURCE_CONFIG, CATEGORY_CONFIG, encodeArticleSlug, decodeArticleSlug

src/app/
├── news/
│   ├── page.tsx           # /news listing (Server Component)
│   ├── [...]slug]/page.tsx # /news/[...slug] article reader
│   └── digest/[date]/page.tsx  # /news/digest/YYYY-MM-DD detail page
└── api/news/
    ├── sync/route.ts      # POST — cron sync trigger
    ├── cleanup/route.ts   # POST — old article cleanup
    ├── digest/generate/route.ts  # GET — digest generation
    ├── translate/route.ts # POST — on-demand EN→VI translation
    ├── like/route.ts      # POST — article like
    └── comments/route.ts  # GET/POST/DELETE — article comments

src/components/news/
├── news-feed.tsx          # Paginated article listing with filters
├── article-end-sections.tsx   # Related articles, comments section
├── article-sidebar.tsx    # Table of contents, up-next, share
├── article-html-body.tsx  # HTML content renderer with video hydration (NEW)
├── article-video-player.tsx   # HLS + MP4 video player (NEW)
├── comment-section.tsx    # Comments CRUD
├── translate-button.tsx   # EN/VI toggle
├── digest-card.tsx        # Daily digest preview
└── [...]                  # Other supporting components
```

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — bypasses RLS for all news operations |
| `GROQ_API_KEY` | Groq Cloud API — translation + digest generation |
| `CRON_SECRET` | Authorizes cron endpoints |

---

## Adding a New Source

1. Add `FeedConfig` entry to `RSS_FEEDS` array in `src/lib/news/config.ts`:
   ```typescript
   { url: "https://example.com/rss.xml", source: "mysource", language: "en" }
   ```
2. Add source key to `NewsSource` union type in `src/lib/news/types.ts`
3. Add display config to `SOURCE_CONFIG` in both `src/lib/news/config.ts` and `src/lib/news-config.ts`
4. Add hostname mapping to `SOURCE_HOSTS` in `src/lib/news-config.ts`
5. Add source priority weight in `src/lib/news/relevance.ts` → `SOURCE_PRIORITY`
6. If the source needs keyword filtering (general sports feed), add `filter: "lfc"` to the config

For a scraper-based source (no RSS), create a new adapter in `src/lib/news/adapters/` implementing the `FeedAdapter` interface and add it to `syncPipeline()` in `sync.ts`.
