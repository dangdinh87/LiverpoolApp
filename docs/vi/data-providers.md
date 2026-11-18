# Nhà Cung Cấp Dữ Liệu Bóng Đá

Tầng dữ liệu bóng đá phía server (`src/lib/football/`) của **Anfield Daily** kết hợp **Football-Data.org v4**, **ESPN Soccer API**, **Fantasy Premier League (FPL) API**, bộ dữ liệu tĩnh song ngữ của CLB và bảng ánh xạ kênh phát sóng theo múi giờ thông qua một điểm xuất duy nhất.

---

## 1. Tổng Quan & Luồng Dữ Liệu

Toàn bộ truy vấn bóng đá đi qua `src/lib/football/index.ts` (có chốt chặn `import "server-only"`) và được bọc `React.cache()` để khử trùng lặp trong cùng một request.

```text
Trang / Route Handler (Server Component)
  ↓
import { getFixtures, getStandings, getSquad } from "@/lib/football"
  ↓
React.cache() gộp lời gọi trùng trong cùng request
  ├── Football-Data.org (`fdo-client.ts` — gộp in-flight + backoff HTTP 429)
  ├── ESPN (`espn-events.ts` — Cúp FA/Liên đoàn, tỷ số trực tiếp, diễn biến, đội hình, 28 chỉ số)
  ├── FPL API (`fpl-stats.ts` — thống kê cá nhân cầu thủ tại Ngoại hạng Anh)
  └── Dữ liệu tĩnh (`src/data/squad.json` + các tệp `.vi.json`)
```

### Các Tệp Thành Phần

| Tệp | Chức năng |
|---|---|
| `src/lib/football/index.ts` | Điểm xuất duy nhất phía server + `React.cache()` + khử trùng lặp lịch đấu cúp |
| `src/lib/football/provider.ts` | Giao diện `FootballDataProvider` |
| `src/lib/football/fdo-client.ts` | Hàm tải dùng chung `fdoFetch`, gộp request đồng thời, retry/backoff `HTTP 429`, `requireNonEmptyArray` |
| `src/lib/football/fdo-provider.ts` | Triển khai `FdoProvider` (đội hình, vua phá lưới, thông tin CLB) |
| `src/lib/football/fdo-standings.ts` | Bảng xếp hạng Ngoại hạng Anh (`/competitions/PL/standings`) & Champions League (`/competitions/CL/standings`) |
| `src/lib/football/fdo-matches.ts` | Lịch thi đấu mùa hiện tại & các mùa lưu trữ (`/teams/64/matches`) + thông tin HLV |
| `src/lib/football/fdo-h2h.ts` | Tổng hợp thành tích đối đầu (`computeH2H`) |
| `src/lib/football/espn-events.ts` | Lịch cúp quốc nội, cập nhật trực tiếp, diễn biến từng phút, đội hình ra sân và 28 chỉ số thống kê |
| `src/lib/football/fpl-stats.ts` | Thống kê chi tiết cầu thủ từ Fantasy Premier League |
| `src/lib/football/season-stats.ts` | Tính toán tổng quan mùa giải, chuỗi phong độ, thống kê theo đấu trường & cột mốc |
| `src/lib/football/current-season.ts` | Xác định năm/nhãn mùa giải hiện hành theo giờ UTC & danh sách mùa giải lưu trữ |
| `src/lib/football/premier-league-broadcasters.ts` | Ánh xạ múi giờ IANA của người đọc sang quốc gia và đơn vị phát sóng Ngoại hạng Anh |
| `src/lib/types/football.ts` | Bộ kiểu chuẩn (`Player`, `Fixture`, `Standing`, `FixtureEvent`, v.v.) |

---

## 2. Football-Data.org v4 (Nguồn Chính)

- **Địa chỉ gốc:** `https://api.football-data.org/v4`
- **Mã đội Liverpool:** `64` trên FDO → chuyển đổi qua `mapFdoTeamId()` về mã chuẩn `40` trong toàn ứng dụng
- **Biến môi trường:** `FOOTBALL_DATA_ORG_KEY` (10 request/phút ở gói miễn phí)

### Cơ Chế Chịu Tải Trong `fdo-client.ts`

1. **Gộp request đang bay (in-flight deduplication):** Các lời gọi đồng thời tới cùng `${revalidate}:${path}` trên một isolate dùng chung một Promise duy nhất.
2. **Tự động chờ và thử lại khi gặp `HTTP 429`:** Đọc header `X-RequestCounter-Reset` (cộng độ trễ ngẫu nhiên nhỏ, tối đa `12s`, thử lại tối đa 2 lần), giúp 7 tiến trình worker khi chạy `next build` không bị gãy vì chạm trần 10 req/phút.
3. **`requireNonEmptyArray()`:** Chủ động ném lỗi trước khi `unstable_cache` kịp lưu nhầm mảng rỗng khi API đối tác chập chờn.
4. **Không dùng dữ liệu giả lập:** Khi thiếu `FOOTBALL_DATA_ORG_KEY`, các hàm ghi log cảnh báo và trả về mảng rỗng/`null` để giao diện hiển thị trạng thái trống minh bạch.

---

## 3. ESPN Soccer API (Chi Tiết Trận Đấu, Trực Tiếp & Cúp Quốc Nội)

- **Địa chỉ gốc:** `https://site.api.espn.com/apis/site/v2/sports/soccer`
- **Mã đội Liverpool:** `364`
- **Xác thực:** Miễn phí, không cần API key
- **Giải đấu hỗ trợ:** `eng.1` (Ngoại hạng Anh), `uefa.champions` (Champions League), `eng.fa` (FA Cup), `eng.league_cup` (EFL Cup)

### Phạm Vi Dữ Liệu Từ ESPN

- **Bổ sung Cúp FA & Cúp Liên đoàn:** `getFixtures()` ghép lịch các giải cúp từ ESPN vào lịch của FDO cho mùa hiện hành, chuẩn hóa tên giải qua `competitionKey()` để không nhân đôi giải đấu đã có.
- **Diễn biến theo phút & Đội hình:** Cung cấp chính xác số phút ghi bàn (bao gồm phân biệt bàn phản lưới nhà), thẻ phạt, thay người cùng đội hình đá chính và dự bị.
- **28 chỉ số chuyên môn & dữ kiện sau trận:** `getMatchDetail(fixtureDate)` trả về sân vận động, lượng khán giả, trọng tài và bộ thống kê hai đội (kiểm soát bóng, dứt điểm, sút trúng đích, chuyền bóng, phạt góc, phạm lỗi...), phục vụ cả trang `/fixtures/[id]` lẫn trình tạo bài phân tích sau trận (`src/lib/site-articles/match-review-facts.ts`).
- **Cập nhật trực tiếp:** `getLiveSnapshot()` cấp dữ liệu cho `/api/live-fixture` khi trận đấu đang diễn ra.

---

## 4. Fantasy Premier League (FPL) & Hồ Sơ Cầu Thủ Nội Bộ

- **Hồ sơ đội hình (`src/data/squad.json` + `src/data/player-bios.vi.json`):** Lưu thông tin, tiểu sử hoàn chỉnh hai ngôn ngữ Anh – Việt, danh hiệu, số áo và slug cho toàn bộ 31 cầu thủ đội một (`src/lib/squad-data.ts`).
- **Thống kê FPL (`src/lib/football/fpl-stats.ts`):** Bổ sung số phút thi đấu, bàn thắng, kiến tạo, trận giữ sạch lưới, cứu thua và chỉ số kỳ vọng cho trang `/player/[id]`.

---

## 5. Tra Cứu Kênh Phát Sóng ("Xem Ở Đâu")

`src/lib/football/premier-league-broadcasters.ts` dựa trên **múi giờ IANA của thiết bị** (`useViewerTimeZone()`) — không phụ thuộc ngôn ngữ giao diện đang chọn — để hiển thị đơn vị nắm bản quyền Ngoại hạng Anh tại quốc gia của người xem (ví dụ: độc giả mở giao diện tiếng Anh tại Việt Nam vẫn thấy K+ / FPT Play, tại Indonesia thấy Vidio, tại Anh thấy Sky Sports / TNT Sports). Nếu không xác định được quốc gia hoặc không phải trận Ngoại hạng Anh, mục này tự ẩn.

---

## 6. Quản Lý Mùa Giải (`current-season.ts`)

`getCurrentSeasonYear()` tính năm bắt đầu mùa bóng châu Âu theo giờ chuẩn UTC (chuyển mùa vào ngày 1 tháng 8 UTC), đảm bảo môi trường build, các cụm Cloudflare Workers ở mọi khu vực và các trang lưu trữ (`/season?season=2025`, `/stats/2025`, tra cứu ngược trận cũ trong `getFixtureById`) luôn nhất quán tuyệt đối.
