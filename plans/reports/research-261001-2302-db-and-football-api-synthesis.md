# Các loại DB & API bóng đá cho LiverpoolApp — báo cáo tổng hợp

**Ngày:** 2026-10-01 · Gộp 2 báo cáo researcher + tự kiểm lại các con số then chốt (trang giá chính thức / gọi API thật).
Báo cáo gốc (có lỗi, xem §5): [db-options](researcher-261001-2302-db-options.md) · [football-api-landscape](researcher-261001-2302-football-api-landscape.md) · Liên quan: [db-data-sources-synthesis](research-261001-1652-db-data-sources-synthesis.md)

---

## 1. Kết luận nhanh

- **DB:** chưa cần dời. Restore Supabase, tìm ra **vì sao bị pause dù có cron sync mỗi giờ**, rồi theo dõi. Chỉ dời sang **Neon free + Auth.js + Cloudinary** (cùng stack cv-app, $0) nếu bị pause lại. Migration là việc cỡ L, không nên làm khi chưa biết nguyên nhân.
- **API bóng đá:** stack **$0** hiện tại (football-data.org + ESPN + FPL) + thêm **API chính chủ Premier League** là đủ dữ liệu, với điều kiện cron ghi vào DB. Nếu muốn một API có tài liệu cho đội hình ra sân/live thì thử **Highlightly free (100 req/ngày)** trước, nâng PRO $9.49 chỉ khi cần.
- **Không xây trên** Goal-api / BigBallsData / Bzzoiro: dịch vụ mới, thiên về kèo cá cược, chưa rõ chất lượng và độ bền.

## 2. DB — so sánh (số đã tự kiểm 1/10)

| Lựa chọn | Free | Pause/ngủ | Auth | File | Trả tiền | Effort dời |
|---|---|---|---|---|---|---|
| **Supabase** (đang dùng) | 500 MB DB, 1 GB file, 5 GB egress, 50k MAU, 2 project active ✅ | **Pause sau 1 tuần không hoạt động** ✅, phải restore tay | ✅ có sẵn | ✅ có sẵn | Pro từ $25/th, **không pause** ✅ | — |
| **Neon** | 100 CU-giờ/project/th, 1 GB/project (20 GB tổng), 100 project, 5 GB egress ✅ | Scale-to-zero sau 5 phút, **tự thức** khi có query ✅ (không có kiểu pause cần restore tay) | ❌ → Auth.js (như cv-app) | ❌ → Cloudinary | Launch: theo usage, **không phí tối thiểu** ✅ | **L** |
| Prisma Postgres | theo báo cáo: free có hard cap | không pause | ❌ | ❌ | usage | L (chưa kiểm) |
| Turso (SQLite) | theo báo cáo: 5 GB | không pause | ❌ | ❌ | usage | L+ (đổi dialect) |
| Convex / MongoDB / DynamoDB / Firestore | — | — | — | — | — | **XL**: không phải SQL quan hệ → loại |

**Lưu trữ file (avatar) nếu rời Supabase:** Cloudinary (app đã dùng cho gallery) là lựa chọn tự nhiên. Vercel Blob Hobby chỉ có **1 GB storage, 10k simple ops, 2k advanced ops, 10 GB transfer/tháng**; vượt hạn mức thì bị khoá tới hết 30 ngày ✅.

**Cache:** chưa cần Upstash/Redis. Khi cron ghi snapshot bóng đá vào Postgres thì DB chính là cache.

### Điều bất thường cần làm rõ trước khi chọn

App **đã có** GitHub Action gọi `/api/news/sync` mỗi giờ (1.326 lần chạy, lần cuối ghi nhận 18/9, đều "success"). Sync ghi vào DB, đáng lẽ phải tính là "hoạt động". Vậy mà project vẫn bị pause, nên "thêm cron keep-alive" (đề xuất của researcher) **chưa chắc giải quyết được**. Cần xem lý do pause trên dashboard Supabase. Giả thuyết:
- Sync trả "success" nhưng không thực sự chạm DB.
- Pause vì lý do khác (vượt quota?).
- Supabase định nghĩa "hoạt động" khác với giả định của mình.

### Chi phí dời sang Neon (nếu phải dời)

- ~100 chỗ gọi `supabase-js` query builder → viết lại bằng SQL/Drizzle.
- 34 RLS policy → kiểm quyền ở tầng app (mọi route ghi phải check `userId`).
- Auth: Google OAuth → Auth.js (copy pattern cv-app). User email/mật khẩu phải đặt lại mật khẩu, hoặc export hash bcrypt từ `auth.users` → **cần biết có bao nhiêu user** trước khi quyết.
- Avatar: bucket `avatars` → Cloudinary.
- Ước lượng 3–4 ngày công (theo báo cáo researcher, mình chưa kiểm).

## 3. API bóng đá — bản đồ

### A. Enterprise (giá liên hệ, ngoài tầm)
Opta/Stats Perform (nhà cung cấp chính thức của PL), Sportradar (có trial 30 ngày theo báo cáo), Genius Sports, Hudl StatsBomb.

### B. API thương mại cho dev

| Nhà cung cấp | Free | Trả tiền rẻ nhất | Ghi chú | Kiểm |
|---|---|---|---|---|
| **football-data.org** (đang dùng) | 10 req/phút, 12 giải, **tỉ số trễ** | €12 live · €29 "Deep Data" (đội hình, ghi bàn, thẻ, squad) · +€15 add-on thống kê (kiểm soát bóng, sút…) | Ổn định, hợp pháp | ✅ trang giá |
| **Highlightly** | BASIC $0, 100 req/ngày, gồm live, mọi giải, **đội hình ra sân**, cầu thủ | PRO $9.49 (7.500/ngày) · ULTRA $20.99 | Đội hình có khi được xác nhận, thường 30–60 phút trước giờ đá | ✅ trang giá |
| **API-Football** (api-sports) | 100 req/ngày, đủ endpoint | ~€19/th theo báo cáo | **Gói free có lấy được mùa hiện tại không: CHƯA XÁC MINH** (trang giá 403; hồi tháng 3 bị chặn) → muốn chắc thì đăng ký key free gọi thử | ⚠️ |
| Goal-api | 1.000 req/ngày, 1.019 giải | $19/th (10k/ngày) | Mới, có kèo cá cược | 🔎 qua tìm kiếm |
| BigBallsData | 250 req/ngày (500 nếu dùng GitHub) | Edge $149/th (kèm kèo) | Mới, 9 môn thể thao, thiên về kèo | 🔎 qua tìm kiếm |
| SportMonks | theo báo cáo: free 2 giải, không có PL | theo báo cáo €29/th | — | ❌ chưa kiểm |
| TheSportsDB | free cơ bản, dữ liệu cộng đồng | Patreon | Dữ liệu cũ/thiếu | ❌ chưa kiểm |

### C. JSON không chính thức (website công khai đang dùng)

| Nguồn | Gọi thử 1/10 | Có gì |
|---|---|---|
| **Premier League** `footballapi.pulselive.com` (header `Origin: https://www.premierleague.com`) | ✅ 200. Mùa 2026/27 = compSeason **841**; 5 trận LFC đã đá (vd Newcastle 2–2 Liverpool) | Lịch, tỉ số, ghi bàn, khán giả, sân, vòng đấu. **Chỉ PL** |
| **ESPN** `site.api.espn.com` | ✅ (đã kiểm phiên trước) | Thống kê trận, diễn biến, đội hình, mọi giải |
| **FPL** | ✅ (đã kiểm phiên trước) | Chấn thương/treo giò, xG (PL) |
| **FotMob** `www.fotmob.com/api/data/teams?id=8650` | ✅ 200 (~700 KB). `/api/teams` → 404 | squad, fixtures, stats, table, **transfers**, history |
| Sofascore `api.sofascore.com` | ❌ 403 | — |

### D. Dữ liệu mở
- openfootball (CC0): chỉ giải VĐQG, **cập nhật trễ** (ngày 1/10 mới có kết quả tới 20/9).
- StatsBomb open-data: chỉ dữ liệu lịch sử; license hai báo cáo ghi khác nhau (CC0 vs BY-NC) → chưa xác minh, không cần dùng.

## 4. Stack đề xuất cho LiverpoolApp

| Dữ liệu | $0 (đề xuất) | Nếu chi ≤ $10/th | Nếu chi ~€30–45/th |
|---|---|---|---|
| Lịch / kết quả / BXH | football-data.org free + PL API (PL) + ESPN (cúp) | như trái | football-data.org €12 (live) |
| Live score | ESPN / PL API (polling khi đang có trận) | Highlightly PRO | football-data.org €12 |
| Đội hình ra sân | ESPN | **Highlightly** (BASIC free trước) | football-data.org Deep Data €29 |
| Thống kê trận | ESPN summary | như trái | football-data.org +€15 add-on |
| Chấn thương | FPL (chỉ PL) | như trái | như trái |
| xG | FPL (chỉ PL) | như trái | như trái |
| Chuyển nhượng | không có (FotMob có, nhưng ToS rủi ro) | — | — |

**Quy tắc chung:** mọi nguồn chỉ được gọi qua **cron → ghi DB**, trang chỉ đọc DB. Với một CLB duy nhất, lưu lượng thật chỉ vài chục đến vài trăm request/ngày, nên gói free 100 req/ngày là đủ.

## 5. Đính chính 2 báo cáo researcher

| Báo cáo nói | Thực tế (kiểm 1/10) |
|---|---|
| Neon "$14/mo" cho phương án B | Neon free (100 CU-giờ, 1 GB/project) có khả năng đủ; Launch tính theo usage, **không phí tối thiểu** |
| Vercel Blob "~100 GB free" | Hobby: **1 GB** storage, 10 GB transfer |
| Cron keep-alive giải quyết pause | App đã có cron mỗi giờ mà vẫn bị pause → nguyên nhân chưa rõ |
| API-Football free có mùa hiện tại, "Tested" | **Không gọi thử hôm nay**; trang giá 403 → chưa xác minh |
| Goal-api "không có gói trả tiền" | Có, $19/th |
| Highlightly $5.99/th | PRO **$9.49**; BASIC $0 đã có đội hình ra sân + mọi giải |
| PL API "chưa có season ID 2026-27" | Có: **841**, gọi ra dữ liệu LFC |
| FotMob "unverified" | `/api/data/teams` chạy (200), có transfers |
| openfootball "cập nhật hằng ngày" | Đang trễ ~10 ngày |

## Câu hỏi còn mở

1. Lý do Supabase pause (xem dashboard)? Restore còn được không?
2. Có bao nhiêu user đăng ký, và bao nhiêu dùng email/mật khẩu (quyết định chi phí dời auth)?
3. API-Football gói free có lấy được mùa 2026 không? (cần đăng ký key free gọi thử)
4. Highlightly / FotMob / PL API: ToS về việc lưu dữ liệu vào DB riêng?
5. Có muốn có live score phút-theo-phút không? Nếu có thì cron mỗi giờ không đủ, cần polling trong giờ có trận.

## Nguồn

- Supabase pricing: https://supabase.com/pricing
- Neon pricing: https://neon.com/pricing
- Vercel Blob pricing: https://vercel.com/docs/vercel-blob/usage-and-pricing
- football-data.org pricing: https://www.football-data.org/pricing
- Highlightly: https://highlightly.net/football-api/
- Goal-api: https://goal-api.com/
- BigBallsData: https://bigballsdata.com/
- PL API (thử): https://footballapi.pulselive.com/football/competitions/1/compseasons
- FotMob (thử): https://www.fotmob.com/api/data/teams?id=8650
