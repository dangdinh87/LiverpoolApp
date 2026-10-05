# Vì sao liverpool-app tốn tiền Vercel (05/10/2026)

Nguồn: Vercel billing API (`/v1/billing/charges`, lọc `Tags.ProjectName=liverpool-app`), project settings API, `curl -I` prod, đọc code. Chưa sửa gì.

## Số liệu

| | Tháng 9 | Nhịp tháng 10 (1–3/10) |
|---|---|---|
| Fluid Provisioned Memory | 674 GB-giờ — $7.14 | ~13 GB-giờ/ngày → ~$4.2/tháng |
| Fluid Active CPU | 14.1 giờ — $1.82 | ~$1.2/tháng |
| Fast Origin Transfer + phần còn lại | ~$0.6 | ~$0.4 |
| **Tổng** | **~$9.6** | **~$5.8/tháng** |

- CPU thấp nhưng memory cao → function chủ yếu ngồi **chờ I/O** (Supabase, API bóng đá, RSS) chứ không tính toán gì.
- 03/9 memory tăng vọt 4.5 → 24 GB-giờ/ngày; 08–10/9 lên ~50. Sau commit 11/9 `022985d perf(news): take RSS syncing off the page-render path` giảm về ~25, tháng 10 còn ~13. Số lượt gọi gần như không đổi (~12k/ngày).
- Memory bị tính ở **19 region** (Montréal, São Paulo, Cape Town…): đó là middleware chạy ở edge gần người truy cập, kể cả bot.
- 22–28/9: liverpool-app có 0 request, trong khi các project khác vẫn có số liệu → site không nhận traffic cả tuần. Domain còn hạn tới 03/2027. **Chưa rõ nguyên nhân.**

## Ai gọi function? (gần như không phải người)

- Người thật: Web Analytics tháng 9 = **1.285 event** (~40 lượt xem/ngày).
- Function invocations tháng 9 = **280k** (~9.300/ngày) → **>99% không phải lượt xem của người**:
  - Bot/crawler: `robots.txt` cho phép tất cả (`Allow: /`), memory phát sinh ở 19 region toàn cầu.
  - Mỗi request đi qua cả middleware lẫn function.
  - Cron GitHub `news-sync.yml` chạy mỗi giờ (`0 * * * *`), `/api/news/sync` có `maxDuration` 120 s.
- Mỗi lượt bot = render đầy đủ (không cache) ở Mỹ, chờ DB ở Singapore → ~4 s × 2 GB.

## Nguyên nhân (đã xác minh)

1. **Function chạy ở `iad1` (Washington, Mỹ)**: `functionDefaultRegions: ["iad1"]`, không có `regions` trong `vercel.json`. Header prod `x-vercel-id: hkg1::iad1::…`. Người xem ở VN, Supabase ở **`ap-southeast-1` Singapore** (IP `db.<ref>.supabase.co` khớp AWS ip-ranges) → mỗi query đi vòng qua Thái Bình Dương, function phải sống lâu hơn để chờ.
2. **`export const dynamic = "force-dynamic"` ở root layout** (`src/app/layout.tsx:47`, có từ commit đầu 03/2026). Dòng này vô hiệu hoá mọi `revalidate` của trang con (`/` 300s, `/standings` 6h, `/history` 24h…). Prod: `cache-control: private, no-cache, no-store`, `x-vercel-cache: MISS` → **mỗi lượt xem = 1 lần render + gọi API ngoài**.
   - Lý do gốc: locale lấy từ cookie `NEXT_LOCALE` → `Accept-Language` (`src/i18n/request.ts`) → đọc `cookies()/headers()` nên trang buộc phải dynamic.
3. **Middleware chạy trên mọi route** (matcher bắt hết trừ file tĩnh). Với trang public, nó chỉ set `Cache-Control: private, max-age=60…` + `Vary`, nhưng header này **bị Next ghi đè** (prod không thấy) → mỗi lượt xem tốn thêm 1 invocation ở edge mà không được gì.
4. Speed Insights đang bật nhưng `hasData: false`.

## Cách sửa (xếp theo công)

| # | Việc | Công | Tác động ước tính |
|---|---|---|---|
| 1 | `vercel.json`: `"regions": ["sin1"]` (Supabase đã xác nhận ở `ap-southeast-1`; API bóng đá đã cache qua `next.revalidate`/`unstable_cache` nên không chậm thêm) | 1 dòng | Thời gian chờ mỗi request giảm rõ → memory giảm. Trang cũng nhanh hơn cho người xem |
| 2 | Thu hẹp matcher middleware còn `/profile/:path*`, `/auth/:path*`, `/api/:path*`; bỏ nhánh set header cho trang public | ~10 dòng | Bớt khoảng một nửa invocation, hết chạy ở 19 region |
| 3 | Tắt Speed Insights | Dashboard | Nhỏ |
| 4 | Đưa locale vào URL (next-intl `localePrefix: 'as-needed'`: vi ở `/`, en ở `/en`), bỏ `force-dynamic` → ISR chạy theo `revalidate` đã khai báo | ½–1 ngày | Lớn nhất: phần lớn traffic phục vụ từ CDN, function chỉ chạy khi revalidate. Bỏ tự nhận diện qua `Accept-Language` / cookie → cần redirect thay thế |

Làm #1–#3 trước (khoảng 15 phút, rủi ro thấp). Đo lại 3–5 ngày rồi mới quyết #4.

## Đã làm (05/10/2026)

Traffic 24h (`vercel firewall traffic list`, CLI 62): 10.6k request được cho qua. Bot đã xác minh: meta-externalagent 1.9k, bingbot 936, petalbot 805, facebookexternalhit 392, tiktokspider 269. Ngoài ra curl/8.7.1 1.2k (Bucklog SARL) và HostRoyale 719.

| Việc | Trạng thái |
|---|---|
| Firewall: Bot Protection → challenge | **Đang ở dạng nháp — chờ `vercel firewall publish`** |
| Firewall: AI Bots → deny | Đang ở dạng nháp |
| Firewall: rule "Block PetalBot" (UA chứa `PetalBot` → deny) | Đang ở dạng nháp |
| Region mặc định của project `iad1` → `sin1` (API) | Đã lưu; có hiệu lực từ lần deploy kế tiếp |
| Redeploy prod để áp `sin1` | Hệ thống chặn agent deploy prod → chờ user tự chạy |
| Code: nhánh `perf/vercel-cost-cut` (từ `origin/master` = `fda62c7`, worktree `~/LiverpoolApp-worktrees/vercel-cost-cut`): `vercel.json` `regions: ["sin1"]`; middleware matcher chỉ còn `/profile/:path*`, `/auth/:path*` | Xong, chưa commit. Test matcher 9/9 PASS, `tsc` + `eslint` sạch |

**Cập nhật 05/10 01:10 — đã lên prod:**

- Firewall đã publish: Bot Protection challenge, AI Bots deny, Block PetalBot. Thêm rule **"Bypass bot checks: authenticated news crons"** (path bắt đầu bằng `/api/news/` VÀ có header `authorization`, xếp ưu tiên đầu). Không có rule này, cron GitHub dùng `curl` sẽ bị challenge.
  - Đã kiểm tra: không có auth → 429; có Bearer sai → 401 do app trả về (đi qua firewall, không chạy sync).
- Commit `017a676` đã push lên `master`, deploy Ready trong 41 s. Header prod `x-vercel-id: hkg1::sin1::…` → function đã chạy ở Singapore.
- Theo dõi: preview link của Zalo/Telegram (bot chưa xác minh) có thể bị challenge → nếu share link mất preview, thêm bypass theo UA.
- Lượt sync tin tức tiếp theo nên kiểm tra bằng `gh run list -R dangdinh87/LiverpoolApp`.

Cố ý chưa làm:
- Đưa locale vào URL / bỏ `force-dynamic`: nhánh audit `fix/full-audit-261001` đang sửa dở 59 file trong `src/app` → refactor sẽ xung đột nặng. Sau khi chặn bot, phần tiết kiệm thêm chỉ còn < $1/tháng.
- Cron news-sync mỗi giờ: phần sửa dở của nhánh audit đang dựa vào lượt chạy hằng giờ để retry digest.
- Merge sau này: nhánh audit cũng sửa `src/middleware.ts` (+`db: { retry: false }`), khác hunk nên sẽ tự merge được.

## Câu hỏi chưa rõ

- Vì sao 22–28/9 site không nhận request nào? (tạm dừng tay? lỗi DNS ở Hostinger?)
- Có cần giữ tự nhận diện ngôn ngữ qua cookie/`Accept-Language` không, hay chỉ cần nút đổi ngôn ngữ dẫn sang `/en`?
