# Hướng Dẫn Bắt Đầu

**Anfield Daily** — chuyên trang độc lập, không chính thức về tin tức, bản tin AI, phân tích sau trận và dữ liệu trận đấu Liverpool FC song ngữ (`en` / `vi`), xây dựng trên Next.js 16.4 (App Router), TypeScript, Tailwind CSS v4, Supabase và Cloudflare Workers.
Trang thực tế: [anfielddaily.com](https://anfielddaily.com)

---

## Yêu Cầu Hệ Thống

| Thành phần | Phiên bản | Ghi chú |
|---|---|---|
| Node.js | 20+ | Khuyến nghị Node 22 hoặc 24 LTS |
| npm | 10+ | Đi kèm Node.js |
| Git | Bất kỳ | — |
| Dự án Supabase | — | [supabase.com](https://supabase.com) — PostgreSQL, Auth & Storage |
| Football-Data.org key | — | [football-data.org](https://www.football-data.org) — gói miễn phí (10 req/phút) |
| VietAPI key | — | [vietapi.tech](https://vietapi.tech) — LLM tương thích OpenAI cho bản tin ngày, dịch bài và phân tích sau trận |
| Tài khoản Cloudinary | Tùy chọn | [cloudinary.com](https://cloudinary.com) — dùng cho thư viện ảnh `/gallery` |
| YouTube Data API v3 key | Tùy chọn | Google Cloud Console — bật dải video chính thức của CLB (`lfctv`) trên `/news` |

---

## Sao Chép Mã Nguồn & Cài Đặt

```bash
git clone https://github.com/dangdinh87/LiverpoolApp.git
cd LiverpoolApp
npm install
```

---

## Biến Môi Trường

Sao chép `.env.example` sang `.env.local` và điền thông tin:

```bash
cp .env.example .env.local
```

| Biến | Bắt buộc | Nguồn lấy |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Có | Supabase Dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Có | Supabase Dashboard → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Có | Supabase Dashboard → Project Settings → API (`service_role`, chỉ dùng phía server) |
| `FOOTBALL_DATA_ORG_KEY` | Có* | [football-data.org/client/register](https://www.football-data.org/client/register) |
| `NEXT_PUBLIC_SITE_URL` | Có | `http://localhost:3000` khi chạy local, `https://anfielddaily.com` trên môi trường thật |
| `VIETAPI_KEY` | Có | [vietapi.tech](https://vietapi.tech) — tạo bản tin ngày, dịch bài báo và viết bài phân tích |
| `CRON_SECRET` | Có | Chuỗi ngẫu nhiên bảo vệ các API định kỳ (ví dụ: `openssl rand -hex 32`) |
| `YOUTUBE_API_KEY` | Tùy chọn | Google Cloud Console → YouTube Data API v3 (tự động bỏ qua nếu để trống) |
| `CLOUDINARY_CLOUD_NAME` | Tùy chọn | Cloudinary Dashboard → Settings |
| `CLOUDINARY_API_KEY` | Tùy chọn | Cloudinary Dashboard → Settings → Access Keys |
| `CLOUDINARY_API_SECRET` | Tùy chọn | Cloudinary Dashboard → Settings → Access Keys |
| `NEXT_PUBLIC_ADSENSE_CLIENT_ID` | Tùy chọn | Mã nhà xuất bản Google AdSense (để trống nếu tắt quảng cáo) |
| `NEXT_PUBLIC_CF_ANALYTICS_TOKEN` | Tùy chọn | Token Cloudflare Web Analytics |

> *Nếu chưa đặt `FOOTBALL_DATA_ORG_KEY`, tầng dữ liệu bóng đá sẽ ghi cảnh báo và trả về mảng rỗng/`null` để giao diện hiển thị trạng thái rỗng gọn gàng (hệ thống không dùng mock data).

---

## Khởi Tạo Cơ Sở Dữ Liệu

Chạy toàn bộ các tệp trong `supabase/migrations/` trên dự án Supabase bằng CLI hoặc SQL Editor.

### Cách A — Supabase CLI (khuyến nghị)

```bash
npx supabase link --project-ref your-project-ref
npx supabase db push
```

### Cách B — SQL Editor (chạy lần lượt theo thứ tự)

```text
supabase/migrations/001_initial.sql                             # profiles, favourite_players + RLS
supabase/migrations/002_articles.sql                            # articles, sync_logs
supabase/migrations/003_article_interactions.sql                # article_likes, article_comments
supabase/migrations/004_saved_articles.sql                      # saved_articles (bài đã lưu)
supabase/migrations/005_gallery.sql                             # gallery & site settings
supabase/migrations/006_news_digests_seo_article.sql            # news_digests + bài SEO đi kèm
supabase/migrations/007_news_tables_rls_and_comment_privacy.sql # RLS & ẩn email trong bình luận
supabase/migrations/008_repair_articles_null_flags.sql          # chuẩn hóa cờ is_active / read_count
supabase/migrations/009_site_articles.sql                       # site_articles (/analysis)
supabase/migrations/010_rls_repair_and_function_hardening.sql   # siết RLS & search_path cho SQL functions
supabase/migrations/011_rls_initplan_and_fk_indexes.sql         # tối ưu RLS initplan & chỉ mục khóa ngoại
supabase/migrations/012_fan_predictions_and_ratings.sql         # match_predictions, player_ratings
```

### Cấu Hình Đăng Nhập OAuth (Supabase)

Để đăng nhập Google hoặc GitHub hoạt động tại máy cá nhân:

1. Mở Supabase Dashboard → Authentication → Providers, bật Google và/hoặc GitHub.
2. Điền Client ID và Client Secret từ Google Cloud Console / GitHub Developer Settings.
3. Thêm `http://localhost:3000/auth/callback` vào Authentication → URL Configuration → Redirect URLs.

---

## Chạy Môi Trường Phát Triển

```bash
npm run dev
```

- Giao diện tiếng Anh (mặc định): `http://localhost:3000`
- Giao diện tiếng Việt: `http://localhost:3000/vi`

---

## Danh Sách Lệnh

```bash
npm run dev          # Chạy dev server Next.js 16 (Turbopack)
npm run build        # Build bản production
npm run start        # Chạy server production tại local
npm run lint         # Kiểm tra ESLint 9
npm test             # Chạy bộ kiểm thử đơn vị Vitest
npm run test:e2e     # Chạy kiểm thử E2E Playwright (desktop + mobile)
npm run test:e2e:ui  # Mở giao diện trực quan Playwright
npm run seed:gallery # Khởi tạo dữ liệu mẫu cho thư viện ảnh Cloudinary
npm run cf:build     # Đóng gói OpenNext cho Cloudflare Workers
npm run cf:preview   # Chạy thử Worker tại local bằng Wrangler
npm run cf:deploy    # Triển khai Worker lên Cloudflare
```

---

## Cấu Trúc Thư Mục Rút Gọn

```text
src/
├── app/
│   ├── [locale]/          # Toàn bộ trang giao diện (/, /vi, /news, /analysis, /fixtures, /standings, /predictions, /squad, /player/[id], /stats, /season, /history, /gallery, /profile, /auth, /about, /legal)
│   ├── actions/           # Server Actions (auth, profile, phân trang tin tức, dự đoán & chấm điểm)
│   ├── api/               # Route Handlers (đồng bộ tin, bản tin AI, dọn dẹp, dịch bài, bình luận, lượt thích, bài phân tích, lịch .ics, gallery, live-fixture, streak)
│   ├── auth/callback/     # Xử lý OAuth callback của Supabase
│   ├── llms.txt/          # Tài liệu hướng dẫn nguồn trích dẫn cho mô hình AI
│   ├── robots.txt/        # Quy tắc thu thập dữ liệu động
│   └── sitemap.xml/       # Sơ đồ trang XML song ngữ kèm hreflang
├── components/            # Giao diện theo tính năng + shadcn/ui + bộ lọc pickClientMessages
├── data/                  # Dữ liệu JSON tĩnh kèm bản .vi.json
├── hooks/                 # Ẩn tỷ số, đồng hồ an toàn hydration, múi giờ người đọc, yêu thích
├── i18n/                  # Cấu hình định tuyến, điều hướng và request của next-intl
├── lib/                   # Nghiệp vụ (brand, football, news, site-articles, fan-predictions, calendar, ai, seo, supabase)
├── messages/              # Từ điển giao diện en.json & vi.json (1.156 khóa đồng bộ 100%)
├── stores/                # Zustand stores (auth, toast)
└── proxy.ts               # Proxy cấp request của Next.js 16 (định tuyến ngôn ngữ, chặn bot quét CMS, bảo vệ /profile)
```

---

## Các Nguyên Tắc Kiến Trúc Cốt Lõi

- **Nguồn chuẩn thương hiệu** — `src/lib/brand.ts` và [`docs/brand.md`](../brand.md) quy định tên **Anfield Daily**, biểu trưng vòng tròn giữa sân (`BrandMark`), hệ chữ và giọng văn báo chí. Tuyệt đối không dùng huy hiệu CLB làm logo của trang.
- **Phân tách 3 lớp Supabase client** — `src/lib/supabase.ts` (trình duyệt), `src/lib/supabase-server.ts` (`server-only`) và `src/lib/news/supabase-service.ts` (service role). Mọi client đều gắn `createSupabaseFetch()` (timeout 3 giây + cơ chế ngắt mạch 30 giây) và `db: { retry: false }`.
- **Truy vấn bóng đá tập trung phía server** — các trang chỉ import từ `@/lib/football`, nơi mọi hàm đều có `import "server-only"` và `React.cache()`.
- **Định tuyến song ngữ & tinh gọn RSC payload** — tiếng Anh ở `/` và tiếng Việt ở `/vi` qua `src/i18n/routing.ts`; `<NextIntlClientProvider>` chỉ nhận các namespace thực sự dùng ở client thông qua `pickClientMessages()`.

---

## Tài Liệu Liên Quan

- [Kiến Trúc Hệ Thống](./architecture.md) — các tầng dữ liệu, Cloudflare Workers, bộ nhớ đệm và cơ chế chịu lỗi
- [Quy Chuẩn Mã Nguồn](./code-standards.md) — tổ chức component, TypeScript, chuyển động và khả năng tiếp cận
- [Hệ Thống Thiết Kế](./design-system.md) — bảng màu Dark Stadium, 4 phông chữ và `shadcn/ui`
- [Hệ Thống Tin Tức & AI](./news-system.md) — 13 đầu báo Anh, bóc tách toàn văn, bản tin AI, dịch bài và `/analysis`
- [Triển Khai](./deployment.md) — Cloudflare Workers (`@opennextjs/cloudflare`), R2/D1/DO và GitHub Actions
