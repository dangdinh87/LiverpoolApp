# Hệ Thống Tin Tức

Tin tức Liverpool FC tổng hợp từ 17+ nguồn RSS (EN + VI), lưu trữ trên Supabase, với tính năng dịch tự động bằng AI và bản tóm tắt tin tức hàng ngày.

---

## Tổng Quan

```
RSS/Scraper Adapters (17+ nguồn)
        |
        v
   fetchAllNews()         -- lấy song song, xử lý lỗi riêng từng nguồn
        |
        v
  deduplicateArticles()   -- loại trùng theo URL + độ tương đồng tiêu đề Jaccard
        |
        v
  categorizeArticle()     -- quy tắc regex → nhãn danh mục
  scoreArticle()          -- độ tươi mới + từ khóa + độ ưu tiên nguồn
        |
        v
  Supabase articles table -- upsert, từng đợt 50 bài
        |
        v
  enrichArticleMeta()     -- lấy ảnh OG cho bài thiếu thumbnail
        |
        v
  sync_logs               -- ghi thống kê mỗi lần đồng bộ
```

**DB là nguồn dữ liệu duy nhất đáng tin cậy.** Các trang không bao giờ gọi trực tiếp adapter; chúng đọc từ bảng `articles` qua `getNewsFromDB()`.

---

## Nguồn RSS

### Tiếng Anh (feed dành riêng cho LFC)

| Khóa nguồn | Nhãn | URL feed |
|---|---|---|
| `lfc` | Liverpool FC | `liverpoolfc.com` (adapter tùy chỉnh) |
| `bbc` | BBC Sport | `feeds.bbci.co.uk/sport/football/teams/liverpool/rss.xml` |
| `guardian` | The Guardian | `theguardian.com/football/liverpool/rss` |
| `echo` | Liverpool Echo | `liverpoolecho.co.uk/all-about/liverpool-fc/?service=rss` |
| `anfield-watch` | Anfield Watch | `anfieldwatch.co.uk/feed` |
| `eotk` | Empire of the Kop | `empireofthekop.com/feed/` |
| `goal` | GOAL | Google News RSS proxy (adapter tùy chỉnh) |

### Tiếng Việt (feed có lọc theo từ khóa)

| Khóa nguồn | Nhãn | Bộ lọc |
|---|---|---|
| `bongda` | Bóng Đá | Feed riêng cho LFC (không cần lọc) |
| `bongdaplus` | Bóng Đá+ | Scraper tùy chỉnh (`bongdaplus.vn`) |
| `24h` | 24h | Lọc từ khóa `lfc` |
| `vnexpress` | VnExpress | Lọc từ khóa `lfc` |
| `tuoitre` | Tuổi Trẻ | Lọc từ khóa `lfc` |
| `thanhnien` | Thanh Niên | Lọc từ khóa `lfc` |
| `dantri` | Dân Trí | Lọc từ khóa `lfc` |
| `zingnews` | ZNews | Lọc từ khóa `lfc` |
| `vietnamnet` | VietNamNet | Lọc từ khóa `lfc` |
| `webthethao` | Webthethao | Lọc từ khóa `lfc` |

> Lưu ý: `thisisanfield.com` đã bị tắt do liên tục xảy ra vòng lặp redirect.

### Các Loại Adapter

- **`LfcAdapter`** — Scraper trang web chính thức của LFC
- **`RssAdapter`** — RSS parser tổng quát, áp dụng bộ lọc `LFC_KEYWORDS` khi config có `filter: "lfc"`
- **`BongdaplusAdapter`** — HTML scraper cho trang `bongdaplus.vn`
- **`GoalAdapter`** — Google News RSS proxy cho GOAL.com

---

## Pipeline Đồng Bộ

### Điểm Khởi Đầu

| Kích hoạt | Vị trí | Ghi chú |
|---|---|---|
| Cron job (hàng ngày 6 AM UTC) | `POST /api/news/sync` | Xác thực qua `CRON_SECRET` |
| Tự động đồng bộ nền | `db.ts → triggerSyncIfNeeded()` | Kích hoạt khi dữ liệu lỗi thời lúc tải trang |

### `syncPipeline()` — `src/lib/news/sync.ts`

```typescript
async function syncPipeline(): Promise<SyncResult> {
  // 1. Khởi tạo các adapter
  const adapters = [new LfcAdapter(), ...RSS_FEEDS.map(rssAdapter), new BongdaplusAdapter()];

  // 2. Lấy tất cả nguồn song song
  const { articles, stats } = await fetchAllNews(adapters, 300);

  // 3. Upsert vào Supabase theo đợt 50 bài (thử lại 1 lần nếu gặp lỗi 502/503)
  await supabase.from("articles").upsert(rows, { onConflict: "url" });

  // 4. Enrich lại: lấy ảnh OG cho tối đa 30 bài đang thiếu thumbnail
  await fetchOgMeta(noThumbArticles);

  // 5. Ghi kết quả vào bảng sync_logs
  await supabase.from("sync_logs").insert({ inserted, failed, duration_ms, source_stats });

  return { total, upserted, failed, enriched, durationMs, errors };
}
```

### Chiến Lược Đồng Bộ Ba Tầng (`triggerSyncIfNeeded`)

Được gọi mỗi khi tải trang `/news`. Kiểm tra độ tươi mới của DB để quyết định hành động:

| Tuổi dữ liệu trong DB | Hành động |
|---|---|
| `< 15 phút` | Bỏ qua — phục vụ dữ liệu đã cache |
| `15–30 phút` | Đồng bộ nền fire-and-forget, trả dữ liệu cũ ngay lập tức |
| `> 30 phút` hoặc rỗng | **Đồng bộ chặn** với timeout 8 giây, sau đó phục vụ |

Khóa `syncInProgress` theo từng instance ngăn chặn đồng bộ trùng lặp trong cùng một serverless instance.

---

## Loại Trùng Lặp

**File:** `src/lib/news/dedup.ts`

Loại trùng hai bước trước khi upsert vào DB:

1. **Chuẩn hóa URL** — bỏ protocol, `www.`, dấu gạch chéo cuối → kiểm tra với `Set<string>`
2. **Độ tương đồng tiêu đề Jaccard** — token hóa 60 ký tự đầu của tiêu đề, tính Jaccard trên tập token, ngưỡng `0.6`

```typescript
// Jaccard: giao / hợp của tập token
// Ngưỡng 0.6 → hai tiêu đề có hơn 60% token giống nhau = trùng lặp
const JACCARD_THRESHOLD = 0.6;
```

Stopwords bị loại khỏi quá trình token hóa: `a, an, the, is, in, of, to, and, for, on, at, with, by, from, as, but, or, not, be, are, was`.

---

## Phát Hiện Danh Mục

**File:** `src/lib/news/categories.ts`

Quy tắc regex áp dụng cho `title + snippet`. Khớp đầu tiên thắng:

| Danh mục | Mẫu kích hoạt |
|---|---|
| `match-report` | Mẫu tỷ số (`2-1`), "highlights", "full-time", "kết quả", "tường thuật" |
| `transfer` | "sign", "deal", "bid", "fee", "contract", "chuyển nhượng", "ký hợp đồng" |
| `injury` | "injured", "ruled out", "hamstring", "chấn thương", "nghỉ thi đấu" |
| `team-news` | "lineup", "squad list", "starting xi", "đội hình", "danh sách" |
| `opinion` | "opinion", "ratings", "verdict", "pundit", "nhận định", "chấm điểm" |
| `analysis` | "preview", "predicted", "pre-match", "dự đoán", "trước trận" |
| `general` | dự phòng |

---

## Tính Điểm Liên Quan

**File:** `src/lib/news/relevance.ts`

Công thức điểm: `freshness × 0.4 + keywords × 0.3 + source_priority × 0.3`

**Tính điểm từ khóa** (`src/lib/news/config.ts` → `LFC_KEYWORDS_WEIGHTED`):
- Danh tính CLB: `liverpool` (3), `anfield` (3), `lfc` (3)
- HLV: `arne slot` (2.5)
- Cầu thủ ngôi sao: `salah` (2.5), `van dijk` (2.5)
- Tân binh: `florian wirtz` (3), `alexander isak` (3)
- Tối đa 10 điểm

**Độ tươi mới**: `10 × e^(-ageHours / 24)` — điểm đầy đủ trong vòng 2 giờ, giảm một nửa sau ~17 giờ, gần bằng 0 sau 7 ngày

**Độ ưu tiên nguồn** (0–10): `lfc:10`, `anfield-watch/eotk:8`, `echo:7`, `bbc/guardian:6`, nguồn tiếng Việt: 3–4

---

## Sơ Đồ Database

### Bảng `articles`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `url` | `text` | **Khóa chính** |
| `title` | `text` | |
| `snippet` | `text` | ~200 ký tự đầu của nội dung |
| `author` | `text` | |
| `thumbnail` | `text` | Nullable |
| `hero_image` | `text` | Nullable |
| `source` | `text` | Khóa nguồn (`bbc`, `lfc`, v.v.) |
| `language` | `text` | `en` hoặc `vi` |
| `category` | `text` | Xem danh mục ở trên |
| `relevance` | `numeric` | Điểm tính toán 0–10 |
| `tags` | `text[]` | |
| `published_at` | `timestamptz` | |
| `fetched_at` | `timestamptz` | Gán lúc upsert |
| `content_scraped_at` | `timestamptz` | Gán khi scrape nội dung đầy đủ |
| `word_count` | `integer` | |
| `content_en` | `jsonb` | `{ paragraphs, description }` — cache 24 giờ |
| `content_vi` | `jsonb` | `{ paragraphs, description, translatedAt }` |
| `title_vi` | `text` | Tiêu đề đã dịch bằng AI |
| `snippet_vi` | `text` | Snippet đã dịch bằng AI |
| `is_active` | `boolean` | `false` = bị soft-delete bởi cron cleanup |

**Index:** `(is_active, language, published_at)`, `(is_active, language, relevance, published_at)`, cột tìm kiếm toàn văn `fts`.

### Bảng `sync_logs`

Theo dõi thống kê từng lần chạy: `inserted`, `updated`, `failed`, `duration_ms`, `errors`, `source_stats` (JSONB phân tích theo từng nguồn).

---

## Định Tuyến URL Bài Báo

**File:** `src/lib/news-config.ts`

URL bài báo được mã hóa thành slug dễ đọc để tránh chuỗi base64 dài trên trình duyệt:

```
URL gốc:        https://www.bbc.com/sport/football/liverpool/123456
Route trong app: /news/bbc/sport/football/liverpool/123456
```

```typescript
// Encode: URL bài báo → slug
encodeArticleSlug(url: string): string
// Decode: các segment [...slug] của Next.js → URL gốc
decodeArticleSlug(segments: string[]): string | null
// Tạo URL đầy đủ trong app
getArticleUrl(articleLink: string): string  // trả về "/news/{slug}"
```

Mỗi nguồn có hostname đã đăng ký trong `SOURCE_HOSTS`. Nếu hostname không nhận ra, fallback về mã hóa base64url (hỗ trợ legacy).

---

## Hệ Thống Dịch Thuật

Dịch nội dung bài báo theo yêu cầu từ EN sang VI qua Groq API.

**Endpoint:** `POST /api/news/translate`

**Luồng xử lý:**
1. Kiểm tra `articles.content_vi` trong DB — trả về cache nếu có
2. Scrape nội dung đầy đủ bài báo với `scrapeArticle(url)`
3. Lọc các đoạn văn rác (kêu gọi mạng xã hội, quảng bá newsletter)
4. Gọi Groq `llama-3.3-70b-versatile` với system prompt theo phong cách nhà báo thể thao
5. Phân tích phản hồi phân tách bởi `|||` thành `[title, description?, ...paragraphs]`
6. Lưu vào DB: các cột `title_vi`, `snippet_vi`, `content_vi`
7. Trả về cho client

**Cache phía client:** `src/lib/news/translation-cache.ts` — cache localStorage với TTL 7 ngày, đặt key theo hash URL. Ngăn gọi API lặp lại trong cùng phiên trình duyệt.

**Giới hạn tốc độ:** 10 lượt dịch mỗi IP mỗi giờ.

**Cache trong DB:** Cột `content_vi` JSONB lưu trữ xuyên suốt các phiên. Sau khi đã dịch, các yêu cầu tiếp theo trả về phiên bản đã cache (`cached: true`).

---

## Bản Tóm Tắt Tin Tức Hàng Ngày (AI Daily Digest)

**File:** `src/lib/news/digest.ts`

Tóm tắt tin tức tiếng Việt hàng ngày được tự động tạo bởi Groq.

### Quá Trình Tạo

```
Cron: hàng ngày lúc 00:00 UTC
  |
  v
GET /api/news/digest/generate?key=CRON_SECRET
  |
  v
generateDailyDigest()
  ├─ Truy vấn top 25 bài từ 24h qua (sắp xếp theo độ liên quan)
  ├─ Tạo prompt: danh sách bài báo + ngày tháng tiếng Việt
  ├─ Gọi Groq model (chuỗi fallback — xem bên dưới)
  ├─ Phân tích JSON phản hồi → DigestResult
  └─ Upsert vào news_digests (idempotent theo digest_date)
```

**Chuỗi fallback model** (thử theo thứ tự khi bị giới hạn tốc độ):
1. `llama-3.3-70b-versatile` — chất lượng tốt nhất, 100K TPD
2. `qwen/qwen3-32b` — fallback mạnh, 500K TPD
3. `llama-3.1-8b-instant` — nhanh, 500K TPD
4. `openai/gpt-oss-20b` — phương án cuối cùng, 200K TPD

**Tự động tạo:** `getLatestDigest()` cũng tự tạo nếu:
- Chưa có digest cho hôm nay
- Digest đã cũ hơn 2 giờ

Sử dụng khóa dựa theo timestamp 30 giây để ngăn tạo đồng thời. Nếu quá trình tạo thất bại, trả về digest trước đó một cách khéo léo.

### Bảng `news_digests`

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

### Cấu Trúc DigestSection

```typescript
{
  category: "match-report" | "transfer" | "injury" | "team-news" | "opinion" | "analysis" | "general",
  categoryVi: string,     // ví dụ: "Kết Quả Trận Đấu"
  headline: string,       // tiêu đề tiếng Việt
  body: string,           // tóm tắt tiếng Việt 4–6 câu
  articleUrls: string[]   // URL các bài báo nguồn
}
```

### Giao Diện Frontend

- **`/news`** — `getLatestDigest()` được lấy song song với danh sách bài; `DigestCard` được ghim ở trên cùng feed
- **`DigestCard`** — client component có thể đóng/mở, trạng thái thu gọn/mở rộng lưu trong localStorage
- **`/news/digest/[date]`** — trang chi tiết digest đầy đủ; liên kết trở về các bài báo nguồn

---

## Các Component Frontend

### `/news` — Trang Danh Sách Tin Tức

`src/app/news/page.tsx` — Server Component

- Gọi `getNewsFromDB(limit, preferLang)` để lấy bài viết ban đầu (mặc định 30 bài)
- Lấy `getLatestDigest()` song song
- Render `DigestCard` + `NewsFeed` (client component xử lý lọc/phân trang)

**Bộ lọc:**
- Ngôn ngữ: Tất cả / Quốc tế (EN) / Tiếng Việt (VI)
- Danh mục: Tất cả / Tường thuật trận đấu / Chuyển nhượng / Chấn thương / Tin đội hình / Phân tích / Nhận định
- Sắp xếp: Mới nhất / Nổi bật (theo độ liên quan)
- Nguồn: Dropdown tất cả nguồn đang hoạt động

### `/news/[...slug]` — Trang Đọc Bài Báo

`src/app/news/[...slug]/page.tsx` — Server Component

- Giải mã `[...slug]` qua `decodeArticleSlug()` để khôi phục URL gốc
- Tra cứu bài báo trong DB theo URL
- Scrape nội dung đầy đủ qua `scrapeArticle(url)` nếu `content_en` chưa có cache
- Render `ArticleReader` với:
  - Nút chuyển đổi bản dịch (EN/VI) — gọi `/api/news/translate` lần đầu chuyển
  - Thanh tiến trình đọc
  - Hành động like/lưu bài
  - Phần bình luận
  - Sidebar bài viết liên quan

### Bình Luận & Lượt Thích

- **Lượt thích:** `POST /api/news/like` — upsert vào bảng `article_likes` (cần đăng nhập)
- **Bình luận:** `GET/POST/DELETE /api/news/comments` — CRUD trên bảng `article_comments` (cần đăng nhập để đăng/xóa)
- Hiển thị bình luận: an toàn cho người dùng ẩn danh — hiển thị thời gian tương đối (vừa xong / Xm trước / Xh trước / Xd trước)

### Bài Báo Đã Lưu

- `POST/DELETE /api/saved-articles` — thêm/xóa khỏi bảng `saved_articles` (cần đăng nhập)
- Trang profile liệt kê bài đã lưu với tùy chọn xóa
- Trạng thái lưu được theo dõi phía client với cập nhật lạc quan (optimistic update)

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

1. **24-hour cache** (CONTENT_CACHE_TTL_MS): Skips re-scraping recently extracted articles
2. **Junk filtering**: Removes generic "next match" widget HTML and social CTAs
3. **Video detection**: Finds embedded video URLs (HLS streams, MP4 files) and inserts placeholder divs
4. **HTML sanitization**: Whitelist tags (p, h1–h4, img, figure, figcaption, a, em, strong, code, pre, ul, ol, li, blockquote, table)
5. **Image extraction**: Collects all `<img src>` from article body
6. **Reading time**: Word count ÷ 200
7. **Thin content detection**: Flags articles <400 words as `isThinContent: true`

### Article Rendering Components

**`ArticleHtmlBody`** (`src/components/news/article-html-body.tsx`):
- Renders `htmlContent` via dangerouslySetInnerHTML
- Hydrates video player placeholders with imperative React mounting

**`ArticleVideoPlayer`** (`src/components/news/article-video-player.tsx`):
- Supports HLS streams (`.m3u8`) and MP4 files
- Uses HLS.js for cross-browser HLS support
- Falls back to native HTML5 video on Safari
- Graceful error handling with link to original source

---

## Cron Jobs

Cấu hình trong `vercel.json`:

| Route | Lịch chạy | `maxDuration` | Mục đích |
|---|---|---|---|
| `/api/news/sync` | `0 6 * * *` (6 AM UTC) | 60s | Đồng bộ tất cả feed RSS → Supabase, scrape HTML content + detect videos |
| `/api/news/cleanup` | `0 3 * * *` (3 AM UTC) | mặc định | Soft-delete bài >30 ngày; hard-delete bài >60 ngày |
| `/api/news/digest/generate` | `0 0 * * *` (nửa đêm UTC) | 60s | Tạo bản tóm tắt AI hàng ngày qua Groq |

**Xác thực:** Tất cả route cron kiểm tra header `Authorization: Bearer <CRON_SECRET>` (Vercel gửi tự động) hoặc query param `?key=<CRON_SECRET>`.

---

## Sơ Đồ File Chính

```
src/lib/news/
├── config.ts              # Danh sách RSS_FEEDS, SOURCE_CONFIG, LFC_KEYWORDS_WEIGHTED
├── types.ts               # Các kiểu NewsArticle, FeedConfig, NewsSource, ArticleCategory
├── sync.ts                # syncPipeline() — điểm vào chung cho tất cả thao tác đồng bộ
├── db.ts                  # getNewsFromDB(), getNewsPaginated(), searchArticles()
├── pipeline.ts            # fetchAllNews() — lấy song song, dedup, phân loại, tính điểm
├── dedup.ts               # deduplicateArticles() — loại trùng theo URL + Jaccard
├── categories.ts          # categorizeArticle() — phát hiện danh mục bằng regex
├── relevance.ts           # scoreArticle() — tính điểm theo độ tươi mới + từ khóa + nguồn
├── digest.ts              # generateDailyDigest(), getLatestDigest(), getDigestByDate()
├── translation-cache.ts   # Cache localStorage phía client cho bản dịch (TTL 7 ngày)
├── source-detect.ts       # detectSource(url), tập hợp VI_SOURCES
├── supabase-service.ts    # getServiceClient() — service role client (bỏ qua RLS)
├── index.ts               # Barrel: export scrapeArticle, getNews
├── adapters/
│   ├── base.ts            # Interface FeedAdapter
│   ├── lfc-adapter.ts     # Adapter trang web chính thức LFC
│   ├── rss-adapter.ts     # Adapter RSS tổng quát (rss-parser)
│   ├── bongdaplus-adapter.ts  # HTML scraper cho bongdaplus.vn
│   ├── goal-adapter.ts    # Google News RSS proxy cho GOAL.com
│   └── vietnamvn-adapter.ts   # Scraper cho vietnam.vn
├── enrichers/
│   ├── og-meta.ts         # fetchOgMeta() — enrich ảnh OG / ngày đăng
│   ├── article-extractor.ts   # Scraper nội dung bài đầy đủ (Cheerio) + video detection
│   └── readability.ts     # Wrapper cho Mozilla Readability
└── __tests__/
    ├── categories.test.ts
    ├── dedup.test.ts
    ├── relevance.test.ts
    └── pipeline.test.ts

src/lib/news-config.ts     # An toàn phía client: SOURCE_CONFIG, CATEGORY_CONFIG, encodeArticleSlug, decodeArticleSlug

src/app/
├── news/
│   ├── page.tsx           # /news danh sách (Server Component)
│   ├── [...slug]/page.tsx # /news/[...slug] trang đọc bài báo
│   └── digest/[date]/page.tsx  # /news/digest/YYYY-MM-DD trang chi tiết digest
└── api/news/
    ├── sync/route.ts      # POST — kích hoạt đồng bộ cron
    ├── cleanup/route.ts   # POST — dọn dẹp bài báo cũ
    ├── digest/generate/route.ts  # GET — tạo digest
    ├── translate/route.ts # POST — dịch EN→VI theo yêu cầu
    ├── like/route.ts      # POST — like bài báo
    └── comments/route.ts  # GET/POST/DELETE — bình luận bài báo

src/components/news/       # Tất cả component UI tin tức (cards, reader, digest, comments)
```

---

## Biến Môi Trường

| Biến | Mục đích |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL dự án Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — bỏ qua RLS cho tất cả thao tác tin tức |
| `GROQ_API_KEY` | Groq Cloud API — dịch thuật + tạo digest |
| `CRON_SECRET` | Xác thực các endpoint cron |

---

## Thêm Nguồn Tin Mới

1. Thêm mục `FeedConfig` vào mảng `RSS_FEEDS` trong `src/lib/news/config.ts`:
   ```typescript
   { url: "https://example.com/rss.xml", source: "mysource", language: "en" }
   ```
2. Thêm khóa nguồn vào union type `NewsSource` trong `src/lib/news/types.ts`
3. Thêm cấu hình hiển thị vào `SOURCE_CONFIG` trong cả `src/lib/news/config.ts` và `src/lib/news-config.ts`
4. Thêm mapping hostname vào `SOURCE_HOSTS` trong `src/lib/news-config.ts`
5. Thêm trọng số độ ưu tiên nguồn trong `src/lib/news/relevance.ts` → `SOURCE_PRIORITY`
6. Nếu nguồn cần lọc từ khóa (feed thể thao tổng hợp), thêm `filter: "lfc"` vào config

Đối với nguồn dựa trên scraper (không có RSS), hãy tạo adapter mới trong `src/lib/news/adapters/` triển khai interface `FeedAdapter` và thêm vào `syncPipeline()` trong `sync.ts`.
