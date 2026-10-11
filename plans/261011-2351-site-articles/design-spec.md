# Bài viết chính chủ (`/analysis`) — design spec

**Ngày:** 2026-10-11 · **Branch:** `feat/upgrade`
**Quyết định đã chốt:** AI sinh tự động, **không có người duyệt**. Làm cả 4 loại bài + nghiên cứu thêm. Hướng **A — dữ liệu trước, model chỉ viết văn**.

---

## 1. Mục đích

Site hiện chỉ có **tin trích dẫn từ báo khác** (`/news`, đang `noindex` vì là nội dung của người ta). Không có gì là của mình để Google xếp hạng, và không có gì khiến người đọc quay lại.

Section này tạo **nội dung gốc, index được**, dựng từ dữ liệu site đã có (lịch, kết quả, sự kiện trận, BXH, thống kê cầu thủ) chứ không diễn giải lại tin báo khác.

**Thành công trông như thế nào**
- Mỗi trận có trang xem trước và nhìn lại của riêng site, index được, nội dung không trùng ai.
- Không bài nào đăng kèm số liệu sai.
- Các bài cùng loại đọc không giống nhau.

## 2. Ràng buộc quan trọng nhất

Không có người duyệt. Nên **model không bao giờ được là nguồn sự thật** — nó chỉ viết văn quanh dữ kiện code dựng sẵn.

Google không cấm nội dung AI; thứ bị phạt là *scaled content abuse* — "dùng AI sinh nhiều trang mà không thêm giá trị" — và chính sách áp dụng như nhau dù người hay máy viết. Google khuyến nghị fact-check thủ công trước khi đăng; vì ta bỏ bước đó, **phải thay bằng kiểm chứng máy**, nếu không thì đây đúng là thứ chính sách nhắm tới.

Nguồn: [AI content guidance](https://developers.google.com/search/blog/2023/02/google-search-and-ai-content) · [Spam policies](https://developers.google.com/search/docs/essentials/spam-policies) · [Gen-AI content](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content)

## 3. Không làm (non-goals)

- Không có giao diện soạn thảo, không có vai trò biên tập viên — đã chốt là tự động.
- Không viết về chuyển nhượng, tin đồn, chấn thương chưa xác nhận: site không có nguồn đáng tin cho những thứ đó.
- Không dịch lại bài báo khác. `/news` vẫn là trích dẫn + link-out, vẫn `noindex`.
- Không sinh bài cho trận của đội khác — chỉ các trận có Liverpool.

## 4. Các loại bài và lúc sinh

| Loại | Sinh khi | Nguồn dữ kiện | Tần suất |
|---|---|---|---|
| `preview` | Trận còn < 48h, chưa có bài | Lịch, phong độ 5 trận, BXH, đối đầu, HLV | ~4/tháng |
| `review` | Trận `FT` và đã có events + statistics | Tỷ số, người ghi bàn + phút, thẻ, đội hình, cầm bóng, dứt điểm, BXH trước/sau | ~4/tháng |
| `weekly` | Cron hằng tuần | Top ghi bàn/kiến tạo, FPL, xu hướng BXH | 4/tháng |
| `digest` | Cron hằng ngày (đã có) | Tin đã tổng hợp trong ngày | 30/tháng |
| `history` | Chạy tay một lần | `trophies.json`, `history.json`, `legends.json` | một lần |

Tổng đều đặn ~12 bài gốc/tháng ngoài digest. Đủ để site có nhịp sống, không nhiều tới mức thành dây chuyền.

## 5. Luồng xử lý — 4 bước

```
facts = buildFacts(kind, input)      ← thuần code, không AI, test được
draft = model(voiceBrief, facts)     ← model CHỈ thấy facts
report = validate(draft, facts)      ← thuần code
if (report.ok && !tooSimilar) publish else reject(reason)
```

**Bước 1 — Fact builder.** Mỗi loại bài một hàm thuần: nhận id trận (hoặc ngày) → trả `facts` đã chuẩn hoá. Không gọi model. Đây là nơi duy nhất đọc dữ liệu bóng đá.

**Bước 2 — Model.** Nhận `facts` + brief giọng văn. Trả JSON có cấu trúc: `title`, `excerpt`, `sections[]`, `metaTitle`, `metaDescription`. Prompt cấm tuyệt đối việc tự nhớ ra số liệu hay sự kiện.

**Bước 3 — Validator.** Thuần code, không AI:
- **Số:** bóc mọi số trong bài. Mỗi số phải khớp một giá trị trong `facts` (hoặc tập phái sinh cho phép: hiệu số, tổng, thứ hạng). Lệch ⇒ loại.
- **Tên riêng:** bóc token viết hoa. Phải nằm trong tập tên của `facts` (cầu thủ, đội, giải, HLV, sân) hoặc allowlist từ thường gặp. Tên lạ ⇒ loại.
- **Phạm vi:** độ dài, số section, không chứa URL, không nhắc tên báo khác.
- **Tính trung thực:** chặn các cụm mô tả thứ dữ liệu không có — bầu không khí, cảm xúc, phát biểu, lời bình trong phòng thay đồ. *Bài không xem trận, nó chỉ có số liệu.*

**Bước 4 — Chống trùng.** So với N bài gần nhất cùng `kind` bằng độ tương đồng trigram. Vượt ngưỡng ⇒ loại. Đây là thứ trực tiếp trị rủi ro "nhiều trang không thêm giá trị" — và là lý do bỏ phương án template.

Bài bị loại **vẫn lưu** kèm `status='rejected'` và lý do, để còn soi được vì sao hỏng.

## 6. Dữ liệu

Bảng mới `site_articles` (migration `009_site_articles.sql`):

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | uuid pk | |
| `slug` | text unique | `liverpool-vs-man-city-preview-2026-10-11` |
| `kind` | text | preview / review / weekly / digest / history |
| `fixture_id` | int null | gắn với trận, cho preview/review |
| `content_en`, `content_vi` | jsonb | theo đúng kiểu bảng `articles` đang dùng |
| `facts` | jsonb | giữ lại để kiểm toán và validate lại |
| `status` | text | published / rejected |
| `reject_reason` | text null | |
| `model`, `generated_at`, `published_at` | | |

Index: `slug`, `(kind, published_at desc)`, `fixture_id`.
RLS: đọc công khai các dòng `published`; ghi chỉ service role (theo đúng khuôn migration 007).

## 7. Route và chuyển hướng

- `/analysis` — danh sách, lọc theo loại
- `/analysis/[slug]` — bài
- `/vi/analysis/...` — bản Việt, tự động theo routing sẵn có
- **301 `/news/digest/[date]` → `/analysis/digest-[date]`** để không mất URL đã index
- Thêm `/analysis` vào `e2e/support/routes.ts` và sitemap

Khác `/news`: bài ở đây **cho index**, có JSON-LD `Article`, vào sitemap. Đây mới là thứ Google có cớ xếp hạng.

## 8. Giao diện

Dùng lại primitive sẵn có, không đẻ pattern mới: `PageHero`, `SectionHeader`, `FilterChips`, `EmptyState`, `SiteArticleBadge`, `LocalTime`.

**Trang danh sách**
- `PageHero` + một dòng nói thẳng đây là bài do site viết từ dữ liệu trận đấu.
- `FilterChips` lọc loại bài (giống bộ lọc vị trí ở `/squad`).
- Thẻ bài: `kind` làm nhãn, tiêu đề, trích dẫn 2 dòng, ngày theo giờ người xem. Bài gắn với trận thì hiện crest hai đội — dùng `TeamCrest` sẵn có.
- Mobile ưu tiên: một cột, vùng chạm ≥ 44px, không tràn ngang.

**Trang bài**
- Chiều rộng chữ ≤ 68ch, body ≥ 17px, line-height ~1.65 (đúng nguyên tắc đã có trong design spec cũ).
- Đầu bài: nhãn loại + ngày + **dòng công khai AI** có link giải thích.
- Bài gắn trận: chèn khối tỷ số/đội hình lấy từ component fixtures đã có, thay vì tả bằng chữ — số liệu nên **hiện ra**, không nên kể lại.
- Cuối bài: link sang trang trận, và 3 bài liên quan cùng loại.

**Công khai dùng AI.** Mỗi bài ghi rõ: viết tự động từ dữ liệu trận đấu, kèm link tới mục giải thích trong `/about`. Vừa trung thực vừa là thứ phân biệt ta với spam. Không giả vờ có người viết, không bịa tên tác giả.

## 9. Giọng văn

Một chỗ duy nhất (`src/lib/prompts/`), EN là chính, VI dịch sát nghĩa:

- Câu ngắn. Xưng "you" / "bạn".
- Không hoa mỹ, không tự khen, không giật gân.
- Không ra vẻ biết chuyện nội bộ, không đoán ý HLV/cầu thủ.
- Chỉ viết thứ số liệu chống lưng được. Không có số thì không nói.
- Không mở bài bằng sáo ngữ ("Trận cầu đáng chú ý...").

## 10. Kiểm thử

- **Unit:** fact builder (từng loại, kể cả trận thiếu dữ liệu); validator (số sai, tên bịa, cụm mô tả bị cấm, độ dài); dedup.
- **Fixture thật:** lưu vài `facts` mẫu làm fixture để test validator không cần gọi mạng.
- **E2E:** `/analysis` và một bài vào `routes.ts`; kiểm tiêu đề, không lỗi console, không tràn ngang ở 390px.
- **Chốt chặn:** test phải chứng minh *bài có số sai thì bị loại* — đó là bài test quan trọng nhất của cả tính năng.

## 11. Thứ tự làm

1. Migration + kiểu dữ liệu + hàm đọc/ghi
2. Fact builder cho `review` (dữ liệu giàu nhất, dễ kiểm nhất) + test
3. Validator + test (làm trước khi gọi model lần nào)
4. Nối model, sinh thử `review`
5. Route + UI danh sách + UI bài
6. `preview`, rồi `weekly`
7. Di dời `digest` + 301
8. `history` chạy một lần
9. Cron + lên lịch

## 12. Câu còn để ngỏ

1. Tên route `/analysis` — đã chốt chưa? Nó hợp preview/review/weekly nhưng hơi gượng với digest và history.
2. Di dời digest đụng URL đã index; nếu Search Console đang có traffic vào `/news/digest/*` thì có nên để yên?
3. Ngưỡng tương đồng để loại bài trùng — phải đo trên bài thật mới chỉnh được, ban đầu đặt tạm.
4. Bài `preview` dữ liệu mỏng hơn `review` nhiều. Nếu mỏng tới mức không viết nổi thứ gì đáng đọc thì nên bỏ loại này, chỉ giữ `review`.
5. Chi phí VietAPI mỗi tháng ở tần suất này — chưa ước lượng.
