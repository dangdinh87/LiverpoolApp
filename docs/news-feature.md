# Tài Liệu Kỹ Thuật: Hệ Thống Tin Tức Liverpool

> **Cập nhật**: 08/03/2026 — v3.0
> **Tác giả**: Antigravity AI

---

## Mục lục

1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Lớp thu thập dữ liệu (Adapters)](#2-lớp-thu-thập-dữ-liệu-adapters)
3. [Pipeline xử lý dữ liệu](#3-pipeline-xử-lý-dữ-liệu)
4. [Hệ thống scraping bài viết (Article Extractor)](#4-hệ-thống-scraping-bài-viết-article-extractor)
5. [Caching & ISR](#5-caching--isr)
6. [Frontend — Trang danh sách tin `/news`](#6-frontend--trang-danh-sách-tin-news)
7. [Frontend — Trang đọc bài `/news/[...slug]`](#7-frontend--trang-đọc-bài-newsslug)
8. [Hệ thống URL Routing (Slug Encoding)](#8-hệ-thống-url-routing-slug-encoding)
9. [Client-side Features](#9-client-side-features)
10. [Đa ngôn ngữ (i18n)](#10-đa-ngôn-ngữ-i18n)
11. [Cơ chế chịu lỗi (Resilience)](#11-cơ-chế-chịu-lỗi-resilience)
12. [Homepage Integration](#12-homepage-integration)
13. [Sơ đồ file & Module Map](#13-sơ-đồ-file--module-map)

---

## 1. Tổng quan kiến trúc

```
┌─────────────────── SERVER SIDE ───────────────────┐
│                                                    │
│  13 News Sources ──► 3 Adapter Types               │
│       │                  │                         │
│       │             ┌────┴────┐                    │
│       │             │ Pipeline│                    │
│       │             └────┬────┘                    │
│       │        Dedup → Categorize → Score → Enrich │
│       │                  │                         │
│       │          React.cache() + ISR               │
│       ▼                  │                         │
│  getNews(limit)  ◄───────┘                         │
│       │                                            │
│  ┌────┴─────────────┐    ┌─────────────────┐       │
│  │ /news (listing)  │    │ /news/[...slug]  │       │
│  │ Server Component │    │ Server Component │       │
│  └────┬─────────────┘    └────┬────────────┘       │
│       │                       │                    │
│       │                  scrapeArticle(url)         │
│       │                  + Readability              │
│       │                  + Cheerio extractors       │
└───────┼───────────────────────┼────────────────────┘
        ▼                       ▼
┌─── CLIENT SIDE ───────────────────────────────────┐
│  NewsFeed (Hero/Grid/Compact cards)                │
│  CategoryTabs, ReadTracker, ReadingProgress        │
│  ArticleSidebar, ArticleActions, RelatedArticles   │
│  ShareButton, TranslateBadge                       │
│  localStorage: read/like/save tracking             │
└────────────────────────────────────────────────────┘
```

**Nguyên tắc thiết kế cốt lõi:**
- `"server-only"` guard trên tất cả module chứa URL/logic crawl → ngăn leak sang client bundle
- `React.cache()` cho `getNews()` và `scrapeArticle()` → request dedup trong cùng render pass
- ISR (Incremental Static Regeneration) cho cả listing (30 min) và article (1 hour)
- `Promise.allSettled()` ở mọi lớp song song → một source fail không kéo sập toàn bộ

---

## 2. Lớp thu thập dữ liệu (Adapters)

### 2.1 Interface chung

```typescript
// src/lib/news/adapters/base.ts
interface FeedAdapter {
  readonly name: string;
  fetch(): Promise<NewsArticle[]>;
}
```

Mỗi adapter trả về `NewsArticle[]` với cấu trúc:

```typescript
interface NewsArticle {
  title: string;
  link: string;           // URL gốc bài viết
  pubDate: string;        // ISO date string
  contentSnippet: string; // Mô tả ngắn / RSS description
  thumbnail?: string;     // URL ảnh thumbnail
  source: NewsSource;     // "bbc" | "lfc" | "guardian" | ...
  language: "en" | "vi";
  category?: ArticleCategory;    // set sau bởi pipeline
  relevanceScore?: number;       // set sau bởi pipeline
}
```

### 2.2 RssAdapter — RSS Feed Parser (10 feeds)

**File:** `src/lib/news/adapters/rss-adapter.ts`

| Cấu hình | Nguồn | Ngôn ngữ | Filter |
|-----------|-------|----------|--------|
| BBC Sport Liverpool | `bbc` | EN | — |
| The Guardian Liverpool | `guardian` | EN | — |
| This Is Anfield | `tia` | EN | — |
| Anfield Watch | `anfield-watch` | EN | — |
| Liverpool Echo | `echo` | EN | — |
| Bongda.com.vn Liverpool | `bongda` | VI | — |
| 24h Bóng Đá | `24h` | VI | `lfc` keywords |
| VnExpress Thể Thao | `vnexpress` | VI | `lfc` keywords |
| Tuổi Trẻ Thể Thao | `tuoitre` | VI | `lfc` keywords |
| Thanh Niên Thể Thao | `thanhnien` | VI | `lfc` keywords |

**Luồng hoạt động:**
1. `fetch()` gửi HTTP GET tới RSS URL với `User-Agent` header, timeout 15s, `next.revalidate = 1800` (ISR cache)
2. Response XML → `rss-parser` thư viện parse (dùng `parser.parseString()` thay vì built-in HTTP của parser vì Next.js fetch ổn định hơn)
3. Custom fields extraction: `media:thumbnail`, `media:content`, `enclosure` → dùng cho ảnh thumbnail
4. **Keyword filter** (cho feeds VI chung): nếu `config.filter === "lfc"`, chỉ giữ bài chứa ít nhất 1 keyword từ `LFC_KEYWORDS`

**LFC_KEYWORDS dùng cho filter:**
```
liverpool, anfield, salah, van dijk, slot, the kop, lữ đoàn đỏ,
trent, nunez, gakpo, szoboszlai, mac allister, jota, alisson, diaz
```

**Xử lý ảnh từ RSS:**
- Thứ tự ưu tiên: `mediaContent` → `enclosure` → `mediaThumbnail`
- Parse cả dạng string URL và dạng object `{ $: { url: "..." } }`
- Sanitize URL: chỉ cho phép `http://` hoặc `https://`

### 2.3 LfcAdapter — LiverpoolFC.com Scraper

**File:** `src/lib/news/adapters/lfc-adapter.ts`

**Kỹ thuật:** Next.js Data Injection Extraction

1. GET `https://www.liverpoolfc.com/news` với User-Agent Chrome desktop, timeout 8s
2. Parse HTML tìm `<script id="__NEXT_DATA__">` → extract JSON
3. Navigate: `data.props.pageProps.data.newsPage.results`
4. Lấy tối đa 15 bài viết mới nhất
5. Ảnh: ưu tiên `coverImage.sizes.sm.webpUrl` → `sm.url` → `md.webpUrl`
6. Build link: `https://www.liverpoolfc.com${item.url}`

**Ưu điểm:** Dữ liệu rất ổn định vì lấy thẳng structured JSON, có `publishedAt` chính xác.

### 2.4 BongdaplusAdapter — HTML Scraper (Cheerio)

**File:** `src/lib/news/adapters/bongdaplus-adapter.ts`

**Kỹ thuật:** DOM Scraping với Cheerio

1. Crawl 2 URL đồng thời: `/ngoai-hang-anh` và `/champions-league-cup-c1`
2. Parse HTML bằng `cheerio.load(html)`
3. Selector: `.news` elements → tìm `a` (href + title), `img` (ảnh)
4. Filter: chỉ giữ bài LFC-related (dùng `LFC_KEYWORDS`)
5. **Hạn chế:** `pubDate` set là `new Date().toISOString()` (không có date chính xác) → sẽ được enricher bổ sung sau
6. Giới hạn 10 bài/request

---

## 3. Pipeline xử lý dữ liệu

**File:** `src/lib/news/pipeline.ts`

Sau khi tất cả adapter trả về raw articles, pipeline thực hiện 4 bước:

### 3.1 Parallel Fetching + Graceful Failure

```
Promise.allSettled(adapters.map(a => a.fetch()))
```
→ Collect tất cả `fulfilled` results, bỏ qua `rejected`

### 3.2 Deduplication (`dedup.ts`)

**Hai lớp dedup:**

1. **URL Dedup** — normalize URL (strip protocol, www, trailing slash) → `Set<string>`
2. **Title Dedup** — Jaccard Similarity trên 60 ký tự đầu tiêu đề:
   - Tokenize: lowercase → remove punctuation → split words → filter stopwords + words < 3 chars
   - `jaccardSimilarity(setA, setB) = |A ∩ B| / |A ∪ B|`
   - Threshold: `> 0.6` → coi là trùng lặp
   - So sánh O(n²) với tất cả bài đã giữ

**Ví dụ:** "Liverpool beat Arsenal 3-1 in thrilling match" vs "Liverpool beat Arsenal 3-1 at Anfield" → Jaccard > 0.6 → loại bài sau.

### 3.3 Categorization (`categories.ts`)

Mỗi bài được phân loại bằng **regex pattern matching** trên `title + contentSnippet`:

| Category | Pattern (EN) | Pattern (VI) |
|----------|-------------|--------------|
| `match-report` | `\d+-\d+`, `match report`, `full-time` | `kết quả`, `tỷ số`, `hiệp 1/2` |
| `transfer` | `transfer`, `sign(s/ed/ing)`, `deal`, `bid` | `chuyển nhượng`, `gia nhập`, `chiêu mộ` |
| `injury` | `injur(y/ed/ies)`, `sidelined`, `hamstring` | `chấn thương`, `nghỉ thi đấu`, `gãy` |
| `team-news` | `lineup`, `starting xi`, `squad list` | `đội hình`, `xuất phát`, `dự bị` |
| `opinion` | `opinion`, `verdict`, `ratings` | `đánh giá`, `chấm điểm`, `bình luận` |
| `analysis` | `preview`, `predicted`, `pre-match` | `dự đoán`, `nhận định trước` |
| `general` | _(fallback)_ | _(fallback)_ |

**Thứ tự ưu tiên:** `match-report` > `transfer` > `injury` > `team-news` > `opinion` > `analysis` > `general`

### 3.4 Relevance Scoring (`relevance.ts`)

Mỗi bài được tính điểm tổng hợp từ 3 thành phần:

**A. Keyword Score (0-10, weight 30%)**
| Keyword | Weight | Keyword | Weight |
|---------|--------|---------|--------|
| liverpool, anfield, lfc | 3 | salah, van dijk, arne slot | 2 |
| trent, nunez, gakpo, mac allister, szoboszlai | 1.5 | jota, alisson, premier league, champions league | 1 |

Tổng cap ở 10.

**B. Source Priority (0-10, weight 30%)**
| Source | Score | Source | Score |
|--------|-------|--------|-------|
| lfc | 10 | tia, anfield-watch | 8 |
| echo | 7 | bbc, guardian | 6 |
| sky | 5 | bongda | 4 |
| 24h, bongdaplus, vnexpress, tuoitre, thanhnien | 3 | | |

**C. Freshness Score (0-10, weight 40%)**
```
freshnessScore = 10 × e^(-ageHours / 24)
```
- 0h → 10 (full score)
- 24h → ~3.7
- 48h → ~1.4
- 7d → ~0.06 (gần 0)

**Công thức cuối:** `score = freshness × 0.4 + keywords × 0.3 + source × 0.3`

→ Kết quả sort descending theo score. Bài từ LFC.com viết về Salah vừa post 1h trước sẽ luôn ở top.

### 3.5 OG Meta Enrichment (`enrichers/og-meta.ts`)

Sau khi sort + slice theo limit, pipeline enrich bài thiếu thumbnail hoặc có fake date:

1. **Detect fake date:** `isFakeDate()` — nếu date < 2 phút so với hiện tại → coi là scraper đặt `new Date()` làm fallback
2. Fetch OG meta từ URL gốc (timeout 6s, ISR cache 24h):
   - Chỉ đọc đến `</head>` hoặc tối đa 50KB
   - Extract `og:image` và `article:published_time` bằng regex
3. Batch 10 URL cùng lúc (`Promise.allSettled`) → tránh overwhelm server

---

## 4. Hệ thống scraping bài viết (Article Extractor)

**Khi người dùng mở đọc 1 bài (`/news/[...slug]`)**, hệ thống cần extract full content.

**File:** `src/lib/news/enrichers/article-extractor.ts`

### 4.1 Chiến lược 2 lớp: Readability → Cheerio Fallback

```
scrapeArticle(url)
  │
  ├── 1. fetch(url) → HTML (timeout 10s, ISR 1h)
  │
  ├── 2. extractWithReadability(html, url)
  │     └── Mozilla Readability + JSDOM + sanitize-html
  │     └── Nếu result.length > 300 → DÙNG (ưu tiên)
  │
  └── 3. Fallback: findExtractor(url) → per-site cheerio extractor
        └── Dựa trên hostname → chọn extractor phù hợp
```

### 4.2 Readability Layer (`readability.ts`)

- Dùng `@mozilla/readability` + `jsdom` để parse
- Sanitize HTML output bằng `sanitize-html` (allow `img`, `figure`, headings)
- Trả về: `title`, `htmlContent` (sanitized), `textContent`, `excerpt`, `byline`
- **Reading time:** `Math.ceil(wordCount / 200)` phút

### 4.3 Per-site Cheerio Extractors

Mỗi site có extractor riêng tối ưu:

| Site | Selector | Đặc biệt |
|------|----------|-----------|
| `liverpoolfc.com` | `#__NEXT_DATA__` JSON → `article.body` blocks | Parse structured block types (paragraph, image) |
| `bbc.com/bbc.co.uk` | `article` hoặc `[role=main]` → `p`, `img` | Filter placeholder images |
| `theguardian.com` | `article` → `p`, `img[src*='guim']` | Filter Guardian CDN images only |
| `bongda.com.vn` | `.detail-content, .cms-body` → `p`, `img` | Skip brand watermark text |
| `24h.com.vn` | `.detail-content, .content-detail` → `p`, `img` | Generic Vietnamese |
| `bongdaplus.vn` | `.news-detail, .detail-body` → `p, .sapo` | Always marked `isThinContent` (client-rendered) |
| `thisisanfield.com`, `anfieldwatch.co.uk` | `.entry-content, .post-content` (WordPress) | Standard WP selectors |
| `liverpoolecho.co.uk`, `skysports.com` | `article, [role=main], .article-body` | Generic English |

**Fallbacks chung:**
- Nếu không match hostname → `extractGeneric()` → chỉ lấy `og:title`, `og:image`, `og:description`
- Nếu paragraphs rỗng → fallback về `og:description` as single paragraph
- Nếu `paragraphs.length <= 1` → đánh dấu `isThinContent = true`

### 4.4 ArticleContent Output

```typescript
interface ArticleContent {
  title: string;
  heroImage?: string;
  description?: string;
  publishedAt?: string;
  author?: string;
  paragraphs: string[];    // Text-only (sanitized)
  htmlContent?: string;     // From Readability (sanitized HTML)
  images: string[];
  sourceUrl: string;
  sourceName: string;
  readingTime?: number;     // phút
  isThinContent?: boolean;  // true → hiện banner "đọc trang gốc"
}
```

### 4.5 `getOgImage()` — Lightweight OG Image Fetcher

Riêng function này dùng `ReadableStream` reader:
- Chỉ đọc đến 50KB hoặc `</head>`
- Tìm `og:image` bằng regex
- ISR cache 24h
- Dùng cho enrichment nhẹ (không cần parse full page)

---

## 5. Caching & ISR

### 5.1 Bảng tổng hợp cache

| Layer | TTL | Mục đích |
|-------|-----|----------|
| `getNews()` — `React.cache()` | Per-request (render pass) | Dedup cùng request trong SSR |
| `/news` page — `revalidate = 1800` | 30 phút | ISR cho listing page |
| `/news/[...slug]` page — `revalidate = 3600` | 1 giờ | ISR cho article page |
| RSS fetch — `next.revalidate = 1800` | 30 phút | ISR cho từng RSS HTTP request |
| LFC/Bongdaplus fetch — `next.revalidate = 1800` | 30 phút | ISR cho scraper HTTP request |
| OG meta enrichment — `next.revalidate = 86400` | 24 giờ | Cache OG meta (thumbnail, date) |
| `scrapeArticle()` — `React.cache()` + `next.revalidate = 3600` | Per-request + 1 giờ | Article content cache |
| `getOgImage()` — `React.cache()` + `next.revalidate = 86400` | Per-request + 24 giờ | OG image lightweight fetch |

### 5.2 Luồng cache khi user truy cập `/news`

```
User GET /news
  │
  ├── ISR check: page revalidate = 1800s
  │    ├── FRESH → trả cached HTML ngay
  │    └── STALE → serve stale, background regenerate:
  │         │
  │         ├── getNews(200) [React.cache]
  │         │    ├── 12 adapters fetch song song [Promise.allSettled]
  │         │    │    ├── Mỗi fetch có ISR 1800s riêng
  │         │    │    └── Stale adapter → serve cached, refetch background
  │         │    ├── Dedup → Categorize → Score → Sort
  │         │    └── OG Enrich (batch 10, chỉ bài thiếu ảnh/date)
  │         │
  │         └── Render Server Component → HTML
```

### 5.3 Luồng cache khi user đọc bài `/news/bbc/sport/...`

```
User GET /news/bbc/sport/football/12345
  │
  ├── ISR check: page revalidate = 3600s
  │    ├── FRESH → trả cached HTML
  │    └── STALE → background regenerate:
  │         │
  │         ├── decodeArticleSlug(["bbc", "sport", "football", "12345"])
  │         │    → "https://www.bbc.com/sport/football/12345"
  │         │
  │         ├── Promise.all([
  │         │    scrapeArticle(url),  // React.cache + ISR 1h
  │         │    getNews(20),          // For related articles
  │         │    getFixtures(),        // For sidebar next match
  │         │ ])
  │         │
  │         ├── scrapeArticle flow:
  │         │    ├── fetch(url) [ISR 1h]
  │         │    ├── Try Readability first
  │         │    └── Fallback to per-site Cheerio extractor
  │         │
  │         └── Render: Hero + Body + Sidebar + Related
```

---

## 6. Frontend — Trang danh sách tin `/news`

**File:** `src/app/news/page.tsx` (Server Component)

### 6.1 Data Flow

```typescript
const allArticles = await getNews(200);

// Filter by category (từ ?category= query param)
if (category && category !== "all") {
  allArticles = allArticles.filter(a => a.category === category);
}

// Split theo locale user
const localArticles = allArticles.filter(a => a.language === userLang);
const globalArticles = allArticles.filter(a => a.language !== userLang);
```

### 6.2 Layout

```
┌────────────────────────────────────────┐
│ Hero Banner (22vh, background image)   │
│  - Tagline, Title, Summary stats       │
├────────────────────────────────────────┤
│ CategoryTabs (horizontal scroll)       │
│  all | match-report | transfer | ...   │
├────────────────────────────────────────┤
│ NewsFeed Component (client)            │
│  ├── Language Toggle: Local / All      │
│  ├── HeroCard (bài #1)                │
│  ├── GridCard × 6 (bài #2-7)          │
│  ├── CompactCard × n (bài #8+)        │
│  └── Load More button                 │
├────────────────────────────────────────┤
│ Attribution footer                     │
└────────────────────────────────────────┘
```

### 6.3 NewsFeed Component (`news-feed.tsx`)

**Client Component** — nhận data từ server, quản lý UI state.

**States:**
- `showGlobal` (boolean) — toggle hiển thị chỉ local hoặc tất cả
- `visibleCount` (number) — Load More pagination (initial 12, +8 each)
- `readSet` (Set<string>) — articles đã đọc (từ localStorage)

**3 loại card:**
| Card | Dùng cho | Đặc điểm |
|------|----------|----------|
| `HeroCard` | Bài đầu tiên | Full-width, aspect 16/10 → 21/9, overlay gradient, snippet visible |
| `GridCard` | Bài #2-7 | Grid 1→2→3 cols, aspect-video thumbnail, smaller text |
| `CompactCard` | Bài #8+ | Horizontal layout, 96×80px thumbnail, minimal text |

### 6.4 CategoryTabs (`category-tabs.tsx`)

Client Component dùng `useRouter` push `?category=xxx` → trigger server re-render.
Labels i18n qua `useTranslations("News.categories")`.

---

## 7. Frontend — Trang đọc bài `/news/[...slug]`

**File:** `src/app/news/[...slug]/page.tsx` (Server Component)

### 7.1 Data Fetching (parallel)

```typescript
const [content, allArticles, fixtures] = await Promise.all([
  scrapeArticle(url),  // Full article content
  getNews(20),          // For related articles
  getFixtures(),        // For sidebar next match
]);
```

### 7.2 Layout — Article Page

```
┌──────────────────────────────────┐
│ ReadingProgress (fixed top bar)  │  ← 3px red bar, scroll-linked
├──────────────────────────────────┤
│ Hero Image (60vh, full-width)    │
│  ← Image from og:image/extractor│
├──────────────────────────────────┤
│ Back button ← /news             │
│ Source Badge (colored pill)      │
│ Title (h1, max-w-4xl)           │
│ Description (blockquote, italic) │
├──────────┬───────────────────────┤
│ Article  │ Sidebar (desktop)     │
│ Body     │  ├── Source card      │
│ (paras)  │  ├── Meta card        │
│          │  │   (author, date,   │
│ Images   │  │    reading time)   │
│ (grid)   │  ├── Actions          │
│          │  │   (like,save,share)│
│ Thin     │  └── Next Match card  │
│ Content  │                       │
│ Banner   │                       │
├──────────┴───────────────────────┤
│ Footer: source attribution       │
├──────────────────────────────────┤
│ Related Articles (3-col grid)    │
│  6 bài, keyword overlap ranking  │
│  + source diversity penalty      │
└──────────────────────────────────┘
```

### 7.3 Related Articles Algorithm

```typescript
// Extract meaningful words from current title
const currentWords = title.toLowerCase()
  .split(/\s+/)
  .filter(w => w.length > 3 && !STOP_WORDS.has(w));

// Score each candidate: overlap count + source diversity
score = wordOverlap + (sameSource ? -0.3 : 0);
// Sort desc, take top 6
```

### 7.4 Thin Content Handling

Khi `isThinContent === true` hoặc `paragraphs.length <= 2`:
→ Hiển thị banner CTA: "This article is best viewed on the original site" + link đến nguồn gốc.

Khi `content === null` hoặc `paragraphs.length === 0`:
→ Hiện trang fallback: icon + "Content Unavailable" + 2 buttons (Back, Read Original).

---

## 8. Hệ thống URL Routing (Slug Encoding)

**File:** `src/lib/news-config.ts`

### 8.1 Encoding

```
Original: https://www.bbc.com/sport/football/12345
Encoded:  /news/bbc/sport/football/12345
```

Quy tắc:
1. Parse URL → tìm hostname trong `SOURCE_HOSTS` map → lấy source key
2. Path = `{source}/{pathname+search}`

Fallback: nếu URL parse fail → Base64url encoding.

### 8.2 Decoding

```
Segments: ["bbc", "sport", "football", "12345"]
  → source = "bbc", host = "www.bbc.com"
  → URL = "https://www.bbc.com/sport/football/12345"
```

Legacy support: single-segment base64url format cũng vẫn decode được.

### 8.3 SOURCE_HOSTS Map

```
lfc → www.liverpoolfc.com
bbc → www.bbc.com
guardian → www.theguardian.com
tia → www.thisisanfield.com
echo → www.liverpoolecho.co.uk
sky → www.skysports.com
anfield-watch → www.anfieldwatch.co.uk
bongda → www.bongda.com.vn
24h → www.24h.com.vn
bongdaplus → www.bongdaplus.vn
vnexpress → vnexpress.net
tuoitre → tuoitre.vn
thanhnien → thanhnien.vn
```

---

## 9. Client-side Features

### 9.1 Read History (`read-history.ts`)

- Storage key: `lfc-news-read` (localStorage)
- Auto-mark on article page mount via `ReadTracker` component
- Max 200 entries (FIFO khi vượt)
- Read articles hiện opacity 60-70% + "Read" badge

### 9.2 Like & Save (`read-history.ts`)

- Storage keys: `lfc-news-likes`, `lfc-news-saves`
- Toggle pattern: `toggleLike()` / `toggleSave()` → return boolean
- Max 200 entries mỗi loại
- UI: Heart (like), Bookmark (save) trong ArticleActions sidebar

### 9.3 Share (`share-button.tsx`, `article-actions.tsx`)

- Primary: `navigator.share()` (Web Share API) cho mobile
- Fallback: `navigator.clipboard.writeText()` + "Copied" feedback 2s

### 9.4 Reading Progress (`reading-progress.tsx`)

- Fixed bar 3px top viewport
- Track scroll position relative to `#article-body` element
- Smooth transition via CSS `transition-[width]`

---

## 10. Đa ngôn ngữ (i18n)

Sử dụng `next-intl`:

### Server-side:
- `generateMetadata()` — tạo title/description SEO theo locale
- `getTranslations("News")` — server-side translations

### Client-side:
- `CategoryTabs`: category labels qua `useTranslations("News.categories")`
- `NewsSection` (homepage): tagline, title, viewAll qua `useTranslations("News")`
- `NewsFeed`: toggle labels ("Tin Việt Nam" / "Local News", "Tất cả" / "All News")
- `formatRelativeDate()`: "5 phút trước" vs "5m ago"

### Language Split Logic:
```typescript
const userLang = locale === "vi" ? "vi" : "en";
const localArticles = allArticles.filter(a => a.language === userLang);
const globalArticles = allArticles.filter(a => a.language !== userLang);
```

User mặc định thấy tin đúng ngôn ngữ. Toggle "All News" để xem cả 2.

---

## 11. Cơ chế chịu lỗi (Resilience)

### Level 1: Adapter Level
- Mỗi adapter wrap trong try-catch → return `[]` nếu fail
- Timeout riêng: RSS 15s, LFC 8s, Bongdaplus 8s

### Level 2: Pipeline Level
- `Promise.allSettled()` — chỉ collect `fulfilled`
- Nếu tất cả fail → return `[]` (empty, không crash)

### Level 3: Enrichment Level
- OG meta fetch fail → silent skip (bài vẫn hiển thị, chỉ thiếu ảnh)
- Batch 10 URL → tránh overwhelm

### Level 4: Article Scraping Level
- Readability fail → fallback Cheerio per-site extractor
- Cheerio fail → fallback `extractGeneric()` (OG meta only)
- Tất cả fail → trang "Content Unavailable" + link đọc nguồn gốc

### Level 5: Page Level
- `error.tsx` — ErrorBoundary component
- `loading.tsx` — Skeleton UI cho loading state
- Mock data (`mock.ts`) — 6 bài mẫu dự phòng

---

## 12. Homepage Integration

### 12.1 LatestNewsWidget (`latest-news-widget.tsx`)

- Server Component (stateless)
- Hiển thị 3 bài mới nhất dạng text list
- Link đến nguồn gốc (`target="_blank"`)

### 12.2 NewsSection (`news-section.tsx`)

- Client Component (cần Framer Motion animations + read tracking)
- Layout: Featured card (3 cols) + Side list (2 cols) × 5 bài
- Có read tracking opacity, click vào in-app article page
- Framer Motion: fade-in-up (featured), slide-in-right (list items)

---

## 13. Sơ đồ file & Module Map

```
src/lib/news/
├── types.ts              # NewsArticle, ArticleContent, FeedConfig (client-safe)
├── config.ts             # RSS_FEEDS[], SOURCE_CONFIG, LFC_KEYWORDS (server-only)
├── index.ts              # getNews() entry point (server-only, React.cache)
├── pipeline.ts           # fetchAllNews() orchestrator
├── dedup.ts              # URL + Jaccard title dedup
├── categories.ts         # Regex-based article categorization
├── relevance.ts          # Weighted scoring (freshness + keywords + source)
├── validation.ts         # Zod schema for feed items
├── mock.ts               # 6 mock articles fallback
├── read-history.ts       # localStorage: read/like/save (client-safe)
├── adapters/
│   ├── base.ts           # FeedAdapter interface
│   ├── rss-adapter.ts    # 10 RSS feeds parser
│   ├── lfc-adapter.ts    # LiverpoolFC.com __NEXT_DATA__ scraper
│   └── bongdaplus-adapter.ts  # Cheerio HTML scraper
├── enrichers/
│   ├── og-meta.ts        # Batch OG image/date enrichment
│   ├── article-extractor.ts  # Full article scraping (Readability + Cheerio)
│   └── readability.ts    # Mozilla Readability + sanitize-html wrapper
└── __tests__/
    ├── categories.test.ts
    ├── dedup.test.ts
    ├── pipeline.test.ts
    ├── relevance.test.ts
    └── server-only-mock.ts

src/lib/news-config.ts     # Client-safe config: SOURCE_CONFIG, CATEGORY_CONFIG,
                           # encodeArticleSlug/decodeArticleSlug, formatRelativeDate

src/app/news/
├── page.tsx              # Listing page (Server Component, ISR 30m)
├── [...slug]/page.tsx    # Article reader (Server Component, ISR 1h)
├── loading.tsx           # Skeleton loading state
└── error.tsx             # Error boundary

src/components/news/
├── news-feed.tsx         # Main feed UI (Hero/Grid/Compact cards)
├── category-tabs.tsx     # Category filter tabs
├── reading-progress.tsx  # Scroll progress bar
├── read-tracker.tsx      # Mark article as read on mount
├── article-sidebar.tsx   # Desktop sidebar (source, meta, actions, next match)
├── article-actions.tsx   # Like, Save, Share, Original buttons
├── related-articles.tsx  # Related articles grid
└── share-button.tsx      # Web Share API / clipboard

src/components/home/
├── latest-news-widget.tsx  # BentoGrid widget (3 headlines)
└── news-section.tsx        # Homepage news section (featured + list)
```

### Dependencies

| Package | Dùng cho |
|---------|----------|
| `rss-parser` | RSS XML parsing |
| `cheerio` | HTML DOM scraping |
| `@mozilla/readability` | Article content extraction |
| `jsdom` | DOM cho Readability |
| `sanitize-html` | XSS-safe HTML output |
| `zod` | Feed item validation schema |
| `next-intl` | i18n translations |
| `framer-motion` | Homepage news animations |
| `lucide-react` | Icons (Newspaper, Clock, etc.) |
