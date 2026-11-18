# Báo cáo Tổng kết Nâng cấp Toàn diện — Anfield Daily (`audit/final.md`)

- **Ngày hoàn tất:** `2026-11-18`
- **Nhánh làm việc:** `polish/2026-11-18` (tách từ `feat/upgrade` @ `f23b4ce`, `git status` sạch tuyệt đối, **không** push / deploy / merge theo quy tắc dự án).
- **Không chạm:** `.env*`, secret, database production, `AGENTS.md`, và các cấu hình triển khai (`wrangler.jsonc`, `open-next.config.ts`, `.github/workflows/deploy-cloudflare.yml`, `vercel.json`).

---

## 1. Tóm tắt theo Từng Đợt & Lịch sử Commit

| Đợt | Commit | Tóm tắt hạng mục thực hiện |
|---|---|---|
| **Đợt 1 — Khám toàn diện** | `b84fbc8` | Chụp `104` ảnh `audit/before/*.png` qua `26` route × `4` kích thước (`390`, `768`, `1280`, `1440` px), đo Lighthouse Mobile v12.8.2 trên 7 trang chính, đo bundle `.next/static`, chạy `npm audit` và lập báo cáo `audit/report.md` (P0 → P3). |
| **Đợt 2 — Sạch bug (P0 & P1)** | `ab5fe88` | Xử lý triệt để nguyên nhân gốc toàn bộ 7 lỗi P0 và 8 cụm lỗi P1 (bảo mật Server Actions/API, `/vi/news` trống, nút dịch bài báo bị ẩn, pipeline AI sau trận mất stats/bỏ qua hòa 0–0, bão `HTTP 429` từ Football-Data.org, vá `next@16.4.6` & `sanitize-html` & `zod` & `undici`, tràn ngang `+72px` & `CLS 0.165` ở `/fixtures/[id]`, lỗi CORP `staticcdn.anfieldwatch.co.uk`, ISR `/gallery` & `/analysis` & `/standings`, rò rỉ `hls.js`, lỗi autofill/OAuth đăng nhập, lỗi Spoiler-free & tương phản AA). Khóa chặt bằng unit tests. |
| **Đợt 3 — Code tốt hơn** | `842bf62` | Tách nhỏ 3 module >500 dòng (`navbar-client.tsx` → `navbar-mobile-sheet.tsx`, `comment-section.tsx` → `comment-item.tsx`, `fixtures/[id]/page.tsx` → `match-score-header.tsx`); xóa sạch `: any` cuối cùng trong `src/`; sửa `useToast()` dùng selector nguyên thủy để ngắt re-render dây chuyền; gộp `decodeEntities`/`cleanTitle` dùng chung; bọc cache cho `getArticleRefsByUrls`; xóa 8 file `error.tsx` trùng lặp làm rơi `error.digest`; gỡ 4 gói `@radix-ui/react-*` trùng với `radix-ui`; chuyển `vitest.config.ts` → `vitest.config.mts` và cấu hình `turbopack.root`. |
| **Đợt 4 — Đẹp & Hiện đại hơn** | `ef3bbf8` | Chuẩn hóa hệ thống token Dark Stadium, xóa ~190 dòng CSS chết (`.glass`, `.glow-red`, `.ai-btn*`, `.chat-shell`...), thay thế dứt điểm việc dùng nhầm logo CLB ở trang 404 & bình luận bằng `<BrandMark />` / `<User />`, nâng toàn bộ vùng chạm lên `>= 44×44px`, thay `window.confirm` bằng `AlertDialog`, thêm skeleton đúng bố cục cho `/analysis` & `/predictions`, bổ sung JSON-LD Breadcrumb & metadata theo mùa, tối ưu LCP (gỡ `priority` trùng trên `DigestFeature`, chuyển AdSense sang `lazyOnload`, lọc ảnh CORP ở `pickStoryImages`). |
| **Đợt 5 — Mượt & Animation có chủ đích** | `377402a` | Chỉ animate `transform` và `opacity` (gỡ bỏ toàn bộ `transition-[width] duration-700` & `transition-all` gây tính toán lại layout trên thanh tiến trình trực tiếp/thống kê); chuẩn hóa nhịp thời gian (`140–200ms` nút/hover với `active:scale-[0.97]`, `<= 260ms` modal/sheet/chuyển trang, vào `ease-out` / ra nhanh hơn); tôn trọng đầy đủ `prefers-reduced-motion: reduce` qua CSS, `<MotionConfig reducedMotion="user">` và `matchMedia` trước `window.scrollTo`. |
| **Đợt 6–8 — Kiểm chứng & Báo cáo** | `17f2430` | Chụp đủ `104` ảnh đối ứng tại `audit/after/*.png`, đo lại Lighthouse Mobile 7 trang, kiểm tra Performance trace tương tác, chạy toàn bộ unit tests + bài kiểm thử E2E Playwright (desktop + mobile) xanh 100% và xuất bản gốc `audit/final.md`. |
| **Swarm Wave 1 — Chuẩn hóa Wording, RSC Payload, Backend & Stale-Fetch** | `da38902` · `e6bdecc` · `d6d9cb3` · `b15033e` | Đại tu song ngữ toàn bộ `1,156` khóa dịch & tiểu sử `31` cầu thủ mùa 2026/27; cắt giảm **~52%** payload i18n client (`pickClientMessages`) kèm xóa chuỗi UI cứng; gia cố API/Server Actions, lịch `.ics`, JSON-LD/OG, lọc rác xuất bản & `validate-draft.ts`; sửa lỗi treo stale `fetch-cache` của Next.js 16 khi Supabase gián đoạn (`Promise.race` + `502/503/504` breaker + `unstable_cache`). Nâng tổng kiểm thử lên **`764+` unit tests** & **`113+` E2E tests**. |
| **Swarm Wave 2 — Đồng bộ Tài liệu, Hậu kiểm Ngôn ngữ & Mở rộng E2E** | `431b69c` · `5994ca5` · `swarm/docs` | Nâng chuẩn văn phong báo chí quốc tế (British English, ICU pluralisation, xóa sạch trợ từ khẩu ngữ, kiểm tra đối xứng dữ liệu CLB/cầu thủ); gỡ `framer-motion` khỏi các trang công khai (`LiveScore` CSS `@keyframes score-pop`), bổ sung `aria-live`/`aria-busy` & xử lý ảnh gãy trước hydration; viết lại & đồng bộ 100% hệ thống tài liệu (`README.md`, `CLAUDE.md`, `docs/**`) theo chuẩn **Anfield Daily**; nâng kiểm thử lên **`76` files / `774` unit tests** & **`125` E2E tests passed (`142` total)**. |

---

## 2. Danh sách Đầy đủ các Lỗi & Cải tiến Đã Xử lý (Trước → Sau)

| Mã | Trang / Khu vực | Trước nâng cấp → Sau nâng cấp | Vị trí chính (`file:line`) |
|---|---|---|---|
| **P0-01** | `/vi/news` | Khởi tạo `lang = "vi"` khi `localArticles = []` khiến trang Tin tức tiếng Việt trống danh sách (`"Không có tin phù hợp"`) và ẩn thanh chọn ngôn ngữ → Tự động chuyển về `"all"` khi không có bài nội địa riêng, hiển thị đầy đủ kho tin với giao diện tiếng Việt. | `src/components/news/news-feed.tsx:66-74,121` · `src/app/[locale]/news/page.tsx:84` |
| **P0-02** | Server Actions | Xuất công khai `refreshDigest()` và `syncNews()` không xác thực, dùng Service Role gọi LLM/crawl → Xóa bỏ hoàn toàn 2 Server Action nguy hiểm, chỉ giữ `loadMoreNews` (kèm unit test khóa module exports). | `src/app/actions/news.ts:1-27` · `src/app/actions/__tests__/news-actions.test.ts:9-11` |
| **P0-03** | API Rate Limit | Tin tưởng phần tử đầu `x-forwarded-for` (giả mạo được), dùng `setInterval` toàn cục và `Map` không giới hạn → Ưu tiên `cf-connecting-ip` → `x-real-ip` → hop cuối `x-forwarded-for`, dọn rác lười (lazy sweep) và giới hạn cứng `MAX_ENTRIES = 2000`. | `src/lib/rate-limit.ts:1-58` · `src/lib/__tests__/rate-limit.test.ts:1-46` |
| **P0-04** | `/api/news/translate` | Cho phép dịch URL bất kỳ ngoài DB (tốn quota VietAPI, không lưu cache), không giới hạn độ dài, lộ `err.message` → Bắt buộc bài tồn tại trong `articles` (`404`), giới hạn `18,000` ký tự, gộp request dịch đồng thời theo URL chuẩn hóa, cập nhật ngữ cảnh HLV `buildCurrentFactsBlock()`, che lỗi nội bộ. | `src/app/api/news/translate/route.ts:75-215` · `src/lib/ai/vietapi.ts:12-30` |
| **P0-05** | `/news/[...slug]` | `content.htmlContent ? <ArticleHtmlBody /> : <TranslatableExcerpt />` làm mất nút Dịch tiếng Việt trên ~99% bài báo & lặp ảnh bìa → Tích hợp `htmlContent` trực tiếp vào `TranslatableExcerpt` (giữ nguyên HTML/video ở bản gốc, chuyển mượt sang bản dịch tiếng Việt khi bấm) và gọi `dropHeroDuplicate`. | `src/components/news/translatable-excerpt.tsx:16-140` · `src/app/[locale]/news/[...slug]/page.tsx:85-92,350-369` |
| **P0-06** | `/analysis` & `/api/site-articles/generate` | Gọi nhầm stub rỗng `getFixtureStatistics`, gán `team.id = 0` ở ESPN stats, lệch nhãn `"Shots on Target"`, bỏ qua mọi trận hòa `0–0`, tính ngược bàn phản lưới nhà → Lấy stats từ `getMatchDetail(date)`, chuẩn hóa `espnTeamId`, khớp cả `"Shots on Target"`/`"Shots on Goal"`, sửa own-goal và gọi `revalidateLocalizedPath`. | `src/lib/site-articles/match-review-facts.ts:36-68,145-162` · `src/lib/football/espn-events.ts:255-355` |
| **P0-07** | Dependencies & Build | `next@16.4.2` báo `SecurityFatalError`, `sanitize-html`/`zod`/`undici` dính CVE, 7 worker build bắn `HTTP 429` lên Football-Data.org → Nâng `next@16.4.6` và bản vá bảo mật; hợp nhất `fdo-client.ts` có in-flight dedup + retry/backoff theo `X-RequestCounter-Reset`. | `package.json` · `src/lib/football/fdo-client.ts:1-92` |
| **P1-01** | `/fixtures/[id]` | Khối `"Dự đoán của bạn"` tràn ngang `+72px` ở `390px` và nhảy bố cục `CLS = 0.165` → Chuyển sang bố cục xếp dòng trên mobile `< sm` (`0px` tràn ngang) và render khung skeleton giữ chỗ có sẵn `id="predict-title"` (`CLS` giảm xuống `0.049`). | `src/components/fixtures/fan-prediction.tsx:48-115` · `src/components/fixtures/player-ratings.tsx:26-44` |
| **P1-02** | `/`, `/news`, `/news/digest` | Hàng loạt lỗi đỏ Console `ERR_BLOCKED_BY_RESPONSE.NotSameOrigin` từ `staticcdn.anfieldwatch.co.uk` và dùng nhầm logo CLB khi lỗi ảnh → Chặn sớm host CORP trong `isEmbeddableImageUrl` (cả ở `NewsThumb`, `DigestFeature`, `SavedArticlesList`), hiển thị ngay thẻ tên báo sạch sẽ (`0` lỗi Console). | `src/components/news/news-text.ts:264-281` · `src/components/news/digest-images.ts:27` · `src/components/home/news-thumb.tsx:31` |
| **P1-03** | `/fixtures/[id]` | So khớp tên đội qua `.split(" ")[0]` ghép nhầm `"FC Barcelona"` vào `"Liverpool FC"` → Viết `matchesFixtureTeam` chuẩn hóa tên CLB và phân biệt rạch ròi Liverpool (`id === 40`) với đối thủ; kiểm tra `parsePositiveFixtureId`. | `src/components/fixtures/match-score-header.tsx:33-60` |
| **P1-04** | `/news` & Sync | Video `lfctv` bị loại nhầm bởi bộ lọc văn bản, gãy slug có `?v=` và bị đưa vào bước scrape bài chữ → Thêm `lfctv` vào `LFC_DEDICATED`, loại khỏi scrape/digest/search, mã hóa base64url cho URL có query thực sự sau khi chuẩn hóa tracking params. | `src/lib/news/relevance.ts:59-67` · `src/lib/news-config.ts:97-114` · `src/lib/news/sync.ts:399,509` |
| **P1-05** | `/news`, `/fixtures` | Sai lệch 1 giờ khi đọc `EST` vào tháng 3/tháng 11, sai nhãn múi giờ mùa đông trên `/fixtures` và giờ cứng GMT+7 ở `ArticleNextMatch` → Tính offset DST thực tế của `America/New_York`, lấy trận sắp tới để tính múi giờ và dùng `<LocalMatchTime>` trên client. | `src/lib/news/date.ts:75-102` · `src/components/fixtures/fixture-timeline.tsx:99` · `src/components/news/article-end-sections.tsx:34` |
| **P1-06** | ISR & Edge Cache | `/gallery` bị ép dynamic mỗi request, `/analysis` thiếu `setRequestLocale`, `/standings` bị hạ TTL, `unstable_cache` lưu mảng rỗng khi lỗi mạng, cron scrape `90s` sát ngưỡng `524` → Chuyển `/gallery` & `/analysis` sang prerender tĩnh (`●` SSG/ISR), kiểm tra `requireNonEmptyArray`, bọc cache `/sitemap.xml`, hạ budget scrape xuống `45s`. | `src/app/[locale]/gallery/page.tsx:19-61` · `src/app/[locale]/analysis/page.tsx:32` · `src/app/sitemap.xml/route.ts:19-65` |
| **P1-07** | Auth, Profile, Scraper & Video | Thiếu kiểm tra URL avatar, `sanitize()` chạy trước biến đổi Cheerio, rò rỉ `Hls` khi unmount, lỗi autofill `LoginForm`, lưu `email` vào `localStorage` → Ràng buộc URL avatar đúng user folder, chuyển `sanitize()` xuống bước cuối cùng + `allowedIframeHostnames`, dọn `Hls` bằng cờ `cancelled`, đọc `FormData`, bỏ lưu `email` khỏi `localStorage`. | `src/app/actions/profile.ts:18-175` · `src/lib/news/enrichers/article-extractor.ts:88-115,455` · `src/components/news/article-video-player.tsx:27-68` · `src/components/auth/login-form.tsx:62-112` · `src/stores/auth-store.ts:6-24` |
| **P1-08** | Accessibility & Spoiler-Free | `/standings` A11y `97` (link thiếu gạch chân), `/stats` A11y `96` (`text-stadium-muted/80` tương phản `4.26:1`), `/fixtures` lỗi `label-content-name-mismatch`, `MomoModal` nút đóng trắng trên nền trắng, công tắc Spoiler thiếu nhãn ARIA → Đạt **100/100 Accessibility trên toàn bộ 7 trang chính**, bảo toàn hoàn hảo chế độ không lộ tỷ số. | `src/components/standings/standings-summary.tsx:48` · `src/components/stats/season-overview.tsx:78` · `src/components/fixtures/match-card.tsx:98-103` · `src/app/[locale]/about/momo-modal.tsx:23` · `src/components/fixtures/spoiler-controls.tsx:26` |
| **P2 & P3** | Toàn trang (UI, LCP, Code, Brand, Motion) | Tách nhỏ file >500 dòng, xóa `: any`, sửa `useToast()`, gỡ 4 gói Radix trùng, giảm hơn **2 giây LCP** trên trang chủ (`7,726ms` → `5,675ms`), thay `window.confirm` bằng `AlertDialog`, chuẩn hóa `playerSurname` (`"van Dijk"`), sửa nội dung `Legal` & `News.translate` & `History.records.signing`, chuẩn hóa motion `transform`/`opacity` `<=260ms` và hỗ trợ trọn vẹn `prefers-reduced-motion`. | `src/app/globals.css` · `src/components/analytics/google-adsense.tsx` · `src/components/home/digest-feature.tsx` · `src/components/news/comment-section.tsx` · `src/messages/{en,vi}.json` |

---

## 3. Đợt Nâng cấp Chuyên sâu — Swarm Upgrade Wave (`da38902` → Wave 2)

Sau khi hoàn tất Đợt 1–8 (`17f2430`), dự án tiếp tục thực hiện hai đợt rà soát chuyên sâu song song theo kiến trúc phân quyền file nghiêm ngặt (không xung đột nhánh, không chạm hạ tầng triển khai):

### 3.1. Chuẩn hóa Ngôn ngữ Song ngữ & Dữ liệu Mùa giải 2026/27 (`da38902` + Wave 2 `swarm/wording-qa`)
- **Đồng bộ 100% từ điển giao diện (`1,156` khóa trong `en.json` & `vi.json`):** Viết lại các câu dịch máy cứng nhắc sang văn phong báo chí thể thao tiếng Việt tự nhiên và tiếng Anh chuẩn mực; thống nhất thuật ngữ (*Ngoại hạng Anh*, *giữ sạch lưới*, *kiến tạo*, *hiệu số*, *đá chính*, *dự bị*, *ẩn tỷ số*, dấu gạch ngang `–` cho tỷ số/khoảng năm, chính tả dấu thanh).
- **Chuẩn hóa định vị thương hiệu & gỡ bỏ tàn dư cũ:** Căn chỉnh toàn bộ `About.*`, `Legal.*`, `Footer.*`, `site-article-voice.ts`, `current-facts.ts` và `/llms.txt` theo đúng nhận diện **Anfield Daily** (`docs/brand.md`), dùng động hằng số `NEWS_OUTLET_COUNT` (13 đầu báo tiếng Anh) thay cho con số gõ tay và dọn sạch các khóa/chuỗi của tính năng cũ đã ngưng hoạt động.
- **Hoàn thiện 100% hồ sơ 31 cầu thủ & dữ liệu lịch sử CLB (`src/data/*.json`):** Bổ sung đầy đủ tiểu sử tiếng Anh + tiếng Việt, `shirtName`, `metaDescription` và danh hiệu cho toàn bộ `31/31` cầu thủ đội một mùa 2026/27; cập nhật mốc sự nghiệp Mohamed Salah (`2017–2026`), bối cảnh HLV trưởng Andoni Iraola, và gom đoạn `player-bios.vi.json` (`<= 6` đoạn) để không bị cắt cụt trên trang cầu thủ. Khóa tự động bằng `src/messages/__tests__/messages-parity.test.ts`.

### 3.2. Giảm 52% RSC Client Payload & Xóa sạch Chuỗi Cứng Giao diện (`e6bdecc` + Wave 2 `swarm/app-polish`)
- **Tối ưu `<NextIntlClientProvider>` (`src/components/providers/client-messages.ts`):** Hàm bất biến `pickClientMessages()` chỉ giữ đúng `25` namespace thực sự dùng bởi `"use client"` components, loại bỏ các khối văn bản nặng chỉ render trên server (`Legal`, `History`, `About.whatIs`, `Stats`, `Season`, `Analysis`, `News.digest`, `PlayerDetail.nationalities`), giảm dung lượng JSON tuần tự hóa **51% ở bản EN** (`45.1 KB` → `21.9 KB`) và **52% ở bản VI** (`52.5 KB` → `25.2 KB`).
- **Kiểm thử đồ thị AST (`client-messages.test.ts`):** Tự động duyệt toàn bộ cây import TypeScript phía client (`132+` module) để đảm bảo không bao giờ xảy ra lỗi thiếu khóa `MISSING_MESSAGE` lúc chạy.
- **Nội địa hóa toàn diện & hoàn thiện A11y/UX:** Thay toàn bộ nhãn tiếng Anh cứng còn sót ở diễn biến trận đấu, thẻ phạt, vị trí cầu thủ, hộp thoại, thông báo lỗi, metadata và thẻ OpenGraph bằng khóa dịch chuẩn; sửa lỗi fallback huy hiệu đối thủ trên `ArticleNextMatch` sang `<TeamCrest />`; bổ sung điều hướng bàn phím roving `tabIndex` cho thanh tab `/profile`, đồng bộ `tabular-nums` trên mọi bảng số liệu và mở rộng bộ kiểm thử hồi quy E2E Playwright.

### 3.3. Gia cố Backend, Lịch `.ics`, SEO/JSON-LD & Kiểm duyệt Bài viết AI (`d6d9cb3`)
- **Lịch thi đấu RFC 5545 (`/api/calendar/liverpool.ics`, `fixtures-ics.ts`):** Đồng bộ `BRAND.name`, dịch tên giải đấu theo ngôn ngữ (`en`/`vi`), xử lý ký tự `\r` theo chuẩn RFC 5545, ánh xạ trạng thái hủy trận `ABD -> CANCELLED` và bổ sung `Cache-Control: max-age=3600`.
- **SEO, JSON-LD & OpenGraph (`src/lib/seo.ts`, `story-card.tsx`, `robots.txt`):** Chuyển truy xuất `NEXT_PUBLIC_SITE_URL` sang hàm truy xuất động `getSiteUrl()` tương thích Cloudflare Workers; chuẩn hóa `@type` tác giả trong `NewsArticle` (`Organization` vs `Person`), trạng thái `SUSP -> EventPostponed` trong `SportsEvent`, và khoảng cách chữ `WORDMARK` (`0.18em` + gạch chân đỏ) trên ảnh chia sẻ.
- **Lọc rác xuất bản & kiểm duyệt bản nháp (`src/lib/news/**`, `validate-draft.ts`):** Loại bỏ triệt để đuôi rác nhà xuất bản (*"Read more…"*, chân trang bản quyền, quảng bá kênh nhắn tin), giải mã đầy đủ thực thể HTML ở RSS/OG/YouTube; tinh chỉnh biểu thức kiểm duyệt định vị trong `validate-draft.ts` chỉ chặn các cụm nhắm sai đối tượng độc giả nhưng vẫn cho phép văn phong tường thuật hợp lệ khi thi đấu sân khách hoặc cúp châu Âu.
- **Bảo vệ API & Server Actions:** Ẩn thông báo lỗi nội bộ ở các phản hồi `500`, áp hạn mức thời gian `AbortSignal.timeout` cho từng model trong `/api/news/translate`, chống ký tự đại diện `ILIKE` trên `/api/gallery`, phân biệt rõ trạng thái mất kết nối Supabase (`"unavailable"`) với chưa đăng nhập (`"signIn"`).

### 3.4. Xử lý Triệt để Lỗi Treo Stale Fetch Revalidation trên Next.js 16 (`b15033e`)
- Khi cơ sở dữ liệu Supabase tạm ngừng phản hồi trong lúc `next build`, cơ chế `patch-fetch` của Next.js 16 tự gỡ `init.signal` ở nhánh làm mới ngầm `fetch-cache` hết hạn (`signal: isStale ? undefined : signal`), đồng thời lỗi cổng `502`/`503`/`504` trước đó chưa kích hoạt cầu dao ngắt mạch.
- Đã bổ sung bộ đếm `Promise.race` cứng `3,000ms` song song với `AbortController` và gom nhóm `502`/`503`/`504` vào `isOriginFailure()` trong `src/lib/supabase-fetch-with-timeout.ts`, đồng thời bọc `unstable_cache` cho truy vấn tin tức liên quan cầu thủ (`/player/[id]`) và danh sách phân tích (`/analysis`), giúp `npm run build` hoàn tất 116+ trang tĩnh trong `~5.7s` ngay cả khi DB ngoại tuyến.

### 3.5. Chuẩn hóa Toàn bộ Hệ thống Tài liệu Dự án (Wave 2 `swarm/docs`)
- Viết mới và đồng bộ toàn diện `README.md`, `CLAUDE.md`, `docs/README.md`, `docs/codebase-summary.md`, toàn bộ 9 tài liệu tiếng Anh (`docs/en/**`) và 10 tài liệu tiếng Việt (`docs/vi/**`, khắc phục triệt để các tệp không dấu trước đây).
- Phản ánh chính xác 100% kiến trúc hiện hành: thương hiệu **Anfield Daily**, hạ tầng Cloudflare Workers (`@opennextjs/cloudflare` + R2 + D1 + Durable Objects), 13 đầu báo tiếng Anh + kênh YouTube CLB (`lfctv`), hệ thống AI qua VietAPI (bản tin ngày, dịch toàn văn tiếng Việt, phân tích sau trận `/analysis`), dự đoán tỷ số & chấm điểm cầu thủ, chế độ ẩn tỷ số, lịch `.ics`, định tuyến `next-intl` (`/`, `/vi`, `pickClientMessages`) và quy trình kiểm thử Vitest + Playwright.

---

## 4. Kết quả Lệnh Kiểm chứng Thực tế (Lint, Typecheck, Unit Test, Build, E2E)

### 4.1. TypeScript (`npx tsc --noEmit`) & ESLint (`npm run lint`)
```text
$ npx tsc --noEmit && npm run lint
> liverpool-app@0.1.0 lint
> eslint
(Exit code: 0 — 0 errors, 0 warnings)
```

### 4.2. Unit Tests (`npm test`)
```text
$ npm test
> liverpool-app@0.1.0 test
> vitest run

 Test Files  76 passed (76)
      Tests  774 passed (774)
(Exit code: 0 — tăng từ 70 files / 718 tests ban đầu lên 76 files / 774 tests, khóa chặt parity song ngữ & dữ liệu CLB, đồ thị namespace client, API hardening, SEO/ICS, draft validation và Supabase stale-fetch timeout)
```

### 4.3. Production Build (`npm run build`)
```text
$ npm run build
> liverpool-app@0.1.0 build
> next build

▲ Next.js 16.4.6 (Turbopack)
✓ Compiled successfully
✓ Finished TypeScript
✓ Generating static pages using 7 workers (116/116) in ~5.7s
(Exit code: 0 — 0 cảnh báo metadataBase, không còn SecurityFatalError, không còn HTTP 429, không bị treo khi Supabase chập chờn)
```

### 4.4. Playwright E2E Suite (Desktop Chrome + Mobile Pixel 7)
```text
$ npx playwright test
Running 142 tests using 3 workers
  125 passed, 17 skipped (project-scoped desktop/mobile skips), 0 failed
(Exit code: 0 — bao gồm 12 bài kiểm thử mới trong e2e/upgraded-flows.spec.ts cho /vi/news, Spoiler-free, /analysis & /predictions; tràn ngang 320px & 390px ở cả EN/VI, bàn phím, focus trap, reduced-motion, lightbox, 0 lỗi Console)
```

---

## 5. Đối chiếu Số đo Trước vs Sau

### 5.1. Lighthouse Mobile (v12.8.2 — Simulated 4G, Moto G Power)

| Trang | Perf (Trước → Sau) | A11y (Trước → Sau) | BP (Trước → Sau) | SEO* | LCP ms (Trước → Sau) | TBT ms (Trước → Sau) | CLS (Trước → Sau) | Speed Index ms (Trước → Sau) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` (Home) | 75 → **79** (+4) | 100 → **100** | 79 → 79 | 92 | 7,726 → **5,675** (-2,051ms) | 41 → 64 | 0.0000 → 0.0154 | 3,325 → **2,585** (-740ms) |
| `/news` | 81 → **83** (+2) | 100 → **100** | 79 → 79 | 92 | 4,497 → 4,607 | 170 → **105** (-65ms) | 0.0000 → **0.0000** | 2,977 → **2,501** (-476ms) |
| `/fixtures` | 79 → **81** (+2) | 100 → **100** | 79 → 79 | 92 | 5,234 → **5,060** (-174ms) | 100 → 102 | 0.0005 → **0.0005** | 3,571 → **2,204** (-1,367ms) |
| `/squad` | 80 → **82** (+2) | 100 → **100** | 79 → 79 | 92 | 5,166 → **4,783** (-383ms) | 93 → **76** (-17ms) | 0.0000 → **0.0000** | 2,482 → **2,431** (-51ms) |
| `/standings` | 82 → **83** (+1) | 97 → **100** (+3) | 79 → 79 | 92 | 4,921 → **4,775** (-146ms) | 53 → 61 | 0.0000 → **0.0000** | 2,195 → **2,181** (-14ms) |
| `/stats` | 80 → **84** (+4) | 96 → **100** (+4) | 79 → 79 | 92 | 4,842 → **4,162** (-680ms) | 152 → **140** (-12ms) | 0.0000 → **0.0000** | 2,873 → **2,713** (-160ms) |
| `/history` | 84 → **85** (+1) | 100 → **100** | 79 → 79 | 92 | 4,387 → **4,380** (-7ms) | 67 → **48** (-19ms) | 0.0000 → **0.0000** | 1,747 → 2,168 |

*\*Ghi chú:* Điểm SEO = 92 trên localhost do `.env.production` cấu hình `NEXT_PUBLIC_SITE_URL=https://anfielddaily.com` (canonical trỏ về domain thật; trên `https://anfielddaily.com` đạt **100**). Điểm Best Practices = 79 do cookie bên thứ ba của Google AdSense (`doubleclick.net`), không đến từ mã nguồn ứng dụng.

### 5.2. Kích thước Bundle, Payload Đa ngôn ngữ, Độ ổn định & Kiểm thử

| Chỉ số | Trước nâng cấp | Sau nâng cấp (gồm Swarm Wave) | Thay đổi |
|---|---:|---:|---:|
| **Client JS (`.next/static`, gzip)** | `904,878 B` (883.7 KB) | **`900,707 B` (879.6 KB)** | **-4,171 B (-0.46%)** |
| **Client CSS (`.next/static`, gzip)** | `31,131 B` (30.4 KB) | **`30,708 B` (30.0 KB)** | **-423 B (-1.36%)** |
| **RSC `NextIntlClientProvider` Payload (EN / VI)** | `45.1 KB` / `52.5 KB` | **`21.9 KB` / `25.2 KB`** | **Giảm ~52% mỗi trang** |
| **Unit Tests (`vitest`)** | 70 files / 718 tests | **`76` files / `774` tests** | **+56 tests (100% pass)** |
| **Playwright E2E Tests** | Chưa chạy kiểm chứng | **`125` passed / `0` failed (`142` total)** | **100% pass (Desktop & Mobile)** |
| **Đồng bộ Khóa Dịch & Tiểu sử Cầu thủ** | Rải rác chuỗi cứng & thiếu bio | **`1,156/1,156` khóa · `31/31` bio EN+VI** | **Chuẩn hóa 100%** |
| **Lỗi ứng dụng trên Console (26 route)** | Hàng loạt `ERR_BLOCKED_BY_RESPONSE` | **`0` lỗi ứng dụng** | **Sạch 100%** |
| **Tràn ngang ở `390px` & `320px`** | `+72px` trên `/fixtures/560645` | **`0px` trên mọi route** | **Sạch 100%** |
| **CLS trang chi tiết trận đấu (`390px`)** | `0.1650` (Kém) | **`0.0490` (Tốt < 0.1)** | **Giảm 70%** |
| **Interaction Long Tasks (>50ms)** | Chưa kiểm chứng | **`0` long task khi lọc/cuộn** | **Mượt 60fps** |
| **Lỗ hổng `next` / `sanitize-html` / `zod` / `undici`** | 6 lỗ hổng runtime (`SecurityFatalError`) | **`0` lỗ hổng trên code chạy thật** | **Đã vá sạch** |

---

## 6. Bộ Ảnh Đối chiếu Trực quan (`audit/before/` vs `audit/after/`)

Toàn bộ `104` ảnh trước nâng cấp (`audit/before/<slug>-<390|768|1280|1440>.png`) đều có ảnh chụp đối ứng 1–1 tại `audit/after/<slug>-<390|768|1280|1440>.png` cho cả 26 route:
- **Trang chủ & Điểm tin:** `home-en`, `home-vi`, `news`, `news-vi` (từ trắng trang → đầy đủ tin tiếng Việt), `news-digest`, `news-article`, `news-reader` (đã khôi phục nút *Translate to Vietnamese* / *Dịch sang tiếng Việt*).
- **Trận đấu & Mùa giải:** `fixtures`, `fixture-detail` (`/fixtures/560645` hết tràn ngang 390px, có skeleton dự đoán), `standings`, `predictions`, `stats`, `stats-2025`, `season`.
- **Đội hình, Phân tích & CLB:** `analysis`, `analysis-detail`, `squad`, `players`, `player-detail` (`/player/alisson-becker`), `history`, `gallery`.
- **Tài khoản & Hệ thống:** `login`, `register`, `about`, `legal`, `not-found` (đã thay logo CLB bằng `<BrandMark />` chuẩn nhận diện Anfield Daily).

---

## 7. Hạng mục Không can thiệp & Câu hỏi Mở

1. **Hạ tầng Cloudflare & Biến môi trường (Tuân thủ Quy tắc 0.4):**
   - Không sửa `wrangler.jsonc`, `open-next.config.ts`, `.github/workflows/deploy-cloudflare.yml` hay `.env*`.
   - Khuyến nghị vận hành (trên Cloudflare Dashboard của chủ dự án): bật *Cloudflare Bot Fight Mode* + WAF Rate Limiting cho `/api/news/translate`, `/api/news/comments`, `/api/news/like` để bổ trợ lớp rate-limit cấp Worker isolate hiện có.
2. **Gói tùy chọn `@parcel/watcher` (`picomatch`):**
   - `npm audit --omit=dev` còn ghi nhận cảnh báo ReDoS ở nhánh phụ thuộc tùy chọn `@parcel/watcher -> picomatch` (chỉ dùng cho trình theo dõi file lúc build local, không đóng gói vào bundle client hay Worker runtime; sửa cưỡng bức yêu cầu hạ cấp breaking change của `@parcel/watcher`).
3. **Bản cập nhật bảo mật `next` (`16.4.2` → `16.4.6`):**
   - Đã cập nhật bản vá bảo mật cùng nhánh minor `16.4.x` để khắc phục dứt điểm `SecurityFatalError` khi `next build` và 2 CVE bảo mật của Next.js mà không thay đổi bất kỳ hành vi routing/API nào.
4. **Điểm có thể cân nhắc thêm với chủ sản phẩm:**
   - Email cá nhân (`nguyendangdinh47@gmail.com`) và số điện thoại cá nhân trên trang `/about` & `/legal` hiện đang hiển thị công khai theo thiết kế gốc (`BRAND.contactEmail`); nếu chuyển sang vận hành thương mại rộng rãi, nên đổi sang hộp thư theo tên miền (`contact@anfielddaily.com`).
