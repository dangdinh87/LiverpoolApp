# Báo cáo Kiểm toán Toàn diện — Anfield Daily (Đợt 1)

- **Ngày kiểm toán:** `2026-11-18`
- **Nhánh làm việc:** `polish/2026-11-18` (tách từ `feat/upgrade` @ `f23b4ce`)
- **Môi trường kiểm thử:** Bản build production thực tế (`next build` + `next start --port 3100`) trên trình duyệt Chromium thật (Playwright + Google Chrome) ở 4 kích thước `390px`, `768px`, `1280px`, `1440px` (chế độ Dark Stadium mặc định của site theo `CLAUDE.md`) và Lighthouse Mobile CLI v12.8.2.
- **Bộ ảnh trước nâng cấp:** `audit/before/*.png` (104 ảnh chụp qua 26 route × 4 viewport).

---

## 1. Số đo Cơ sở (Baseline Metrics)

### 1.1. Lighthouse Mobile (Simulated 4G, Moto G Power)

| Trang | Performance | Accessibility | Best Practices | SEO* | FCP (ms) | LCP (ms) | TBT (ms) | CLS | Speed Index (ms) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` (Home) | 75 | 100 | 79 | 92 | 1,210 | 7,726 | 41 | 0.0000 | 3,325 |
| `/news` | 81 | 100 | 79 | 92 | 1,371 | 4,497 | 170 | 0.0000 | 2,977 |
| `/fixtures` | 79 | 100 | 79 | 92 | 1,217 | 5,234 | 100 | 0.0005 | 3,571 |
| `/squad` | 80 | 100 | 79 | 92 | 1,240 | 5,166 | 93 | 0.0000 | 2,482 |
| `/standings` | 82 | **97** | 79 | 92 | 1,218 | 4,921 | 53 | 0.0000 | 2,195 |
| `/stats` | 80 | **96** | 79 | 92 | 1,214 | 4,842 | 152 | 0.0000 | 2,873 |
| `/history` | 84 | 100 | 79 | 92 | 1,362 | 4,387 | 67 | 0.0000 | 1,747 |

*\*Ghi chú minh bạch:*
- **SEO = 92 trên localhost:** Do `.env.production` đặt `NEXT_PUBLIC_SITE_URL=https://anfielddaily.com`, thẻ `<link rel="canonical">` trỏ về domain production nên Lighthouse chạy trên `http://127.0.0.1:3100` trừ 8 điểm mục `canonical` khác origin (trên domain thật đạt 100).
- **Best Practices = 79:** Do script Google AdSense (`adsbygoogle.js`) tải ở chiến lược `afterInteractive` gắn third-party cookie `doubleclick.net`.

### 1.2. Kích thước Bundle & Codebase
- **Client JS (`.next/static`):** `2,884.9 KB` raw / **`904.9 KB` gzip**
- **Client CSS (`.next/static`):** `188.7 KB` raw / **`31.1 KB` gzip**
- **Unit tests:** `70 files`, `718 tests` xanh (`vitest run`)
- **Lỗ hổng `npm audit --omit=dev`:** `6` lỗ hổng runtime (`4 high`, `2 moderate`: `next@16.4.2`, `sanitize-html@2.18.0`, `zod`, `undici`, `picomatch`), khiến `next build` báo `SecurityFatalError` ở lần chạy đầu.

---

## 2. Danh mục Vấn đề theo Mức độ Ưu tiên (P0 → P3)

### P0 — Hỏng tính năng cốt lõi / Bảo mật nghiêm trọng / Thất thoát tài nguyên

#### [P0-01] Trang tin tiếng Việt `/vi/news` hiển thị trống hoàn toàn ("Không có tin phù hợp") và ẩn thanh chọn ngôn ngữ
- **Trang:** `/vi/news`
- **Ảnh:** `audit/before/news-vi-390.png`, `audit/before/news-vi-1280.png`
- **Bước tái hiện:** Mở `/vi/news` (hoặc chuyển ngôn ngữ sang Tiếng Việt rồi vào Tin tức). Bên dưới thẻ Điểm tin AI, danh sách tin hiện trống với thông báo `"Không có tin phù hợp"`, thanh chuyển ngôn ngữ bị ẩn và không có nút xoá bộ lọc.
- **Vị trí:** `src/components/news/news-feed.tsx:64, 106, 116-120, 199, 417-430`, `src/app/[locale]/news/page.tsx:79-86`
- **Nguyên nhân gốc:** Từ 10/2026 toàn bộ 11 nguồn RSS tiếng Việt đã gỡ bỏ và cron `/api/news/cleanup` xoá bài sau 14 ngày nên `localArticles` (`language === "vi"`) bằng `[]`. Tuy nhiên `NewsFeed` vẫn khởi tạo `lang = "vi"` khi `locale === "vi"`, lọc rỗng toàn bộ 72 bài tiếng Anh. Đồng thời `availableLangs` chỉ còn `["all", "en"]` (`length === 2 < 3`) làm `hidden={availableLangs.length < 3}` ẩn mất bộ chọn ngôn ngữ.
- **Cách sửa:** Khởi tạo `lang` về `"all"` khi `localArticles.length === 0` và suy diễn `effectiveLang` an toàn nếu ngôn ngữ đang chọn không có bài viết; đồng bộ `storyTimes` ở `src/app/[locale]/news/page.tsx:84`.
- **Rủi ro:** Thấp (nếu tương lai thêm lại nguồn tiếng Việt, nhánh `localArticles.length > 0` tự động hoạt động lại).

#### [P0-02] Server Actions công khai không xác thực cho phép gọi LLM tạo lại bản tin và chạy đồng bộ RSS bằng Service Role
- **Trang:** Server Action endpoint toàn cục
- **Bước tái hiện:** Gửi POST request trực tiếp tới Next Server Action ID của `refreshDigest` hoặc `syncNews`.
- **Vị trí:** `src/app/actions/news.ts:28-81`
- **Nguyên nhân gốc:** File có `"use server"` xuất `refreshDigest()` và `syncNews()` dùng `getServiceClient()` (bỏ qua RLS) và gọi `generateDailyDigest()` (tốn quota VietAPI) mà không kiểm tra quyền hay `CRON_SECRET`, và không còn bất kỳ nơi nào trong `src/` sử dụng.
- **Cách sửa:** Xoá bỏ `refreshDigest` và `syncNews` khỏi `src/app/actions/news.ts` (giữ lại `loadMoreNews`; các tác vụ cron đã nằm sau `withCronAuth` ở `/api/news/digest/generate` và `/api/news/sync`).
- **Rủi ro:** Bằng 0 (code chết không có caller).

#### [P0-03] Bộ giới hạn tốc độ (`rate-limit.ts`) có thể bị vượt qua hoàn toàn qua `X-Forwarded-For` và dùng `setInterval` toàn cục không giới hạn bộ nhớ
- **Trang:** `/api/news/translate`, `/api/news/comments`, `/api/news/like`
- **Bước tái hiện:** Gửi kèm header giả mạo `X-Forwarded-For: <random-ip>` mỗi request đến `/api/news/translate`.
- **Vị trí:** `src/lib/rate-limit.ts:3-42`
- **Nguyên nhân gốc:** `getClientIP` ưu tiên phần tử đầu của `x-forwarded-for` (do client tự điền được khi đi qua Cloudflare) thay vì `cf-connecting-ip`. Ngoài ra `store` (`Map`) không giới hạn kích thước tối đa (dễ gây tràn RAM 128 MB của Worker) và gọi `setInterval` ở phạm vi module toàn cục.
- **Cách sửa:** Đọc `cf-connecting-ip` trước tiên, dọn rác lười (lazy sweep) kết hợp giới hạn kích thước tối đa (LRU/FIFO cap `MAX_ENTRIES = 2000`), bỏ `setInterval` ở top-level.
- **Rủi ro:** Thấp.

#### [P0-04] `/api/news/translate` cho phép scrape & dịch bài báo bất kỳ ngoài DB (tốn token VietAPI, không cache được) và rò rỉ thông báo lỗi nội bộ
- **Trang:** `/api/news/translate`
- **Bước tái hiện:** Gửi `POST /api/news/translate` với một URL bất kỳ trên `bbc.com/news/...` hoặc `theguardian.com/...` không nằm trong bảng `articles`, hoặc gửi body JSON lỗi.
- **Vị trí:** `src/app/api/news/translate/route.ts:78-225`
- **Nguyên nhân gốc:** Route chỉ kiểm tra hostname qua `isKnownNewsSourceUrl(url)` chứ không kiểm tra bài viết có tồn tại trong DB hay không; khi `!cached`, route vẫn scrape trang ngoài, gọi LLM dịch toàn văn rồi chạy `.update().in("url", urlVariants)` tác động 0 dòng (không bao giờ lưu cache). Thêm vào đó `req.json()` không bắt lỗi `400`, độ dài văn bản đầu vào không giới hạn, không gộp các request dịch trùng đang bay (in-flight dedup), và trả thẳng `err.message` ra ngoài ở mã `500`.
- **Cách sửa:** Bắt buộc bài viết phải tồn tại trong `articles` (trả `404` nếu không có), giới hạn độ dài văn bản dịch tối đa (`18,000` ký tự), gộp promise dịch trùng theo URL chuẩn hoá, dùng `buildCurrentFactsBlock()` cho ngữ cảnh HLV/nhân sự, bắt lỗi JSON `400` và trả thông báo chung khi lỗi `500`.
- **Rủi ro:** Thấp.

#### [P0-05] Tính năng dịch bài báo sang tiếng Việt (`TranslatableExcerpt`) bị ẩn trên ~99% bài viết
- **Trang:** `/news/[...slug]` và `/vi/news/[...slug]`
- **Ảnh:** `audit/before/news-reader-390.png`, `audit/before/news-reader-1280.png`
- **Bước tái hiện:** Mở bất kỳ bài báo tiếng Anh nào từ BBC, Guardian, LFC, Anfield Watch, Liverpool Echo... Không hề có nút `"Dịch sang tiếng Việt"` / `"Translate to Vietnamese"`.
- **Vị trí:** `src/app/[locale]/news/[...slug]/page.tsx:346-366`
- **Nguyên nhân gốc:** Nhánh JSX viết `content.htmlContent ? <ArticleHtmlBody /> : <TranslatableExcerpt />`. Hầu hết bộ bóc tách đều trả về `htmlContent`, khiến nhánh `<TranslatableExcerpt>` không bao giờ được render. Ngoài ra ảnh `heroImage` ở dòng `374` bị lặp lại ngay dưới bài khi `htmlContent` đã chứa ảnh đầu bài (`dropHeroDuplicate` chưa được gọi).
- **Cách sửa:** Tạo component `TranslatableArticleBody` kết hợp `ArticleHtmlBody` (bản gốc giữ nguyên định dạng HTML/video) với bản dịch tiếng Việt toàn văn theo yêu cầu người đọc, đồng thời gọi `dropHeroDuplicate` để tránh lặp ảnh bìa.
- **Rủi ro:** Thấp.

#### [P0-06] Pipeline tự động viết bài phân tích sau trận (`/api/site-articles/generate`) luôn mất thống kê trận đấu, bỏ qua mọi trận hoà 0–0 và revalidate sai đường dẫn
- **Trang:** `/analysis`, `/analysis/[slug]`
- **Vị trí:** `src/lib/site-articles/match-review-facts.ts:36-60, 146-156`, `src/lib/football/espn-events.ts:257, 307-310, 338-346`, `src/app/api/site-articles/generate/route.ts:61, 73-76`
- **Nguyên nhân gốc:**
  1. `loadMatchReviewFacts` gọi `getFixtureStatistics` (stub trả `[]` ở `FdoProvider`) thay vì `getMatchDetail(date)` của ESPN.
  2. `mapEspnStats` gán cứng `team.id = 0` thay vì `espnTeamId(...)` (`40` cho Liverpool).
  3. Nhãn `"Shots on Goal"` lệch với `"Shots on Target"` của ESPN, làm `facts.stats` luôn `null` → điều kiện `if (facts.goals.length === 0 && !facts.stats) continue;` bỏ qua vĩnh viễn mọi trận hoà 0–0.
  4. `getEspnMatchEvents` chưa đảo đội ghi bàn khi phản lưới nhà (own goal), và route gọi `revalidatePath("/analysis")` thay vì `revalidateLocalizedPath`.
- **Cách sửa:** Lấy stats từ `getMatchDetail(date)`, chuẩn hoá `espnTeamId` và so khớp đội Liverpool (`id === 40`) vs đối thủ (`id !== 40`), chấp nhận cả `"Shots on Target"` / `"Shots on Goal"`, đồng bộ xử lý phản lưới nhà và dùng `revalidateLocalizedPath`.
- **Rủi ro:** Thấp, khóa chặt bằng unit test với dữ liệu thật từ `mapEspnStats`.

#### [P0-07] Lỗ hổng bảo mật trên dependencies runtime (`next`, `sanitize-html`, `zod`, `undici`) và bão `HTTP 429` từ Football-Data.org khi `next build`
- **Trang:** Toàn bộ trang bóng đá (`/`, `/fixtures`, `/standings`, `/stats`) khi build tĩnh
- **Vị trí:** `package.json`, `src/lib/football/fdo-matches.ts:81`, `src/lib/football/fdo-standings.ts:57`, `src/lib/football/fdo-provider.ts:28`
- **Nguyên nhân gốc:**
  1. `next@16.4.2` dính GHSA-mfr8-8qww-v76h & GHSA-vc7v-qv4w-wrv8; `sanitize-html@2.18.0` dính lỗi đệ quy tràn ngăn xếp khi lọc `<iframe>` (GHSA-c9rx-x947-fp3h); `zod` & `undici` dính lỗi DoS.
  2. Khi `next build` chạy 7 worker song song, cả 3 file FDO tự viết hàm `fdoFetch` riêng không gộp request đồng thời và không retry khi gặp `HTTP 429` (giới hạn 10 req/phút), làm log build báo hàng loạt `HTTP 429` và ghi dữ liệu rỗng `[]` vào HTML tĩnh / R2 cache.
- **Cách sửa:** Chạy bản vá bảo mật không phá vỡ tương thích (`npm audit fix` cho các gói runtime) và hợp nhất `fdoFetch` vào một module dùng chung có in-flight deduplication + backoff/retry thông minh theo header `X-RequestCounter-Reset` khi gặp `429`.
- **Rủi ro:** Thấp.

---

### P1 — Bug người dùng gặp / Tràn khung Mobile / Sai lệch dữ liệu / Cache & Bảo mật

#### [P1-01] Tràn ngang `+72px` trên màn hình `390px` và nhảy bố cục mạnh (`CLS = 0.165`) ở trang Chi tiết trận đấu `/fixtures/[id]`
- **Trang:** `/fixtures/560645`
- **Ảnh:** `audit/before/fixture-detail-390.png`, `audit/before/fixture-detail-768.png`
- **Bước tái hiện:** Mở `/fixtures/560645` trên điện thoại `390px`. Khối `"Dự đoán của bạn"` tràn ngang 72px khỏi khung thẻ; ngay khi dữ liệu dự đoán tải xong trên client, toàn bộ phần Đội hình & Đối đầu bên dưới bị đẩy tụt xuống ~260px, đồng thời link `#predict-title` từ trang chủ không cuộn tới đúng chỗ.
- **Vị trí:** `src/components/fixtures/fan-prediction.tsx:47-59, 95-103`, `src/components/fixtures/player-ratings.tsx:26-38`
- **Cách sửa:** Bố cục mobile `< sm` xếp dọc 2 hàng `[Tên đội] [Bộ đếm -/+]` (từ `sm:` giữ nguyên 3 cột ngang), đồng thời hiển thị khung skeleton giữ chỗ gắn sẵn `id="predict-title"` trong lúc chờ `getPredictionState` để triệt tiêu CLS và giữ neo `#predict-title` hoạt động ngay lập tức.
- **Rủi ro:** Thấp.

#### [P1-02] Lỗi console `ERR_BLOCKED_BY_RESPONSE.NotSameOrigin` trên trang chủ, danh sách tin và bản tin ngày do CDN Anfield Watch chặn nhúng ảnh chéo miền
- **Trang:** `/`, `/vi`, `/news`, `/news/digest`, `/news/digest/[date]`
- **Ảnh:** `audit/before/home-en-390.png`, `audit/before/news-390.png`
- **Bước tái hiện:** Mở DevTools Console ở `/` hoặc `/news` → xuất hiện hàng loạt lỗi đỏ `GET https://staticcdn.anfieldwatch.co.uk/... net::ERR_BLOCKED_BY_RESPONSE.NotSameOrigin`.
- **Vị trí:** `src/components/news/news-thumb.tsx`, `src/components/home/news-thumb.tsx`, `src/components/news/news-text.ts`
- **Nguyên nhân gốc:** `staticcdn.anfieldwatch.co.uk` trả header `Cross-Origin-Resource-Policy: same-origin` cấm trình duyệt tải ảnh trực tiếp trên domain khác.
- **Cách sửa:** Lọc các host chặn CORP đã biết (`staticcdn.anfieldwatch.co.uk`) trong hàm kiểm tra ảnh hợp lệ để hiển thị ngay thẻ tên nguồn sạch sẽ, không phát sinh request lỗi và xoá sạch lỗi đỏ trên Console; đồng thời hợp nhất 2 component `NewsThumb` (bổ sung `referrerPolicy="no-referrer"` + `onError`).
- **Rủi ro:** Thấp.

#### [P1-03] Ghép nhầm bàn thắng, đội hình và thống kê sang đối thủ khi tên CLB bắt đầu bằng tiền tố chung (`FC`, `AFC`, `AS`, `RB`, `Manchester`, `Real`)
- **Trang:** `/fixtures/[id]`
- **Vị trí:** `src/app/[locale]/fixtures/[id]/page.tsx:60, 90, 149-161, 171-195`
- **Nguyên nhân gốc:** So khớp tên đội dự phòng dùng `.split(" ")[0]` (ví dụ `"FC Barcelona"` → `"fc"`, mà `"liverpool fc".includes("fc")` là `true`!). Ngoài ra `Number(id)` không kiểm tra số nguyên dương trước khi gọi API.
- **Cách sửa:** Viết helper so khớp tên đội chuẩn hoá (bỏ tiền tố/hậu tố `FC`, `AFC`, `CF`... và ưu tiên nhận diện rõ Liverpool `id === 40` vs đối thủ), kiểm tra `fixtureId` hợp lệ trước khi truy vấn.
- **Rủi ro:** Thấp.

#### [P1-04] Nguồn video `lfctv` (YouTube) bị bộ lọc độ liên quan loại nhầm, làm hỏng URL `/news/lfctv/watch?v=...` và làm sai lệch cảnh báo tỷ lệ scrape hàng giờ
- **Trang:** `/news`, `/player/[id]`, `/api/news/sync`
- **Vị trí:** `src/lib/news/pipeline.ts:100-104`, `src/lib/news/relevance.ts:59-67`, `src/lib/news/sync.ts:399, 509`, `src/lib/news/digest.ts:371-377`, `src/lib/news/db.ts:243-250, 277-284`, `src/lib/news-config.ts:96-129`
- **Cách sửa:** Đưa `lfctv` vào danh sách nguồn chuyên biệt của CLB ở `relevance.ts`, loại trừ `lfctv` khỏi bước scrape nội dung bài viết, digest văn bản và truy vấn bài báo cầu thủ, đồng thời cho `getArticleUrl` trả thẳng link gốc đối với URL có query video hoặc nguồn `LINK_OUT_ONLY`.
- **Rủi ro:** Thấp.

#### [P1-05] Sai lệch 1 giờ khi phân tích múi giờ `EST` vào đầu tháng 3 và tháng 11 + sai nhãn múi giờ mùa đông trên `/fixtures`
- **Trang:** `/news`, `/fixtures`
- **Vị trí:** `src/lib/news/date.ts:77-86`, `src/components/fixtures/fixture-timeline.tsx:99`, `src/components/news/article-end-sections.tsx:34-35`
- **Nguyên nhân gốc:** `date.ts` coi cả tháng 3 và cả tháng 11 là UTC-4 (`EDT`), sai 1 giờ trong ~35 ngày/năm (bao gồm ngày hiện tại 18/11!). `fixture-timeline.tsx` tính UTC offset của người xem dựa vào trận đầu mùa (tháng 8 — giờ mùa hè BST/EDT) nên hiển thị nhầm `GMT+1` ở Anh vào mùa đông. `ArticleNextMatch` in cứng giờ Việt Nam GMT+7 lên trang tĩnh tiếng Anh.
- **Cách sửa:** Giải mã `EST`/`EDT` chính xác theo lịch DST thực tế của `America/New_York` qua `Intl.DateTimeFormat`; lấy trận sắp tới gần nhất để tính offset ở `fixture-timeline.tsx`; dùng `<LocalMatchDay>` / `<LocalMatchTime>` trong `ArticleNextMatch`.
- **Rủi ro:** Thấp, bổ sung đầy đủ unit test cho DST.

#### [P1-06] Thất thoát cache ISR & tốn CPU Worker: thiếu `setRequestLocale` ở `/analysis`, `/gallery` bị ép dynamic vì đọc cookie admin, `/standings` bị hạ TTL từ 6h xuống 5 phút, `getCachedFixtures` lưu nhầm mảng rỗng khi lỗi mạng
- **Trang:** `/analysis`, `/analysis/[slug]`, `/gallery`, `/standings`, `/news`, `/sitemap.xml`, `/api/news/digest/generate`, `/api/news/sync`
- **Vị trí:** `src/app/[locale]/analysis/page.tsx`, `src/app/[locale]/analysis/[slug]/page.tsx`, `src/app/[locale]/gallery/page.tsx`, `src/app/[locale]/standings/page.tsx`, `src/app/[locale]/news/page.tsx:51`, `src/lib/football/cached-fixtures.ts`, `src/lib/football/fdo-provider.ts:250`, `src/app/sitemap.xml/route.ts`, `src/app/api/news/digest/generate/route.ts`, `src/lib/news/sync.ts:55`
- **Cách sửa:**
  - Thêm `setRequestLocale(locale)` vào mọi trang dưới `src/app/[locale]/` và viết test tự động kiểm tra.
  - Chuyển kiểm tra hiển thị nút Admin trên `/gallery` sang client khi có session cookie (API ghi dữ liệu vẫn kiểm tra admin nghiêm ngặt trên server) để `/gallery` được prerender tĩnh ISR.
  - Dùng `getCachedFixtures()` trên `/standings` và nâng TTL `getCachedVideoItems` lên `1800s` để không kéo tụt ISR của trang.
  - Không lưu mảng rỗng `[]` vào `unstable_cache` khi FDO lỗi; xoá cache vô hạn `this.scorersCache` trong `FdoProvider`; bọc cache cho `/sitemap.xml` + escape đầy đủ dấu `"` / `'`; gọi `revalidateLocalizedPath` sau khi sinh digest; hạ `SCRAPE_TIME_BUDGET_MS` xuống `45_000ms` dưới ngưỡng 100s HTTP 524 của Cloudflare.
- **Rủi ro:** Thấp.

#### [P1-07] Thiếu kiểm tra đầu vào ở `actions/profile.ts`, mXSS tiềm ẩn sau `sanitize-html` trong `article-extractor.ts`, rò rỉ bộ nhớ `hls.js` khi unmount và lỗi trạng thái đăng nhập/đăng xuất
- **Trang:** `/profile`, `/auth/login`, `/news/[...slug]`
- **Vị trí:** `src/app/actions/profile.ts`, `src/lib/news/enrichers/article-extractor.ts:88-107, 436-460`, `src/lib/news/enrichers/og-meta.ts:32`, `src/components/news/article-video-player.tsx:27-61`, `src/components/auth/login-form.tsx:62-95`, `src/components/layout/navbar-client.tsx:103-139, 189`, `src/proxy.ts:34-70`
- **Cách sửa:**
  - Kiểm tra chặt URL avatar thuộc đúng Supabase Storage của chính user đó, giới hạn độ dài & kiểm tra nguồn tin khi lưu bài viết, trả mã lỗi chuẩn thay vì `error.message` thô.
  - Trong `article-extractor.ts`: chạy `sanitize()` ở bước **cuối cùng** sau mọi biến đổi Cheerio, giới hạn `allowedIframeHostnames`, giới hạn kích thước HTML đọc về (2 MB), kiểm tra `isKnownNewsSourceUrl(res.url)` sau redirect ở `fetchOgMeta`.
  - Thêm cờ `cancelled` dọn sạch `Hls` instance khi unmount, ưu tiên native HLS trên Safari, thêm `onError` cho `<video>`.
  - Sửa `LoginForm` đọc `FormData` trước khi validate để hỗ trợ trình quản lý mật khẩu autofill, xử lý lỗi OAuth và query `?error=callback`.
  - Đồng bộ state đăng xuất trên `NavbarClient`, không lưu `email` nhạy cảm xuống `localStorage`, giữ nguyên cookie xoá phiên khi `proxy.ts` redirect khỏi `/profile`.
- **Rủi ro:** Thấp.

#### [P1-08] Lỗi Accessibility & Spoiler-Free: công tắc Spoiler thiếu nhãn ARIA, nút đóng Modal MoMo trắng trên nền trắng (tương phản 1:1), rò rỉ tỉ số qua `aria-label` / `.sr-only`, tương phản thấp trên `/stats` và link thiếu gạch chân trên `/standings`
- **Trang:** `/fixtures`, `/season`, `/standings`, `/stats`, `/about`, `/`
- **Ảnh:** `audit/before/standings-390.png`, `audit/before/stats-390.png`, `audit/before/fixtures-390.png`
- **Vị trí:** `src/components/fixtures/spoiler-controls.tsx:26`, `src/app/[locale]/about/momo-modal.tsx:23`, `src/components/fixtures/match-card.tsx:100-107`, `src/components/home/form-widget.tsx:82`, `src/components/standings/standings-table.tsx`, `src/components/stats/stats-season-view.tsx`
- **Cách sửa:** Gắn `aria-label` và mở rộng vùng chạm `>=44px` cho `<Switch>` và các ô kết quả trên `/stats`; chỉnh nút đóng `MomoModal` màu tối rõ nét; ẩn tỉ số trong `aria-label` / `.sr-only` khi bật chế độ không lộ kết quả; sửa `text-stadium-muted/80` → `text-stadium-muted` (tương phản `5.8:1`) trên `/stats` và thêm `underline` cho link trong văn bản trên `/standings` để đạt **100 điểm Accessibility trên toàn bộ trang**.
- **Rủi ro:** Thấp.

---

### P2 — Cải thiện Hiệu năng (LCP), Kiến trúc Code, Đồng nhất Dữ liệu & SEO

- **[P2-01] Tối ưu LCP trên Mobile (`7.7s` ở `/`):** Bỏ `priority` trùng lặp ở `<DigestFeature>`, sửa lỗi nhân đôi chuỗi transform Cloudinary (`w_1280.../w_1920...`) và dùng `w_auto` / kích thước hợp lý theo thiết bị cho ảnh bìa Cloudinary, chuyển Google AdSense sang `strategy="lazyOnload"` để không tranh băng thông và main-thread với ảnh Hero lúc mới vào trang.
- **[P2-02] Hợp nhất và gộp truy vấn trùng lặp:**
  - Tách client chung `src/lib/football/fdo-client.ts` thay cho 3 bản sao `fdoFetch` ở `fdo-matches.ts`, `fdo-standings.ts`, `fdo-provider.ts`.
  - Gộp lịch thi đấu ESPN kèm `leagueSlug` và bọc `React.cache` cho `fetchSummary` / `getMatchDetail` để tránh quét tuần tự 4 giải đấu nhiều lần trong một lượt render.
  - Sửa `findFplMatch` (`fpl-stats.ts:162-198`) tách từ họ kép (`"Alisson Ramses Becker"` khớp `"Alisson Becker"`).
  - Gộp tuần tự `Promise.all` ở `stats-season-view.tsx`, `profile/page.tsx`, `analysis/page.tsx` và bọc cache cho `getArticleRefsByUrls`.
- **[P2-03] Gộp đếm Like/Comment theo URL chuẩn hoá (`engagement.ts`):** Tránh tách làm 2 bản ghi khi bài viết vừa có URL cũ (có dấu `/`) vừa có URL mới, làm ẩn bình luận cũ.
- **[P2-04] Khởi tạo lười biến môi trường runtime (`vietapi.ts`, `cloudinary.ts`, `football/index.ts`):** Đọc `process.env` lúc gọi hàm thay vì đóng băng lúc nạp module trên Cloudflare Workers.
- **[P2-05] Sửa họ cầu thủ có tiền tố (`playerSurname` cho `"van Dijk"`, `"Mac Allister"`), cập nhật ảnh HLV hiện tại ở `getFdoCoach()` và prompt bản tin (`digest.ts`), giữ đúng tiền tố `/vi` khi chuyển hướng đăng nhập, bổ sung metadata mùa giải cho `/season` & `/stats/[season]`, sửa thứ bậc thẻ `h1 -> h2` trên `/analysis` và `/stats`.**
- **[P2-06] Giảm re-render thừa & payload i18n:** Sửa `useToast()` dùng selector nguyên thuỷ để không kéo mọi component re-render khi hiện toast; lọc bỏ các namespace chỉ dùng trên server (`Legal`, `History`, `About`...) khỏi `NextIntlClientProvider` để giảm dung lượng HTML/RSC trên mọi trang; tách nhỏ các file lớn (`comment-section.tsx`, `navbar-client.tsx`, `fixtures/[id]/page.tsx`).

---

### P3 — Đánh bóng Thiết kế, Brand, Nội dung Song ngữ, Motion & Vệ sinh Repo

- **[P3-01] Tuân thủ nghiêm ngặt Brand (`docs/brand.md` & `CLAUDE.md`):** Thay thế việc dùng nhầm logo CLB (`/assets/lfc/crest.webp`) làm biểu tượng trang 404 (`[locale]/not-found.tsx`), ảnh thế chỗ tin tức (`home/news-thumb.tsx`) và avatar mặc định bình luận (`comment-section.tsx`) bằng `<BrandMark />` / thẻ tên báo / icon `<User />`.
- **[P3-02] Chuẩn hoá câu chữ & thông tin pháp lý (`en.json`, `vi.json`):** Sửa đoạn văn tự mâu thuẫn và cụt câu ở `About.news.body`, gỡ bỏ thông tin cũ về AI Chat / Groq đã xoá ở trang Pháp lý (`Legal`), sửa lỗi chính tả `"Hợp đồng kỷ lục (Mua)"`, dùng `NEWS_OUTLET_COUNT` thay cho số cứng `"10 nguồn"`.
- **[P3-03] Dọn dẹp CSS chết, cấu hình & hộp thoại xác nhận:** Xoá ~130 dòng CSS chết của tính năng chat cũ trong `globals.css`, thay `window.confirm` xoá bình luận bằng `AlertDialog` đồng bộ giao diện Dark Stadium, dọn bớt các domain báo tiếng Việt cũ không còn dùng trong `next.config.ts` (`remotePatterns` đang chạm trần 50/50 của Next.js), sửa cấu hình `turbopack.root`, `eslint.config.mjs` (`.open-next/**`), `tsconfig.json` và chuyển `vitest.config.ts` sang `vitest.config.mts` để hết cảnh báo ESM.
- **[P3-04] Chuyển động (Motion) có chủ đích & tôn trọng `prefers-reduced-motion`:** Bọc `<MotionConfig reducedMotion="user">` cho toàn ứng dụng, chuẩn hoá thời lượng phản hồi nút (`150ms–200ms`, `active:scale-[0.97]`), modal/drawer (`<= 250ms`, `ease-out`), kiểm tra `prefers-reduced-motion` trước khi gọi `window.scrollTo({ behavior: "smooth" })`, chỉ animate `transform` và `opacity`.

---

## 3. Hướng Thiết kế & Kế hoạch Dependency

### 3.1. Hướng thiết kế (Giữ trọn nhận diện Anfield Daily — "Dark Stadium")
- **Bảng màu & Tương phản:** Giữ nguyên nền `#0D0D0D` (`stadium-bg`), bề mặt phân lớp `#141414` / `#1A1A1A` / `#222222`, đỏ thương hiệu `#C8102E` cho mảng đặc/nút chính và `#FF3347` (`text-brand`, tương phản `>= 4.8:1` chuẩn WCAG AA) cho chữ nhấn trên nền tối; loại bỏ các mã màu lẻ tẻ.
- **Typography (theo luật repo `CLAUDE.md` & `docs/brand.md`):** Giữ bộ chữ nhận diện `League Gothic` (wordmark, tỉ số, tiêu đề mục), `Newsreader` (tiêu đề bài báo & điểm tin), `Inter` (nội dung & UI), `Barlow Condensed` (nhãn ngắn, nút, tiêu đề bảng); áp dụng đồng bộ `tabular-nums` cho toàn bộ tỉ số, thứ hạng, điểm số, thời gian.
- **Trạng thái tương tác & Vùng chạm:** Mọi nút, tab, chip, ô nhập đều có đủ `hover`, `active` (`scale-[0.97]` hoặc đổi nền tức thì trên cảm ứng), `focus-visible` (viền `#FF3347` 2px rõ nét) và `disabled`, đảm bảo vùng chạm `>= 44×44px` trên màn hình `390px` và không cuộn ngang ở bất kỳ trang nào.

### 3.2. Danh sách Dependency thay đổi
- **Không cài thêm bất kỳ thư viện UI hay animation mới nào** (tận dụng tối đa CSS chuẩn và các primitive `radix-ui` + `framer-motion` sẵn có).
- **Cập nhật bản vá bảo mật (patch/minor không phá vỡ API):** Cập nhật `next`, `eslint-config-next`, `@next/third-parties`, `sanitize-html`, `zod` và các gói con (`undici`, `picomatch`) qua `npm audit fix` để xoá sạch `SecurityFatalError` và 6 lỗ hổng runtime.
- **Gỡ trùng lặp gói:** Chuyển 4 wrapper `@radix-ui/react-alert-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-popover`, `@radix-ui/react-tooltip` sang dùng trực tiếp gói hợp nhất `radix-ui` đã cài sẵn trong `package.json` để giảm dung lượng bundle client.
