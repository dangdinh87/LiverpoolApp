# News Pipeline Full Audit + AI Daily Digest Brainstorm

**Date:** 2026-03-11 | **Type:** brainstorm | **Status:** Complete

---

## Problem Statement

The news feature has 17 sources, 15+ extractors, DB sync, translation, like/comment — but has accumulated tech debt, performance bottlenecks, and missing monitoring. User also wants an AI daily digest feature.

---

## AUDIT FINDINGS

### 🔴 CRITICAL (5)

#### C1 — Blocking sync on page load
`getNewsFromDB()` calls `syncIfStale()` which **blocks entire page render** for 10-30s on cold start (17 RSS feeds + 2 scrapers + OG enrichment in series).

**Fix:** Non-blocking background sync. Page serves stale DB data immediately, triggers sync in background.
```
Option A: fire-and-forget sync (don't await)
Option B: separate cron-only sync, remove syncIfStale from page path
```

#### C2 — Duplicate sync logic in `db.ts` vs `sync/route.ts`
Two independent sync implementations:
- `db.ts:syncArticles()` — simple, called from page
- `api/news/sync/route.ts` — has retry, re-enrichment, batch logging, sync_logs

They will drift. Single source of truth needed.

**Fix:** Extract shared `syncPipeline()`, call from both places.

#### C3 — Article content not cached in DB
`scrapeArticle()` fetches from source **every article page visit** (`force-dynamic`). No content caching.
- 10s timeout per scrape
- Source site goes down → article unreadable
- Same article scraped 100x/day = 100 HTTP requests to source

**Fix:** Store scraped content in DB (`content_en` JSONB column). Serve from cache, re-scrape only if >24h old.

#### C4 — Massive client payload (300 articles shipped to browser)
Page fetches 300 articles from DB, serializes ALL to client `<NewsFeed>`. User sees 12 initially. ~150KB+ JSON in page props.

**Fix:** Server-side pagination. Load 20-30 initially, load more via API route or server action.

#### C5 — `paragraphs.includes(text)` O(n) scan across ALL extractors
6+ extractors use `paragraphs.includes(text)` for dedup — O(n) per check. Code review H1 flagged this.

**Fix:** Use `Set<string>` instead of array for dedup checking.

---

### 🟡 HIGH (6)

#### H1 — No extraction health monitoring
Only `console.log`. No structured data on:
- Which sources are failing
- Average extraction success rate
- Thin content percentage per source
- Sync duration trends

**Fix:** Add `extraction_stats` to sync_logs or separate table. Track per-source: `{ fetched, parsed, failed, thin, avgParagraphs }`.

#### H2 — `LFC_KEYWORDS` duplicated in 2 files
- `config.ts:LFC_KEYWORDS` — flat string array for RSS filtering
- `relevance.ts:LFC_KEYWORDS` — weighted objects for scoring

Adding new player requires editing BOTH files. Easy to miss one.

**Fix:** Single source in `config.ts` with weights. Filter function derives flat list.

#### H3 — `webthethao` has NO dedicated extractor
Listed in RSS_FEEDS config but not in `extractors` map in article-extractor.ts. Falls back to generic Readability only.

**Fix:** Add extractor or verify Readability is sufficient (low-priority source).

#### H4 — `detectSource()` duplicated
- `article-extractor.ts:detectSourceName()` → returns display name (string)
- `[...slug]/page.tsx:detectSource()` → returns source ID (NewsSource type)

Two different URL→source mappings that can drift.

**Fix:** Single `detectSource(url): { id: NewsSource, name: string }` helper.

#### H5 — `fetchOgMeta` downloads full body then truncates
`res.text()` downloads entire page (could be MB), then slices to `</head>`. The `getOgImage` function below it uses streaming reader correctly.

**Fix:** Use streaming reader like `getOgImage` does, or reuse `getOgImage`.

#### H6 — No DB cleanup / article TTL
Articles accumulate forever. No archival, no pruning of articles >30 days old.

**Fix:** Cron job: mark `is_active=false` for articles older than 30 days. Or hard delete >60 days.

---

### 🟢 MEDIUM (6)

#### M1 — `validation.ts` is dead code
`validateFeedItems()` is never called anywhere in the pipeline.

**Fix:** Either integrate into RssAdapter or delete.

#### M2 — `SOURCE_CONFIG` includes disabled sources
`tia` (This Is Anfield), `sky` (Sky Sports) — no feeds produce articles for these.

**Fix:** Remove from SOURCE_CONFIG or mark as `disabled: true`.

#### M3 — Cross-language duplicate titles not caught
Jaccard dedup only compares first 60 chars. EN "Salah scores twice in 3-0 win" and VI "Salah lập cú đúp trong chiến thắng 3-0" are different strings → both appear.

**Fix:** Low priority. Could match by fuzzy entity extraction but complex. Accept as feature (show both).

#### M4 — Related articles pool too small
`getNewsFromDB(20)` for related — only 20 articles to choose from.

**Fix:** Use `getNewsFromDB(100)` or query by same category/tags.

#### M5 — No rate limiting on API endpoints
`/api/news/translate`, `/api/news/like`, `/api/news/comments` — no rate limit.

**Fix:** Add simple in-memory or Supabase-based rate limit (e.g., 10 translations/hour/user).

#### M6 — `znews.vn` URL detection missing in `detectSource()`
`[...slug]/page.tsx:detectSource()` checks `zingnews.vn` but actual URLs are `znews.vn`.

**Fix:** Add `znews.vn` check:
```typescript
if (url.includes("znews.vn")) return "zingnews";
```

---

## AI DAILY DIGEST — Feature Design

### Evaluated Approaches

#### Approach A: Cron-generated static digest (Recommended)
```
Cron (daily 7:00 AM VN) →
  Query top 15 articles from DB (last 24h, highest relevance) →
  Call Groq LLaMA 3.3-70b →
  Generate bilingual digest (EN + VI) →
  Store in `news_digests` table →
  Display on /news page as pinned card + /news/digest/[date] page
```

**Pros:**
- Simple, predictable, zero runtime cost for users
- Reuses existing Groq integration
- Pre-generated = instant load
- Can be cached forever (ISR)

**Cons:**
- Fixed schedule, not real-time
- Breaking news after digest generated won't be included

#### Approach B: On-demand AI digest (user-triggered)
```
User clicks "Generate Today's Digest" →
  API route queries top articles →
  Streams Groq response →
  Caches result in DB
```

**Pros:** Fresh on every request, user-initiated
**Cons:** Slow (5-10s wait), Groq rate limits, expensive per-user

#### Approach C: Realtime digest with incremental updates
**Rejected** — Overengineered. YAGNI. Too complex for a fan site.

### Recommended: Approach A — Cron-generated daily digest

#### Data Model
```sql
CREATE TABLE news_digests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date UNIQUE NOT NULL,
  language text NOT NULL DEFAULT 'vi',
  title text NOT NULL,
  summary text NOT NULL,        -- 2-3 sentence overview
  sections jsonb NOT NULL,      -- [{ category, headline, body, articleUrls }]
  article_count int NOT NULL,
  generated_at timestamptz DEFAULT now()
);
```

#### Digest Format (generated by AI)
```
📰 Liverpool Daily — March 11, 2026

## Tổng Quan
Liverpool tiếp tục phong độ ấn tượng với chiến thắng 2-0 trước Arsenal...

## Kết Quả Trận Đấu
Liverpool 2-0 Arsenal: Salah và Wirtz ghi bàn...
→ [BBC Sport] [Bóng Đá] [VnExpress]

## Chuyển Nhượng
Tin mới nhất về thương vụ Alexander Isak...
→ [The Guardian] [Thanh Niên]

## Chấn Thương
Robertson dự kiến trở lại vào cuối tháng...
→ [Liverpool FC] [24h]
```

#### AI Prompt Strategy
```
System: You are a Liverpool FC news editor creating a daily digest.
Input: 15 article titles + snippets (EN + VI mixed)
Output: Structured Vietnamese digest with sections by category.
Fallback: If <5 articles, generate shorter "Quick Update" format.
```

#### UI Placement
- **Pinned card** on top of /news feed (collapsible)
- **Dedicated page** at /news/digest/[date]
- **Badge** showing "New digest available" if unread

---

## Implementation Priority

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 1 | C1: Non-blocking sync | 2h | 🔴 Page load 10-30s → instant |
| 2 | C3: Cache scraped content in DB | 3h | 🔴 Article load reliability |
| 3 | C4: Server-side pagination | 2h | 🔴 Client payload 150KB → 30KB |
| 4 | C2: Deduplicate sync logic | 1h | 🟡 Maintainability |
| 5 | C5: Set-based paragraph dedup | 30m | 🟡 Code quality |
| 6 | H1: Extraction health monitoring | 2h | 🟡 Observability |
| 7 | H2: Merge LFC_KEYWORDS | 30m | 🟡 Single source of truth |
| 8 | H4+M6: Unify detectSource | 1h | 🟡 DRY |
| 9 | H6: DB cleanup cron | 1h | 🟡 DB hygiene |
| 10 | AI Digest: full feature | 4-5h | 🟢 New feature |
| 11 | H5: Fix fetchOgMeta streaming | 30m | 🟢 Memory efficiency |
| 12 | M1-M5: Minor cleanups | 1h | 🟢 Polish |

**Total estimated: ~18-20h across all items**

---

## Success Metrics

- News page load: <2s (currently 10-30s on cold start)
- Article detail load: <1s (currently 3-10s per scrape)
- Client payload: <50KB (currently ~150KB+)
- Extraction success rate: >90% across all sources (currently unknown)
- Digest: generated daily by 7:00 AM VN, <5s read time

---

## Unresolved Questions

1. Should digest be bilingual (EN+VI) or VI-only? (Most LFC-specific EN articles are already readable)
2. Should we add email digest subscription? (Requires email service integration)
3. Is Groq free tier sufficient for daily digest + on-demand translations? (Current usage unclear)
4. Should article content caching use Supabase JSONB or external storage (R2/S3)?
