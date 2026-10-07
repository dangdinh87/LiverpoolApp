# QA `feat/upgrade` — link locale + canonical/hreflang

**Ngày:** 2026-10-07 · **Branch:** `feat/upgrade` (15 commit ahead `origin/master`, **chưa deploy**)

---

## 1. Trạng thái branch

| Gate | Kết quả |
|---|---|
| `tsc --noEmit` | ✅ clean |
| `eslint src/ e2e/` | ✅ 0 error (6 warning) |
| Unit (Vitest) | ✅ **435 pass** / 42 file |
| E2E (Playwright) | ✅ **107 pass, 0 fail**, 17 skip (desktop + mobile) |
| `next build` | ✅ 114 static page |

Vào phiên: 1 test fail. Ra phiên: 0 fail, và sửa được 2 lỗi sản phẩm thật.

---

## 2. Lỗi sản phẩm đã sửa

### P1 — Link nội bộ mất locale (21 file)
App serve tiếng Anh ở `/en`, nhưng 21 file vẫn `import Link from "next/link"` ⇒ href không prefix.
Trên trang tiếng Anh gần như mọi link trỏ URL tiếng Việt, chỉ tới đúng chỗ nhờ middleware trả **307**.

Đo thực tế một lượt duyệt `/en`: **15+ redirect 307** (`/news`, `/squad`, `/player/*`, `/news/digest/*`…).
Hệ quả: prefetch tiêu vào redirect thay vì payload, mỗi click thêm một round-trip, và người đọc copy link
sẽ phát ra URL sai locale.

Rõ nhất ở `navbar-client.tsx`: đã lấy `usePathname` từ `@/i18n/navigation` (có cả comment giải thích)
nhưng `Link` vẫn từ `next/link` — nối dây đúng một nửa. `bottom-nav.tsx` thì đúng cả hai.

→ Chuyển hết sang `Link` của `@/i18n/navigation`. Sau sửa: **0 redirect** trên `/en`.
Link ngoài không ảnh hưởng (đều là `<a>`).

### P1 — Trang tiếng Anh tự khai canonical là trang tiếng Việt
`getHreflangAlternates()` trả **cùng một URL** cho `vi`, `en`, `x-default`.

| | Trước | Sau |
|---|---|---|
| `/squad` canonical | `/squad` | `/squad` |
| `/en/squad` canonical | **`/squad`** ❌ | `/en/squad` ✅ |
| `en` alternate | `/squad` ❌ | `/en/squad` ✅ |

Comment trong code lộ nguyên nhân: logic viết cho thời i18n **theo cookie** (một URL, hai locale).
Site đã chuyển sang locale-in-URL nên nó thành sai. Hệ quả: Google được bảo **loại bản tiếng Anh**,
và hreflang không cho nó đường nào tìm ra `/en`. Với kế hoạch "go global" thì đây là chặn cả phễu.

→ Mỗi locale trỏ URL của chính nó, `x-default` = locale mặc định, canonical theo locale đang render.
16 call site truyền `locale` (đã có sẵn từ `params`). OG `locale`/`alternateLocale` theo cùng.
Thêm 4 test (tổng 23 trong `seo.test.ts`).

---

## 3. Sửa test harness (không phải lỗi sản phẩm)

- **Selector hardcode URL không prefix** — `header a[href='/']` (6 chỗ) và `a[href^='/player/']` (3 chỗ)
  ngừng khớp khi href mang locale. Biểu hiện ra là "squad grid không render cầu thủ" chứ không ra
  "selector sai". → 2 helper: `waitForHeader`, `anchorTo(path)`.
- **Request fail của host bên thứ ba** — CDN ảnh của Reach PLC chặn hotlink (`ERR_BLOCKED_BY_ORB`)
  làm fail navigation test, vì lý do không sửa được từ repo này. → chỉ báo lỗi request do **chính ta** serve
  (cùng ranh giới mà luật 4xx đã vạch).
- **Hydration budget** của language dropdown — 3 worker dùng chung 1 server local, hydration vượt mốc
  của máy rảnh. → nới budget, pass riêng 1.5s.

---

## 4. Commit (5)

| Commit | Nội dung |
|---|---|
| `d1359b5` | 21 file dùng `Link` có locale |
| `4eb8e98` | canonical + hreflang theo locale (+ test) |
| `035e201` | next-intl 4.14.2 → 4.14.9 (patch) |
| `a723fcc` | e2e: helper locale-agnostic, phạm vi request fail, hydration budget |
| `66a5884` | gitignore output Playwright |

---

## 5. Cần quyết định / còn lại

1. **Deploy**: branch 15 commit chưa lên production. Push `feat/upgrade` → `master` sẽ trigger build.
   Production đang chạy bản cũ, chưa có brand/UX upgrade lẫn 2 fix trên.
2. **Quyết định của chủ sở hữu** (từ `researcher-261007-1201`): chọn tên (`Reds Abroad` / `KopClock`),
   có chạy ads dưới brand mới không (đổi hẳn phân tích fan-site legitimacy), mua `.com` + check trademark,
   rồi 301 từ `liverpoolfcvn.blog`.
3. **`navigation.spec.ts` trùng `shell-navigation.spec.ts`** — file cũ của tôi (navbar + 404) giờ
   chồng lấn file mới đầy đủ hơn (header, bottom bar, language dropdown, skip link, tab order).
   Nên gộp, nhưng chưa làm vì là thiết kế suite của người khác.
4. **17 e2e test đang skip** — chưa soát vì sao skip.
