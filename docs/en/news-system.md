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
| Cron job (daily 6 AM UTC) | `POST /api/news/sync` | Authorized via `CRON_SECRET` |
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

  // 5. Log result to sync_logs table
  await supabase.from("sync_logs").insert({ inserted, failed, duration_ms, source_stats });

  return { total, upserted, failed, enriched, durationMs, errors };
}
```

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

Configured in `vercel.json`:

| Route | Schedule | `maxDuration` | Purpose |
|---|---|---|---|
| `/api/news/sync` | `0 6 * * *` (6 AM UTC) | 60s | Sync all RSS feeds → Supabase, scrape HTML content + detect videos |
| `/api/news/cleanup` | `0 3 * * *` (3 AM UTC) | default | Soft-delete articles >30d; hard-delete >60d |
| `/api/news/digest/generate` | `0 0 * * *` (midnight UTC) | 60s | AI daily digest via Groq |

**Auth:** All cron routes check `Authorization: Bearer <CRON_SECRET>` header (Vercel sends automatically) or `?key=<CRON_SECRET>` query param.

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
