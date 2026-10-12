# Chuyển tên miền: www.liverpoolfcvn.blog → anfielddaily.com

Ngày soạn: 12/10/2026. URL chính mới: **https://anfielddaily.com** (không www).
Code không ghi cứng tên miền: mọi URL (canonical, hreflang, sitemap, robots,
JSON-LD, OG, link nội bộ trong chat) đọc từ `NEXT_PUBLIC_SITE_URL`.

## 0. Trước khi bắt đầu

- [ ] **Đưa bản đổi tên lên production trước.** Production (12/10) vẫn là bản "Reds Abroad";
      tên Anfield Daily, logo mới, `ads.txt` và các tính năng mới còn chưa commit trên `feat/upgrade`.
      Vercel chỉ build production từ `master` (`vercel.json` → `ignoreCommand`), nên: commit → merge
      vào `master` → đợi deploy xong. Không làm bước này thì `anfielddaily.com` sẽ hiện tên/logo cũ.
- [ ] **(Bạn)** Mua `anfielddaily.com` (Cloudflare hoặc Porkbun, ~$11/năm).
- [ ] Chọn giờ ít người xem (không trùng giờ có trận).

## 1. Gắn tên miền vào Vercel — (Claude chạy)

```bash
vercel domains add anfielddaily.com liverpool-app
vercel domains add www.anfielddaily.com liverpool-app
vercel domains inspect anfielddaily.com   # in ra đúng bản ghi DNS cần tạo
```

- [ ] **(Bạn)** Tạo đúng các bản ghi Vercel in ra (thường: `A @ → IP Vercel`, `CNAME www → …vercel-dns…`).
      Cloudflare: để **DNS only** (đám mây xám), không bật proxy.
- [ ] Đợi Vercel báo "Valid Configuration" và cấp SSL (vài phút).

## 2. Chuyển hướng 301 (giữ thứ hạng SEO) — Vercel Dashboard → Project → Domains

| Tên miền | Cấu hình |
|---|---|
| `anfielddaily.com` | Production, **chính** |
| `www.anfielddaily.com` | Redirect 308 → `anfielddaily.com` |
| `www.liverpoolfcvn.blog` | Redirect **308 (permanent)** → `anfielddaily.com` |
| `liverpoolfcvn.blog` | Redirect **308 (permanent)** → `anfielddaily.com` |

Vercel giữ nguyên đường dẫn và query khi redirect (`/news/bbc/...` → `anfielddaily.com/news/bbc/...`),
nên mọi backlink, bài đã index, link chia sẻ cũ vẫn dẫn đúng trang. **Giữ tên miền cũ và
các redirect này ít nhất 12 tháng** (đừng để `liverpoolfcvn.blog` hết hạn).

## 3. Biến môi trường + build lại — (Claude chạy)

```bash
vercel env rm NEXT_PUBLIC_SITE_URL production
printf 'https://anfielddaily.com' | vercel env add NEXT_PUBLIC_SITE_URL production
vercel redeploy <URL deployment production hiện tại>   # build lại CÙNG commit, chỉ đổi env
```

`NEXT_PUBLIC_*` được nhúng lúc build, nên bắt buộc build lại. `redeploy` build lại đúng commit
đang chạy, không đẩy các thay đổi chưa commit trong máy lên production.
Sửa luôn `.env.production` trong repo cho khớp.

## 4. Các hệ thống ngoài bị ảnh hưởng

| Hệ thống | Việc cần làm | Ai | Không làm thì sao |
|---|---|---|---|
| **GitHub Actions** secret `SYNC_URL` | Đổi thành `https://anfielddaily.com/api/news/sync` (Settings → Secrets → Actions) | Bạn | Cron sync tin gọi tên miền cũ; curl không theo redirect với POST → **tin ngừng cập nhật** |
| **Supabase Auth** → URL Configuration | Site URL = `https://anfielddaily.com`; thêm `https://anfielddaily.com/**` vào Redirect URLs (giữ URL cũ vài tuần) | Bạn | Đăng nhập / email xác nhận quay về tên miền cũ hoặc bị chặn |
| **Google Search Console** | Thêm property `anfielddaily.com` (xác minh DNS TXT, hoặc file `google583c5c945cf216b2.html` đã có sẵn trong `public/`); nộp `https://anfielddaily.com/sitemap.xml`; ở property cũ dùng **Change of Address** → anfielddaily.com | Bạn | Google chuyển thứ hạng chậm hơn nhiều tuần |
| **Bing Webmaster** | Thêm site mới, nộp sitemap (hoặc import từ Search Console) | Bạn | Bing index chậm |
| **Google AdSense** | Sites → thêm `anfielddaily.com`, đợi duyệt. `ads.txt` đã thêm sẵn (`public/ads.txt`) | Bạn | Quảng cáo không chạy / bị hạn chế trên tên miền mới |
| **Google Analytics / GTM** | Đổi URL luồng dữ liệu web (nếu có lọc theo hostname thì sửa) | Bạn | Báo cáo tách đôi hai tên miền |
| **Vercel Firewall** (chặn bot) | Không cần sửa (áp theo project, không theo tên miền). Kiểm tra lại sau khi chuyển | — | — |

## 5. Ảnh hưởng tới người dùng (biết trước, không sửa được)

- Phiên đăng nhập và cookie ngôn ngữ gắn theo tên miền → người dùng **phải đăng nhập lại** một lần trên tên miền mới.
- App đã cài ra màn hình (PWA) theo tên miền cũ vẫn mở tên miền cũ → redirect sang mới.
- Lượt đăng ký lịch (`/api/calendar/liverpool.ics`) cũ vẫn chạy qua redirect.
- Đổi cả tên thương hiệu lẫn tên miền cùng lúc: thứ hạng Google thường **dao động 2–6 tuần** rồi hồi lại nhờ 301 + Change of Address.

## 6. Kiểm tra sau khi chuyển — (Claude chạy)

- [ ] `https://anfielddaily.com` mở được, SSL hợp lệ.
- [ ] `www.liverpoolfcvn.blog/news/...` → 308 → `anfielddaily.com/news/...` (cùng đường dẫn).
- [ ] `<link rel="canonical">`, hreflang, `og:url` trỏ `anfielddaily.com`.
- [ ] `/sitemap.xml` và dòng `Sitemap:` trong `/robots.txt` dùng `anfielddaily.com`.
- [ ] JSON-LD (WebSite, Organization) dùng `anfielddaily.com`.
- [ ] Ảnh chia sẻ (`/opengraph-image`) hiện logo + tên mới (thử Facebook Sharing Debugger).
- [ ] Đăng nhập Google / email chạy, quay về `anfielddaily.com`.
- [ ] Lần sync tin kế tiếp của GitHub Actions thành công.
- [ ] Sửa README và `docs/en/deployment.md`, `docs/vi/deployment-faq.md` sang tên miền mới.

## Rollback

Đặt lại `NEXT_PUBLIC_SITE_URL=https://www.liverpoolfcvn.blog`, gỡ redirect ở bước 2, `vercel redeploy`.
