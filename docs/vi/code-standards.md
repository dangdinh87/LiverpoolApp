# Quy Chuẩn Mã Nguồn

Quy ước kỹ thuật và danh mục kiểm tra chất lượng cho **Anfield Daily** — Next.js 16.4 (App Router), React 19, TypeScript 5 (`strict`), Tailwind CSS v4 và Supabase.

---

## 1. Ranh Giới Server Component và Client Component

Mặc định viết **React Server Component**. Chỉ khai báo `"use client"` khi tệp thực sự cần React hooks, xử lý sự kiện tương tác hoặc truy cập API trình duyệt.

### Server Components

```tsx
// src/app/[locale]/squad/page.tsx
import { setRequestLocale } from "next-intl/server";
import { getSquad } from "@/lib/football";

export default async function SquadPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const players = await getSquad();
  return <SquadGrid players={players} />;
}
```

- Luôn `await params` (quy ước tham số bất đồng bộ của Next.js 16) và gọi `setRequestLocale(locale)` ở mọi trang/layout dưới `src/app/[locale]/` để hỗ trợ prerender tĩnh.
- Tự do sử dụng các module `server-only` (`@/lib/football`, `@/lib/supabase-server`, `@/lib/news/*`).
- Chỉ truyền dữ liệu tuần tự hóa gọn nhẹ xuống Client Component.

### Client Components & Quản Lý Namespace Đa Ngôn Ngữ

- Khai báo `"use client"` ở dòng đầu tiên.
- Khi thêm lời gọi `useTranslations("Namespace")` mới trong cây module phía client, phải khai báo namespace đó trong `CLIENT_MESSAGE_NAMESPACES` (`src/components/providers/client-messages.ts`). Bài kiểm thử `client-messages.test.ts` phân tích cú pháp AST toàn bộ cây import client và sẽ báo lỗi ngay nếu thiếu namespace.
- Giữ kích thước mỗi tệp gọn gàng (ưu tiên `< 400–500` dòng; tách nhỏ các khối lớn như `NavbarClient` + `NavbarMobileSheet` hoặc `CommentSection` + `CommentItem`).

---

## 2. Phân Tách Supabase Client & Đọc Biến Môi Trường

### Quy Tắc 3 Client

| Tệp | Phạm vi được phép | Ghi chú |
|---|---|---|
| `src/lib/supabase.ts` | `"use client"` components | Anon key phía trình duyệt |
| `src/lib/supabase-server.ts` | Server Components, Actions, Route Handlers | Có chốt chặn `import "server-only"` |
| `src/lib/news/supabase-service.ts` | Route cron & thao tác ghi đã xác thực trên server | Service role; bỏ qua RLS |

Mọi Supabase client **bắt buộc** truyền `global: { fetch: createSupabaseFetch() }` và `db: { retry: false }`.

### Truy Xuất Biến Môi Trường Tại Thời Điểm Thực Thi (`src/lib/env.ts`)

Trên Cloudflare Workers, biến môi trường được cấp theo từng request thay vì lúc nạp module. Luôn truy xuất qua `getEnv("KEY")` / `hasEnv("KEY")` bên trong hàm thay vì gán cố định `process.env.KEY` ở hằng số cấp module.

---

## 3. Hệ Thống Kiểu & Chuẩn Hóa Dữ Liệu

- Bật bắt buộc `strict: true` và `noImplicitAny: true`. **Không dùng `: any` hay `@ts-ignore`** trong `src/`.
- Mọi dữ liệu từ nhà cung cấp ngoài phải được ánh xạ về kiểu chuẩn trong `src/lib/types/football.ts`.
- Năm mùa giải hiện hành luôn lấy từ `getCurrentSeasonYear()` / `getCurrentSeasonLabel()` (`src/lib/football/current-season.ts`), tuyệt đối không gõ số năm cố định.
- Giao diện phụ thuộc thời gian thực phải dùng `useNowAfterMount()` (`src/hooks/use-now-after-mount.ts`) thay vì gọi `Date.now()` trực tiếp lúc render để tránh lệch hydration.

---

## 4. Quy Ước Đặt Tên

| Thành phần | Quy ước | Ví dụ |
|---|---|---|
| Tệp & thư mục | `kebab-case` | `match-score-header.tsx`, `fdo-client.ts` |
| React component | `PascalCase` | `MatchScoreHeader`, `BrandMark` |
| Hàm & custom hook | `camelCase` | `pickClientMessages()`, `useSpoilerFree()` |
| Hằng số | `UPPER_SNAKE_CASE` | `NEWS_OUTLET_COUNT`, `SUPABASE_FETCH_TIMEOUT_MS` |
| Bảng & cột CSDL | `snake_case` | `site_articles`, `match_predictions`, `digest_date` |

---

## 5. Bảo Mật API Route & Server Action

- **Xác thực cron:** Bọc các route định kỳ bằng `withCronAuth()` (`src/lib/cron.ts`), chỉ chấp nhận header `Authorization: Bearer <CRON_SECRET>` (không nhận khóa qua query string).
- **Giới hạn tần suất (Rate limit):** Dùng `checkRateLimit(getClientIP(req), ...)` (`src/lib/rate-limit.ts`), ưu tiên `cf-connecting-ip` → `x-real-ip` → hop cuối của `x-forwarded-for`, tự dọn bộ nhớ với trần `MAX_ENTRIES = 2000`.
- **Kiểm tra URL an toàn:** Kiểm tra URL bài báo qua `isKnownNewsSourceUrl()` trước khi tải nội dung từ server; ràng buộc đường dẫn ảnh đại diện đúng thư mục người dùng đang đăng nhập.
- **Ẩn chi tiết lỗi nội bộ:** Ghi log đầy đủ ở server (`console.error`), nhưng chỉ trả mã/thông báo tổng quát ở phản hồi `4xx`/`5xx` — không bao giờ trả trực tiếp `err.message` ra ngoài.

---

## 6. Quy Tắc Giao Diện & Chuyển Động

- **Token Tailwind CSS v4:** Sử dụng các lớp ngữ nghĩa Dark Stadium (`bg-stadium-bg`, `bg-stadium-surface`, `border-stadium-border`, `bg-lfc-red`, `text-lfc-red-text` / `text-brand`, `text-stadium-muted`) trong `src/app/globals.css`; không dùng `.module.css`.
- **Căn thẳng chữ số:** Gắn `tabular-nums` cho toàn bộ tỷ số, bảng xếp hạng, đồng hồ đếm ngược, thống kê và bảng điểm dự đoán.
- **Chuyển động mượt 60fps:** Chỉ tạo hiệu ứng trên `transform` và `opacity` (không dùng `transition-all` hay `transition-[width]`). Giữ thời lượng `140–200ms` cho nút bấm (`active:scale-[0.97]`) và `<= 260ms` cho hộp thoại/ngăn kéo.
- **Tôn trọng giảm chuyển động:** Tuân thủ `prefers-reduced-motion: reduce` qua `<MotionConfig reducedMotion="user">`, quy tắc CSS toàn cục và kiểm tra `matchMedia` trước khi cuộn trang.

---

## 7. Nhận Diện Thương Hiệu & Ngôn Ngữ

- Đọc kỹ [`docs/brand.md`](../brand.md) trước khi chỉnh sửa câu chữ giao diện hoặc prompt AI.
- Tên trang là **Anfield Daily** (`BRAND.name` từ `src/lib/brand.ts`). Không dùng huy hiệu CLB (`/assets/lfc/crest.webp`) làm biểu tượng trang, ảnh đại diện mặc định hay trang báo lỗi — dùng `<BrandMark />` cho nhận diện trang và `<TeamCrest />` cho dữ liệu đội bóng.
- Duy trì đồng bộ 100% khóa và tham số `{placeholder}` giữa `src/messages/en.json` và `src/messages/vi.json` (`messages-parity.test.ts`).

---

## 8. Danh Mục Kiểm Tra Trước Khi Commit

- [ ] `npx tsc --noEmit` đạt 0 lỗi
- [ ] `npm run lint` đạt 0 lỗi, 0 cảnh báo
- [ ] `npm test` vượt qua 100% (bao gồm `messages-parity.test.ts` và `client-messages.test.ts`)
- [ ] Vùng chạm tối thiểu `44×44px` trên di động, có viền `focus-visible`, đúng thẻ ngữ nghĩa (`<button>`, `<nav>`, `<main>`, duy nhất một `<h1>` mỗi trang)
- [ ] Liên kết mở tab mới có đủ `rel="noopener noreferrer"`
- [ ] Mọi tỷ số và kết quả trận đấu đều tương thích với chế độ ẩn tỷ số (`spoiler-hide` / `SpoilerControls`)
