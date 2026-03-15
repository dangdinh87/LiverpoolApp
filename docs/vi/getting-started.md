# Hướng Dẫn Bắt Đầu

Trang fan Liverpool FC Việt Nam — Next.js 16 App Router + TypeScript + Supabase + Vercel.
Live: [www.liverpoolfcvn.blog](https://www.liverpoolfcvn.blog)

---

## Yêu Cầu Cài Đặt

| Yêu cầu | Phiên bản | Ghi chú |
|---|---|---|
| Node.js | 18.17+ | Khuyến nghị dùng bản LTS |
| npm | 9+ | Đi kèm với Node |
| Git | bất kỳ | — |
| Tài khoản Supabase | — | [supabase.com](https://supabase.com) — gói miễn phí dùng được |
| Football-Data.org key | — | [football-data.org](https://www.football-data.org) — đăng ký miễn phí |
| Groq API key | — | [console.groq.com](https://console.groq.com) — gói miễn phí dùng được |
| Tài khoản Cloudinary | — | [cloudinary.com](https://cloudinary.com) — gói miễn phí dùng được |

---

## Clone & Cài Đặt

```bash
git clone https://github.com/your-org/LiverpoolApp.git
cd LiverpoolApp
npm install
```

---

## Biến Môi Trường

Sao chép file mẫu và điền các giá trị:

```bash
cp .env.example .env.local
```

Chỉnh sửa `.env.local`:

| Biến | Bắt buộc | Lấy ở đâu |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Có | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Có | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Có | Supabase Dashboard → Settings → API → service_role |
| `FOOTBALL_DATA_ORG_KEY` | Có* | [football-data.org](https://www.football-data.org) — đăng ký miễn phí |
| `NEXT_PUBLIC_SITE_URL` | Có | `http://localhost:3000` khi dev, URL production khi deploy |
| `GROQ_API_KEY` | Có | [console.groq.com](https://console.groq.com) → API Keys |
| `CRON_SECRET` | Có | Chuỗi ngẫu nhiên bất kỳ (ví dụ: `openssl rand -hex 32`) |
| `CLOUDINARY_CLOUD_NAME` | Có | Cloudinary Dashboard → Settings |
| `CLOUDINARY_API_KEY` | Có | Cloudinary Dashboard → Settings → Access Keys |
| `CLOUDINARY_API_SECRET` | Có | Cloudinary Dashboard → Settings → Access Keys |

> *`FOOTBALL_DATA_ORG_KEY` không bắt buộc khi dev. Nếu không có, ứng dụng sẽ tự động dùng dữ liệu mock.

---

## Thiết Lập Database

Chạy tất cả các migration cho Supabase project của bạn. Có thể thực hiện qua Supabase CLI hoặc SQL editor.

### Phương án A — Supabase CLI (khuyến nghị)

```bash
# Cài Supabase CLI nếu chưa có
npm install -g supabase

# Liên kết với project (lấy project ref từ URL Supabase Dashboard)
supabase link --project-ref your-project-ref

# Push tất cả migration
supabase db push
```

### Phương án B — SQL Editor (thủ công)

Trong Supabase Dashboard → SQL Editor, chạy từng file migration theo thứ tự:

```
supabase/migrations/001_initial.sql          # profiles, favourite_players + RLS
supabase/migrations/002_articles.sql         # bảng articles (lưu trữ tin tức)
supabase/migrations/003_article_interactions.sql  # article_likes, article_comments
supabase/migrations/004_saved_articles.sql   # bookmarks của người dùng
supabase/migrations/005_gallery.sql          # metadata ảnh gallery
supabase/migrations/chat_schema.sql          # conversations, messages (AI chat)
```

### Thiết Lập OAuth (Supabase)

Để đăng nhập bằng Google/GitHub hoạt động ở local:

1. Supabase Dashboard → Authentication → Providers → bật Google và/hoặc GitHub
2. Thêm thông tin OAuth app từ Google Cloud Console / GitHub Developer Settings
3. Đặt redirect URL cho từng provider: `http://localhost:3000/auth/callback`

---

## Chạy Dev Server

```bash
npm run dev
# Mở tại http://localhost:3000
```

Ứng dụng tự phát hiện khi thiếu `FOOTBALL_DATA_ORG_KEY` và tự động dùng dữ liệu mock. Tất cả các trang vẫn hoạt động bình thường mà không cần key này.

---

## Tất Cả Lệnh

```bash
npm run dev          # Khởi động dev server (next dev --turbopack)
npm run build        # Build production (lỗi TS sẽ khiến build thất bại)
npm run lint         # ESLint
npm run test         # Vitest unit tests
npm run seed:gallery # Seed gallery với ảnh mẫu từ Cloudinary
```

---

## Cấu Trúc Dự Án (tóm gọn)

```
src/
├── app/                  # Next.js App Router — trang + API routes
│   ├── page.tsx          # Trang chủ (Hero + BentoGrid)
│   ├── layout.tsx        # Root layout (NavbarAuth, Footer, GlobalChat)
│   ├── api/              # API routes + cron endpoints
│   ├── auth/             # Đăng nhập, đăng ký, OAuth callback
│   ├── news/             # Bảng tin + đọc bài + digest
│   ├── squad/            # Lưới cầu thủ + lọc theo vị trí
│   ├── player/[id]/      # Trang chi tiết cầu thủ
│   ├── fixtures/         # Lịch thi đấu + chi tiết trận
│   ├── standings/        # Bảng xếp hạng Premier League
│   ├── stats/            # Bảng thống kê
│   ├── gallery/          # Gallery ảnh + lightbox
│   ├── history/          # Lịch sử CLB (JSON tĩnh)
│   ├── profile/          # Trang cá nhân (được bảo vệ)
│   └── chat/             # AI chat (BRO AI)
├── components/           # React components (phản chiếu cấu trúc app/)
│   └── ui/               # shadcn/ui primitives
├── lib/
│   ├── football/         # Lớp dữ liệu bóng đá (server-only, được cache)
│   ├── news/             # Pipeline tin tức (đồng bộ RSS, digest, dịch thuật)
│   ├── supabase.ts       # Supabase client cho trình duyệt
│   └── supabase-server.ts # Supabase client chỉ dùng phía server
├── data/                 # JSON tĩnh (trophies, history, legends, squad)
└── messages/             # Chuỗi i18n (en.json, vi.json)
```

---

## Các Quyết Định Kiến Trúc Quan Trọng

**Tách Supabase client** — `supabase.ts` (trình duyệt) so với `supabase-server.ts` (chỉ dùng phía server). Không bao giờ trộn lẫn hai cái. Xem [architecture.md](./architecture.md#supabase-client-split).

**Dữ liệu bóng đá theo provider pattern** — tất cả hàm liên quan đến bóng đá nằm trong `src/lib/football/`, được bọc bởi `React.cache()`, với cơ chế tự động fallback sang mock. Các trang luôn import từ `@/lib/football`, không bao giờ import trực tiếp từ các file provider.

**Navbar được tách đôi** — `NavbarAuth` (Server Component) lấy trạng thái auth và truyền xuống `NavbarClient` (Client Component) qua props. Không bao giờ import `supabase-server.ts` trong client component.

**i18n qua next-intl** — hai ngôn ngữ (`en`/`vi`), được phát hiện từ cookie `NEXT_LOCALE` hoặc header `Accept-Language`. Nội dung tĩnh có các file `.vi.json` tương ứng trong `src/data/`.

**Chỉ có dark mode** — hệ thống thiết kế dùng CSS custom properties định nghĩa trong `src/app/globals.css`. Không có light mode.

---

## Đọc Thêm

- [architecture.md](./architecture.md) — các lớp hệ thống, luồng dữ liệu, chiến lược caching
- [deployment.md](./deployment.md) — triển khai lên Vercel + DNS Hostinger + cron jobs
- `docs/code-standards.md` — quy ước đặt tên, component patterns
- `docs/news-feature.md` — đi sâu vào news pipeline
- `docs/design-guidelines.md` — UI tokens, hệ thống thiết kế Dark Stadium
