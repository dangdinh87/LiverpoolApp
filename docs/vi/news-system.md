# Hệ Thống Tin Tức & Biên Tập AI

**Anfield Daily** tổng hợp tin tức Liverpool FC từ **13 đầu báo tiếng Anh** (`NEWS_OUTLET_COUNT = 13`) cùng kênh video chính thức của CLB (`lfctv`), chuẩn hóa URL và lọc trùng vào Supabase, bóc tách sẵn toàn văn HTML kèm video nhúng, đồng thời vận hành ba luồng **VietAPI**: bản tin AI hằng ngày (`/news/digest`), dịch toàn văn sang tiếng Việt theo yêu cầu (`/api/news/translate`) và bài phân tích sau trận đối chiếu dữ kiện (`/analysis`).

---

## 1. Luồng Đồng Bộ Tổng Quan

```text
13 Đầu Báo Tiếng Anh (12 RSS + LfcAdapter) + YouTubeChannelAdapter (`lfctv`)
        │
        ▼
  fetchAllNews()                  ── tải song song (`cache: "no-store"`), giới hạn 14 ngày, ghi trạng thái từng nguồn
        │
        ▼
  canonicalizeArticleUrl()        ── cắt tham số theo dõi (`utm_*`, `at_*`) & dấu gạch chéo cuối
  deduplicateArticles()           ── lọc trùng URL chuẩn hóa + tương đồng tiêu đề Jaccard trong 48h
        │
        ▼
  categorizeArticle()             ── phân loại bằng regex (`match-report`, `transfer`, `injury`, `team-news`, `opinion`, `analysis`, `general`)
  scoreArticle()                  ── chấm điểm theo độ mới + từ khóa mùa 2026/27 + độ ưu tiên nguồn
        │
        ▼
  Supabase `articles`             ── upsert theo lô (`mergeArticleRowForUpsert`, bảo toàn `is_active` & `read_count`)
        │
        ▼
  fetchOgMeta()                   ── bù ảnh `og:image` cho bài thiếu ảnh đại diện
  scrapeContentForRecentArticles()── bóc tách HTML toàn văn + video HLS/MP4 (ngân sách 45 giây, lưu đệm 24h)
        │
        ▼
  `sync_logs` + revalidate        ── ghi nhật ký từng nguồn & làm mới bộ đệm ISR trang chủ/tin tức
```

**Cơ sở dữ liệu là nguồn đọc duy nhất:** Các trang giao diện không bao giờ gọi trực tiếp nguồn RSS khi người dùng mở trang mà chỉ truy vấn dữ liệu đã lưu trong Supabase (`src/lib/news/db.ts` và `cached-feed.ts`).

---

## 2. Danh Sách Nguồn Tin Hoạt Động

### 13 Đầu Báo Tiếng Anh (`src/lib/news/config.ts`)

| Khóa | Đầu báo | Cơ chế thu thập |
|---|---|---|
| `lfc` | Liverpool FC Official | `LfcAdapter` (`sitemap-news.xml`, chỉ giữ bài thuộc mục đội nam & CLB) |
| `bbc` | BBC Sport | RSS chuyên mục Liverpool |
| `guardian` | The Guardian | RSS chuyên mục Liverpool (loại bỏ trang tường thuật trực tiếp `/live/`) |
| `echo` | Liverpool Echo | RSS chuyên mục Liverpool |
| `tia` | This Is Anfield | RSS chuyên mục Liverpool (chỉ mở liên kết gốc do nguồn chặn cào tự động) |
| `anfield-watch` | Anfield Watch | RSS riêng |
| `eotk` | Empire of the Kop | RSS riêng |
| `sky` | Sky Sports | RSS bóng đá (`filter: "lfc"`, loại bỏ bản tin video lẻ và liveblog) |
| `mirror` | Mirror | RSS chủ đề Liverpool |
| `independent` | The Independent | RSS bóng đá (`filter: "lfc"`) |
| `anfieldindex` | Anfield Index | RSS riêng (timeout 8 giây cho tệp XML lớn) |
| `liverpoolcom` | Liverpool.com | RSS riêng |
| `espn` | ESPN | RSS bóng đá (`filter: "lfc"`) |

> Trên trang `/vi/news`, khi bộ lọc nguồn địa phương không có bài riêng, `NewsFeed` tự động chuyển về hiển thị đầy đủ kho tin tiếng Anh dưới giao diện tiếng Việt để không bao giờ xuất hiện trang trống. Bảng ánh xạ tên miền cũ trong `src/lib/news/source-hosts.ts` và `src/lib/news-config.ts` vẫn được giữ lại để các đường dẫn lưu trữ cũ tiếp tục hoạt động bình thường.

### Dải Video Chính Thức Của CLB (`lfctv`)

`YouTubeChannelAdapter` (`src/lib/news/youtube-data-api.ts`) gọi YouTube Data API v3 (`YOUTUBE_API_KEY`) để hiển thị video mới từ kênh Liverpool FC trên trang `/news`. Các mục `lfctv` được ưu tiên nhận diện chính chủ trong `relevance.ts`, không đưa vào bước cào bài chữ hay bản tin tóm tắt, và tự động bỏ qua nếu chưa đặt `YOUTUBE_API_KEY`.

---

## 3. Chuẩn Hóa URL & Đường Dẫn Thân Thiện

- **Chuẩn hóa URL (`src/lib/news/url.ts`):** Mọi tham số theo dõi (`utm_*`, `at_*`...) và dấu `/` thừa cuối đường dẫn bị loại bỏ ngay khi nạp. Khi đọc bài, dịch thuật, thích, bình luận hoặc lưu bài, hệ thống đối chiếu qua `articleUrlVariants()` để tương thích ngược hoàn toàn.
- **Mã hóa Slug (`src/lib/news-config.ts`):**
  - Bài chuẩn: `/news/bbc/sport/football/...`
  - Tên miền phụ của nguồn quen thuộc: `/news/bbc/~www.bbc.co.uk/sport/...`
  - URL có tham số truy vấn thực sự (như `?v=` của YouTube): mã hóa base64url an toàn.
- **Chống SSRF:** Mọi thao tác tải bài từ phía server đều bắt buộc vượt qua `isKnownNewsSourceUrl()`.

---

## 4. Bóc Tách Toàn Văn & Phát Video Nhúng

**Tệp:** `src/lib/news/enrichers/article-extractor.ts`

1. **Phân tích DOM tương thích Cloudflare:** Kết hợp `linkedom` + `@mozilla/readability` + bộ chọn Cheerio riêng cho từng báo (không dùng `jsdom` vì không chạy trên `workerd`).
2. **Làm sạch rác xuất bản & ảnh:** Cắt bỏ dòng mời đọc tiếp ("Read more…", chân trang bản quyền, lời mời kênh WhatsApp, khung lịch đấu chèn sẵn), loại ảnh trùng với ảnh bìa (`dropHeroDuplicate`) và chặn sớm máy chủ ảnh dính lỗi CORP trong `isEmbeddableImageUrl()`.
3. **Làm sạch HTML ở bước cuối:** Chạy `sanitize-html` sau cùng với danh sách thẻ và tên miền `iframe` hợp lệ.
4. **Nhận diện video HLS/MP4:** Chèn thẻ giữ chỗ `<div class="article-video-player" data-video-src="...">`.
5. **Hiển thị trang đọc bài (`/news/[...slug]`):** `TranslatableExcerpt` hiển thị trực tiếp `htmlContent` (kích hoạt `ArticleHtmlBody` + `ArticleVideoPlayer` dùng `hls.js`), đặt dòng ghi nguồn và liên kết bài gốc **ngay phía trên** nội dung, gắn `robots: { index: false, follow: true }` và không chạy quảng cáo.

---

## 5. Ba Luồng AI Qua VietAPI (`src/lib/ai/vietapi.ts`)

Mọi tác vụ AI đều gọi **VietAPI** (`VIETAPI_KEY`) qua `@ai-sdk/openai-compatible` và `ai`, luôn đính kèm khối sự thật nền `buildCurrentFactsBlock()` (`src/lib/prompts/current-facts.ts` — mùa giải 2026/27, HLV trưởng Andoni Iraola, giám đốc thể thao Julian Ward và danh sách 31 cầu thủ đội một):

### A. Dịch Toàn Văn Sang Tiếng Việt (`POST /api/news/translate`)

- Bắt buộc bài viết phải tồn tại trong bảng `articles` (`404` nếu không có) nhằm bảo vệ hạn mức API.
- Giới hạn đầu vào `18.000` ký tự, gộp các yêu cầu dịch đồng thời của cùng một URL chuẩn hóa và áp timeout riêng cho từng lần thử trong chuỗi dự phòng (`deepseek-v4-flash` → `deepseek-v4-pro` → `claude-sonnet-5`).
- Lưu kết quả vào `articles.content_vi` (`title_vi`, `snippet_vi`, `paragraphs`) kèm bộ nhớ đệm `localStorage` 7 ngày trên trình duyệt (`src/lib/news/translation-cache.ts`).

### B. Bản Tin AI Hằng Ngày (`GET /api/news/digest/generate`, `/news/digest/[date]`)

- Xác định ngày theo múi giờ `Europe/London` (`DIGEST_TIME_ZONE`).
- Thực thi song song hai yêu cầu LLM (~35 giây tổng thời gian) để sinh bản tin phân mục (`sections`) và bài tổng hợp chuẩn SEO (`seo_article`), lưu idempotent vào `news_digests`.
- Giao diện người đọc chỉ đọc qua `getLatestDigest()` / `getDigestByDate()`, không bao giờ tự gọi AI lúc tải trang.

### C. Bài Phân Tích Sau Trận Đối Chiếu Dữ Kiện (`GET/POST /api/site-articles/generate`, `/analysis/[slug]`)

- Tổng hợp dữ kiện chuẩn (`src/lib/site-articles/match-review-facts.ts`) từ kết quả FDO cùng diễn biến, đội hình và thống kê ESPN (hỗ trợ đầy đủ cả các trận hòa `0–0` và bàn phản lưới nhà).
- Tạo bài nhận định tiếng Anh và tiếng Việt (`deepseek-v4-flash` → `deepseek-v4-pro`), kiểm duyệt chặt qua `validateDraft()` (`src/lib/site-articles/validate-draft.ts`):
  - Đối chiếu tỷ số, cầu thủ ghi bàn và nhân sự được nhắc tên với tập `facts`
  - Chặn sáo ngữ AI, thực thể HTML thô, văn bản rác và các cụm định vị sai quy chuẩn thương hiệu
  - Kiểm tra độ trùng lặp văn phong với các bài gần đây (`similarity.ts`)
- Bản đạt chuẩn được xuất bản vào `site_articles` (`status = 'published'`), làm mới cache `/analysis` và đưa vào `sitemap.xml` cùng `/llms.txt`. Bản không đạt được giữ lại với `status = 'rejected'` và `reject_reason` để tra cứu.

---

## 6. Lịch Tác Vụ Tự Động

Tất cả route định kỳ yêu cầu header `Authorization: Bearer <CRON_SECRET>` đối chiếu thời gian hằng định qua `withCronAuth()` (`src/lib/cron.ts`):

| Workflow | Lịch chạy (UTC) | Endpoint | Nhiệm vụ |
|---|---|---|---|
| `.github/workflows/news-sync.yml` | `0 * * * *` | `GET /api/news/sync` | Đồng bộ 13 đầu báo + YouTube, bù ảnh bìa, cào toàn văn (tối đa 45s) & gửi báo cáo/cảnh báo Telegram |
| `.github/workflows/news-sync.yml` | `01:00–16:59` (sau sync) | `GET /api/news/digest/generate` | Kiểm tra bù tự động nếu bản tin đầu ngày chưa được tạo |
| `.github/workflows/news-daily.yml` | `7 0 * * *` | `GET /api/news/digest/generate` | Tạo bản tin AI hằng ngày lúc đầu ngày mới |
| `.github/workflows/news-daily.yml` | `17 3 * * *` | `GET /api/news/cleanup` | Xóa nội dung cào quá 7 ngày, xóa hẳn bài quá 14 ngày & dọn `sync_logs` quá 14 ngày |
