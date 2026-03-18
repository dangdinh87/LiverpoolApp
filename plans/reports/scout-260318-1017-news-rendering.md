# News Article Rendering — File Scout Report

**Date:** 2026-03-18  
**Scope:** News article rendering pipeline, components, and data fetching in LiverpoolApp

---

## Executive Summary

News article rendering spans:
- **Dynamic route:** `src/app/news/[...slug]/page.tsx` — main article detail page
- **Component layer:** 12+ news components handling imagery, comments, translation, etc.
- **Data layer:** `src/lib/news/db.ts` for Supabase queries; `src/lib/news/enrichers/article-extractor.ts` for content scraping
- **Config:** `src/lib/news-config.ts` for URL encoding/decoding and source mappings

---

## 1. Article Page Route

**File:** `/Users/nguyendangdinh/LiverpoolApp/src/app/news/[...slug]/page.tsx`

### Key Responsibilities:
- **Dynamic route:** Accepts catch-all slug `[...slug]` (e.g., `/news/bbc/sport/football/...`)
- **URL decoding:** Uses `decodeArticleSlug(slug)` to reconstruct original URL
- **Content fetch:** Calls `scrapeArticle(url)` to extract article HTML/paragraphs
- **Metadata generation:** Builds OpenGraph, Twitter Card, JSON-LD structured data
- **Layout handling:** Different rendering for English (with translation button) vs. Vietnamese articles
- **Related articles:** Finds 6 similar articles using keyword overlap algorithm (with stopwords)
- **Sidebar metadata:** Shows source badge, author, publish date, reading time, next match card
- **SEO:** Implements breadcrumb JSON-LD and NewsArticle schema

### Data Flow:
```
Slug → decodeArticleSlug() → Original URL
  → scrapeArticle() → ArticleContent
  → getNewsFromDB(100) → Related articles
  → getFixtures() → Next match for sidebar
```

### Rendering Variants:
- **English articles:** Wrapped in `<TranslateProvider>` for on-demand translation
- **Vietnamese articles:** Direct rendering without translation UI
- **Thin content:** Fallback banner promoting original article

---

## 2. News Components

### Article Rendering & Media

**File:** `src/components/news/article-image-viewer.tsx`
- Client component using `yet-another-react-lightbox`
- Handles both:
  - **Inline images** in htmlContent (attaches click handlers dynamically)
  - **Grid images** for paragraph-based articles
- Lightbox with zoom plugin (max 3x), scroll-to-zoom enabled
- Lazy loads images, unoptimized (external sources)

**File:** `src/components/news/article-sidebar.tsx`
- Sticky sidebar (hidden on mobile, sticky on lg+)
- Displays:
  - Source badge with live indicator dot
  - Author, publish date, reading time
  - `<ArticleActions>` (like, save, share buttons)
  - Next match card with team logos, league badge

**File:** `src/components/news/article-actions.tsx`
- Like/unlike articles (stores in Supabase `article_likes`)
- Save/bookmark articles (`saved_articles` table)
- Share button (copy link, social share)
- Original article link button

### Translation & Localization

**File:** `src/components/news/translate-button.tsx` (partial read, ~80 lines shown)
- Provides `<TranslateProvider>` context for English articles
- `<TranslateHeader>` + `<TranslateBody>` child components
- State management: original vs. translated mode
- Translation fetching via `/api/news/translate` endpoint
- Caches translations in `translation-cache.ts` (client-side)
- Filters junk paragraphs (Follow us, Subscribe, etc.)

### Related Articles & Comments

**File:** `src/components/news/related-articles.tsx`
- Grid display (1 col mobile, 2 col tablet, 3 col desktop)
- Vertical card layout: thumbnail + title + source + date
- Tracks read articles via localStorage (`getReadArticles()`)
- Shows `CheckCheck` icon for already-read articles
- Links to articles via `getArticleUrl()`

**File:** `src/components/news/comment-section.tsx` (partial read, ~60 lines shown)
- Fetches comments from `/api/news/comments?url=...`
- User authentication check on mount
- Comment submission, deletion (own comments)
- Requires login to comment

### Additional Components

**Files:**
- `src/components/news/digest-card.tsx` — Daily digest summary card
- `src/components/news/reading-progress.tsx` — Top progress bar
- `src/components/news/read-tracker.tsx` — Client-side read history tracking
- `src/components/news/category-tabs.tsx` — Article category filtering
- `src/components/news/share-button.tsx` — Social sharing utilities

---

## 3. Data Fetching & DB Operations

### Database Queries

**File:** `/Users/nguyendangdinh/LiverpoolApp/src/lib/news/db.ts`

**Core Functions:**

| Function | Purpose |
|----------|---------|
| `getNewsFromDB(limit, preferLang)` | Fetch articles from DB with sync trigger; balanced EN/VI split |
| `searchArticles(query, limit)` | Full-text search via `fts` column |
| `getNewsPaginated(offset, limit, lang)` | Pagination for load-more |
| `getArticleTitlesByUrls(urls)` | Batch fetch article titles (used by digest page) |
| `getArticleSitemapData()` | Articles from last 90 days for sitemap.xml |

**DB Columns Queried:**
```
url, title, snippet, thumbnail, source, language, category, relevance,
published_at, fetched_at, author, hero_image, word_count, tags,
title_vi, snippet_vi
```

**Smart Sync Logic:**
- Fresh (<15 min): Skip sync
- Stale (15-30 min): Background sync, serve data immediately
- Very stale (>30 min) or empty: Blocking sync with 8s timeout

### Content Extraction & Caching

**File:** `/Users/nguyendangdinh/LiverpoolApp/src/lib/news/enrichers/article-extractor.ts`

**Main Export:** `scrapeArticle(url) → Promise<ArticleContent>`

**Extraction Strategy:**
- DOM parsing via cheerio based on per-source CSS selectors
  - BBC: `[data-component=text-block]`
  - Guardian: `article`
  - Vietnamese sources: `.fck_detail`, `.post-detail-body`, etc.
- Falls back to Readability library if selectors fail
- Extracts: title, hero image, paragraphs, author, publish date, description
- Sanitizes HTML (allows img, figure, figcaption, h1-h4)
- Estimates reading time (word count / 200 wpm)

**Image Handling:**
- Extracts hero image (largest image in article)
- Collects additional images for gallery grid
- Stores in `content_en` JSON column (cache 24h)

**Fallback Behavior:**
- If scraping fails: Returns `{ paragraphs: [], htmlContent: undefined }`
- Thin content detection: <200 words or <3 paragraphs
- User sees "Content unavailable" banner with link to original

### API Routes for News Operations

**Files:** `src/app/api/news/*.ts`

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/news/sync` | GET (cron) | Sync RSS feeds → DB |
| `/api/news/cleanup` | GET (cron) | Soft-delete >30d, hard-delete >60d articles |
| `/api/news/digest/generate` | GET (cron) | AI-generated daily digest |
| `/api/news/translate` | POST | Translate article via Groq API |
| `/api/news/comments` | GET/POST | Fetch/create article comments |
| `/api/news/like` | POST/DELETE | Like/unlike article |

---

## 4. URL Encoding/Decoding & Source Config

**File:** `/Users/nguyendangdinh/LiverpoolApp/src/lib/news-config.ts`

### Slug Encoding

**Format:** `{source}/{original-path-segments}`

**Example:**
- Input: `https://www.bbc.com/sport/football/article123`
- Output: `bbc/sport/football/article123`

**Fallback:** Base64url if source unknown or URL malformed

**Function:** `encodeArticleSlug(url: string) → string`

**Reverse:** `decodeArticleSlug(segments: string[]) → string | null`

### Source Configuration

**SOURCE_CONFIG Map:**
```typescript
{
  lfc: { label: "Liverpool FC", color: "bg-lfc-red text-white" },
  bbc: { label: "BBC Sport", color: "bg-[#BB1919] text-white" },
  guardian: { label: "The Guardian", color: "bg-[#052962] text-[#9DBFFF]" },
  // ... 16 more sources
}
```

**SOURCE_HOSTS Map:**
Maps source ID → canonical hostname (for URL reconstruction):
```typescript
lfc → www.liverpoolfc.com
bbc → www.bbc.com
guardian → www.theguardian.com
// ... etc
```

### Helper Functions

| Function | Purpose |
|----------|---------|
| `formatRelativeDate(dateStr, lang?)` | "2h ago" / "2 giờ trước" |
| `getArticleUrl(link: string)` | Build `/news/{slug}` path |

---

## 5. Source Detection

**File:** `/Users/nguyendangdinh/LiverpoolApp/src/lib/news/source-detect.ts`

**Main Export:** `detectSource(url: string) → { id: NewsSource; name: string }`

**Source Map (20 sources):**
- **English:** LFC, BBC, Guardian, Liverpool Echo, Anfield Watch, Empire of the Kop, GOAL
- **Vietnamese:** Bóng Đá, Bóng Đá+, 24h, VnExpress, Tuổi Trẻ, Thanh Niên, Dân Trí, Zing News, VietNamNet, Webthethao, Vietnam.vn

**Vietnamese Source Set:**
```typescript
VI_SOURCES = Set<NewsSource>([
  "bongda", "24h", "bongdaplus", "vnexpress", "tuoitre", "thanhnien",
  "dantri", "zingnews", "vietnamnet", "webthethao", "vietnamvn",
])
```

---

## 6. Type Definitions

**File:** `/Users/nguyendangdinh/LiverpoolApp/src/lib/news/types.ts`

### Core Types:

```typescript
interface NewsArticle {
  title: string;
  link: string;
  pubDate: string;
  contentSnippet: string;
  thumbnail?: string;
  source: NewsSource;
  language: NewsLanguage;
  category?: ArticleCategory;
  relevanceScore?: number;
  author?: string;
  heroImage?: string;
  wordCount?: number;
  tags?: string[];
}

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
}

type NewsSource = "lfc" | "bbc" | "guardian" | "bongda" | ... (20 total)
type NewsLanguage = "en" | "vi"
type ArticleCategory = "match-report" | "transfer" | "injury" | ...
```

---

## 7. News Feed Page

**File:** `/Users/nguyendangdinh/LiverpoolApp/src/app/news/page.tsx`

**Key Features:**
- Fetches 60 articles from DB (30 EN, 30 VI)
- Shows latest digest card
- Uses `<NewsFeed>` component with:
  - Filtering (all/local/global, by category)
  - Sorting (trending/newest)
  - Hero card + grid layout (13 initial, then +12 per load-more)
  - Read history tracking (localStorage)

**Dynamic Rendering:** `force-dynamic` (always fresh data)

---

## Complete File Manifest

### Route Pages
- `/src/app/news/page.tsx`
- `/src/app/news/[...slug]/page.tsx` ← **Main article detail page**
- `/src/app/news/digest/[date]/page.tsx`
- `/src/app/news/error.tsx`
- `/src/app/news/loading.tsx`

### News Components (12 files)
- **Article rendering:** `article-image-viewer.tsx`, `article-sidebar.tsx`
- **Translation:** `translate-button.tsx`
- **User interaction:** `article-actions.tsx`, `comment-section.tsx`
- **Discovery:** `related-articles.tsx`, `news-feed.tsx`, `category-tabs.tsx`
- **UI support:** `reading-progress.tsx`, `read-tracker.tsx`, `digest-card.tsx`, `share-button.tsx`

### News Lib (`src/lib/news/` directory)
- **DB:** `db.ts` ← **Core data fetching**
- **Extraction:** `enrichers/article-extractor.ts` ← **Content scraping**
- **Config:** `config.ts`, `types.ts`, `source-detect.ts`
- **Utilities:** `translation-cache.ts`, `digest.ts`, `categories.ts`, `relevance.ts`, `read-history.ts`
- **Sync pipeline:** `sync.ts`, `pipeline.ts`, `dedup.ts`, `index.ts`
- **Adapters:** `adapters/{base,rss,lfc,bongdaplus,vietnamvn,goal}.ts`

### Config & Types
- `/src/lib/news-config.ts` ← **URL encoding/source mapping**
- `/src/lib/news/types.ts`
- `/src/lib/news/source-detect.ts`

### API Routes
- `/src/app/api/news/sync/route.ts` (cron)
- `/src/app/api/news/cleanup/route.ts` (cron)
- `/src/app/api/news/digest/generate/route.ts` (cron)
- `/src/app/api/news/translate/route.ts`
- `/src/app/api/news/comments/route.ts`
- `/src/app/api/news/like/route.ts`

---

## Image Handling Summary

1. **Hero Image:** Extracted as largest image, displayed full-width (60vh) with gradient overlay
2. **Extra Images:** Collected from article body, displayed in 3-column grid with lazy loading
3. **Lightbox:** `yet-another-react-lightbox` with zoom (max 3x) on click
4. **Optimization:** Images set to `unoptimized` (external sources), lazy-loaded, responsive sizes

---

## Translation Pipeline

1. **Detection:** English articles wrapped in `<TranslateProvider>`
2. **Trigger:** User clicks translate button in header
3. **Fetch:** POST `/api/news/translate` with article content
4. **Caching:** Groq-translated text cached in `translation-cache.ts` (client memory)
5. **Junk filtering:** Removes "Follow us", "Subscribe", newsletters, etc.
6. **Rendering:** Swaps paragraphs between original/translated modes

---

## Related Articles Algorithm

- **Keyword extraction:** Title words >3 chars, stopwords removed
- **Overlap scoring:** Count matching keywords
- **Source diversity:** Penalty for same source as current article
- **Diversity sorting:** Promotes articles from different sources
- **Limit:** 6 related articles per page

---

## SEO & Metadata

- **JSON-LD:** Breadcrumb, NewsArticle schema (title, author, image, publish date)
- **OpenGraph:** Type=article, title, description, images, publishedTime
- **Twitter Card:** summary_large_image
- **i18n:** Hreflang alternates for EN/VI versions
- **Canonical:** Based on article slug URL

---

## Key Data Flow Diagram

```
User visits /news/bbc/sport/football/...
    ↓
[...slug]/page.tsx decodeArticleSlug()
    ↓
scrapeArticle(url) → ArticleContent
    ├─ Check 24h cache in articles.content_en
    ├─ Parse DOM via cheerio + source-specific selectors
    ├─ Extract: title, hero, paragraphs, author, date, images
    └─ Store back to cache
    ↓
getNewsFromDB(100) → NewsArticle[]
    ├─ Trigger smart sync if stale
    └─ Fetch balanced EN/VI articles
    ↓
Render layout:
    ├─ Hero image with gradient
    ├─ Header (back button, translate toggle, publish date)
    ├─ Main article (paragraphs or htmlContent)
    ├─ Extra images grid + lightbox
    ├─ Sidebar (source, author, reading time, next match)
    └─ Comments, related articles, actions
```

---

## Unresolved Questions

None. This scout comprehensively covers the news article rendering pipeline.

