# News & AI Editorial System

**Anfield Daily** aggregates Liverpool FC coverage from **13 English press outlets** (`NEWS_OUTLET_COUNT = 13`) plus official club video (`lfctv`), normalises and de-duplicates stories into Supabase, pre-scrapes full article HTML and embedded video, and runs three **VietAPI** editorial workflows: a daily AI briefing (`/news/digest`), on-demand full-article Vietnamese translation (`/api/news/translate`), and fact-validated post-match analysis (`/analysis`).

---

## 1. Pipeline Overview

```text
13 English Outlets (12 RSS + LfcAdapter) + YouTubeChannelAdapter (`lfctv`)
        │
        ▼
  fetchAllNews()             ── parallel fetch (`cache: "no-store"`), 14-day cutoff, source telemetry
        │
        ▼
  canonicalizeArticleUrl()   ── strip tracking params (`utm_*`, `at_*`) & trailing slashes
  deduplicateArticles()      ── canonical URL set + 48h Jaccard title similarity
        │
        ▼
  categorizeArticle()        ── regex rules (`match-report`, `transfer`, `injury`, `team-news`, `opinion`, `analysis`, `general`)
  scoreArticle()             ── freshness + weighted 2026/27 keywords + source priority
        │
        ▼
  Supabase `articles`        ── batch upsert (`mergeArticleRowForUpsert`, preserving `is_active` & `read_count`)
        │
        ▼
  fetchOgMeta()              ── fill missing `og:image` thumbnails
  scrapeContentForRecentArticles() ── full HTML + HLS/MP4 video extraction (45s budget, 24h cache)
        │
        ▼
  `sync_logs` + revalidate   ── log per-source outcomes & bust homepage/feed ISR tags
```

**Database as single source of truth:** Pages never call feed adapters at render time; they read cached rows from Supabase (`src/lib/news/db.ts` & `cached-feed.ts`).

---

## 2. Active Sources

### 13 English Press Outlets (`src/lib/news/config.ts`)

| Key | Outlet | Ingestion Method |
|---|---|---|
| `lfc` | Liverpool FC Official | `LfcAdapter` (`sitemap-news.xml`, filtered to Men's & Club category pages) |
| `bbc` | BBC Sport | Dedicated Liverpool RSS feed |
| `guardian` | The Guardian | Dedicated Liverpool RSS feed (`/live/` liveblogs dropped at ingest) |
| `echo` | Liverpool Echo | Dedicated Liverpool RSS feed |
| `tia` | This Is Anfield | Dedicated Liverpool RSS feed (link-out only; automated scraping blocked) |
| `anfield-watch` | Anfield Watch | Dedicated RSS feed |
| `eotk` | Empire of the Kop | Dedicated RSS feed |
| `sky` | Sky Sports | Football RSS feed (`filter: "lfc"`, video/liveblog items dropped) |
| `mirror` | Mirror | Liverpool topic RSS feed |
| `independent` | The Independent | Football RSS feed (`filter: "lfc"`) |
| `anfieldindex` | Anfield Index | Dedicated RSS feed (8s timeout for large XML) |
| `liverpoolcom` | Liverpool.com | Dedicated RSS feed |
| `espn` | ESPN | Soccer RSS feed (`filter: "lfc"`) |

> Legacy non-English host mappings and labels remain in `src/lib/news/source-hosts.ts` and `src/lib/news-config.ts` solely so older archived URLs continue resolving without broken links.

### Official Club Video (`lfctv`)

`YouTubeChannelAdapter` (`src/lib/news/youtube-data-api.ts`) queries YouTube Data API v3 (`YOUTUBE_API_KEY`) for official Liverpool FC uploads to populate the video strip on `/news`. Video items (`source === "lfctv"`) are recognised as dedicated club items in `relevance.ts`, excluded from text pre-scraping, digests, and full-text search, and skipped cleanly when `YOUTUBE_API_KEY` is unset.

---

## 3. Canonical URLs & Readable Slugs

- **URL Normalisation (`src/lib/news/url.ts`):** Tracking parameters (`utm_*`, `at_*`, etc.) and trailing slashes are stripped at ingest. Database reads, translations, likes, comments, and bookmarks check `articleUrlVariants()` so legacy rows resolve seamlessly.
- **Readable Slugs (`src/lib/news-config.ts`):**
  - Standard article: `/news/bbc/sport/football/...`
  - Alternate host of a known source: `/news/bbc/~www.bbc.co.uk/sport/...`
  - URLs requiring preserved query parameters (such as YouTube `?v=`): base64url segment fallback.
- **SSRF Guard:** Every server-side article fetch validates the decoded target against `isKnownNewsSourceUrl()`.

---

## 4. Full-Article Extraction & Video Hydration

**File:** `src/lib/news/enrichers/article-extractor.ts`

1. **Cloudflare-compatible DOM parsing:** Uses `linkedom` + `@mozilla/readability` + per-source Cheerio selectors (`jsdom` is avoided because it cannot run on Cloudflare `workerd`).
2. **Boilerplate & image hygiene:** Strips "Read more…", syndication footers, newsletter/WhatsApp promos, generic next-match widgets, and duplicate hero images (`dropHeroDuplicate`), while filtering CORP-blocked image CDNs in `isEmbeddableImageUrl()`.
3. **Final HTML sanitisation:** Runs `sanitize-html` as the last step (with `allowedIframeHostnames` and whitelisted semantic tags).
4. **Inline HLS/MP4 video:** Converts detected streams into `<div class="article-video-player" data-video-src="...">` placeholders.
5. **Reader rendering (`/news/[...slug]`):** `TranslatableExcerpt` renders full `htmlContent` via `ArticleHtmlBody` (mounting `ArticleVideoPlayer` + dynamic `hls.js`) with publisher attribution and original link **above** the body, `robots: { index: false, follow: true }`, and no ads.

---

## 5. VietAPI Workflows (`src/lib/ai/vietapi.ts`)

All AI features call **VietAPI** (`VIETAPI_KEY`) via `@ai-sdk/openai-compatible` and `ai`, prepended with `buildCurrentFactsBlock()` (`src/lib/prompts/current-facts.ts` — current date in `GMT+7`, `2026/27` season, head coach Andoni Iraola, and active 31-player squad):

### A. On-Demand Full-Article Vietnamese Translation (`POST /api/news/translate`)

- Verifies the requested URL exists in `articles` (`404` otherwise) to protect LLM quota.
- Caps input at `18,000` characters, deduplicates concurrent requests per canonical URL, and enforces per-attempt `AbortSignal.timeout` deadlines across the fallback chain (`deepseek-v4-flash` → `deepseek-v4-pro` → `claude-sonnet-5`).
- Caches results in `articles.content_vi` (`title_vi`, `snippet_vi`, `paragraphs`) plus a 7-day browser `localStorage` cache (`src/lib/news/translation-cache.ts`).

### B. AI Daily Briefing (`GET /api/news/digest/generate`, `/news/digest/[date]`)

- Keyed to `Europe/London` calendar dates (`DIGEST_TIME_ZONE`).
- Executes two parallel VietAPI requests (~35s wall time) producing the structured daily briefing (`sections`) and a companion SEO summary (`seo_article`), stored idempotently in `news_digests`.
- Pages read via `getLatestDigest()` / `getDigestByDate()` and never trigger generation during user renders.

### C. Fact-Validated Post-Match Analysis (`GET/POST /api/site-articles/generate`, `/analysis/[slug]`)

- Builds a structured `ArticleFacts` payload (`src/lib/site-articles/match-review-facts.ts`) from FDO fixtures and ESPN events, lineups, and statistics (including `0–0` draws and accurate own-goal attribution).
- Generates English and Vietnamese editorial drafts (`deepseek-v4-flash` → `deepseek-v4-pro`) and checks every draft with `validateDraft()` (`src/lib/site-articles/validate-draft.ts`):
  - Verifies scores, scorers, and named players against `facts`
  - Rejects banned AI clichés, raw HTML entities/tags, publisher boilerplate, and off-brand positioning
  - Checks corpus similarity (`similarity.ts`)
- Published pieces land in `site_articles` (`status = 'published'`), revalidate `/analysis` and `site-articles` cache tags, and appear in `sitemap.xml` and `/llms.txt`. Rejected drafts are stored with `status = 'rejected'` and `reject_reason` for inspection.

---

## 6. Scheduled Workflows

All cron routes require `Authorization: Bearer <CRON_SECRET>` validated in constant time by `withCronAuth()` (`src/lib/cron.ts`):

| Workflow | Schedule (UTC) | Endpoint | Purpose |
|---|---|---|---|
| `.github/workflows/news-sync.yml` | `0 * * * *` | `GET /api/news/sync` | Hourly feed sync, thumbnail enrich, 45s pre-scrape & Telegram freshness/failure alerts |
| `.github/workflows/news-sync.yml` | `01:00–16:59` (post-sync) | `GET /api/news/digest/generate` | Idempotent hourly retry if the midnight briefing missed |
| `.github/workflows/news-daily.yml` | `7 0 * * *` | `GET /api/news/digest/generate` | Primary daily AI briefing generation |
| `.github/workflows/news-daily.yml` | `17 3 * * *` | `GET /api/news/cleanup` | Clear cached bodies >7d, hard-delete >14d, prune `sync_logs` >14d |
