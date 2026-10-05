# Audit & Fix — LiverpoolApp

**Ngày:** 2026-09-10 · **Branch:** `codex/vi-first-news-relevance`
**Yêu cầu:** code lâu chưa update → fix mạnh, cải thiện, e2e mạnh, nhiều tính năng chạy không tốt, chat hỏng, update mùa giải mới.

---

## 1. Kết quả tổng quan

| Hạng mục | Trước | Sau |
|---|---|---|
| Production build | ❌ **Fail** (SWC thiếu → sau đó `/sitemap.xml` timeout) | ✅ Pass |
| Static generation | 91s rồi fail | **~1s** |
| Trang chủ (TTFB, DB chết) | **90.6s** | **8.1s** lần đầu → **0.03s** sau |
| Unit test | 71 pass | **87 pass** (+16) |
| E2E test | **Không có** | **86 pass** (desktop + mobile) |
| Lint | 8.052 vấn đề (233 error) | **55** (23 error) |
| AI chat | ❌ Chết hoàn toàn | ✅ Hoạt động (VietAPI) |
| Hydration error #418 | Lỗi liên tục | ✅ Hết |
| Mùa giải hiển thị | 2025/26 (cứng) | **2026/27** (tự suy ra) |

---

## 2. Lỗi thật đã tìm & sửa

### P0 — Build production hỏng hoàn toàn
1. **`@next/swc-darwin-arm64` mất trên đĩa** dù lockfile khai báo có (lỗi optional-dep của npm). Build không chạy được. → cài lại.
2. **`/sitemap.xml` prerender lúc build** → gọi Supabase + football API; DB chết ⇒ treo >60s ⇒ **fail cả build**.
   → `export const dynamic = "force-dynamic"` ([sitemap.xml/route.ts](src/app/sitemap.xml/route.ts)). Build không còn phụ thuộc dịch vụ ngoài.

### P0 — Supabase chết làm treo toàn site
- **Không client Supabase nào có timeout.** DB paused ⇒ mỗi query treo tới ~90s (Cloudflare 522).
- Riêng [gallery/queries.ts](src/lib/gallery/queries.ts) tự tạo client thứ 4 không timeout → **treo trang chủ 90s**.
- → Thêm [supabase-fetch-with-timeout.ts](src/lib/supabase-fetch-with-timeout.ts): timeout 8s + **circuit breaker 30s**, áp cho cả 4 nơi tạo client.
- Kết quả: 90.6s → 8.1s → **0.03s**. Build static: 91s → ~1s.

### P0 — AI chat chết (2 nguyên nhân độc lập)
1. **Auth phụ thuộc Supabase** → `getUser()` fail → 401 "Unauthorized" → UI báo "Please log in", dù người dùng không hề đăng xuất.
   → Phân biệt hạ tầng chết (**503** `auth_backend_unavailable`) với chưa đăng nhập (401).
2. **4/6 model Groq đã bị khai tử** — gồm cả model mặc định `qwen/qwen3-32b`, intent classifier, và **toàn bộ chuỗi translation**. Chat/dịch/digest hỏng kể cả khi DB sống.
   → **Chuyển sang VietAPI** (giống cv-app), mặc định `deepseek-v4-flash`.

### P1 — Hydration mismatch (React #418) trên mọi trang
Nguyên nhân: đọc đồng hồ **trong lúc render**; server render một giá trị, client hydrate ra giá trị khác.
- [next-match-widget.tsx](src/components/home/next-match-widget.tsx) — `useState(() => calcTimeLeft())` đếm **từng giây** ⇒ gần như luôn lệch.
- [match-card.tsx](src/components/fixtures/match-card.tsx) — countdown text tính khi render.
- [navbar-client.tsx](src/components/layout/navbar-client.tsx) — badge "sắp đá" tính bằng `Date.now()` khi render (nằm ở layout ⇒ ảnh hưởng **mọi trang**).
- [fixture-timeline.tsx](src/components/fixtures/fixture-timeline.tsx) — lọc "kết quả gần đây" theo `Date.now()`.
- `chatKey` seed bằng `Date.now()` dùng làm React `key` ⇒ remount ngầm.
→ Tách hook dùng chung [use-now-after-mount.ts](src/hooks/use-now-after-mount.ts): trả `null` cho tới khi mount, nên server và client luôn khớp.

### P1 — Tràn ngang trên mobile (UI thật)
`/stats` tràn **25px** ở màn 412px, **chỉ locale EN** (VI vừa khít nên bị bỏ sót).
Hero là `flex justify-between`, season selector `shrink-0`, tiêu đề không `min-w-0` ⇒ đẩy rộng cả layout viewport (437px).
→ Xếp dọc ở mobile, ngang từ `sm` ([stats/page.tsx](src/app/stats/page.tsx)); selector thêm `max-w-full overflow-x-auto`.

### P2 — Lint ngập rác
ESLint quét cả `.vercel/output/**` (bundle minified) ⇒ 8.052 vấn đề che hết lỗi thật.
→ Thêm ignore build output ([eslint.config.mjs](eslint.config.mjs)): **8.052 → 55**.

### P2 — Code chết
Xoá 4 store thừa từ dự án Pomodoro khác: `timer-store`, `task-store`, `user-store`, `navigation-store` (0 nơi dùng, ~600 dòng).

---

## 3. Mùa giải mới 2026/27

FDO xác nhận mùa hiện tại: **2026-08-21 → 2027-05-30, matchday 4**. App đang cứng ở `2025`.

- Tạo [current-season.ts](src/lib/football/current-season.ts) — **một nguồn sự thật duy nhất**, suy ra từ ngày (tháng ≥ 8 → năm đó). Tự sang mùa mỗi tháng 8, không cần sửa tay hằng năm.
- Thay toàn bộ: 4 chỗ `season: 2025` trong data layer, 2 bản sao `CURRENT_SEASON = 2025` (stats page + season selector), `AVAILABLE_SEASONS` thiếu 2026, H2H cứng `2024` → dùng `season - 1`.
- i18n: 28 chuỗi "2025/26" (EN+VI) → placeholder `{season}` + truyền nhãn động.
- Kiểm chứng render: `/`, `/squad`, `/standings`, `/fixtures` đều ra **2026/27**; picker hiện 2026/27 · 2025/26 · 2024/25.

---

## 4. E2E — bộ test mới

Playwright, chạy trên **production build**, 2 profile (desktop + Pixel 7), **86 test pass**.

| File | Phủ |
|---|---|
| `routes-smoke.spec.ts` | 16 route: status, nội dung thật, không lỗi console/exception |
| `features.spec.ts` | Lọc đội hình, mở trang cầu thủ, BXH, lịch, tin, stats + **giả lập DB chết** |
| `navigation.spec.ts` | Điều hướng navbar, 404 |
| `i18n.spec.ts` | EN/VI qua cookie `NEXT_LOCALE` |
| `accessibility-and-layout.spec.ts` | Tràn ngang mọi route, h1/title |

`page-diagnostics.ts` biến **lỗi console / exception / request fail / 5xx thành test fail** — đây chính là thứ bắt được hydration #418 và lỗi tràn ngang mà mắt thường bỏ qua.

---

## 5. Dependency

Chỉ minor/patch (đúng phạm vi đã chốt): Next **16.1.6 → 16.3.4**, Supabase JS 2.98 → 2.116, 10 gói Radix, TanStack Query, next-intl, date-fns, cloudinary, hls.js, zod, các `@types`, eslint.
Thêm mới: `@playwright/test`, `@ai-sdk/openai-compatible@^2.0.74` (bản 3.x không tương thích `ai@6`).
**Cố ý bỏ qua** (major, cần migrate riêng): `ai` v7, `framer-motion` 13, `lucide-react` 1.x, `@assistant-ui/*`, `@vitejs/plugin-react` 6.1.1 (kéo theo Babel 8 RC).

---

## 6. Việc còn lại / cần bạn quyết

1. **Supabase vẫn đang paused** — bạn cần vào dashboard resume. Mọi thứ phụ thuộc DB (đăng nhập, chat, tin tức, gallery, profile) chỉ chạy thật sau đó. Code hiện đã chịu được DB chết mà không treo.
2. **`VIETAPI_KEY` đang mượn key của cv-app** (`.env`). Cân nhắc tách key riêng cho app này.
3. **`GROQ_API_KEY` vẫn cần giữ** — chỉ dùng cho web search (`groq/compound-mini`), VietAPI không có tool search tương đương. Không có key thì chat vẫn trả lời, chỉ mất kết quả realtime.
4. **23 lint error còn lại** đều là nợ cũ trong `src/` (`any`, `setState` trong effect). Chưa đụng vì rủi ro regression — cần một phiên riêng.
5. **40 lỗ hổng npm audit** (1 critical, 20 high) — phần lớn nằm trong dependency tầng sâu, `npm audit fix --force` sẽ kéo major. Nên xử lý riêng.
6. **3 key i18n chết** (`Squad.glossary.description`, `Stats.overview.allComps`, `Stats.competitions.subtitle`, `PlayerDetail.sections.seasonStats`) — không nơi nào dùng, có thể xoá.
7. `npm update --save` **crash** vì xung đột peer của `@assistant-ui/*` — đã phải nâng thủ công theo lô.
