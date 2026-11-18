# Hỏi & Đáp Về Triển Khai (Deployment FAQ)

Tài liệu giải thích ngắn gọn, dễ hiểu các khái niệm hạ tầng đang vận hành **Anfield Daily** tại **https://anfielddaily.com**. Cấu hình kỹ thuật chi tiết xem tại [`docs/vi/deployment.md`](./deployment.md).

---

## 1. Tại sao Anfield Daily chạy trên Cloudflare Workers thay vì hosting tĩnh thông thường?

Ứng dụng Next.js 16 sử dụng **React Server Components**, **Incremental Static Regeneration (ISR)**, **Server Actions** và **API Routes** (đồng bộ tin tức, dịch bài qua AI, tạo tệp lịch `.ics`). Vì vậy hệ thống cần một môi trường thực thi máy chủ ở biên mạng (edge runtime) thay vì chỉ phục vụ các tệp HTML tĩnh cố định.

Thông qua bộ chuyển đổi `@opennextjs/cloudflare`, toàn bộ ứng dụng chạy trực tiếp trên Worker `liverpool-app` của Cloudflare, đặt vùng tính toán (`placement`) tại `aws:ap-southeast-1` ngay sát cơ sở dữ liệu Supabase để tối ưu độ trễ truy vấn, trong khi trang đã lưu đệm được phân phối tức thì từ mạng CDN toàn cầu của Cloudflare.

---

## 2. R2, D1 và Durable Objects đóng vai trò gì trong kiến trúc cache?

Trên Cloudflare Workers không có ổ đĩa cục bộ cố định như máy chủ truyền thống, nên bộ nhớ đệm ISR của Next.js được tách thành ba thành phần chuyên biệt trong `open-next.config.ts`:

| Dịch vụ Cloudflare | Vai trò trong Anfield Daily |
|---|---|
| **R2 (`liverpool-app-next-cache`) + Regional Cache API** | Lưu trữ HTML/RSC đã prerender; các trang đang có nhiều người đọc được trả thẳng từ Cache API tại trung tâm dữ liệu gần nhất mà không cần khởi chạy lại Next.js (`enableCacheInterception: true`). |
| **D1 (`liverpool-app-tag-cache`)** | Lưu bảng ánh xạ thẻ cache (`news`, `news-digest`, `site-articles`) để khi đồng bộ tin mới, lệnh `revalidateTag` / `revalidatePath` biết chính xác trang nào cần làm mới. |
| **Durable Object (`DOQueueHandler`)** | Điều phối hàng đợi làm mới nền theo chu kỳ thời gian (`revalidate`), ngăn nhiều người đọc cùng kích hoạt render trùng lặp một trang vừa hết hạn. |

---

## 3. Custom Domain trên Cloudflare Workers hoạt động như thế nào?

Tên miền `anfielddaily.com` và `www.anfielddaily.com` được gắn trực tiếp vào Worker `liverpool-app` dưới dạng **Worker Custom Domains** trong `wrangler.jsonc`:

- Cloudflare tự động tạo bản ghi DNS nội bộ và tự động cấp, gia hạn chứng chỉ bảo mật **SSL/HTTPS** — không cần trỏ địa chỉ IP thủ công sang bên thứ ba.
- Mọi truy cập HTTP đều tự động nâng cấp lên HTTPS và đi qua lớp bảo vệ DDoS/CDN của Cloudflare trước khi chạm tới Worker.

---

## 4. Biến `NEXT_PUBLIC_SITE_URL` dùng để làm gì?

Biến này cho ứng dụng biết địa chỉ gốc chính thức của trang (`https://anfielddaily.com`) và quyết định:

| Thành phần | Tác dụng |
|---|---|
| `metadataBase` & thẻ OpenGraph | Tạo đường dẫn tuyệt đối cho ảnh xem trước khi chia sẻ liên kết |
| `rel="canonical"` & `hreflang` | Định danh phiên bản chuẩn tiếng Anh (`/`) và tiếng Việt (`/vi`), tránh trùng lặp chỉ mục trên Google |
| `sitemap.xml`, `robots.txt`, `llms.txt` | Cung cấp đúng tên miền chính thức cho công cụ tìm kiếm và mô hình AI |
| Lịch thi đấu `.ics` | Gắn liên kết mở thẳng trang chi tiết trận đấu trong ứng dụng lịch điện thoại |

---

## 5. Khác biệt giữa biến môi trường lúc Build và Secret lúc Chạy trên Worker là gì?

- **Lúc đóng gói (`npm run cf:build` trong GitHub Actions):** Các biến bắt đầu bằng `NEXT_PUBLIC_*` được nhúng thẳng vào gói mã phía trình duyệt, đồng thời các khóa đọc dữ liệu (`SUPABASE_SERVICE_ROLE_KEY`, `FOOTBALL_DATA_ORG_KEY`) giúp tạo sẵn các trang tĩnh ban đầu. Các giá trị này lấy từ **GitHub Repository Secrets**, tuyệt đối không đóng gói từ máy cá nhân đang chứa tệp `.env.local` thử nghiệm.
- **Lúc chạy thực tế trên Cloudflare (`wrangler secret put`):** Các khóa nhạy cảm như `VIETAPI_KEY`, `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` được lưu mã hóa trong cấu hình Worker và được mã nguồn truy xuất động theo từng request qua hàm `getEnv()` (`src/lib/env.ts`).

---

## 6. Tại sao phải cấu hình Redirect URLs trong Supabase Auth?

Khi người đọc đăng nhập bằng Google, GitHub hoặc email xác nhận, quy trình diễn ra như sau:

```text
Người dùng bấm Đăng nhập → chuyển tới nhà cung cấp OAuth → xác thực qua Supabase → chuyển hướng ngược về trang web
```

Supabase chỉ cho phép chuyển hướng về các tên miền nằm trong danh sách tin cậy (**Site URL** và **Redirect URLs**). Nếu thiếu `https://anfielddaily.com/auth/callback` (hoặc `http://localhost:3000/auth/callback` khi lập trình tại máy cá nhân), bước đăng nhập cuối cùng sẽ bị từ chối.

---

## 7. Các tác vụ tự động (Cron Jobs) được kích hoạt ra sao?

Hệ thống sử dụng hai workflow trên **GitHub Actions** gọi vào các API được bảo vệ bằng khóa `CRON_SECRET`:

1. **`news-sync.yml` (mỗi giờ tại phút `:00` UTC):** Gọi `/api/news/sync` để kéo bài mới từ 13 đầu báo tiếng Anh cùng kênh YouTube CLB, bù ảnh đại diện, bóc tách sẵn nội dung HTML trong giới hạn 45 giây, gửi báo cáo về Telegram và kiểm tra bù bản tin ngày trong khung `01:00–16:59 UTC`.
2. **`news-daily.yml` (mỗi ngày):** Gọi `/api/news/digest/generate` lúc `00:07 UTC` để sinh bản tin AI đầu ngày và gọi `/api/news/cleanup` lúc `03:17 UTC` để dọn nội dung lưu đệm quá hạn.

Mọi lời gọi đều truyền khóa qua header `Authorization: Bearer <CRON_SECRET>`, không bao giờ đặt khóa trên thanh địa chỉ URL để tránh lộ trong nhật ký truy cập.

---

## 8. Quy trình từ lúc sửa mã nguồn đến khi lên trang thật diễn ra thế nào?

```text
1. Phát triển trên nhánh riêng → chạy kiểm tra `npx tsc --noEmit && npm run lint && npm test`
2. Gộp mã vào nhánh `master` và đẩy lên GitHub
3. Workflow `deploy-cloudflare.yml` tự động kiểm tra kiểu, lint, chạy hơn 764 bài unit test
4. Đóng gói OpenNext (`npm run cf:build`) và đẩy lên Cloudflare Worker (`npm run cf:deploy`)
5. Dọn các bản cache R2 cũ (`cf-prune-r2-cache.ts`)
6. Chạy smoke test kiểm tra HTTP 200 trên `/`, `/news`, `/vi`, `/fixtures`, `/sitemap.xml`
7. Gửi thông báo hoàn tất qua Telegram — trang cập nhật trực tiếp tại https://anfielddaily.com.
```
