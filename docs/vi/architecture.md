# Kiến Trúc Hệ Thống

LiverpoolApp là một ứng dụng Next.js 16 App Router với chiến lược server-first data fetching, football data provider dạng pluggable, pipeline tin tức đa nguồn, Supabase cho auth/storage, và các tính năng AI được cung cấp bởi Groq.

---

## Tổng Quan Hệ Thống

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│  React 19 client components — Zustand, TanStack Query       │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP / RSC streaming
┌───────────────────────▼─────────────────────────────────────┐
│                    Vercel Edge / Node.js                     │
│  Next.js 16 App Router                                       │
│  ├── Server Components (lấy dữ liệu + render)               │
│  ├── API Routes (REST endpoints + cron handlers)             │
│  └── Middleware (làm mới session + bảo vệ route)            │
└──────┬────────────────┬───────────────┬─────────────────────┘
       │                │               │
┌──────▼──────┐  ┌──────▼──────┐  ┌────▼───────────────┐
│  Supabase   │  │  Football   │  │  External APIs      │
│  PostgreSQL │  │  Data.org   │  │  Groq LLM           │
│  Auth       │  │  ESPN (free)│  │  Cloudinary         │
│  Storage    │  │  Mock (dev) │  │  17+ RSS feeds      │
└─────────────┘  └─────────────┘  └────────────────────┘
```

---

## Các Lớp Cốt Lõi

### Lớp 1: Nguồn Dữ Liệu

| Nguồn | Mục đích | Key | Giới hạn tốc độ |
|---|---|---|---|
| Football-Data.org | Đội hình, lịch thi đấu, bảng xếp hạng (PL + UCL) | `FOOTBALL_DATA_ORG_KEY` | 10 req/min (miễn phí) |
| ESPN (không cần key) | Lịch cup (FA Cup, EFL Cup), sự kiện trận đấu | — | Không giới hạn |
| Mock provider | Fallback khi dev không có API key | — | Không áp dụng |
| Supabase PostgreSQL | Auth, dữ liệu người dùng, bài viết, gallery, lịch sử chat | — | Theo gói |
| 17+ RSS feeds | Bài báo tin tức (nguồn EN + VI) | — | Không giới hạn |
| Groq API | AI chat, dịch bài viết, daily digest | `GROQ_API_KEY` | Theo gói |
| Cloudinary | Lưu trữ + biến đổi ảnh gallery | `CLOUDINARY_*` | Theo gói |

### Lớp 2: Server Components

Tất cả các trang nặng về dữ liệu đều là Server Component. Chúng lấy dữ liệu phía server, sau đó truyền xuống Client Component dưới dạng props để xử lý tương tác. Không có client-side data fetching khi tải trang lần đầu.

```typescript
// Pattern: server page fetches → truyền xuống client component
// src/app/squad/page.tsx
export default async function SquadPage() {
  const squad = await getSquad(); // server-only, React.cache()
  return <SquadGrid players={squad} />;  // client component để lọc
}
```

### Lớp 3: Client Components

Chỉ dùng khi cần tương tác: lọc dữ liệu, nhập form, cập nhật real-time, animation, browser API. Luôn được đánh dấu `'use client'`.

---

## Tách Supabase Client (CỰC KỲ QUAN TRỌNG)

Hai client riêng biệt — **không bao giờ import server client vào client component** (build sẽ thất bại).

| File | Dùng trong | Tạo bằng | Có thể truy cập |
|---|---|---|---|
| `src/lib/supabase.ts` | Client components, trình duyệt | `createClient()` | Anon key (RLS áp dụng) |
| `src/lib/supabase-server.ts` | Server components, API routes | `createServerSupabaseClient()` | Anon key + session cookies |
| `src/lib/news/supabase-service.ts` | API routes (chỉ thao tác admin) | `getServiceClient()` | Service role (bỏ qua RLS) |

```typescript
// Client component — Đúng
import { createClient } from '@/lib/supabase';

// Server component / API route — Đúng
import { createServerSupabaseClient } from '@/lib/supabase-server';

// SAI: import server client vào client component
// 'use client'
// import { createServerSupabaseClient } from '@/lib/supabase-server'; // BUILD FAILURE
```

---

## Lớp Dữ Liệu Bóng Đá

**Vị trí:** `src/lib/football/`

Tất cả hàm đều là server-only và được bọc bởi `React.cache()`. Các trang luôn import từ barrel `@/lib/football`, không bao giờ import trực tiếp từ file provider.

### Provider Interface

```typescript
// src/lib/football/provider.ts
interface FootballDataProvider {
  getSquad(): Promise<Player[]>;
  getFixtures(): Promise<Fixture[]>;
  getStandings(): Promise<Standing[]>;
  getTopScorers(): Promise<TopScorer[]>;
  getTopAssists(): Promise<TopScorer[]>;
  getPlayerStats(playerId: number): Promise<PlayerStats | null>;
  getCoach(): Promise<Coach | null>;
  // ... thêm các method khác
}
```

### Lựa Chọn Provider

```
FOOTBALL_DATA_ORG_KEY đã được đặt?
  ├── CÓ → FDO (Football-Data.org) provider
  └── KHÔNG → Mock provider (dữ liệu tĩnh, không gọi API)
```

```typescript
// src/lib/football/index.ts — barrel + bọc React.cache
export const getSquad    = cache(() => provider.getSquad());
export const getFixtures = cache(() => provider.getFixtures());
export const getStandings = cache(() => provider.getStandings());
```

### Ghi Chú FDO Provider

- Team ID: 64 (Liverpool FC), League: 39 (Premier League)
- Gói miễn phí: 10 req/min — rate limiting được xử lý bởi provider
- Lịch cup (FA Cup, EFL Cup) lấy từ ESPN (miễn phí, không cần key)
- Mock fallback trả về dữ liệu tĩnh thực tế cho tất cả các method

---

## News Pipeline

**Vị trí:** `src/lib/news/`

```
Vercel Cron (6AM UTC)
  ↓
/api/news/sync
  ↓
syncPipeline()
  ├── Lấy 17+ RSS feeds song song
  ├── Dedup (URL hash + Jaccard title similarity)
  ├── Chấm điểm độ liên quan (LFC keywords có trọng số)
  ├── Phân loại (chuyển nhượng, trận đấu, chấn thương, v.v.)
  ├── Làm giàu nội dung (OG metadata)
  └── Upsert vào bảng articles trong Supabase
```

**Nguồn:**

| Ngôn ngữ | Nguồn |
|---|---|
| EN | LFC Official, BBC Sport, The Guardian, Liverpool Echo, Anfield Watch, Empire of the Kop, Sky Sports, GOAL |
| VI | VnExpress, Tuổi Trẻ, Thanh Niên, Dân Trí, ZNews, VietNamNet, Bóng Đá, 24h, Bóng Đá+, Webthethao |

**Mã hóa URL bài viết:** Slug dễ đọc tại `/news/{source}/{path}` (ví dụ: `/news/bbc/sport/football/...`). Logic encode/decode trong `src/lib/news-config.ts`.

**AI Daily Digest:** Cron lúc nửa đêm UTC gọi Groq (`llama-3.3-70b-versatile`), tóm tắt 15 bài viết hàng đầu trong 24h qua thành các mục bằng tiếng Việt. Lưu trong bảng `news_digests`. Idempotent — bỏ qua nếu digest cho ngày hôm nay đã tồn tại.

**Dịch thuật:** Theo yêu cầu qua `/api/news/translate`. Groq dịch nội dung bài viết, kết quả được cache vào cột `content_en` / `content_vi`.

---

## Luồng Auth

Supabase Auth với email/password + OAuth (Google, GitHub).

```
Người dùng truy cập /profile (được bảo vệ)
  ↓
middleware.ts
  ├── refreshSession() — làm mới Supabase session từ cookies
  ├── Không có session? → redirect đến /auth/login?redirect=/profile
  └── Session hợp lệ → tiếp tục
         ↓
       Trang /profile (server component)
         ├── createServerSupabaseClient().auth.getUser()
         └── render với dữ liệu người dùng
```

**OAuth callback:** `/auth/callback/route.ts` — đổi code lấy session, đặt cookie, redirect về đích ban đầu.

**Middleware** (`src/middleware.ts`) chạy trên mỗi request:
1. Làm mới Supabase session (cập nhật cookies)
2. Chặn truy cập chưa xác thực vào `/profile`
3. Redirect trở lại sau khi đăng nhập

---

## Navbar Pattern

Navbar cần cả trạng thái auth phía server (để hiển thị avatar người dùng) lẫn tương tác phía client (menu mobile, chuyển đổi theme). Giải quyết bằng cách tách thành hai component:

```
Root layout
  └── <NavbarAuth />         ← Server component
        ├── getUser()        ← Supabase server client
        ├── getProfile()     ← DB query
        └── <NavbarClient    ← Client component
              user={user}
              profile={profile}
            />
              ├── useState (menu mobile)
              ├── useTheme (chuyển đổi dark/light)
              └── render nav links + avatar người dùng
```

**Quy tắc:** Layout luôn dùng `<NavbarAuth />`. Không bao giờ dùng legacy `<Navbar />`.

---

## Chiến Lược Caching

### React.cache() — Dedup Cấp Request

Tất cả hàm dữ liệu bóng đá đều được bọc:

```typescript
export const getSquad = cache(() => provider.getSquad());
```

Nhiều component cùng gọi `getSquad()` trong một server request sẽ dùng chung một kết quả — không gọi API trùng lặp.

### ISR — Revalidation Cấp Route

```typescript
// Trang chủ — nội dung mới mỗi 30 phút
export const revalidate = 1800;

// Bảng xếp hạng — cập nhật mỗi 6 tiếng
export const revalidate = 21600;

// Lịch sử — hoàn toàn tĩnh, không bao giờ revalidate
export const revalidate = false;

// Bài báo tin tức — revalidate theo yêu cầu (sau cron sync)
export const revalidate = 3600;
```

### Supabase Là Cache

Bảng articles đóng vai trò là persistent cache cho nội dung RSS. Cron sync làm mới nó hàng ngày. Các trang query Supabase (nhanh) thay vì gọi RSS feeds trực tiếp trên mỗi request.

### Browser Storage

- Lịch sử đọc — `localStorage` (an toàn phía client, `src/lib/news/read-history.ts`)
- Ẩn digest card — `localStorage`
- Like/lưu bài viết — optimistic UI được backup bởi Supabase

---

## Quản Lý State

| Lớp | Công cụ | Dùng cho |
|---|---|---|
| Server | React.cache() | Dedup dữ liệu bóng đá theo request |
| Server | ISR revalidate | Thời gian sống của cache cấp trang |
| Client (global) | Zustand | Trạng thái auth, tùy chọn người dùng, điều hướng |
| Client (server state) | TanStack Query | Lấy dữ liệu trong client components |
| Client (local) | useState | Trạng thái UI (bộ lọc, modal, nhập form) |
| Browser | localStorage | Lịch sử đọc, các phần tử UI đã ẩn |

### Zustand Stores

```
src/stores/
├── auth-store.ts        # Phiên đăng nhập Supabase
├── user-store.ts        # Tùy chọn ngôn ngữ, cài đặt hiển thị
└── navigation-store.ts  # Trạng thái menu mobile
```

---

## Xử Lý Lỗi

### Dữ Liệu Bóng Đá

Tất cả các method của provider trả về mảng rỗng / null khi thất bại thay vì throw. Các trang hiển thị trạng thái rỗng một cách linh hoạt.

```typescript
// Provider bắt tất cả lỗi, trả về fallback
async getSquad(): Promise<Player[]> {
  try {
    const data = await fetchFromApi(...);
    return mapToCanonical(data);
  } catch {
    return []; // Không bao giờ throw ra trang
  }
}
```

### News Pipeline

Xử lý lỗi năm cấp:

1. Try/catch + timeout cấp adapter cho từng feed
2. `Promise.allSettled()` — một feed thất bại không hủy toàn bộ sync
3. Enrichment bị bỏ qua khi thất bại (OG fetch timeout)
4. Chuỗi fallback khi scrape bài viết: Readability → Cheerio → chỉ OG meta
5. `<ErrorBoundary>` cấp trang + fallback skeleton `loading.tsx`

### API Routes

Tất cả API routes xác thực `CRON_SECRET` cho cron endpoints:

```typescript
const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  ?? new URL(req.url).searchParams.get('key');
if (secret !== process.env.CRON_SECRET) {
  return new Response('Unauthorized', { status: 401 });
}
```

---

## i18n

**Framework:** next-intl

**Ngôn ngữ:** `en` (mặc định), `vi` (tiếng Việt)

**Thứ tự phát hiện:** Cookie `NEXT_LOCALE` → header `Accept-Language`

```
src/messages/en.json    # Chuỗi UI tiếng Anh
src/messages/vi.json    # Chuỗi UI tiếng Việt

src/data/*.vi.json      # Phiên bản tiếng Việt của nội dung tĩnh
                        # (trophies, history, legends, club-info, player-bios)
```

**Cách dùng:**
```typescript
// Server component
const t = await getTranslations('News.digest');

// Client component
const t = useTranslations('News.categories');
```

---

## Hạ Tầng SEO

**Vị trí:** `src/lib/seo.ts`, `src/components/seo/json-ld.tsx`

Các tiện ích chính:
- `makePageMeta(title, desc, options)` — tạo đối tượng `Metadata` đầy đủ của Next.js với OG + Twitter cards
- `getCanonical(path)` — xây dựng canonical URL từ `NEXT_PUBLIC_SITE_URL`
- `getHreflangAlternates(path)` — thẻ hreflang i18n (cùng URL, ngôn ngữ dựa trên cookie)
- JSON-LD builders: `buildBreadcrumbJsonLd`, `buildNewsArticleJsonLd`, `buildSportsEventJsonLd`, `buildPersonJsonLd`

Các route động (`robots.txt`, `sitemap.xml`) là route handlers của Next.js tại `src/app/robots.txt/route.ts` và `src/app/sitemap.xml/route.ts`.

---

## Schema Database

| Bảng | Mục đích | Cột chính |
|---|---|---|
| `profiles` | Tên hiển thị, avatar của người dùng | `id` (FK auth.users), `display_name`, `avatar_url` |
| `favourite_players` | Quan hệ người dùng → cầu thủ yêu thích | `user_id`, `player_id` (API int) |
| `articles` | Cache bài báo tin tức | `url`, `title`, `source`, `content_en`, `content_vi`, `relevance_score` |
| `article_likes` | Lượt thích bài viết theo người dùng | `article_id`, `user_id` |
| `article_comments` | Bình luận bài viết | `article_id`, `user_id`, `content` |
| `saved_articles` | Bookmark của người dùng | `article_id`, `user_id` |
| `gallery_images` | Metadata gallery | `cloudinary_id`, `title`, `category` |
| `conversations` | Phiên AI chat | `user_id`, `title` |
| `messages` | Tin nhắn AI chat | `conversation_id`, `role`, `content` |
| `news_digests` | Tóm tắt AI hàng ngày | `digest_date` (PK), `summary`, `sections` (JSONB) |

Tất cả bảng người dùng đều có Row Level Security (RLS) — người dùng chỉ có thể đọc/ghi hàng của chính mình.

---

## Hệ Thống Thiết Kế — Dark Stadium

Tất cả token được định nghĩa trong `src/app/globals.css` dưới dạng biến CSS `@theme inline`:

| Token | Giá trị | Dùng cho |
|---|---|---|
| `stadium-bg` | `#0D0D0D` | Nền trang |
| `stadium-surface` | `#1A1A1A` | Card, panel |
| `stadium-surface2` | `#252525` | Bề mặt nâng cao |
| `lfc-red` | `#C8102E` | Hành động chính, accent |
| `lfc-gold` | `#F6EB61` | Accent phụ, cúp |
| `stadium-muted` | `#A0A0A0` | Văn bản phụ |
| `stadium-border` | `#2A2A2A` | Viền, đường phân cách |

**Fonts:**
- `font-bebas` (League Gothic) — tiêu đề, thống kê, hero text
- `font-inter` (Inter) — nội dung, UI, form
- `font-barlow` (Barlow Condensed) — nhãn, tiêu đề phụ

Chỉ dark mode. `enableSystem: false`, `defaultTheme: "dark"`.

**Components:** shadcn/ui với style `new-york`, màu base `neutral`. Luôn kiểm tra registry trước khi tự viết component. Cài đặt: `npx shadcn@latest add <name>`.
