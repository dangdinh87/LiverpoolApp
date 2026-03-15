# Deployment — Hoi & Dap

Tai lieu giai thich chi tiet cac khai niem deployment cho nguoi moi.

---

## 1. Vercel la gi? Tai sao dung Vercel?

**Vercel** la nen tang hosting chuyen cho Next.js (cung cong ty lam ra Next.js). Ban push code len GitHub → Vercel tu dong build va deploy.

**Tai sao khong dung hosting truyen thong (Hostinger, VPS)?**
- Next.js dung **Server Components** + **API Routes** → can server chay Node.js, khong phai HTML tinh
- Vercel toi uu san cho Next.js: cache, CDN toan cau, serverless functions
- Hobby plan **mien phi** (du cho fan site)
- Hostinger chi dung de **mua domain**, khong host code

---

## 2. Tai sao can ca Vercel LAN Hostinger?

| | Hostinger | Vercel |
|---|---|---|
| **Vai tro** | Ban domain (ten mien) | Host code + chay website |
| **Vi du** | Mua `liverpoolfcvn.blog` | Chay Next.js app |
| **Tuong tu** | Mua bien so xe | Xuong che tao xe |

Hostinger chi giu "ten" (`liverpoolfcvn.blog`). Khi ai go ten do, DNS se chi duong den Vercel — noi code thuc su chay.

---

## 3. DNS la gi? A Record, CNAME la gi?

**DNS** (Domain Name System) = "danh ba dien thoai" cua internet.

Trinh duyet khong hieu `liverpoolfcvn.blog` — no can **dia chi IP** (vi du `76.76.21.21`). DNS dich ten mien → IP.

### A Record (Address Record)

```
liverpoolfcvn.blog → 76.76.21.21 (IP cua Vercel)
```

Noi thang: "domain nay o IP nay"

### CNAME Record (Canonical Name)

```
www.liverpoolfcvn.blog → cname.vercel-dns.com
```

Noi gian tiep: "domain nay giong domain kia" (Vercel tu xu ly phan con lai)

### Tai sao can ca 2?

- A Record cho `liverpoolfcvn.blog` (khong www)
- CNAME cho `www.liverpoolfcvn.blog` (co www)
- Nguoi dung go kieu nao cung vao duoc

---

## 4. NEXT_PUBLIC_SITE_URL dung de lam gi?

Bien nay cho website biet "toi dang o domain nao". No duoc dung o:

| Noi dung | Muc dich |
|---|---|
| `metadataBase` | Google biet domain chinh de index |
| `canonical URL` | Tranh SEO trung lap (vercel.app vs domain chinh) |
| `sitemap.xml` | Google bot crawl dung URL |
| `robots.txt` | Chi Google bot toi sitemap |
| `JSON-LD` | Google Rich Results hien thi dung |
| `OAuth redirect` | Sau dang nhap, redirect ve dung domain |

**Neu khong doi?** Google se index `liverpool-app-five.vercel.app` thay vi `liverpoolfcvn.blog`. Dang nhap co the loi redirect.

---

## 5. Tai sao phai cap nhat Supabase Auth URLs?

Khi user dang nhap (Google OAuth hoac email), flow la:

```
User bam Login
  → Chuyen toi Supabase Auth
  → Supabase xac thuc
  → Redirect VE website ← day la van de
```

Supabase can biet **domain nao duoc phep redirect ve**. Neu ban chi cho phep `liverpool-app-five.vercel.app` ma user dang o `liverpoolfcvn.blog` → Supabase **tu choi redirect** → dang nhap that bai.

**Cach fix:** Them `https://www.liverpoolfcvn.blog/**` vao Supabase Dashboard → Authentication → URL Configuration → Redirect URLs.

---

## 6. SSL/HTTPS tu dong la sao?

**SSL** = chung chi bao mat cho `https://` (o khoa tren trinh duyet).

Vercel **tu dong** cap SSL qua Let's Encrypt khi domain verified. Ban khong can lam gi.

**Neu khong co SSL:**
- Trinh duyet hien canh bao "Not Secure"
- Google giam ranking SEO
- Form dang nhap gui mat khau khong ma hoa

---

## 7. Cron Jobs la gi? Tai sao can?

**Cron Job** = tac vu tu dong chay theo lich (khong can ai bam).

Website co 3 cron jobs:

| Cron | Lich | Lam gi |
|---|---|---|
| `/api/news/sync` | 6h sang UTC moi ngay | Lay tin moi tu 17+ nguon RSS → luu vao database |
| `/api/news/cleanup` | 3h sang UTC moi ngay | Xoa tin cu >30 ngay (soft), >60 ngay (hard) |
| `/api/news/digest/generate` | 0h UTC moi ngay | AI tao ban tom tat tin tuc hang ngay |

**Neu khong co cron?** Trang tin tuc se khong co bai moi, tin cu chat dong, khong co daily digest.

**CRON_SECRET** la mat khau bao ve cac API nay. Khong co no, ai cung co the goi `/api/news/sync` va spam database.

### Cau hinh trong vercel.json

```json
{
  "crons": [
    { "path": "/api/news/sync", "schedule": "0 6 * * *" },
    { "path": "/api/news/cleanup", "schedule": "0 3 * * *" },
    { "path": "/api/news/digest/generate", "schedule": "0 0 * * *" }
  ]
}
```

Vercel tu dong gui request kem header `Authorization: Bearer <CRON_SECRET>`.

---

## 8. Redeploy la gi? Tai sao can sau khi doi env?

Env variables duoc doc **luc build**, khong phai luc user truy cap. Khi ban doi `NEXT_PUBLIC_SITE_URL` tren Vercel, deployment cu van chay voi gia tri cu.

**Redeploy** = build lai tu dau voi env moi → website moi se dung `liverpoolfcvn.blog` thay vi `vercel.app`.

### Cach redeploy

**CLI:**
```bash
vercel --prod
```

**Dashboard:** Vercel → Deployments → deployment moi nhat → ⋮ → Redeploy

---

## 9. DNS Propagation mat bao lau?

Sau khi doi DNS tren Hostinger, thay doi can **lan truyen** (propagate) den tat ca DNS server tren the gioi.

- **Thuong:** 5-30 phut
- **Toi da:** 48 gio (hiem)
- **Kiem tra:** dung lenh `dig liverpoolfcvn.blog` hoac trang web dnschecker.org

Trong thoi gian propagate, mot so nguoi co the vao duoc, mot so thi chua — binh thuong.

---

## 10. Vercel Hobby Plan co gioi han gi?

| Gioi han | Gia tri |
|---|---|
| Bandwidth | 100 GB/thang |
| Serverless function timeout | 10 giay |
| Cron jobs | 2 cron (nhung co the gop) |
| Build time | 45 phut/build |
| Deployments | Khong gioi han |
| Gia | **Mien phi** |

Du cho fan site. Neu luong truy cap tang manh → nang len Pro ($20/thang).

---

## 11. Quy trinh deploy day du (toan bo buoc)

```
1. Code xong → push len GitHub
2. Vercel tu dong detect → build → deploy
3. Kiem tra preview URL (*.vercel.app)
4. Neu OK → Vercel tu dong alias sang domain chinh (liverpoolfcvn.blog)
5. SSL tu dong cap
6. Website live!
```

### Khi doi domain moi (lan dau)

```
1. Mua domain tren Hostinger
2. Them domain tren Vercel Dashboard (Settings → Domains)
3. Cau hinh DNS tren Hostinger:
   - A record:  @ → 76.76.21.21
   - CNAME:     www → cname.vercel-dns.com
4. Cho DNS propagate (5-30 phut)
5. Verify tren Vercel (Valid Configuration)
6. Doi NEXT_PUBLIC_SITE_URL tren Vercel env
7. Cap nhat Supabase Auth URLs
8. Redeploy (vercel --prod)
9. Xong!
```
