# Kế hoạch cache — Anfield Daily

Soạn 13/10/2026. Next **16.4.0**, Vercel Hobby, 1 region `sin1`, bot >99% request.
Mọi khẳng định dưới đây đã đối chiếu với docs 16.4 (`nextjs.org/docs`, `version: 16.4.0`)
và với code trong repo, có `file:line`. Không suy từ trí nhớ.

> **Cập nhật 13/10 11:1x — mục tiêu đã đổi.** Chủ site chốt: ưu tiên **giảm số request
> và giảm số lần gọi DB** (app nhỏ, không muốn tốn lưu lượng DB/Cloudflare), **không**
> ưu tiên freshness. §3 đã làm xong theo hướng đó — xem §7 để biết đã làm gì và giảm
> được bao nhiêu. Phần §2 (không bật Cache Components) càng đúng hơn với mục tiêu này.

## Kết luận trước

1. **KHÔNG bật `cacheComponents` lúc này.** Lý do ở §2 — không phải vì khó, mà vì
   trên serverless nó *mất* tính bền của cache mà site đang dựa vào.
2. Giữ mô hình hiện tại (ISR + `unstable_cache`), **sửa 4 lỗi thật** ở §3.
3. Lỗi nghiêm trọng nhất: **sync chạy xong nhưng data cache không bị xoá** → render
   lại ngay lập tức bằng **dữ liệu cũ**, rồi cache tiếp. Tin mới trễ 5–15 phút và
   lần render đắt nhất bị tiêu vào đúng lúc vô ích nhất.

## 1. Hiện trạng

### 1.1 ISR theo route (`export const revalidate`)

| Route | revalidate | Dữ liệu thật đổi khi nào |
|---|---|---|
| `/` | 300s | news sync **1 giờ/lần** |
| `/news` | 600s | news sync **1 giờ/lần** |
| `/news/digest` | 1800s | digest **1 ngày/lần** |
| `/news/digest/[date]` | 3600s | bất biến sau khi tạo |
| `/news/[...slug]` | 600s | bất biến (excerpt) |
| `/analysis` | 900s / `[slug]` 3600s | khi tự viết bài |
| `/fixtures` 1800s · `/fixtures/[id]` 300s | | theo trận |
| `/standings` | 21600s (6h) | theo trận |
| `/stats` · `/stats/[season]` · `/player/[id]` · `/analysis/[slug]` | 3600s | |
| `/squad` · `/history` · `/about` | 86400s | gần như bất biến |
| `/gallery` · `/season` · `/predictions` | 1800s / 1800s / 600s | |

4 API route `force-dynamic` (sync, cleanup, digest/generate, site-articles/generate) —
đúng, đây là cron. `llms.txt` `force-static` — đúng.
`sitemap.xml` `force-dynamic` nhưng có `s-maxage=3600` nên CDN vẫn đỡ ([route.ts:175](../../src/app/sitemap.xml/route.ts#L175)).

### 1.2 Data cache (`unstable_cache`)

| Key | TTL | Tag | Nhận xét |
|---|---|---|---|
| `home-news-vi-first-v3` | 300s | `news` | ✅ |
| `news-page-list-v4` | 300s | `news` | ✅ |
| `news-page-video-v1` | 900s | `news` | ✅ |
| `home-hero-setting-v2` | 300s | site-settings | ✅ |
| `gallery-first-page-v1` | 1800s | gallery | ✅ |
| `news-digest-latest-date`, `latest-digest-v1` | 1800s | `news-digest` | ✅ |
| `home-fixtures-v1` | 300s | **không** | ❌ không xoá được theo sự kiện |
| `home-standings-v1` | 3600s | **không** | ❌ |
| `fpl-lfc-player-stats` | 6h | **không** | ❌ |
| `prediction-leaderboard-v1` | 600s | **không** | ❌ §3.2 |
| `player-fan-rating-v1` | 600s | **không** | ❌ §3.2 |
| `live-fixture-v1` | 30s | — | ok (có `s-maxage=30`) |

### 1.3 Invalidation đang có

- `revalidateTag("news", "max")` — **chỉ** ở `/api/news/cleanup` (chạy 3h sáng).
- `revalidateTag("news-digest", "max")` — ở `/api/news/digest/generate`. ✅
- `revalidateTag` gallery / site-settings — trong `lib/gallery/queries.ts`. ✅
- `revalidatePath` — auth, site-articles/generate, và sync (chỉ path, xem §3.1).

Chữ ký `revalidateTag(tag, profile)` 2 tham số đang dùng **đúng** chuẩn 16.4
(docs: profile là **bắt buộc**).

## 2. Vì sao KHÔNG bật Cache Components

Docs 16.4 nói thẳng mấy điểm quyết định:

- `use cache` mặc định lưu **in-memory**. Trên serverless: *"cache entries typically
  don't persist across requests"*, và **không bao giờ** sống qua deploy (cache key chứa build ID).
- `unstable_cache` và fetch Data Cache **có** sống qua deploy và qua instance.
  Docs khuyên thẳng: *"For data that needs to persist across deploys, use `unstable_cache`"*
  và với `unstable_cache` thì *"No change required… migrate it later."*
- Muốn bền thì phải `use cache: remote`, mà docs ghi *"typically incurs platform fees"*
  + thêm 1 network roundtrip — ngược hẳn mục tiêu giảm giá Vercel.

Toàn bộ cache của site tồn tại để **giữ Supabase/Football-Data ra khỏi critical path**.
Chuyển sang `use cache` thuần = mỗi request lại đi hỏi DB. Đó là thụt lùi, không phải nâng cấp.

Chưa kể chi phí migrate, và nó rơi đúng vào chỗ dễ vỡ:

- 20 `export const revalidate` phải bỏ hết → thay bằng `use cache` + `cacheLife`.
- `dynamicParams` **fail build**: `"not compatible with nextConfig.cacheComponents"`
  — đang export ở [player/[id]/page.tsx:81](../../src/app/[locale]/player/[id]/page.tsx#L81).
- `generateStaticParams` trả `[]` giờ **lỗi** (`empty-generate-static-params`) — đang có **4 route**:
  `news/[...slug]`, `news/digest/[date]`, `fixtures/[id]`, `stats/[season]`.
- PPR thành mặc định; `cookies/headers/searchParams` ngoài `<Suspense>` ra insight.
- `<Activity>` **giữ state khi navigate** → dropdown/dialog/lightbox không còn unmount.
  Site đang có e2e test khẳng định đúng hành vi cũ (language dropdown Esc + trả focus,
  gallery lightbox trả focus). Những test đó sẽ đổi nghĩa.

→ Xem lại khi nào Vercel cho cache handler bền miễn phí/mặc định, hoặc khi đã biết giá
`use cache: remote`. Không phải bây giờ.

## 3. Việc cần làm

### 3.1 P0 — sync không xoá data cache (tin mới trễ, render tiêu vào dữ liệu cũ)

**Bằng chứng.** [api/news/sync/route.ts:22-27](../../src/app/api/news/sync/route.ts#L22-L27)
gọi `revalidateLocalizedPath("/")` + `("/news")`, **không** gọi `revalidateTag("news")`.
Comment ở đó nói tag *"refreshes on its own 5-min revalidate window"*, còn comment ở
[news/page.tsx:35](../../src/app/[locale]/news/page.tsx#L35) nói *"The 'news' tag is busted by
the sync route, so a fresh sync shows up immediately"* — **câu này sai**, sync chưa bao giờ bust tag.

**Hậu quả.** `revalidatePath` chỉ bỏ HTML đã render, không bỏ entry `unstable_cache`.
Sync xong → page bị đánh dấu stale → visitor kế tiếp kích hoạt render → render đó đọc
`news-page-list-v4` **vẫn còn hạn** → ra HTML **cũ** → HTML cũ đó được cache thêm 600s.
Tin mới trễ tới ~5–15 phút, và lần render đắt nhất bị tiêu vào dữ liệu cũ.

**Sửa.**

```ts
// src/app/api/news/sync/route.ts
import { revalidateTag } from "next/cache";

if (result.upserted > 0) {
  // Phải xoá data layer TRƯỚC. revalidatePath chỉ bỏ HTML; không có dòng này thì
  // lần render sau đọc lại entry unstable_cache cũ và cache tiếp bài cũ một vòng nữa.
  revalidateTag("news", "max");
  revalidateLocalizedPath("/");
  revalidateLocalizedPath("/news");
}
```

- [ ] Thêm `revalidateTag("news", "max")`.
- [ ] Sửa comment sai ở `news/page.tsx:35` và comment ở `sync/route.ts:22`.
- [ ] Test: unit test cho sync route — `upserted > 0` thì `revalidateTag` được gọi với `("news","max")`;
      `upserted === 0` thì không. (Mẫu có sẵn: `api/news/cleanup/__tests__/route.test.ts`.)

### 3.2 P0 — dự đoán / chấm điểm cầu thủ không xoá cache gì cả

**Bằng chứng.** [actions/predictions.ts](../../src/app/actions/predictions.ts) là `"use server"`,
có `savePrediction` + `saveRatings` ghi DB, **không import `next/cache`** (grep = 0).
Hai hàm đọc là `getPredictionLeaderboard` và `getPlayerFanRating`
([leaderboard.ts:66](../../src/lib/fan-predictions/leaderboard.ts#L66),
[:97](../../src/lib/fan-predictions/leaderboard.ts#L97)) — TTL 600s, **không tag**.
Người đọc thật: `/predictions` (ISR 600) và `/player/[id]` (**ISR 3600**).

**Hậu quả.** Người dùng gửi dự đoán rồi không thấy gì. Trên `/player/[id]` điểm vừa chấm
có thể mất **tới 1 tiếng** mới hiện, vì HTML page bị đóng băng 3600s — TTL 600s bên trong
vô nghĩa khi vỏ ngoài 3600s.

**Sửa.** Docs 16.4 gọi đúng tên công cụ cho ca này: `updateTag` — *"for mutations whose
result the user must see immediately (read-your-own-writes)"*, và chỉ gọi được từ Server Action
(đúng, file đã `"use server"`).

```ts
// src/lib/fan-predictions/leaderboard.ts
export const FAN_PREDICTIONS_CACHE_TAG = "fan-predictions";
// ...thêm vào CẢ HAI wrapper:
{ revalidate: 600, tags: [FAN_PREDICTIONS_CACHE_TAG] }
```

```ts
// src/app/actions/predictions.ts
import { updateTag } from "next/cache";
import { FAN_PREDICTIONS_CACHE_TAG } from "@/lib/fan-predictions/leaderboard";

// cuối savePrediction và saveRatings, sau khi ghi thành công:
updateTag(FAN_PREDICTIONS_CACHE_TAG);
```

- [ ] Gắn tag cho 2 wrapper + `updateTag` ở 2 action.
- [ ] `revalidatePath` cho `/player/[id]` của cầu thủ vừa chấm (ISR 3600 vẫn đóng băng HTML;
      tag chỉ xoá data cache). Dùng `revalidateLocalizedPath` để không quên prefix `/vi`.
- [ ] Unit test: gọi action → `updateTag` được gọi.

### 3.3 P1 — nới ISR cho route đã có tag

Khi §3.1 xong, freshness do **sự kiện** quyết định, timer chỉ còn là lưới an toàn.
Hiện `/` 300s = tối đa 12 lần render/giờ/locale (24 cả 2 locale) trong khi news đổi
**1 lần/giờ** → ~11/12 lần render là vô ích. Với bot >99% request thì gần như luôn có
request để kích hoạt, nên con số này là thực chi, không lý thuyết.

| Route | Giờ | Đề xuất | Vì sao an toàn |
|---|---|---|---|
| `/` | 300 | **1800** | tag `news` bust ngay khi sync có bài mới |
| `/news` | 600 | **1800** | như trên |
| `/news/digest` | 1800 | **21600** | tag `news-digest` bust khi generate |
| `/news/[...slug]` | 600 | **86400** | excerpt bất biến; tag `news` vẫn bust |
| `/news/digest/[date]` | 3600 | **max** | bản digest cũ không bao giờ đổi |

- [ ] Đổi 5 giá trị, mỗi chỗ 1 comment ghi *vì sao dài được* (tag nào bảo kê).
- [ ] **Không** nới `/fixtures*`, `/standings`, `/stats`, `/predictions`: không có tag,
      timer là cơ chế duy nhất.

### 3.4 P2 — cache không có tag, và `images.minimumCacheTTL`

- [ ] Gắn tag `football` cho `home-fixtures-v1` + `home-standings-v1` + `fpl-lfc-player-stats`.
      Chưa có ai bust nó (không có cron sau trận), nhưng có tag thì sau này bust được bằng
      1 route, và quan trọng hơn: **giảm được timer** một cách an toàn.
- [ ] `images.minimumCacheTTL` đang **không set** → mặc định **14400s (4h)** ở 16.4
      (không phải 60s như các bản cũ — đã kiểm docs). Crest, ảnh FPL, URL Cloudinary
      gần như bất biến, tối ưu lại mỗi 4h là phí tiền optimizer.
      **Cạm bẫy:** docs ghi *"There is no mechanism to invalidate the [image] cache"*.
      Avatar Supabase dùng **lại cùng URL** sau khi đổi ảnh → TTL dài sẽ đóng băng avatar cũ.
      ⇒ Chỉ nâng TTL **sau** khi avatar có cache-bust (thêm `?v=<updated_at>` vào URL).
      Thứ tự: cache-bust avatar trước → rồi `minimumCacheTTL: 2678400` (31 ngày).

## 4. Thứ tự thi công

1. §3.1 (1 dòng + 2 comment + 1 test) — lợi ích lớn nhất, rủi ro gần như không.
2. §3.2 (lỗi người dùng nhìn thấy được).
3. §3.3 (giảm tiền; làm **sau** §3.1, vì nới ISR mà chưa có tag bust thì tin sẽ trễ hơn).
4. §3.4 (avatar cache-bust → rồi mới nâng TTL ảnh).

**Verify mỗi bước:** `npm run lint && npm run test && npm run test:e2e` (hiện 639 unit +
119 e2e, xanh ở `e7cc823`). Riêng §3.1/§3.2 kiểm thêm bằng `NEXT_PRIVATE_DEBUG_CACHE=1 npm start`
— docs nói biến này log cả ISR lẫn data cache, nên thấy được hit/miss thật.

## 5. Cố ý không làm

- **`cacheComponents` / `use cache`** — §2.
- **`experimental.staleTimes`** (client router cache). Docs 16.4 vẫn ghi *"currently
  experimental… not recommended for production"*. Bỏ.
- **Cache handler ngoài (Redis/KV)** — thêm tiền + thêm hạ tầng, trong khi
  `unstable_cache` đã bền sẵn. Chỉ xét nếu sau này thật sự bật Cache Components.
- **Đổi region khỏi `sin1`** — page static/ISR đã do CDN toàn cầu phục vụ; chỉ
  render động và API chạy ở `sin1`, mà DB Supabase cũng ở đó. Tách ra là thêm
  ~250ms/query. Giữ nguyên.

## 6. Chưa chốt

1. Supabase đang ở region nào? Nếu **không** phải Singapore thì §5 (giữ `sin1`) cần xét lại.
2. Có muốn 1 cron "sau trận" để bust tag `football` (§3.4) không, hay cứ để timer?
3. Avatar: thêm `?v=<updated_at>` vào URL — làm luôn, hay giữ TTL ảnh 4h và bỏ qua §3.4?

## 7. Đã thi công (13/10/2026)

Mục tiêu: **ít request, ít query DB**. Tất cả đã qua `tsc` + `lint` + 641 unit test.

### 7.1 Trang bài viết: khách giờ gọi **0** request (trước: 2 request / 4 Supabase call)

`article-actions.tsx` gọi 2 API cho **mọi** người xem mỗi lượt vào bài:
`/api/news/like` (2 Supabase call: `auth.getUser` + count) và `/api/saved-articles/check`
(với khách thì **luôn** trả `false` — hỏi để không biết gì).

- Like count giờ render sẵn từ server (`initialLikeCount`), vì nó **giống nhau với mọi
  người xem** → không cần request.
- Hai fetch còn lại chỉ chạy khi `user` có thật.
- `engagement.ts` (đang dead code, không ai dùng) được **dùng lại** thay vì xoá: 2 query
  phủ **toàn bộ** bài viết, cache chung 600s, tag `article-engagement` bust khi có like mới.

| | Trước | Sau |
|---|---|---|
| Khách xem 1 bài | 2 request, ~4 Supabase call | **0 request, 0 call** |
| User đã login | 2 request, ~5 call | 2 request |
| Chi phí like count toàn site | ~2 call × mỗi lượt xem | **2 query / 600s** |

### 7.2 `getNewsFromDB(100)` không cache trên trang bài viết

Chỗ tốn nhất và dễ bỏ sót: `/news/[...slug]` gọi thẳng `getNewsFromDB(100, …)`.
`getNewsFromDB` chỉ bọc `React.cache` (dedup **trong một** render), nên **mỗi bài**
render = **một query 100 dòng** — mà bài viết là loại trang nhiều nhất, mỗi URL một
entry ISR riêng. Thêm `src/lib/news/cached-feed.ts` (`unstable_cache`, tag `news`) để
mọi trang bài dùng chung một snapshot.

### 7.3 Nới ISR + TTL (sau khi §3.1 xong nên an toàn)

| Route | Trước | Sau | Bảo kê bởi |
|---|---|---|---|
| `/` | 300s | **1800s** | tag `news` |
| `/news` | 600s | **1800s** | tag `news` |
| `/news/digest` | 1800s | **21600s** | tag `news-digest` |
| `/news/[...slug]` | 600s | **3600s** | — (xem lưu ý) |
| `/news/digest/[date]` | 3600s | **86400s** | bất biến |

TTL data cache bên trong cũng nâng 300s → 1800s (`home-fixtures`, `home-news`,
`home-hero-setting`, `news-page-list`). Lý do: TTL trong **nhỏ hơn** ISR ngoài thì
mỗi lần render chắc chắn phải query lại — cache không bao giờ hit cho trang đó.

Trang chủ: trước ~12 render/giờ/locale × 4 query = **~96 query/giờ**; giờ
~2 render/giờ/locale × 4 (phần lớn hit cache) → **ước ~16 query/giờ**. Giảm ~6×.

**Lưu ý đã cân nhắc:** `/news/[...slug]` để **3600s** chứ không phải 86400s như ý định
ban đầu, vì trang giờ render like count, mà `revalidateTag` chỉ xoá data cache — **không**
xoá HTML đã ISR. 1 giờ là mức chặn độ cũ mà khách thấy; user đã login vẫn lấy số live.

### 7.4 `revalidateTag("news","max")` ở sync route (§3.1)

Đã thêm + sửa 2 comment sai + thêm test
(`src/app/api/news/sync/__tests__/route.test.ts`): bust tag khi `upserted > 0`,
không bust khi `= 0`.

### 7.5 Predictions (§3.2) — fix một phần, nói rõ phần còn lại

Đã gắn tag `fan-predictions` cho 2 reader + `updateTag` ở 2 action +
`revalidateLocalizedPath("/predictions")`.

**Nói chính xác:** client **đã** tự `getPredictionState()` lại sau khi lưu, nên view của
chính người vote chưa bao giờ bị lỗi. Cái bị lỗi là **bảng xếp hạng chung** và
**điểm fan trên `/player/[id]`**. `/predictions` giờ đúng ngay.
`/player/[id]` **vẫn còn trễ tới 1 giờ** (ISR 3600) — action chỉ có `player_name`,
không có route id, nên không revalidate được path. Còn tồn tại, không phải đã xong.

### 7.6 External request: `getFixtures` chỉ có `React.cache`

`getFixtures` được gọi **thẳng** từ 11 chỗ và chỉ bọc `React.cache` (dedup trong
**một** render). Nên mỗi lần render trang bài viết = **1 request Football-Data.org**,
chỉ để biết "trận kế tiếp là gì". Free tier = **10 req/phút**. Đây gần như chắc chắn
là nguồn lỗi 429 làm 2 e2e test fail ở đầu branch này — lúc đó tôi đã đoán sai là
"chỉ do quota".

Thêm `src/lib/football/cached-fixtures.ts` (`unstable_cache`, 1800s) và dùng cho
3 caller nhiều lượt nhất: trang bài viết, `sitemap.xml` (force-dynamic, crawler gọi),
và feed `.ics` (app lịch tự poll).

**Cố ý giữ nguyên:** `/fixtures/[id]` và `/api/live-fixture` đọc trạng thái trận
**đang diễn ra**, phải hỏi provider trực tiếp. `/standings` ISR 6h nên không đáng.

### 7.7 Trang bài viết: comment

Hai chi phí nữa mỗi lượt xem:

- `comment-section.tsx` gọi `createClient()` **vô điều kiện** → kéo Supabase browser
  client (~60KB gzip) vào **mọi** trang bài cho **mọi** khách, phá đúng cái lazy-load
  mà navbar đã làm, cộng 1 request auth để được trả lời "bạn là khách". Giờ dùng
  `hasSupabaseSession()` + `loadSupabaseClient()` như navbar.
- `GET /api/news/comments` chạy mỗi lượt xem. **Hầu hết bài có 0 comment** → giờ
  truyền `initialCommentCount` từ snapshot engagement (đã có sẵn, không thêm query)
  và **bỏ hẳn fetch khi = 0**.

**Bẫy đã chặn:** `engagement` ban đầu chỉ đếm 30 ngày. Khi con số chỉ để *hiển thị*
thì sai cũng chỉ là số sai; nhưng khi nó **quyết định có fetch hay không** thì đếm
thiếu = **comment thật biến mất**. Đã bỏ date cutoff, đổi sang `order(created_at desc)`
+ cap 500 dòng, và thêm 4 unit test (`lib/news/__tests__/engagement.test.ts`) khoá
đúng 2 cách có thể sai: URL lưu ở dạng cũ, và cutoff theo ngày.

`POST /api/news/comments` giờ bust tag + `revalidateLocalizedPath` trang bài đó, nên
comment đầu tiên không bị số `0` trong HTML che lại. `DELETE` **không** cần: số giảm
chỉ gây 1 fetch thừa, không che gì.

**Không làm — cache `GET /api/news/comments` ở CDN.** RLS là `USING (true)` nên
response giống nhau với mọi người, cache được về mặt kỹ thuật. Nhưng `s-maxage` sẽ làm
người vừa gửi comment không thấy comment của mình, mà lợi ích thì nhỏ với site ít
truy cập (ít người xem cùng 1 bài trong cùng 1 phút). Đổi lấy rủi ro UX không đáng.

## 8. Đã làm nốt (13/10, lượt 2)

### 8.1 `/player/[id]` hết trễ 1 giờ sau khi chấm điểm

Thêm `getPlayerSlugByName()` vào `squad-data.ts`; `saveRatings` giờ revalidate
path của từng cầu thủ được chấm. Khớp **đúng chuỗi tên**, cố ý: rating lưu theo
tên từ feed lineup, còn `getPlayerFanRating` đọc lại bằng tên trong `squad.json`
— hai bên chỉ gặp nhau khi chuỗi giống hệt, nên khớp lỏng hơn ở đây chỉ revalidate
những trang vốn không thể hiện rating. (Việc tính năng phụ thuộc 2 nguồn đồng ý
về cách viết tên là fragility **có từ trước**, không phải do lookup này.)

### 8.2 Tag `football` + sửa một vòng import

`home-fixtures`, `home-standings`, `fpl-lfc-player-stats` và `season-fixtures`
giờ đều mang tag `FOOTBALL_CACHE_TAG`.

Lần đầu tôi đặt hằng số này trong `cached-fixtures.ts` — **sai**, vì module đó
import `./index`, mà `./index` lại re-export `fpl-stats`, nơi cũng cần tag:
vòng `index → fpl-stats → cached-fixtures → index`. TypeScript cho phép vòng nên
build không báo gì; lúc runtime, module thua cuộc đua khởi tạo sẽ đọc hằng số
thành `undefined`, tức là cache entry **không có tag** mà không hề báo lỗi.
Đã tách sang `src/lib/football/cache-tags.ts` (module lá, không import gì).

### 8.3 Avatar cache-bust + `images.minimumCacheTTL` 4h → 31 ngày

`avatar-upload.tsx` upload vào path cố định `${user.id}/avatar.${ext}` với
`upsert: true` → **URL không đổi** khi đổi ảnh. Cả browser lẫn Next image
optimizer đều key cache theo URL, và optimizer **không có API invalidate**.
Giờ URL lưu vào DB có `?v=${Date.now()}`.

Chỉ **sau** khi có cái đó mới nâng `minimumCacheTTL` lên 2678400 (31 ngày).
Crest, ảnh cầu thủ PL, URL Cloudinary, hero Unsplash đều gần như bất biến —
tối ưu lại 6 lần/ngày không được gì mà vẫn bị tính tiền. Ảnh bài báo render
`unoptimized` nên không liên quan.

## 9. Cố ý KHÔNG gộp 3 wrapper feed

Ban đầu tôi xếp việc này vào "nên làm cho DRY". Đọc kỹ thì **không nên**:
`requireNonEmptyNews` **throw** khi danh sách rỗng, và nó được gọi *bên trong*
`unstable_cache` chính vì thế — exception không bao giờ bị cache, nên lỗi DB
được thử lại ngay (đúng rule trong CLAUDE.md). Gộp vào một reader dùng chung sẽ
mất tính chất đó, hoặc phải sinh ra 2 biến thể "strict/tolerant" — thêm API
surface chứ không bớt trùng lặp. Ba wrapper khác nhau về limit, ưu tiên ngôn ngữ
và cách xử lý rỗng; phần trùng thật sự rất nhỏ. Giữ nguyên.

## 10. Ba câu hỏi mở — đã tự trả lời

**1. Cloudflare: DNS-only, không proxy.** `dig anfielddaily.com` → `76.76.21.21`,
đó là IP của **Vercel**; proxy Cloudflare sẽ là `104.21.x` / `172.67.x`. Đúng như
runbook domain đã chốt. ⇒ **Cloudflare gần như không tốn gì** (chỉ truy vấn DNS,
free và không tính lưu lượng). Toàn bộ traffic đi thẳng Vercel, nên chỗ cần siết
là **Vercel + Supabase** — đúng cái §3/§7/§8 đã làm. Không cần tinh chỉnh CDN thêm.

**2. Region Supabase: không xác định được từ đây, và giờ gần như không còn quan trọng.**
`pg_settings` không chứa region (Postgres không biết region AWS của nó),
`db.<ref>.supabase.co` không resolve, còn API host nằm sau Cloudflare
(`104.18.38.10`) nên IP cũng không nói gì.
Nhưng câu hỏi này đặt ra để quyết có giữ `regions: ["sin1"]` hay không, và nó đã
mất phần lớn ý nghĩa: trang static/ISR do CDN toàn cầu của Vercel phục vụ bất kể
function region, và sau §7 thì **khách đọc bài không gọi API nào nữa** — nên
region của function hầu như không còn ảnh hưởng người đọc. Giữ `sin1`.
Muốn biết chính xác: Supabase dashboard → Project Settings → Database, hostname
pooler có chứa region (`aws-0-ap-southeast-1...`). Một cái nhìn là xong.

**3. `/player/[id]`** — đã fix, xem §8.1.

## 11. Còn lại (không có việc nào tôi làm được tiếp)

- **Merge `feat/upgrade` → `master`** — chỉ `master` deploy (`vercel.json` → `ignoreCommand`).
- Bật leaked-password protection trong Supabase dashboard (không set được bằng SQL).
- Kiểm Googlebot không bị bot firewall trả 429 (Search Console → URL Inspection).
- Đường "bài có comment" chưa được e2e phủ (cần seed dữ liệu + session).
- Chưa có job sau trận để bust tag `football`; hiện timer vẫn là cơ chế duy nhất.
