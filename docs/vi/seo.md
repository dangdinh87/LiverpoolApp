# SEO & Khám Phá Bằng AI

Kiến trúc tối ưu công cụ tìm kiếm, thẻ chia sẻ mạng xã hội, dữ liệu có cấu trúc JSON-LD và hướng dẫn trích dẫn cho mô hình AI của **Anfield Daily** (`https://anfielddaily.com`).

---

## 1. Chuẩn Hóa Canonical & Hreflang (`src/lib/seo.ts`)

Với cấu trúc tiếng Anh tại `/` và tiếng Việt tại `/vi` (`src/i18n/routing.ts`), mọi trang cho phép lập chỉ mục đều sinh cặp `canonical` và `hreflang` đồng nhất qua hàm `getHreflangAlternates(path, locale, locales)`:

- `en` → `https://anfielddaily.com<path>`
- `vi` → `https://anfielddaily.com/vi<path>`
- `x-default` → `https://anfielddaily.com<path>`
- `og:locale` → `en_GB` trên trang tiếng Anh, `vi_VN` trên trang tiếng Việt

Cả thẻ `<head>` của từng trang (`makePageMeta` / `generateMetadata`) lẫn `src/app/sitemap.xml/route.ts` đều dùng chung `getHreflangAlternates()`, triệt tiêu hoàn toàn nguy cơ lệch địa chỉ giữa HTML và sơ đồ trang. Hàm `getSiteUrl()` truy xuất `NEXT_PUBLIC_SITE_URL` tại thời điểm gọi hàm (`getEnv()`) và cắt dấu `/` dư ở cuối để chạy an toàn trên Cloudflare Workers.

---

## 2. Chính Sách Lập Chỉ Mục: Nội Dung Tự Viết vs Bản Sao Báo Chí

| Nhóm đường dẫn | Chính sách chỉ mục | Lý do |
|---|---|---|
| `/`, `/news`, `/analysis`, `/analysis/[slug]`, `/news/digest/[date]`, `/fixtures`, `/fixtures/[id]`, `/standings`, `/predictions`, `/squad`, `/player/[id]`, `/stats`, `/stats/[season]`, `/season?season=<mùa-cũ>`, `/history`, `/gallery`, `/about`, `/legal` | `index: true, follow: true` + có mặt trong `sitemap.xml` | Trang gốc của Anfield Daily: dữ liệu trận đấu, bản tin ngày và bài phân tích sau trận tự biên soạn từ thống kê |
| `/news/[...slug]` (trang đọc bài báo cào về) | `index: false, follow: true` + **loại khỏi** `sitemap.xml` + không đặt quảng cáo | Hiển thị lại bài viết của các đầu báo gốc kèm ghi nhận tác giả và liên kết gốc; không cạnh tranh thứ hạng tìm kiếm với tờ báo xuất bản |
| `/profile`, `/auth/*` | `X-Robots-Tag: noindex, nofollow` + chặn trong `robots.txt` | Khu vực tài khoản cá nhân và đăng nhập |

---

## 3. Đồ Thị Dữ Liệu Có Cấu Trúc (`JSON-LD`)

Các thực thể toàn trang được khai báo một lần trong `<StructuredData />` (`src/components/analytics/structured-data.tsx`) với định danh `@id` cố định (`SCHEMA_IDS.publisher`, `SCHEMA_IDS.website`, `SCHEMA_IDS.club`), còn các trang con tham chiếu ngược về các nút `@id` này:

| Phạm vi | Loại Schema |
|---|---|
| Layout ngôn ngữ gốc | `Organization` (`#publisher`), `WebSite` (`#website`), `SportsTeam` (`#club`) |
| Trang chuyên mục & chi tiết | `BreadcrumbList` (`src/lib/seo-breadcrumbs.ts`) |
| `/analysis/[slug]` & `/news/digest/[date]` | `BreadcrumbList` + `NewsArticle` |
| `/news/[...slug]` | `BreadcrumbList` + `NewsArticle` (`Organization` dự phòng hoặc `Person` khi có tên phóng viên) |
| `/fixtures/[id]` | `BreadcrumbList` + `SportsEvent` (ánh xạ đầy đủ trạng thái hoãn/hủy `EventPostponed`, `EventScheduled`) |
| `/player/[id]` | `BreadcrumbList` + `Person` (`memberOf: { "@id": "#club" }`) |
| `/gallery` | `BreadcrumbList` + `ImageGallery` |

---

## 4. Ảnh Chia Sẻ OpenGraph (`src/lib/og/story-card.tsx`)

- Thẻ mặc định toàn trang: `src/app/opengraph-image.tsx` (1200×630).
- Thẻ động theo ngôn ngữ cho `/news/digest/[date]/opengraph-image.tsx` và `/analysis/[slug]/opengraph-image.tsx`.
- Nhúng trực tiếp phông League Gothic dạng base64 (`src/assets/fonts/league-gothic-base64.ts`), giữ đúng khoảng cách chữ `WORDMARK` (`0.18em`) và vạch gạch chân đỏ theo [`docs/brand.md`](../brand.md) mà không cần đọc đĩa hay tải mạng lúc chạy trên Worker.

---

## 5. `sitemap.xml`, `robots.txt` & `llms.txt`

### `src/app/sitemap.xml/route.ts`

- Render động (`force-dynamic`, `Cache-Control: public, max-age=3600, s-maxage=3600`) và bọc `unstable_cache` cho truy vấn danh sách ngày bản tin cũng như `site_articles`, đảm bảo quá trình build không bao giờ phụ thuộc vào kết nối CSDL trực tiếp.
- Sinh thẻ `<url>` cho cả hai ngôn ngữ (đầy đủ `xhtml:link` `hreflang` và chỉ xuất `lastmod` khi có ngày cập nhật thật) đối với các trang tĩnh, mùa giải lưu trữ (`/season?season=...`, `/stats/...`), hồ sơ 31 cầu thủ, `/analysis/[slug]` (chỉ liệt kê ngôn ngữ thực sự có bản xuất bản), `/news/digest/[date]` và `/fixtures/[id]`.

### `src/app/robots.txt/route.ts`

- Chặn `/api/`, `/profile`, `/vi/profile`, `/auth/` và `/vi/auth/`.
- Chủ đích **không chặn chuỗi truy vấn** (`/*?*`) để Google có thể thu thập các liên kết chia sẻ có bộ lọc (như `/news?source=bbc` hoặc `/fixtures?view=results`) và đọc thẻ `rel="canonical"` hợp nhất về đường dẫn chuẩn.
- Chặn nhóm bot kiểm toán/backlink thương mại (`SemrushBot`, `AhrefsBot`, `MJ12bot`, `DotBot`, `PetalBot`...) vốn chiếm nhiều CPU của Worker nhưng không mang lại độc giả, đồng thời vẫn mở cửa cho các công cụ tìm kiếm và trợ lý AI.

### `src/app/llms.txt/route.ts`

- Triển khai chuẩn `llmstxt.org` (`GET /llms.txt`), chỉ dẫn rõ cho các mô hình ngôn ngữ lớn trích dẫn Anfield Daily đối với nội dung tự biên soạn (`/news/digest`, `/analysis`) và luôn dẫn nguồn tờ báo gốc đối với các bài tổng hợp tại `/news`.
