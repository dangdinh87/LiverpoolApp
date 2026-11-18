# Kiến Trúc Hệ Thống

**Anfield Daily** là ứng dụng Next.js 16.4 App Router vận hành trên **Cloudflare Workers** (`@opennextjs/cloudflare`), kết hợp kiến trúc ưu tiên React Server Components, tầng dữ liệu bóng đá đa nguồn, luồng tổng hợp 13 đầu báo tiếng Anh kèm bóc tách toàn văn, hệ thống xác thực/lưu trữ Supabase và các tác vụ biên tập/dịch thuật AI qua VietAPI.

---

## Sơ Đồ Tổng Quan

```text
┌──────────────────────────────────────────────────────────────────────┐
│                            Trình duyệt                               │
│  React 19 Client Components · Zustand · TanStack Query · Spoiler CSS │
└─────────────────────────────────┬────────────────────────────────────┘
                                  │ HTTPS / RSC Streaming
┌─────────────────────────────────▼────────────────────────────────────┐
│            Cloudflare Workers (`liverpool-app`, OpenNext)            │
│  ├── Cache Interception → Regional Cache API + R2 (`next-cache`)     │
│  ├── D1 Tag Cache (`tag-cache`) + Durable Object Queue (`DOQueue`)   │
│  ├── `src/proxy.ts` (định tuyến `/vi`, chặn bot quét CMS, bảo vệ auth)│
│  ├── Server Components (prerender SSG/ISR + `pickClientMessages`)    │
│  └── Route Handlers & Server Actions (cron, API, ghi dữ liệu)        │
└──────────┬──────────────────────┬───────────────────────┬────────────┘
           │                      │                       │
┌──────────▼──────────┐ ┌─────────▼───────────┐ ┌─────────▼────────────┐
│ Supabase            │ │ Dữ liệu Bóng đá     │ │ Tin tức, Media & AI  │
│ • PostgreSQL (RLS)  │ │ • Football-Data.org │ │ • 13 đầu báo Anh     │
│ • Auth (OAuth/Email)│ │ • ESPN (cúp & live) │ │ • YouTube Data API   │
│ • Storage (avatar)  │ │ • FPL API (cầu thủ) │ │ • VietAPI (LLM)      │
│ • Timeout 3s/breaker│ │ • Bản đồ phát sóng  │ │ • Cloudinary         │
└─────────────────────┘ └─────────────────────┘ └──────────────────────┘
```

---

## Các Tầng Cốt Lõi

### Tầng 1: Nguồn Dữ Liệu & Dịch Vụ Ngoài

| Nguồn | Vai trò | Biến môi trường | Cơ chế bảo vệ & giới hạn |
|---|---|---|---|
| Football-Data.org v4 | Bảng xếp hạng Ngoại hạng Anh & Cúp C1, lịch thi đấu, mùa lưu trữ, đối đầu, đội hình, HLV | `FOOTBALL_DATA_ORG_KEY` | 10 req/phút; `fdo-client.ts` gộp request trùng & retry/backoff `HTTP 429` |
| ESPN Soccer API | Cúp FA & Cúp Liên đoàn, tỷ số trực tiếp, diễn biến theo phút, đội hình ra sân, 28 chỉ số trận đấu | — (miễn phí) | Bọc `React.cache()` + ISR |
| Fantasy Premier League | Thống kê chi tiết cầu thủ tại Ngoại hạng Anh | — (miễn phí) | Lưu đệm ISR |
| 13 Đầu Báo Tiếng Anh | 12 nguồn RSS + adapter `sitemap-news.xml` của trang chủ CLB | — | Đồng bộ mỗi giờ + giới hạn cào 45 giây |
| YouTube Data API v3 | Dải video chính thức của CLB (`lfctv`) trên `/news` | `YOUTUBE_API_KEY` | Tốn ~24 đơn vị quota/giờ (miễn phí 10.000/ngày); tự ẩn nếu không cấu hình |
| VietAPI | Bản tin AI hằng ngày, dịch toàn văn sang tiếng Việt, bài phân tích sau trận | `VIETAPI_KEY` | Chuỗi model dự phòng + `AbortSignal.timeout` |
| Supabase | Xác thực, PostgreSQL có RLS, lưu trữ ảnh đại diện | `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY` | `createSupabaseFetch()` (timeout 3 giây + ngắt mạch 30 giây) |
| Cloudinary | Lưu trữ và biến đổi kích thước ảnh thư viện | `CLOUDINARY_*` | Đọc không cookie qua `unstable_cache` |

### Tầng 2: Proxy Điều Phối Request (`src/proxy.ts`)

Trên Next.js 16, `src/proxy.ts` thay thế `middleware.ts` và xử lý theo thứ tự:
1. Trả `404` tức thì cho các truy vấn dò quét WordPress/CMS (`/wp-*`, `*.php`, `?rest_route=`) để tiết kiệm CPU của Worker.
2. Điều phối ngôn ngữ `next-intl` (tiếng Anh mặc định tại `/`, tiếng Việt tại `/vi`, ưu tiên cookie `NEXT_LOCALE` và header `Accept-Language`).
3. Làm mới phiên đăng nhập Supabase trên các đường dẫn cần bảo vệ (`/profile`, `/vi/profile`) bằng client có gắn timeout 3 giây; chuyển hướng khách chưa đăng nhập sang `/auth/login?redirect=...`.
4. Gắn header `X-Robots-Tag: noindex, nofollow` cho `/auth` và `/profile`.

### Tầng 3: Server Components & Tối Ưu Payload Client

Mọi trang trong `src/app/[locale]/` đều gọi `setRequestLocale(locale)` để prerender tĩnh (SSG/ISR). Tại `src/app/[locale]/layout.tsx`, hàm `pickClientMessages()` chỉ truyền đúng 25 namespace mà Client Component thực sự sử dụng vào `<NextIntlClientProvider>`, giảm ~52% dung lượng JSON đa ngôn ngữ đính kèm HTML/RSC.

---

## Phân Tách Supabase Client & Chống Treo Kết Nối (BẮT BUỘC)

| Tệp | Ngữ cảnh sử dụng | Quyền truy cập |
|---|---|---|
| `src/lib/supabase.ts` | Client Component (`"use client"`) | Anon key, chịu sự kiểm soát của RLS |
| `src/lib/supabase-server.ts` | Server Components, Server Actions, Route Handlers (`import "server-only"`) | Anon key + cookie phiên đăng nhập |
| `src/lib/news/supabase-service.ts` | Tác vụ cron & thao tác ghi đã kiểm tra hợp lệ phía server (`import "server-only"`) | Service role key (bỏ qua RLS) |

### Timeout Cứng & Cơ Chế Ngắt Mạch (`src/lib/supabase-fetch-with-timeout.ts`)

Mỗi Supabase client đều cấu hình `createSupabaseFetch()` và `db: { retry: false }`:
- **Giới hạn thời gian cứng 3 giây bằng `Promise.race` (`SUPABASE_FETCH_TIMEOUT_MS`):** Đặt bộ đếm `setTimeout` song song với `AbortController`, đảm bảo không bao giờ treo 60–90 giây ngay cả khi Next.js 16 gỡ `init.signal` lúc làm mới ngầm `fetch-cache` hết hạn.
- **Tắt retry ngầm của PostgREST:** Chuẩn hóa lỗi thành `DOMException("...", "AbortError")` để ngăn `postgrest-js` tự cộng thêm 1s + 2s + 4s chờ lặp lại.
- **Ngắt mạch 30 giây (`SUPABASE_BREAKER_COOLDOWN_MS`):** Tự kích hoạt khi gặp lỗi mạng, quá hạn hoặc lỗi cổng (`502`, `503`, `504`, Cloudflare `520–530`), giúp các truy vấn kế tiếp trả về rỗng ngay lập tức thay vì làm nghẽn trang hay gãy quá trình build.

---

## Luồng Tin Tức, Bản Tin Ngày & Bài Phân Tích Sau Trận

```text
GitHub Actions (`news-sync.yml` mỗi giờ, `news-daily.yml` mỗi ngày)
  ├── GET /api/news/sync
  │     ├── Tải song song 13 đầu báo Anh + YouTube CLB (`lfctv`)
  │     ├── Chuẩn hóa URL (`url.ts`) + lọc trùng tiêu đề Jaccard (`dedup.ts`)
  │     ├── Chấm điểm mức độ liên quan + phân loại chuyên mục
  │     ├── Upsert theo lô vào `articles` + bổ sung ảnh `og:image`
  │     └── Cào sẵn toàn văn HTML & video nhúng (`article-extractor.ts`, tối đa 45s)
  ├── GET /api/news/digest/generate
  │     └── Hai lời gọi VietAPI song song → lưu bản tin ngày + bài SEO vào `news_digests`
  ├── GET /api/news/cleanup
  │     └── Xóa nội dung cào quá 7 ngày, bài quá 14 ngày & `sync_logs` quá 14 ngày
  └── GET/POST /api/site-articles/generate
        └── Dữ liệu trận đấu (`match-review-facts.ts`) → VietAPI (`en` + `vi`) → `validateDraft()` → `site_articles`
```

---

## Chiến Lược Bộ Nhớ Đệm Trên Cloudflare Workers

| Cấp độ | Cơ chế | Mục đích |
|---|---|---|
| Trong một request | `React.cache()` | Gộp các lời gọi hàm trùng nhau trong cùng lượt render RSC |
| Dữ liệu dùng chung | `unstable_cache` + D1 tag cache | Lưu đệm xuyên request, làm mới tức thì qua `revalidateTag` / `revalidateLocalizedPath` |
| Trang tĩnh & ISR tại biên | R2 (`liverpool-app-next-cache`) + `withRegionalCache` + `DOQueueHandler` | Trả thẳng trang ISR từ Cache API của trung tâm dữ liệu Cloudflare trước khi khởi chạy bundle Next.js (`enableCacheInterception: true`) |
| Trình duyệt | `localStorage` + thuộc tính `<html>` | Lưu lịch sử đọc, bản dịch tiếng Việt (7 ngày) và chế độ ẩn tỷ số không nhấp nháy (`SPOILER_BOOT_SCRIPT`) |

---

## Bảng Dữ Liệu Chính Trong Supabase

| Bảng | Mục đích | Cơ chế bảo mật |
|---|---|---|
| `profiles` | Tên hiển thị, tiểu sử, ảnh đại diện | RLS (chỉ sửa hồ sơ cá nhân) |
| `favourite_players` | Danh sách cầu thủ yêu thích | RLS theo `user_id` |
| `articles` | Kho bài báo tiếng Anh, HTML gốc (`content_en`) và bản dịch tiếng Việt (`content_vi`) | Bật RLS; ghi qua service role |
| `sync_logs` | Nhật ký đồng bộ và trạng thái từng nguồn tin | Bật RLS; ghi qua service role |
| `article_likes` / `article_comments` | Lượt thích và bình luận bài viết (đã lọc ẩn địa chỉ email) | RLS + kiểm tra phiên đăng nhập |
| `saved_articles` | Bài viết người đọc đã lưu | RLS theo `user_id` |
| `news_digests` | Bản tin AI hằng ngày và bài tổng hợp SEO | Đọc công khai, ghi qua service role |
| `site_articles` | Bài phân tích sau trận song ngữ (`/analysis`) đã qua kiểm chứng dữ kiện + lưu bản nháp bị loại | Đọc công khai (`published`), ghi qua service role |
| `match_predictions` / `player_ratings` | Dự đoán tỷ số trước giờ bóng lăn & chấm điểm cầu thủ 1–10 sau trận | Đọc hàng của chính mình qua RLS; ghi qua Server Action kiểm tra giờ đá & đội hình |
| `gallery` | Ảnh thư viện Cloudinary & cấu hình ảnh trang chủ | Đọc công khai, quản trị viên ghi |
