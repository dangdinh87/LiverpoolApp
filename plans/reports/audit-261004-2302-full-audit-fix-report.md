# Audit & cải thiện toàn diện — LiverpoolApp

**Ngày:** 2026-10-01 → 2026-10-04 · **Branch:** `fix/full-audit-261001` (tách từ `fda62c7` = production hiện tại) · **Chưa commit / push.**
**Yêu cầu:** phân tích và cải thiện lại tất cả.
**Cách làm:** 4 agent phân tích song song (bảo mật, hiệu năng, dữ liệu/tin tức, UI/SEO trên production) → sửa (lead + 3 agent sửa theo vùng file riêng) → 1 agent review toàn bộ diff → sửa phát hiện review → kiểm chứng.

---

## 1. Kết quả tổng quan

| Hạng mục | Trước | Sau |
|---|---|---|
| `/` (DB chết, local prod) | 10.4s mỗi request | **1.5s** lần đầu · **0.02s** sau |
| `/news` | 22.1s | **0.04s** |
| `/gallery` | 7.1s | **0.39s** |
| Trang bài viết | 24.3s mỗi request | **0.7s** lần đầu · 0.34s sau |
| `/sitemap.xml` | 7–10s | **0.23s** |
| JS tải lần đầu (`/about`, gzip) | 572 KB | **370 KB** (−35%) |
| Lỗ hổng npm (production deps) | 11 (1 critical: RCE `next/og`) | **0** |
| Unit test | 115 | **190** (26 file) |
| Lint | 0 error / 29 warning | 0 error / 24 warning |
| Typecheck · build | ✅ | ✅ |
| E2E (Playwright, desktop + mobile) | 86 pass (09/2026) | **86/86 pass** |

Số đo "trước" của trang lấy từ báo cáo agent hiệu năng (cùng điều kiện: build production local, Supabase chết).

---

## 2. Nguyên nhân gốc lớn nhất: "~7s cố định" bí ẩn

`postgrest-js` tự retry GET hỏng **3 lần với backoff 1s + 2s + 4s**, chỉ bỏ qua lỗi tên `AbortError`. Wrapper timeout của mình ném `TimeoutError`/`Error` ⇒ mỗi bước Supabase tốn timeout + 7s, circuit breaker vô dụng.
→ Wrapper ném `AbortError`, thêm `db: { retry: false }` cho cả 5 client. Đây là phần lớn mức tăng tốc ở §1.

Các phần còn lại của `/news` 22s: **AI digest được sinh ngay trên đường render** (race 15s) + một bước "backfill" chạy lại **y hệt** truy vấn trước.

---

## 3. Đã sửa — theo nhóm

### Bảo mật
| Mức | Lỗi | Sửa |
|---|---|---|
| P1 | **SSRF**: slug base64 kiểu cũ `/news/<b64>` giải mã ra URL bất kỳ ⇒ server tải và **render trang lạ dưới domain mình**; `/api/news/translate` (ẩn danh) tải URL bất kỳ rồi gửi sang LLM | `isKnownNewsSourceUrl()` + bảng host duy nhất (`source-hosts.ts`); chặn ở `scrapeArticle`, trang bài, translate, comments, likes; kiểm cả URL sau redirect |
| P1 | Open redirect sau đăng nhập (`/\evil.com`, `/.//evil.com`) | `src/lib/safe-redirect.ts` dùng chung + test |
| P1 | Bình luận công khai **email** người dùng | Tên hiển thị không bao giờ là email; migration 007 xoá email cũ |
| P1 | Chat: client chọn model tuỳ ý, gửi được `role: system`, không giới hạn độ dài/lượt | Allow-list model, chỉ user/assistant, 20 tin × 4000 ký tự, `maxOutputTokens`, 40 req/giờ/user |
| P0* | `articles`, `sync_logs`, `news_digests` **không bật RLS** ⇒ ai có anon key có thể sửa/xoá (kể cả chèn script vào nội dung bài) | Migration `007_…sql` (*cần chạy tay, xem §5) |
| P2 | `CRON_SECRET` nhận qua `?key=` (lộ vào log), so sánh không constant-time | Chỉ header Bearer + `timingSafeEqual` |
| P2 | Không có security header | `X-Frame-Options`, `frame-ancestors`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` |
| P3 | 2 server action ẩn danh (`syncNews`, `refreshDigest`) dùng service role + LLM | Xoá; `loadMoreNews` giới hạn limit |
| — | Đăng nhập Google **xoá bio/username** mỗi lần (upsert ghi đè) | `ignoreDuplicates` |
| — | Next 16.3.4 RCE `next/og` (critical), sanitize-html, lodash, nanoid, picomatch… | Next 16.3.8 + patch; prod deps 0 lỗ hổng |

### Hiệu năng & độ bền
- Supabase không retry (§2); digest chỉ sinh trong cron (+ bước retry mỗi giờ trong GitHub Actions, bỏ giờ 00 UTC để không trùng cron Vercel); bỏ backfill trùng lặp.
- Lỗi không còn bị "cache thành rỗng" hoặc "không bao giờ cache": hero setting, gallery (cache 30', tag + revalidate khi admin sửa), digest (ném lỗi để không cache null), danh sách tin trên `/` và `/news` (`requireNonEmptyNews` — phát hiện khi Supabase vừa resume: trang chủ trống tin 5 phút).
- Chat (assistant-ui + AI SDK + markdown) tách thành panel tải khi bấm lần đầu.
- Mùa đã kết thúc cache 30 ngày; `/stats` không còn so với mùa cứng `[2024, 2023, 2022]`, `?season=` được kiểm.
- 4 ảnh nền 2.23 MB → 0.74 MB (cwebp q72, so mắt không khác).

### Dữ liệu bóng đá
- **FPL lấy nhầm Ipswich** (team id 12 cứng; LFC giờ là 14) ⇒ mọi trang cầu thủ trống thống kê → tra theo `short_name === "LIV"`.
- Loạt luân lưu FDO hiện **1-5** (fullTime gồm penalty) → regular + extra time, thêm AET/PEN, W/L theo người thắng loạt pen.
- Cúp mùa trước lẫn vào 2026/27; `/stats` thiếu trận cúp; trận sắp tới ở cúp (Carabao R4 vs Chelsea 28/10) không hiện (ESPN bỏ date-range) → season theo ngày trận, `?fixture=true`.
- Phản lưới bị rơi khỏi diễn biến; trận hoãn tính như đã đá; mùa cũ link tới 404 (`getFixtureById` tìm cả mùa lưu trữ).
- Đội hình: script cập nhật viết lại cho trang Contentful/RSC mới; **+5** (Tsimikas, Chambers, McConnell, Koumas, Danns), **−4** (Elliott, Pecsi, Ramsay, Ndukwe); ảnh body của Jaroš trỏ vào thư mục → sửa. Diogo Jota (#20, trang CLB giữ tên để tưởng nhớ) bị loại khỏi đội hình đang thi đấu (`EXCLUDED_SLUGS`).

### Chat AI
- Web search chết (`groq/compound-mini` 404) → `openai/gpt-oss-20b` + `browser_search`, prompt có **ngày hôm nay** (không có ngày thì model tìm "2024" và trả lời HLV cũ).
- Khối "Current Facts" mỗi request: ngày, mùa 2026/27, **HLV Andoni Iraola**, đội hình từ `squad.json`. Trước đó chat trả lời "Arne Slot".
- Fallback model chưa từng chạy (lỗi provider nằm trong `fullStream`, không throw) → đọc `fullStream`, chuyển model khi lỗi trước token đầu, thông báo khi tất cả hỏng.
- Prompt dịch: **Julian Ward** = giám đốc thể thao (LFC xác nhận 09/2026), Hughes = cựu.

### Tin tức (agent)
- BBC (`bbc.co.uk`) và ZNews (`lifestyle.zingnews.vn`) **404 trong site** → bảng host có alias, slug `~host`.
- UA giả Chrome bị Reach (Echo, Mirror, MEN, Liverpool.com) chặn 403 → UA thật; This Is Anfield chỉ link-out.
- Ngày không múi giờ của Tuổi Trẻ/Bongda24h lệch **+7h tương lai** → đọc là +07:00; ngày tương lai chỉ clamp khi lưu và giữ ngày cũ khi resync.
- Bongdaplus gần như không lấy được bài; phân loại sai ("feel the heat" → chuyển nhượng, "bán kết" → bán, "4-3-3" → tỉ số); dedup xoá dấu tiếng Việt; lọc "Liverpool Street / city council / Liverpool Women".
- Feed: Sky → `/rss/11669`, Independent, VietNamNet đổi; bỏ webthethao (404), thethao247 (403), Goal/Vietnam.vn adapter chết.
- Cron cleanup báo `ok` khi DB chết → 503; giờ hiển thị theo giờ VN.

### i18n · SEO · UI
- Key thiếu: `BENTO.UNBEATEN` trên trang chủ, `Stats.noData.*`; **test mới** bắt key lệch EN/VI và key dùng trong code nhưng không có.
- Lỗi đăng nhập hiện chữ kỹ thuật tiếng Anh ("Supabase unavailable: … breaker is open") → mã lỗi, dịch EN/VI.
- Trang cầu thủ: bio/ngày sinh/meta theo ngôn ngữ; `/fixtures/[id]`, `/legal`, digest: ngày theo ngôn ngữ; "Matchday"/"H1"→"HT"; nội dung cũ (FPL, "10+ nguồn", "powered by Groq", version gõ tay).
- **Ảnh chia sẻ MXH**: hầu hết trang không có `og:image` (crest 110×200 khai là 1200×630) → mọi trang dùng card 1200×630; bỏ canonical toàn site (đang trỏ `/chat`, `/auth`, 404 về trang chủ); bài lỗi `noindex`; sitemap bỏ lastmod giả, thêm `/legal`; `/players` 308.
- Widget "Trận tiếp theo" không còn **bịa trận Liverpool vs Man City** khi thiếu dữ liệu.
- UI (agent): thẻ trận cắt mất đội khách ở 390px; header vỡ ở 768px (chuyển sang `lg`); icon header chìm trên ảnh; hero `/history` bị cắt; `/chat` nhốt người dùng (không có lối ra); BXH mobile mất cột Pts; chip gallery bị cắt, gallery ~27 MB (thumbnail nhỏ); trái tim yêu thích không có tên a11y; dropdown "The Club" dùng được bàn phím.

---

## 4. Kiểm chứng
- `tsc` sạch · lint 0 error · **190/190** unit (`TZ=UTC` cho phần tin tức cũng pass) · `next build` ✅ · **e2e 86/86** (sau khi cài Chromium mới mà Playwright bản vá cần: `npx playwright install chromium`).
- Server prod local: số đo §1; header bảo mật có mặt; `og:image` → `/opengraph-image` (200, PNG 1200×630); `/players` 308; slug SSRF trả UI 404 + `noindex`, **không** fetch URL nội bộ; translate URL lạ → 400; cron `?key=` → 401.
- API thật: Groq `gpt-oss-20b`+browser_search trả lời đúng "Andoni Iraola"; VietAPI model sai ⇒ phần `error` trong `fullStream` (fallback chạy đúng).
- Lưu ý: `test_extractors` / `test_bongdaplus` gọi website thật — một lần chạy fail do mạng, chạy lại pass.

---

## 5. Bạn cần làm (mình không tự làm được)
1. **Resume Supabase** (vẫn 522). Báo cáo `research-261001-2302-…` nêu: sync mỗi giờ vẫn "success" mà project vẫn bị pause — nên xem lý do pause trên dashboard.
2. **Chạy migration** `supabase/migrations/007_news_tables_rls_and_comment_privacy.sql` (SQL editor). Trước đó kiểm xem RLS trên `articles` đã bật chưa — nếu chưa, đây là lỗ P0.
3. Kiểm **"Confirm email"** đang bật trong Supabase Auth (admin xác định bằng email cứng trong RLS).
4. Nếu `CRON_SECRET` từng được dùng trong URL `?key=` (curl tay, cấu hình cũ) ⇒ **đổi secret** (Vercel env + GitHub secret).
5. Domain: `http://liverpoolfcvn.blog` → https → www là 2 bước, bước cuối 307 — đặt redirect 308 thẳng tới `https://www…` trong Vercel Domains.
6. Review + commit + deploy branch này (production vẫn là `fda62c7`).
7. Một next-server **không thuộc dự án này** chạy ở cổng 3200 đã bị agent UI tắt nhầm (`pkill -f next-server`) — khởi động lại nếu cần.

---

## 6. Chưa làm / để phiên sau
- **Trang tĩnh/CDN cache**: root layout `force-dynamic` + locale từ cookie ⇒ mọi trang dynamic, không CDN cache. Hướng: `app/[locale]` + `localePrefix: 'never'` hoặc `cacheComponents`. Rủi ro cao (đụng mọi route) — nên làm riêng.
- Soft 404 (status 200 khi `notFound()` sau khi stream bắt đầu dưới `loading.tsx`) — hiện đã có `noindex`.
- Rate limit vẫn in-memory theo instance — cần Upstash/Vercel KV hoặc Vercel Firewall rule cho `/api/chat-groq`, `/api/news/translate`.
- CSP đầy đủ (cần chạy report-only trước vì AdSense/GTM).
- hreflang đang trỏ cùng URL cho vi/en/x-default (vô hại, không có tác dụng) — chỉ có ý nghĩa nếu tách `/en/...`.
- `getFdoCoach` trả coach toàn null (không nơi nào hiển thị); "Top assists" thiếu người kiến tạo ít ghi bàn (giới hạn FDO free); ~100 key i18n không dùng; 11 lỗ hổng high ở **devDependencies** cần `--force` (major).
- Slug: bản `www.` của host không-canonical sinh URL thứ hai cho cùng bài (`~www.host`) — cân nhắc canonical/redirect.
- Thumbnail tin tức vẫn `unoptimized` (đánh đổi quota ảnh Hobby).

## Câu hỏi còn mở
- Có muốn loại tin U21/U18/học viện khỏi feed không? (hiện giữ — có tên cầu thủ trẻ trong keyword)
- Feed Independent mới (`/sport/football/rss` + lọc lfc) hôm nay không có bài Liverpool — giữ hay bỏ?
- ESPN có thật sự chặn UA giả không (chưa có link bài ESPN để thử)?


---

## Phụ lục (2026-10-05): dựng lại UI/UX "Matchday" + sửa pipeline crawl

**Hệ thiết kế mới** (`globals.css` khối "Design system v2", `src/components/ui/{page-hero,section-header,empty-state,skeleton,stat,filter-chips}`): màu chữ đỏ đạt WCAG (`text-brand` 5.8:1; `#c8102e` chỉ còn cho nền/viền), chuyển trang mượt bằng View Transitions (CSS), tôn trọng `prefers-reduced-motion`, một ngôn ngữ card/khoảng cách/chuyển động, skeleton `loading.tsx` cho từng route.
**Trang dựng lại**: khung trang (header cố định 56/64px, menu mobile toàn màn hình, thanh tiến trình, 404/lỗi, chat widget có quản lý focus, đăng nhập), trang chủ ("trận tới → kết quả → tin" ngay màn hình đầu), lịch đấu/season/BXH/thống kê/đội hình/cầu thủ, tin tức (danh sách, trang đọc, digest), lịch sử/gallery/giới thiệu/pháp lý/hồ sơ/chat.
**Đo (build production, e2e)**: layout shift ≤ 0.002 trên mọi trang đã đo (mục tiêu 0.02), không tràn ngang ở 390/768/1440, `e2e 86/86`, unit 324/324, tsc/lint 0 lỗi. Trang bóng đá/đội hình: Recharts lazy; payload đội hình giảm còn 10 trường.
**Pipeline crawl (17 mục)**: xem báo cáo agent — migration `008_repair_articles_null_flags.sql` (**chạy sau khi deploy**), URL chuẩn hoá (bỏ `at_*`/`utm_*`/dấu `/` cuối) + tra cứu tolerant, bongdaplus dùng `/liverpool-tags`, lọc tin nữ/học viện/Media Watch, Sky video/live, relevance/category/dedup sửa, thumbnail bổ sung mỗi lần sync, digest sinh trong ~35s (lỗi gốc: 1 request 84s > 60s), cảnh báo nguồn lỗi trong `sync_logs`.
**Sự cố trong quá trình**: ổ đĩa đầy (dọn cache npm/pnpm +4GB); `images.remotePatterns` > 50 mục làm `next dev` không chạy (gộp wildcard còn 49, có test canh giới hạn).
**Việc bạn cần làm thêm**: (1) workflow sync nên gọi `…/api/news/sync?deep=1` nếu muốn pre-scrape nội dung bài (hiện chỉ bổ sung thumbnail); (2) chạy migration 008 sau deploy; (3) cột tên CLB ở BXH mobile vẫn cắt ("Manchester …") — cần tên rút gọn từ nhà cung cấp dữ liệu.
