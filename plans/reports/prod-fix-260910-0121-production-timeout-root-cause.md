# Production Fix — timeout ở `/` và `/gallery`

**Ngày:** 2026-09-11 · **Deploy:** `fda62c7` → production Ready (49s)

---

## 1. Triệu chứng

| Route | Trước | Sau |
|---|---|---|
| `/` | **timeout >70s** (HTTP 000) | 200 · cold 26.8s · **warm 0.80s** |
| `/gallery` | **timeout mọi lần** | 200 · **8.0s** |
| `/news` | 200 nhưng 60s | 200 · **0.95s** |
| 18 route tổng | 2 chết, 1 sát ngưỡng | **0 lỗi** |

---

## 2. Nguyên nhân gốc

Commit `abfe0cd` ("commit the modules the tree imports but git never had") chỉ đưa
**file mới** lên để build qua, **không kèm phần sửa các file cũ dùng chúng**. Kết quả:
production ở trạng thái nửa vời.

`git show HEAD:<file> | grep createSupabaseFetch` — **0/5 client được nối**:

| File | Production trước deploy |
|---|---|
| `supabase-server.ts` | không nối |
| `supabase.ts` | không nối |
| `news/supabase-service.ts` | không nối |
| `gallery/queries.ts` | không nối |
| `middleware.ts` | không nối |

⇒ Mọi call Supabase vẫn chạy trên platform `fetch` (không timeout). DB chết ⇒ đợi
Cloudflare bỏ cuộc ở ~90s ⇒ cold render vượt giới hạn function ⇒ trả về rỗng.

Bằng chứng từ log production:
```
level: error   requestPath: /   cache: MISS
revalidating cache with key: getSiteSetting("homepage_hero_image")
Error 522: Connection timed out — zone: menrdepfthgregzgnvuo.supabase.co
```

Ngoài ra production còn thiếu: `DEFAULT_CHAT_AI_MODEL = 'qwen/qwen3-32b'` (model Groq
đã khai tử ⇒ chat chết) và `season: 2025` + 14 chuỗi `2025/26` (hiển thị sai mùa).

## 2b. Nguyên nhân thứ hai — gallery

DB path xin `limit: 50`; fallback render **cả 354** entry của `gallery.json`.
DB chết ⇒ luôn vào fallback ⇒ **1.0 MB HTML mỗi cold render**. Đã cap → 0.26 MB.

`getUser()` còn nằm **ngoài** try/catch và **sau** query ảnh ⇒ tốn timeout thứ hai
liên tiếp. Đã bọc guard (mặc định không phải admin) + cho chạy song song.

---

## 3. Phân tích chi phí cold render (đo, không đoán)

Thí nghiệm hạ timeout Supabase và đo lại:

| Timeout Supabase | `/gallery` cold | `/` cold |
|---|---|---|
| 8s | 15.17s | — |
| 3s | 10.09s | 10.19s |
| 500ms | 7.58s | 7.14s |

⇒ Mô hình: **~7.1s cố định + đúng 1 timeout Supabase tuần tự**. Nên hạ timeout 8s → 3s.
`/about` cold chỉ 0.17s ⇒ navbar/auth không phải nguyên nhân (không session cookie thì
`getUser()` không gọi mạng).

---

## 4. Đã deploy — 7 commit

| Commit | Nội dung |
|---|---|
| `723f1ac` | Nối 5 client Supabase vào bounded fetch; timeout 8s→3s; middleware bound + chịu lỗi |
| `3467c7a` | Gallery: cap fallback 354→50; guard + song song hoá admin check |
| `a6a1856` | Chat/dịch/digest → VietAPI (model Groq đã chết); auth outage trả 503 thay vì 401 |
| `34e4627` | Mùa giải suy ra từ ngày (2026/27), bỏ mọi số cứng |
| `79e600a` | Fixture timeline: bỏ đọc clock trong render (hydration) |
| `022985d` | Bỏ RSS sync khỏi đường render; sitemap per-request |
| `fda62c7` | ESLint bỏ qua build output; sửa empty interface |

Verify trước deploy: build ✅ · 115 unit ✅ · 86 e2e ✅ · lint 0 error.

---

## 5. Còn lại

1. **Supabase VẪN chết** — chưa resume. Feed tin vẫn rỗng; đăng nhập/chat/gallery data
   chưa hoạt động thật. Code giờ degrade nhanh thay vì treo, nhưng không thay được dữ liệu.
2. **`/gallery` 8.0s** = 3s Supabase (do DB chết) + ~5s render 50 ảnh. Resume DB sẽ về ~5s.
   Muốn nhanh hơn cần tách admin check ra client để trang vào được ISR, hoặc phân trang nhỏ hơn.
3. **`/sitemap.xml` 11s** — dynamic, gọi Supabase + football. Chỉ crawler dùng nên tạm ổn.
4. **~7.1s cold render cố định** ở `/` và `/gallery`, không liên quan Supabase. Chưa tìm ra.
5. Cảnh báo Next.js: `middleware` convention deprecated (có codemod), Edge Runtime deprecated.
6. 40 lỗ hổng npm audit (1 critical) — `audit fix --force` sẽ kéo major, cần phiên riêng.
