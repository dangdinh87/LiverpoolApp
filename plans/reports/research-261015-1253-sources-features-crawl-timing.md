# Research 15/10/2026 — nguồn mới, tính năng, thời điểm crawl

Read-only. Bằng chứng: gh run list (400 run), Supabase `sync_logs`/`articles`, ESPN schedule, curl với `NEWS_USER_AGENT`, chạy `extractFromHtml` thật. Nguồn `lfc` loại khỏi số liệu (hỏng từ 08/10 — xem review trước).
Scratch evidence: `/private/tmp/claude-501/-Users-nguyendangdinh-LiverpoolApp/83c3878a-aa8f-48b2-bb35-c97619696e33/scratchpad/sources/`

## 0. Phát hiện lớn nhất: cron chạy ~4 lần/ngày, không phải 24

| Cửa sổ | Run/khung giờ | Gap median | p90 | Max |
|---|---|---|---|---|
| 14 ngày gần nhất | 59 run = **19%** | **5.4h** | 7.4h | 10.2h |
| Tuần 2026-W34 (để so) | 155 = 92% | — | — | — |

- GitHub throttle cron giờ chẵn; mọi run đều "success" nên không ai thấy.
- Trận MCI (11/10 15:30Z): không run nào từ T−4h19 đến T+1h49. Đội hình chính thức (đăng T−74') vào DB lúc **T+109'** — sau khi hết trận. Ratings (T+120') vào lúc T+358'.
- Trận LASK: run T−13' (may), rồi T+3h41.
- Ingest lag p50 mọi nguồn 2.5–4.5h, p90 tới 8–11h.
- liverpoolcom/echo feed chỉ 25 item, giữa 2 run có tới 22/19 bài mới → khả năng **mất bài** khi gap 5–10h (chưa chứng minh).

→ Sửa scheduler đáng giá hơn mọi nguồn mới.

## 1. Thời điểm crawl

### Nhịp đăng bài (bài/giờ, tất cả nguồn trừ lfc; chỉ 2 trận có đủ data → tham khảo)

| Khung so với giờ bóng lăn | MCI | LASK | Nội dung |
|---|---|---|---|
| −48…−24h | 3.6 | 4.3 | chấn thương, họp báo, chuyển nhượng |
| −24…−6h | 3.4 | 3.8 | preview, đội hình dự kiến |
| −6…−2h | 4.0 | 6.0 | tin chấn thương muộn |
| **−2…0h** | **9.5** | 6.0 | **đội hình chính thức T−75…−70'** |
| 0…+2h | 9.5 | 4.5 | phản ứng trong trận |
| **+2…+6h** | **14.5** | 8.3 | **report T+105–115', ratings T+111–136', quote HLV T+180–200'** |
| +6…+24h | 5.3 | — | ratings follow-up, cập nhật chấn thương |

Ngày thường (tuần FIFA): ~85 bài/ngày; 04–21 UTC 3–7 bài/giờ (đỉnh 08 và 11 UTC); 22–03 UTC gần như 0.

### Lịch đề xuất

| Khung | Khoảng cách |
|---|---|
| T−90' … T+4h | **10 phút** |
| T−3h … T−90' | 30 phút |
| T+4h … T+8h | 20 phút |
| Còn lại, 04–22 UTC | 60 phút |
| 22–04 UTC, không có trận | 120 phút |

### Scheduler

| Lựa chọn | Kết luận |
|---|---|
| GitHub Actions cron | Không tin được (19% slot). Giữ làm dự phòng `23 */3 * * *`. |
| Vercel Hobby cron | Tối đa 1 lần/ngày. Loại. |
| **Supabase pg_cron + pg_net** | **Đề xuất.** Có sẵn, chưa bật (pg_cron 1.6.4, pg_net 0.20.0; Vault đã có). Miễn phí, chính xác tới phút. Phải nâng timeout pg_net (mặc định 2s). |
| Cloudflare Workers Cron | Phương án thay thế; thêm 1 nền tảng phải quản lý. |

Thiết kế: pg_cron gọi `/api/news/sync?auto=1` mỗi 5 phút → route tự quyết có cần chạy không (dùng `getMatchTrafficMode()` + `sync_logs.ran_at`), trả sớm nếu chưa tới hạn.

```sql
create extension if not exists pg_cron; create extension if not exists pg_net;
select vault.create_secret('<CRON_SECRET>','cron_secret');
select cron.schedule('news-sync-tick','*/5 * * * *',$$
  select net.http_get(url:='https://<domain>/api/news/sync?auto=1',
    headers:=jsonb_build_object('Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='cron_secret')),
    timeout_milliseconds:=130000)$$);
```

Chi phí ước tính: 288 tick/ngày (~20–50ms CPU) + ~32 sync đầy đủ/ngày trung bình (21 ngày thường, 59 ngày có trận) ≈ 960/tháng (hiện ~130). Active CPU ước 30–65 phút/tháng ≈ 13–27% quota Hobby (**chưa đo** — xem Vercel usage).

Đi kèm:
- Chỉ `revalidateTag/Path` khi `inserted > 0` (hiện `upserted > 0` → gần như mọi run đều re-render `/` và `/news`).
- Trong khung dày: bỏ enrich thumbnail, chỉ scrape bài mới insert.
- Thêm conditional GET (ETag / If-Modified-Since) cho RSS — lịch sự với nguồn.

Kỳ vọng: đội hình/ratings vào DB trong ~5 phút ở khung trận, ~30 phút ngày thường (hiện 3–4h).

## 2. Nguồn

### Nguồn hiện có (14 ngày)

| Nguồn | bài/ngày | scrape được | Ghi chú |
|---|---|---|---|
| liverpoolcom | 22.9 | 136/320 | Reach |
| echo | 16.0 | 97/224 | Reach |
| anfieldindex | 13.6 | **0** | link-out (Cloudflare), opinion fan → **bỏ/hạ** |
| anfield-watch | 13.5 | 87/189 | |
| tia | 12.0 | 0 | link-out (đã biết) |
| mirror | 6.1 | 32/86 | relevance thấp nhất → cắt đầu tiên nếu cần |
| eotk | 5.4 | 37/76 | |
| bbc / independent / guardian / sky | 0.9–2.1 | ok | tier-1, giữ |
| espn | 1.8 | **3/25** | → thêm `LINK_OUT_ONLY` cho đỡ tốn budget scrape |
| lfctv | 0 trong 10/10 run | — | có thể thiếu `YOUTUBE_API_KEY` |

Trùng lọt qua dedup: guardian 15%, independent 11%, espn/sky/mirror ~8%.

### Ứng viên mới

| Nguồn | LFC bài/ngày | Unique so với DB | Trang bài | Kết luận |
|---|---|---|---|---|
| talkSPORT `/football/feed/` | 2.1 | 78% | 200, sạch | **THÊM** (`filter: "lfc"`, timeout 8s) |
| Football365 `/liverpool/feed` | 0.9 | 100% | 200, sạch | **THÊM** |
| The Anfield Wrap `/feed/` | ~1 | 92% | 200, `.entry-content` | **THÊM** + rule bỏ `Podcast`/`TAW Player`, timeout 8s |
| The Athletic RSS Liverpool | 3.0 | 67% | 403 + paywall | **THÊM dạng headline/link-out** |
| Metro tag liverpool-fc | 2.6 | 56% | 200, cần lọc byline/"MORE:" | Có thể |
| Rousing The Kop | 2.9 | 85% | Cloudflare 403 với curl, 200 với Node | Có thể — phải thử từ IP Vercel |
| Daily Mail team RSS | 3.7 | 55% | 403 Akamai | Có thể, link-out |
| Goal.com | — | — | không có RSS | Cần adapter HTML |

Loại: Daily Star, Express, Standard, Sportsmole, The Sun, FourFourTwo, BBC gossip, Redmen TV, Reddit (429 + điều khoản API), Google News RSS (link mã hoá), Telegraph/Transfermarkt/Squawka (chặn), 90min/Liverpool Offside/Anfield HQ (chết), football.london (chỉ CLB London). Bluesky: chỉ có 2 nhà báo Echo hoạt động → trùng.

Bonus: PL pulselive content API (`tagNames=OptaID_t14`) trả link liverpoolfc.com → dự phòng cho adapter LFC.

```ts
{ url: "https://talksport.com/football/feed/", source: "talksport", language: "en", filter: "lfc", timeoutMs: 8_000 },
{ url: "https://www.football365.com/liverpool/feed", source: "f365", language: "en", filter: "lfc" },
{ url: "https://www.theanfieldwrap.com/feed/", source: "taw", language: "en", timeoutMs: 8_000 },
{ url: "https://www.nytimes.com/athletic/rss/football/liverpool/", source: "athletic", language: "en", filter: "lfc" },
```

Mỗi nguồn mới cần sửa: `NewsSource` (types.ts), `source-hosts.ts`, label trong `news-config.ts`; Athletic/Daily Mail thêm vào `LINK_OUT_ONLY`.

## 3. Tính năng

Hiện có (đừng làm trùng): story cluster phía client, đánh dấu đã đọc, "N bài mới từ lần trước" (chỉ /news), digest + OG card, like/comment/save, match centre live, spoiler-free, where-to-watch, H2H, .ics, dự đoán + bảng xếp hạng, chấm điểm cầu thủ, streak (cần đăng nhập), /analysis.

Lỗ hổng đã kiểm trên DB:
- **`/api/site-articles/generate` không được lên lịch ở đâu cả** — `site_articles` có 4 dòng, đều từ 1 lần chạy tay ngày 11/10. Nội dung riêng duy nhất được index đã dừng.
- predictions 0, ratings 0, 12 user, 14 like, 25 comment, 3 save → tính năng cộng đồng cần đăng nhập chưa ai dùng.
- Không có RSS output; không có analytics để đo quay lại.

| # | Tính năng | Công | Rủi ro chi phí |
|---|---|---|---|
| 1 ★ | Lên lịch match report + hiện link sau khi hết trận (fixtures/[id], widget home) | S | Thấp |
| 2 ★ | Card cụm tin: "Echo đưa đầu tiên 09:12 · 5 báo · mới nhất 14 phút trước" | S | Không |
| 3 ★ | Digest buổi sáng lên kênh Telegram công khai + `/feed.xml` | S | Không |
| 4 | Trang story `/story/[id]`: AI tóm tắt "các báo nói gì, khác nhau ở đâu" (cụm ≥3 báo) | M | Thấp–TB (bot) |
| 5 | Transfer tracker có tier độ tin cậy nguồn | M | Thấp |
| 6 | Tổng hợp điểm cầu thủ từ các báo + điểm fan | M | Thấp |
| 7 | Theo dõi cầu thủ (localStorage, không cần login) + "mới cho bạn" ở home/digest | S–M | Không |
| 8 | Email digest (Resend free 3k/tháng), sau đó web push chỉ cho sự kiện lớn | M–L | Thấp–TB |

Bỏ ưu tiên: mở rộng streak (Duolingo A/B chỉ +1–3% DAU), thêm tính năng cộng đồng cần login, live blog (match centre đã đủ).

Nguồn tham khảo: Techmeme about; Press Gazette (WhatsApp Channels — CLB bóng đá chiếm đa số top 10); Twipe (FT trên Telegram); Ground News help; Particle (TechCrunch 11/2024); This Is Anfield "ratings: what the media say"; Resend pricing; Reuters DNR 2025 (79% không nhận alert tin tức/tuần); Econsultancy (Duolingo A/B).

## Thứ tự làm đề xuất

1. Sửa adapter LFC (sitemap-news.xml) + selector extractor.
2. Scheduler pg_cron + gate `?auto=1` + revalidate chỉ khi `inserted > 0`.
3. Lên lịch site-articles (match report) — gần như 1 dòng.
4. Thêm talkSPORT, Football365, The Anfield Wrap, Athletic (link-out); bỏ anfieldindex; espn → link-out.
5. Quick win UI: tín hiệu tốc độ/độ phủ trên card cụm tin; Telegram + feed.xml.
6. Sau đó mới tới story page / transfer tracker / ratings consensus.

## Câu hỏi chưa giải quyết

1. Bỏ lịch site-articles là cố ý (chi phí token, chất lượng) hay quên?
2. Trang story có AI tóm tắt sẽ được index — chủ site có chấp nhận không (mirror vẫn noindex)?
3. Có mở kênh Telegram công khai không?
4. Quyết định "đăng toàn văn" có tự áp cho nguồn mới không?
5. Active CPU thật của mỗi lần sync? (xem Vercel usage)
6. Rousing The Kop / TAW / talkSPORT có trả lời IP datacenter của Vercel giống ở máy local không?
7. Workflow bị tắt 18/09–01/10 và data bắt đầu từ 01/10 — có reset DB không?
8. Số liệu nhịp đăng chỉ từ 2 trận; chạy lại sau Brentford 17/10, Villarreal 20/10, Brighton 25/10.
