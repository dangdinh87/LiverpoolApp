# Nguồn dữ liệu để làm DB LiverpoolApp tốt hơn — báo cáo tổng hợp

**Ngày:** 2026-10-01 · Gộp 2 báo cáo researcher + tự gọi thử từng nguồn (kết quả bên dưới là số đo thật, không phải tuyên bố của tài liệu).
Báo cáo gốc (có lỗi, xem §3): [match-season-data-apis](researcher-261001-1652-match-season-data-apis.md) · [reference-history-vn](researcher-261001-1652-reference-history-vn-data-sources.md)

---

## 1. Kết luận nhanh

- **Chặn số 0: DB không sống.** Supabase paused từ trước 11/9 ([prod-fix-260910](prod-fix-260910-0121-production-timeout-root-cause.md)); hôm nay `/news` production vẫn "Không tìm thấy bài viết", sitemap 0 URL tin. Thêm nguồn nào cũng vô ích tới khi DB chạy lại.
- **DB hiện không có bảng bóng đá nào.** Bảng hiện có: articles, comments, likes, saved, digests, gallery, profiles, favourites, chat, site_settings, sync_logs. Đội hình/lịch/thống kê = gọi API lúc render + JSON tĩnh (`src/data/squad.json`, sync tay).
- **Lỗ hổng trong code:** `getInjuries()` luôn `[]`, `getFixtureStatistics()` luôn `[]`, `getCoach()` luôn `null`, thống kê cầu thủ chỉ PL.
- **Lấp được hết bằng nguồn miễn phí, đã kiểm chứng:** FPL (chấn thương + xG), ESPN summary (thống kê trận + diễn biến, mọi giải), Wikidata (làm giàu hồ sơ + tên VI), openfootball (dự phòng PL, CC0).
- **Không có nguồn miễn phí hợp lệ cho chuyển nhượng.** Đừng làm bảng `transfers`.

## 2. Bảng kiểm chứng (gọi thật 1/10/2026)

| Nguồn | Đã gọi | Thấy gì | Lấp gap |
|---|---|---|---|
| **FPL** `fantasy.premierleague.com/api/bootstrap-static/` | ✅ | LFC team id 14, 36 cầu thủ. **12 bị gắn cờ** `status≠a`: `i` chấn thương ("Knee injury - Unknown return date": Bradley, Leoni, Chiesa…), `d` nghi ngờ + % (Gakpo 75%), `u` rời/cho mượn ("joined St Mirren on loan"). 8 trường `expected_*` (Isak xG 3.54) | Chấn thương/treo giò/cho mượn, xG — **chỉ PL** |
| **ESPN** `site.api.espn.com/.../soccer/{lg}/summary?event=` | ✅ (trận UCL 401915446) | `boxscore`: possessionPct, totalShots, shotsOnTarget, wonCorners, fouls, saves, offsides, cards. `keyEvents` 27, `commentary` 106, `rosters`, `broadcasts` | Thống kê trận, timeline, đội hình ra sân |
| **ESPN** `.../{lg}/teams/364/schedule` | ✅ | Có cả `eng.1`, `uefa.champions`, `eng.league_cup`, `eng.fa` | Lịch/kết quả mọi giải (app đã dùng một phần) |
| **ESPN** `.../eng.1/teams/364/roster` | ✅ | 31 cầu thủ; field `injuries` **có nhưng 0/31 có dữ liệu**; có field `transactions` | ❌ Không dùng cho chấn thương |
| **openfootball** `football.json/master/2026-27/en.1.json` | ✅ | 38 trận LFC, 5 có tỉ số (tới 20/9; repo push 22/9). Chỉ giải VĐQG, không UCL/cúp. Dữ liệu từ 2010-11 | Dự phòng PL + H2H lịch sử, CC0 |
| **Wikidata SPARQL** (Q1130849) | ✅ | 41 người "đang ở LFC" — **lẫn người đã đi** (Ilori, Rossiter, Caulker: thiếu ngày kết thúc). 27/41 có nhãn `vi`, 26 có bài viwiki | Làm giàu DOB/quốc tịch/tên VI. **Không** dùng để xác định đội hình |
| **FPT Play** | 🔎 tin báo | Độc quyền NHA tại VN **1/1/2026 → hết 2030/31**, K+ dừng 1/1/2026 | Dữ liệu "xem Liverpool kênh nào" (hợp pháp) |
| **RSS đang cấu hình** (`src/lib/news/config.ts`) | ✅ 26 feed | **23 sống.** Chết: `thethao247.vn/ngoai-hang-anh-c8.rss` (403), `webthethao.vn/rss/rss.php` (404). Independent còn 1 item | Tin tức |

## 3. Đính chính 2 báo cáo researcher

| Báo cáo nói | Thực tế |
|---|---|
| FPL `transfers_in/out` = chuyển nhượng | Là **lượt người chơi fantasy mua/bán** cầu thủ. Không phải chuyển nhượng thật |
| FPL `history_past` = số liệu mọi giải | Tổng **PL** các mùa trước. FPL chỉ có PL |
| FPL `fixtures.stats[]` = thống kê trận | Sự kiện fantasy (bàn, kiến tạo, thẻ, cứu thua, bps). Không có kiểm soát bóng/cú sút → dùng ESPN |
| Wikidata: 0 nhãn VI | 27/41 có nhãn VI |
| openfootball `2026-27/1-premier-league.json` | Đường dẫn đúng là `2026-27/en.1.json` |
| Webthethao `/feed` 200 OK, nên làm feed chính | `/feed` trả **HTML**, không phải RSS |
| Bóng Đá / Tuổi Trẻ RSS chết | Researcher thử sai URL. Feed thật đang sống (`bongda.com.vn/liverpool.rss` 50 item, `tuoitre.vn/rss/the-thao.rss` 50) |
| Bzzoiro = nguồn chính tiềm năng | Có thật (sports.bzzoiro.com) nhưng thiên về **dự đoán/kèo**, dịch vụ nhỏ, ToS lưu trữ không rõ → không dùng |
| "Big Balls Data" 250 req/ngày | Không xác minh được → bỏ |
| FBref mất Opta 01/2026; StatsBomb CC BY-NC | Chưa xác minh — không ảnh hưởng vì không định dùng |

## 4. Nguồn đề xuất theo từng gap

| Gap | Nguồn | Cadence (cron) |
|---|---|---|
| Chấn thương / treo giò / cho mượn | FPL `elements[].status, news, news_added, chance_of_playing_next_round` | 4 lần/ngày; mỗi giờ trong ngày có trận |
| Thống kê trận + diễn biến + đội hình ra sân | ESPN `summary?event=` (boxscore, keyEvents, rosters) | 1 lần, ~2h sau khi trận kết thúc (dữ liệu bất biến) |
| Lịch / kết quả mọi giải | Giữ FDO (PL, UCL) + ESPN schedule (cúp) như hiện nay | Mỗi giờ |
| xG cầu thủ | FPL `expected_goals/assists/_per_90` (PL) | Hằng ngày |
| Đội hình hiện tại | Giữ curated từ liverpoolfc.com; **đối chiếu FPL** (`status=u` → cầu thủ đã rời/cho mượn) để tự phát hiện lệch | Hằng tuần |
| Hồ sơ + tên VI | Wikidata (DOB, quốc tịch, nhãn `vi`, link viwiki) + phần còn lại curated | Khi đổi đội hình |
| HLV | Giữ `coach` trong squad.json (curated) | Khi đổi HLV |
| Kênh xem tại VN | Config tĩnh: NHA → FPT Play. UCL: **chưa xác minh** | Mỗi mùa |
| Chuyển nhượng | Không có nguồn free hợp lệ (Transfermarkt cấm scrape) → để mảng tin tức xử lý | — |
| Lịch sử trước 2010 | Không có nguồn mở. LFChistory.net cần xin phép | — |

## 5. Bảng DB đề xuất (tối thiểu)

Nguyên tắc: **cron ghi snapshot vào DB, trang đọc DB.** Như vậy trang không còn gọi API lúc render (đây là một phần nguyên nhân cold render 7–11s). Mỗi bảng lưu `raw jsonb` + vài cột trích ra để query (KISS, đổi schema provider không vỡ).

| Bảng | Cột chính | Nguồn | Thay cho |
|---|---|---|---|
| `players` | slug, name, name_vi, shirt_number, position, nationality, dob, photo, on_loan, **fpl_id, espn_id, fdo_id, wikidata_id**, viwiki_url | curated + Wikidata | `src/data/squad.json` |
| `player_status` | player_id, status, chance_next_round, news, news_added, xg, xa, minutes, updated_at | FPL | `getInjuries()` rỗng |
| `matches` | id, competition, kickoff_at timestamptz, home, away, score, status, ext_ids jsonb `{fdo, espn}`, updated_at | FDO + ESPN | gọi API lúc render |
| `match_details` | match_id, stats jsonb, key_events jsonb, lineups jsonb, fetched_at | ESPN summary | `getFixtureStatistics()` rỗng |

**Phần tốn công nhất:** khớp ID giữa các provider (FPL id ↔ ESPN id ↔ FDO id ↔ Wikidata Q). Làm 1 lần theo tên + ngày sinh, lưu vào `players`, kiểm tay ~36 dòng.

**Không làm (YAGNI):** `transfers` (không có nguồn), `broadcasters` (đổi theo năm → config tĩnh), `matches_history` từ 1892 (không có nguồn hợp lệ). openfootball chỉ thêm khi thật sự cần H2H trước mùa hiện tại.

## 6. Thứ tự triển khai

0. **Cho DB sống lại**: restore Supabase, hoặc dời sang Neon (đã dùng ở cv-app). Supabase free pause sau 7 ngày không hoạt động và phải restore tay; Neon free tự ngủ/tự thức theo kết nối. Việc này chặn mọi bước sau.
1. FPL → `player_status`. Nhanh nhất, giá trị cao nhất cho fan ("ai nghỉ trận tới").
2. ESPN summary → `match_details`. Lấp tab thống kê trận.
3. `matches` snapshot → bỏ gọi API lúc render.
4. `players` thay `squad.json` + làm giàu từ Wikidata.
5. Sửa 2 RSS chết: tìm URL mới cho thethao247, webthethao; hoặc gỡ.

## 7. Rủi ro / pháp lý

- **FPL & ESPN là API không công khai**, không có ToS cho phép rõ ràng; app đã dùng sẵn. Giảm rủi ro: chỉ gọi qua cron (vài chục request/ngày), cache trong DB, đặt User-Agent rõ ràng, giữ circuit breaker, không bán lại data. Nếu ESPN đổi format → hỏng tab thống kê, không sập trang.
- Wikidata CC0, dùng tự do. Nội dung viwiki CC BY-SA → ghi nguồn nếu chép bio.
- openfootball CC0.
- Ảnh cầu thủ từ CDN liverpoolfc.com thuộc bản quyền CLB; ảnh Commons theo license từng file.
- Footer nên có: "Trang fan không chính thức. Liverpool F.C. là thương hiệu của Liverpool Football Club and Athletic Grounds Limited."

## Câu hỏi còn mở

1. Restore Supabase hay dời DB sang Neon?
2. Bản quyền UEFA Champions League tại VN mùa 2026/27 thuộc đơn vị nào?
3. Field `transactions` trong ESPN roster có dữ liệu chuyển nhượng dùng được không? (chưa mở xem)
4. FDO free tier có trả `coach` trong `/v4/teams/64` không? (cần token, chưa gọi)
5. Có cần lịch sử trận trước 2010 không? Nếu có thì phải xin phép LFChistory.net.

## Nguồn

- FPL: https://fantasy.premierleague.com/api/bootstrap-static/
- ESPN: https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/summary?event=401915446
- openfootball: https://github.com/openfootball/football.json
- Wikidata SPARQL: https://query.wikidata.org/
- FPT Play bản quyền NHA: https://nhandan.vn/fpt-play-so-huu-ban-quyen-ngoai-hang-anh-tu-nam-2026-post928807.html · https://vnexpress.net/ngoai-hang-anh-tro-lai-tren-fpt-play-tu-22-8-5109180.html · https://fpt.vn/ngoai-hang-anh/
- Bzzoiro: https://sports.bzzoiro.com/
