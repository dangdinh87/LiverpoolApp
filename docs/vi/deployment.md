# Triển Khai (Deployment)

**Anfield Daily** vận hành thực tế trên **Cloudflare Workers** (`@opennextjs/cloudflare`) tại tên miền **[anfielddaily.com](https://anfielddaily.com)**, kết hợp các tác vụ định kỳ qua **GitHub Actions**.

---

## 1. Kiến Trúc Hạ Tầng (`wrangler.jsonc` & `open-next.config.ts`)

| Thành phần | Tài nguyên / Binding | Vai trò |
|---|---|---|
| **Cloudflare Worker** | `liverpool-app` (Workers Paid, `nodejs_compat`) | Xử lý SSR, RSC, Server Actions & API routes (`cpu_ms: 60000`, đặt tại `aws:ap-southeast-1` sát cạnh Supabase) |
| **Tên miền tùy chỉnh** | `anfielddaily.com`, `www.anfielddaily.com` | Worker Custom Domains đi kèm chứng chỉ TLS tự động của Cloudflare |
| **Bộ đệm ISR trên R2** | `NEXT_INC_CACHE_R2_BUCKET` → `liverpool-app-next-cache` | Lưu trữ trang SSG/ISR phía sau lớp đệm biên `withRegionalCache(..., { mode: "long-lived" })` |
| **Bộ đệm thẻ trên D1** | `NEXT_TAG_CACHE_D1` → `liverpool-app-tag-cache` | Theo dõi lệnh làm mới `revalidateTag` và `revalidatePath` |
| **Hàng đợi Durable Object** | `NEXT_CACHE_DO_QUEUE` → `DOQueueHandler` | Khử trùng lặp các tác vụ làm mới ISR ngầm theo thời gian |
| **Phục vụ trực tiếp từ Cache biên** | `enableCacheInterception: true` | Trả thẳng trang ISR đã lưu trong cache biên mà không cần nạp bundle server Next.js |

### Lưu Ý Tương Thích Trên Môi Trường Worker

- `open-next.config.ts` chạy lệnh `npx next build && node scripts/cf-patch-middleware-trace.mjs` để bổ sung `@opentelemetry/api/build/esm` vào file trace trước khi đóng gói `src/proxy.ts`.
- Bộ cào nội dung bài báo sử dụng `linkedom` thay vì `jsdom` để chạy tương thích hoàn toàn trên runtime `workerd`.
- Trình tối ưu ảnh mặc định của Next.js được tắt khi đóng gói cho Cloudflare (`images.unoptimized` khi `DEPLOY_TARGET=cloudflare`); ảnh thư viện sử dụng URL biến đổi trực tiếp của Cloudinary.
- `wrangler.jsonc` đặt `assets.html_handling = "none"` nhằm giữ nguyên tệp xác minh `.html` của Google Search Console không bị chuyển hướng `307`.

---

## 2. Quy Trình CI/CD Tự Động (`.github/workflows/deploy-cloudflare.yml`)

Mỗi khi đẩy mã nguồn mới lên nhánh `master` (bỏ qua thay đổi chỉ thuộc `docs/**`, `plans/**` hoặc `**/*.md`), GitHub Actions tự động thực thi:

1. `npm ci` trên Node 24
2. `npx tsc --noEmit && npm run lint && npm test`
3. `npm run cf:build` (`DEPLOY_TARGET=cloudflare opennextjs-cloudflare build`) với các biến `NEXT_PUBLIC_*` và khóa đọc dữ liệu prerender từ GitHub Secrets
4. `npm run cf:deploy` (`opennextjs-cloudflare deploy`) qua `CLOUDFLARE_API_TOKEN` và `CLOUDFLARE_ACCOUNT_ID`
5. `npx tsx scripts/cf-prune-r2-cache.ts --bucket liverpool-app-next-cache --apply` để dọn các thư mục cache của bản build cũ trên R2
6. Kiểm tra nhanh đầu cuối (smoke test) xác nhận mã HTTP `200` trên `/`, `/news`, `/vi`, `/fixtures` và `/sitemap.xml`
7. Gửi thông báo hoàn tất qua Telegram (`scripts/deploy-notify.sh`)

### Đóng Gói & Triển Khai Thủ Công

```bash
npm run cf:build     # Đóng gói thư mục .open-next/ (không đặt tệp .env.local tại thư mục gốc khi chạy lệnh này)
npm run cf:preview   # Chạy thử trên workerd tại máy cá nhân qua Wrangler
npm run cf:deploy    # Đẩy bản build lên Cloudflare Workers
```

---

## 3. Biến Môi Trường & Bí Mật Hệ Thống

### Secret Lúc Chạy Trên Worker (`wrangler secret put <TÊN_BIẾN>`)

Các khóa bí mật lúc chạy được lưu trực tiếp trong Cloudflare Worker (không bao giờ lưu vào git) và được truy xuất động theo từng request qua `getEnv()` (`src/lib/env.ts`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FOOTBALL_DATA_ORG_KEY`
- `VIETAPI_KEY`
- `YOUTUBE_API_KEY` (tùy chọn)
- `CRON_SECRET`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `NEXT_PUBLIC_SITE_URL` (`https://anfielddaily.com`)
- `NEXT_PUBLIC_ADSENSE_CLIENT_ID`, `NEXT_PUBLIC_CF_ANALYTICS_TOKEN` (tùy chọn)

### GitHub Repository Secrets

| Secret | Nơi sử dụng |
|---|---|
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | `deploy-cloudflare.yml` |
| `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_CF_ANALYTICS_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `FOOTBALL_DATA_ORG_KEY` | Bước `cf:build` trong `deploy-cloudflare.yml` |
| `CRON_SECRET` | `news-sync.yml`, `news-daily.yml` |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Báo cáo và cảnh báo đồng bộ tin trong `news-sync.yml` (tùy chọn) |
| `DEPLOY_BOT_TOKEN`, `DEPLOY_CHAT_ID` | Thông báo triển khai trong `deploy-cloudflare.yml` (tùy chọn) |

---

## 4. Các Tác Vụ Định Kỳ (GitHub Actions)

Mọi endpoint cron đều bắt buộc header `Authorization: Bearer <CRON_SECRET>`:

| Workflow | Lịch (UTC) | Endpoint | Mục đích |
|---|---|---|---|
| `news-sync.yml` | `0 * * * *` | `GET /api/news/sync` | Đồng bộ 13 đầu báo + YouTube, bù ảnh đại diện, cào toàn văn (ngân sách 45s) & gửi báo cáo Telegram |
| `news-sync.yml` | `01:00–16:59` | `GET /api/news/digest/generate` | Kiểm tra dự phòng mỗi giờ nếu bản tin đầu ngày chưa có |
| `news-daily.yml` | `7 0 * * *` | `GET /api/news/digest/generate` | Tạo bản tin AI hằng ngày và bài SEO |
| `news-daily.yml` | `17 3 * * *` | `GET /api/news/cleanup` | Xóa nội dung cào quá 7 ngày, bài quá 14 ngày & `sync_logs` quá 14 ngày |

Lệnh kích hoạt thủ công khi cần kiểm tra:

```bash
gh workflow run news-sync.yml
gh workflow run news-daily.yml -f job=digest
curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://anfielddaily.com/api/news/sync
```

---

## 5. Cấu Hình Supabase Auth & OAuth

Trong Supabase Dashboard → Authentication → URL Configuration:
- **Site URL:** `https://anfielddaily.com`
- **Redirect URLs:**
  - `https://anfielddaily.com/**`
  - `https://anfielddaily.com/auth/callback`
  - `http://localhost:3000/auth/callback` (phục vụ phát triển tại local)

Trên Google Cloud Console và GitHub OAuth Apps, đảm bảo callback URL trỏ đúng về địa chỉ xác thực của dự án Supabase (`https://<project-ref>.supabase.co/auth/v1/callback`).

---

## 6. Danh Mục Kiểm Tra Sau Khi Triển Khai

- [ ] Pipeline `deploy-cloudflare.yml` xanh toàn bộ (kiểm tra kiểu, lint, Vitest, OpenNext build, deploy, smoke check)
- [ ] `https://anfielddaily.com` và `https://anfielddaily.com/vi` trả mã `200` với giao diện Dark Stadium chuẩn
- [ ] `/news` và `/vi/news` hiển thị đầy đủ danh sách tin tức mới nhất
- [ ] `/news/digest` và `/analysis` phản hồi nhanh từ bộ đệm ISR
- [ ] `/api/calendar/liverpool.ics` tải về tệp lịch RFC 5545 hợp lệ
- [ ] `/sitemap.xml`, `/robots.txt` và `/llms.txt` hiển thị đúng tên miền `https://anfielddaily.com`
- [ ] Đăng nhập Supabase / OAuth chuyển hướng mượt về `/profile`
