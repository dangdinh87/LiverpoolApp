# Triển Khai

Mục tiêu triển khai: **Vercel (gói Hobby)** + **Hostinger custom domain** (`www.liverpoolfcvn.blog`).

---

## Thiết Lập Dự Án Vercel

### 1. Kết Nối Repository

1. Truy cập [vercel.com](https://vercel.com) → New Project
2. Import GitHub repository của bạn
3. Framework preset: **Next.js** (tự động phát hiện)
4. Root directory: để nguyên `/` (mặc định)
5. Nhấn **Deploy** — lần deploy đầu tiên có thể thất bại cho đến khi env vars được thiết lập

### 2. Cấu Hình Biến Môi Trường

Trong Vercel Dashboard → Project → Settings → Environment Variables, thêm tất cả biến cần thiết:

| Biến | Môi trường | Giá trị |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Tất cả | URL Supabase project của bạn |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Tất cả | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview | Supabase service role key |
| `FOOTBALL_DATA_ORG_KEY` | Tất cả | Football-Data.org API key |
| `NEXT_PUBLIC_SITE_URL` | Production | `https://www.liverpoolfcvn.blog` |
| `NEXT_PUBLIC_SITE_URL` | Preview | URL Vercel preview (hoặc để trống) |
| `GROQ_API_KEY` | Tất cả | Groq API key |
| `CRON_SECRET` | Tất cả | Chuỗi secret ngẫu nhiên |
| `CLOUDINARY_CLOUD_NAME` | Tất cả | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Tất cả | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Tất cả | Cloudinary API secret |

> `SUPABASE_SERVICE_ROLE_KEY` có toàn quyền truy cập database — chỉ đặt cho Production/Preview, không bao giờ để lộ ra trình duyệt.

### 3. Redeploy

Sau khi đặt env vars: Deployments → deployment mới nhất → menu ba chấm → **Redeploy**.

---

## Cron Jobs

Cron jobs được cấu hình trong `vercel.json` ở thư mục gốc dự án:

```json
{
  "crons": [
    { "path": "/api/news/sync",            "schedule": "0 6 * * *" },
    { "path": "/api/news/cleanup",         "schedule": "0 3 * * *" },
    { "path": "/api/news/digest/generate", "schedule": "0 0 * * *" }
  ]
}
```

| Route | Lịch chạy | Mục đích | Thời gian tối đa |
|---|---|---|---|
| `/api/news/sync` | 6:00 SA UTC hàng ngày | Đồng bộ RSS feeds → bảng articles Supabase | 60s |
| `/api/news/cleanup` | 3:00 SA UTC hàng ngày | Soft-delete bài >30 ngày, hard-delete bài >60 ngày | mặc định (10s) |
| `/api/news/digest/generate` | 00:00 UTC hàng ngày | Tạo AI daily digest qua Groq | 60s |

### Cách Xác Thực Cron Hoạt Động

Vercel tự động gửi `Authorization: Bearer <CRON_SECRET>` trên tất cả cron request. Cả ba route đều xác thực điều này:

```typescript
// Bên trong mỗi cron route handler
const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  ?? new URL(req.url).searchParams.get('key');
if (secret !== process.env.CRON_SECRET) {
  return new Response('Unauthorized', { status: 401 });
}
```

Bạn cũng có thể kích hoạt thủ công để kiểm tra:

```bash
curl -X GET https://www.liverpoolfcvn.blog/api/news/sync \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Giới Hạn Cron Trên Vercel Hobby

- Tối đa **2 cron jobs** mỗi dự án trên gói Hobby
- Dự án này dùng 3 — cần nâng lên **Pro** ($20/tháng) hoặc gộp lại
- Cách khắc phục: gộp cleanup + sync vào một endpoint, hoặc kích hoạt cleanup từ sync handler
- Cron jobs chỉ chạy khi deployment đang active (không chạy trên preview deployments)

---

## Custom Domain — Hostinger

### Bước 1: Mua Domain Trên Hostinger

Mua domain tại [hostinger.com](https://www.hostinger.com). Domain `liverpoolfcvn.blog` đã được đăng ký sẵn.

### Bước 2: Thêm Domain Trên Vercel

1. Vercel Dashboard → Project → Settings → Domains
2. Nhấn **Add Domain**
3. Nhập: `www.liverpoolfcvn.blog`
4. Thêm cả apex domain: `liverpoolfcvn.blog` (Vercel sẽ gợi ý redirect từ apex → www)
5. Vercel hiển thị các DNS records cần cấu hình — giữ trang này mở

### Bước 3: Cấu Hình DNS Trên Hostinger

Đăng nhập Hostinger → hPanel → Domains → tên miền của bạn → **DNS / Nameservers**.

Thêm các records sau:

| Loại | Tên | Giá trị | TTL |
|---|---|---|---|
| `A` | `@` | `76.76.21.21` | 3600 |
| `CNAME` | `www` | `cname.vercel-dns.com` | 3600 |

> Vercel có thể cung cấp IP hoặc CNAME khác trong dashboard — luôn dùng chính xác giá trị Vercel hiển thị vì họ có thể cập nhật.

Nếu Hostinger dùng **nameservers** (không phải DNS zone editor), bạn có thể cần chuyển sang nameservers tùy chỉnh hoặc dùng DNS Zone editor của Hostinger.

### Bước 4: Chờ DNS Propagation

DNS propagation thường mất **5–30 phút**, tối đa 48h trong trường hợp hiếm gặp.

Kiểm tra trạng thái propagation:
```bash
# Kiểm tra A record
dig A liverpoolfcvn.blog

# Kiểm tra CNAME
dig CNAME www.liverpoolfcvn.blog

# Kiểm tra nhanh online
# https://dnschecker.org
```

### Bước 5: Xác Nhận Trên Vercel

Vercel Dashboard → Project → Settings → Domains. Khi DNS đã propagate, domain hiển thị **Valid Configuration** với dấu tick xanh.

Nếu hiển thị "Invalid Configuration" sau 30 phút, kiểm tra lại các DNS records đã được lưu đúng trên Hostinger.

### Bước 6: Cập Nhật NEXT_PUBLIC_SITE_URL

Trong Vercel Environment Variables, cập nhật `NEXT_PUBLIC_SITE_URL` thành `https://www.liverpoolfcvn.blog`.

Biến này được dùng cho:
- `metadataBase` (URL OpenGraph)
- Canonical URL cho sitemap
- Xây dựng OAuth redirect URI

### Bước 7: Redeploy

Kích hoạt một deployment mới sau khi cập nhật env var để build lấy được giá trị mới.

---

## Supabase — Cập Nhật Cho Custom Domain

Sau khi domain đã hoạt động, cập nhật cài đặt Supabase Auth để OAuth redirect hoạt động đúng.

### Cập Nhật Site URL

1. Supabase Dashboard → Authentication → URL Configuration
2. Đặt **Site URL** thành: `https://www.liverpoolfcvn.blog`

### Thêm Redirect URLs

Trong phần **Redirect URLs**, thêm:

```
https://www.liverpoolfcvn.blog/**
https://www.liverpoolfcvn.blog/auth/callback
```

Wildcard `/**` bao phủ tất cả các đường dẫn OAuth callback.

### Cập Nhật OAuth Provider Callbacks

Cho từng OAuth provider (Google, GitHub) được cấu hình trong Supabase:

- **Google:** Google Cloud Console → OAuth 2.0 credentials → Authorized redirect URIs → thêm `https://www.liverpoolfcvn.blog/auth/callback`
- **GitHub:** GitHub → Settings → Developer settings → OAuth Apps → app của bạn → Cập nhật callback URL thành `https://www.liverpoolfcvn.blog/auth/callback`

---

## SSL

SSL là **tự động** — Vercel cấp chứng chỉ Let's Encrypt ngay khi DNS trỏ đúng về Vercel. Không cần thao tác thủ công.

HTTPS được áp dụng tự động; các request HTTP sẽ được redirect sang HTTPS.

---

## Xử Lý Sự Cố

### DNS Không Propagate

```bash
# Kiểm tra những gì đang được resolve
nslookup www.liverpoolfcvn.blog
dig www.liverpoolfcvn.blog CNAME

# Xóa cache DNS local (macOS)
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
```

Nếu vẫn không hoạt động sau 1h: đăng nhập Hostinger hPanel → DNS Zone và xác nhận các record đã được lưu. Một số gói Hostinger yêu cầu tắt "Auto-renew DNS" hoặc tùy chọn tương tự trước khi custom records có hiệu lực.

### Lỗi SSL Certificate

Thường là do DNS chưa propagate xong khi Vercel cố cấp cert. Cách xử lý:

1. Chờ DNS propagate hoàn toàn
2. Vercel Dashboard → Domains → nhấn vào domain → **Refresh** / **Re-issue certificate**

Nếu Vercel hiển thị "SSL Certificate Pending" hơn 24h, hãy xóa và thêm lại domain.

### OAuth Redirect Mismatch

Lỗi: `redirect_uri_mismatch` hoặc "This site can't be reached after login"

Kiểm tra:
1. `NEXT_PUBLIC_SITE_URL` trong Vercel env vars khớp chính xác với domain (bao gồm `https://www.`)
2. Supabase → Authentication → URL Configuration → Site URL và Redirect URLs đã được cập nhật
3. OAuth app (Google/GitHub) đã có callback URL mới
4. Redeploy sau khi thay đổi env vars

### Build Thất Bại

Nguyên nhân thường gặp:

```bash
# Lỗi TypeScript — chạy locally trước
npm run build

# Thiếu env vars — kiểm tra Vercel dashboard
# Nếu thiếu env var bắt buộc, Next.js build sẽ throw

# Supabase types không khớp — tạo lại types
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts
```

### Cron Jobs Không Chạy

1. Xác nhận `vercel.json` đã được commit và deploy
2. Kiểm tra Vercel Dashboard → Project → Settings → Crons — phải liệt kê đủ 3 jobs
3. Trên gói Hobby, chỉ hỗ trợ 2 crons — cái thứ 3 sẽ âm thầm không chạy
4. Kiểm tra function logs: Vercel Dashboard → Logs → lọc theo `/api/news/sync`
5. Kiểm tra thủ công bằng curl với `CRON_SECRET`

### 504 Timeout Trên Cron Sync/Digest

`maxDuration` trong `vercel.json` phải được đặt là 60s cho sync và digest routes:

```json
{
  "crons": [
    { "path": "/api/news/sync",            "schedule": "0 6 * * *" },
    { "path": "/api/news/digest/generate", "schedule": "0 0 * * *" }
  ],
  "functions": {
    "src/app/api/news/sync/route.ts":            { "maxDuration": 60 },
    "src/app/api/news/digest/generate/route.ts": { "maxDuration": 60 }
  }
}
```

Gói Hobby tối đa: 60s. Gói Pro tối đa: 300s.

---

## Giới Hạn Gói Vercel Hobby

| Giới hạn | Hobby | Pro |
|---|---|---|
| Timeout serverless function | 10s (mặc định), 60s (đã cấu hình) | 300s |
| Cron jobs | 2 mỗi dự án | Không giới hạn |
| Băng thông | 100GB/tháng | 1TB/tháng |
| Deployments | Không giới hạn | Không giới hạn |
| Thành viên team | 1 | Không giới hạn |
| Preview deployments | Có | Có |

Các hạn chế quan trọng cho dự án này:
- **Giới hạn cron** — chỉ 2 trong 3 cron jobs chạy được trên Hobby. Nâng lên Pro hoặc gộp cleanup vào sync.
- **Function timeout** — news sync (60s) và digest (60s) đang ở mức giới hạn Hobby. Nếu feeds chậm lại, có thể bị timeout.
- **Không có background functions** — tất cả công việc phải hoàn thành trong cửa sổ timeout.

---

## Danh Sách Kiểm Tra Trước Khi Go Live

Trước khi ra mắt chính thức:

- [ ] Tất cả env vars đã được đặt trên Vercel (môi trường Production)
- [ ] `NEXT_PUBLIC_SITE_URL` được đặt thành production domain
- [ ] `npm run build` chạy thành công ở local
- [ ] Supabase migrations đã được áp dụng cho production database
- [ ] Supabase Auth → Site URL đã cập nhật thành production domain
- [ ] Supabase Auth → Redirect URLs bao gồm production domain
- [ ] OAuth providers (Google/GitHub) đã cập nhật callback URLs
- [ ] DNS records đã cấu hình trên Hostinger
- [ ] Domain hiển thị "Valid Configuration" trên Vercel
- [ ] SSL certificate đã được cấp (ổ khóa xanh trên trình duyệt)
- [ ] Cron jobs hiển thị trong Vercel Dashboard → Settings → Crons
- [ ] Kiểm tra cron thủ công: `curl -H "Authorization: Bearer SECRET" https://domain/api/news/sync`
- [ ] Trang chủ tải được, bài báo tin tức hiển thị
- [ ] Luồng đăng nhập/đăng ký hoạt động
- [ ] Ảnh gallery tải từ Cloudinary
