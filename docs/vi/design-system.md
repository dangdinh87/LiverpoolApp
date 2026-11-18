# Hệ Thống Thiết Kế

**Dark Stadium** — ngôn ngữ thị giác và biên tập của **Anfield Daily** (xem [`docs/brand.md`](../brand.md)). Nền đen sâu lấy cảm hứng từ sân Anfield dưới ánh đèn đêm, sắc đỏ đặc trưng dành cho điểm nhấn hành động và nhận diện, kết hợp tiêu đề báo chí có chân sắc nét cùng bộ chữ số thể thao cô đọng.

---

## 1. Triết Lý Cốt Lõi

- **Chỉ dùng giao diện tối.** `ThemeProvider` cố định `defaultTheme="dark"` và `enableSystem={false}`.
- **Tách bạch nhận diện thương hiệu.** Biểu trưng riêng của Anfield Daily (`<BrandMark />` từ `src/lib/brand.ts`) là góc nhìn từ trên cao của vòng tròn giữa sân bóng — vạch giữa sân dọc xuyên suốt chiều cao, vòng tròn trung tâm và chấm giao bóng — màu trắng trên nền ô vuông bo góc đỏ `#C8102E`. Huy hiệu các câu lạc bộ (`<TeamCrest />`) chỉ xuất hiện trong dữ liệu lịch đấu và bảng xếp hạng, không bao giờ dùng làm logo của trang.
- **Tách sắc đỏ cho mảng màu và chữ viết.** Màu `#C8102E` chỉ đạt tương phản ~3:1 trên nền tối nên được dùng cho **nền nút bấm, ô biểu trưng, đường kẻ và huy hiệu**. Khi hiển thị **chữ màu đỏ** trên nền tối, luôn dùng `#FF3347` (`text-lfc-red-text` / `text-brand`) để đạt chuẩn WCAG AA (4.8:1 trên bề mặt thẻ, 5.4:1 trên nền trang).
- **Phân tầng biên tập rõ ràng.** Phông Newsreader (`font-serif`) đảm nhiệm tiêu đề bài báo và bản tin; League Gothic (`font-bebas`) đảm nhiệm wordmark, tiêu đề mục, tỷ số và con số thống kê lớn.

---

## 2. Bảng Token Màu Sắc

Được khai báo trong `src/app/globals.css` qua `@theme inline` của Tailwind CSS v4:

| Token | Mã Hex | Lớp Tailwind | Mục đích sử dụng |
|---|---|---|---|
| `--color-stadium-bg` | `#0D0D0D` | `bg-stadium-bg` | Nền trang chính |
| `--color-stadium-surface` | `#1A1A1A` | `bg-stadium-surface` | Bề mặt thẻ, thanh điều hướng, hộp thoại |
| `--color-stadium-surface2` | `#252525` | `bg-stadium-surface2` | Bề mặt nổi, trạng thái rê chuột, ô nhập liệu |
| `--color-stadium-border` | `#2A2A2A` | `border-stadium-border` | Đường viền thẻ và vạch ngăn cách |
| `--color-stadium-muted` | `#A0A0A0` | `text-stadium-muted` | Chữ phụ, mốc thời gian, chú thích |
| `--color-lfc-red` | `#C8102E` | `bg-lfc-red` / `border-lfc-red` | Nền biểu trưng, nút hành động chính, dải trực tiếp |
| `--color-lfc-red-dark` | `#A00E24` | `hover:bg-lfc-red-dark` | Màu nút chính khi rê chuột |
| `--color-lfc-red-text` | `#FF3347` | `text-lfc-red-text` / `text-brand` | Chữ nhấn màu đỏ đạt chuẩn tương phản AA |
| `--color-lfc-gold` | `#F6EB61` | `text-lfc-gold` / `bg-lfc-gold` | Điểm nhấn danh hiệu và cột mốc chọn lọc |

---

## 3. Hệ Thống Chữ (Typography)

Bốn phông chữ từ `next/font/google` đảm nhiệm từng vai trò riêng biệt:

| Phông chữ | Biến CSS | Lớp Tailwind | Vai trò |
|---|---|---|---|
| **League Gothic** | `--font-bebas` | `font-bebas` | Wordmark `ANFIELD DAILY`, tiêu đề phân mục, tỷ số, thống kê lớn |
| **Newsreader** | `--font-newsreader` | `font-serif` | Câu định vị trang chủ, tiêu đề bản tin ngày, bài báo và bài phân tích |
| **Inter** | `--font-inter` | `font-inter` | Nội dung bài đọc, biểu mẫu, bình luận, văn bản giao diện |
| **Barlow Condensed** | `--font-barlow` | `font-barlow` | Nhãn in hoa ngắn, tên giải đấu, nút bấm, tiêu đề cột bảng |

### Quy Tắc Trình Bày Số Liệu & Dấu Câu

- Gắn `tabular-nums` trên mọi tỷ số, giờ bóng lăn, bảng xếp hạng, điểm chấm cầu thủ và bộ đếm.
- Sử dụng dấu gạch ngang ngắn chuẩn (`–`) cho tỷ số và khoảng năm (`2–1`, `2017–2026`).
- Không trộn `font-bebas` và `font-barlow` trên cùng một dòng văn bản ngắn.

---

## 4. `shadcn/ui` & Bộ Component Dùng Chung

Cấu hình tại `components.json` (`style: "new-york"`, `rsc: true`, `cssVariables: true`, gói `radix-ui` hợp nhất, biểu tượng `lucide-react`).

### Primitives Đã Cài Đặt (`src/components/ui/`)

`accordion`, `alert-dialog`, `badge`, `button`, `dialog`, `dropdown-menu`, `popover`, `sheet`, `skeleton`, `slider`, `switch`, `table`, `tooltip`

### Các Component Hỗ Trợ Nghiệp Vụ (`src/components/ui/`)

- `page-hero.tsx` & `section-header.tsx` — phần đầu trang và tiêu đề mục đồng bộ
- `team-crest.tsx` — hiển thị huy hiệu CLB kèm biểu tượng khiên trung tính dự phòng khi thiếu ảnh
- `local-time.tsx` — hiển thị giờ thi đấu theo đúng múi giờ thiết bị của người đọc
- `form-badge.tsx` — huy hiệu phong độ Thắng / Hòa / Thua
- `empty-state.tsx` & `error-boundary.tsx` — khung trạng thái rỗng và bắt lỗi an toàn
- `toast-notification.tsx` — thông báo nhanh tối ưu chọn lọc state qua Zustand
- `scroll-to-top.tsx` — nút cuộn lên đầu trang có kiểm tra `prefers-reduced-motion`

Cài thêm component chuẩn qua CLI:

```bash
npx shadcn@latest add <component-name>
```

---

## 5. Bố Cục Đáp Ứng, Chuyển Động & Khả Năng Tiếp Cận

### Không Tràn Ngang & Ổn Định Bố Cục

- Không phát sinh thanh cuộn ngang ở mọi kích thước màn hình từ `320px`, `390px`, `768px`, `1280px` đến `1440px` (được kiểm thử tự động trong `e2e/responsive-overflow.spec.ts`).
- Các cụm tương tác dày trên di động (như khung dự đoán tỷ số hoặc thông tin đầu trận tại `/fixtures/[id]`) tự động xếp dòng dưới ngưỡng `sm` và giữ khung chờ skeleton cố định (`CLS < 0.05`).

### Chuyển Động Có Chủ Đích

- **Thuộc tính:** Chỉ tạo chuyển động bằng `transform` và `opacity` — tuyệt đối không animate `width`, `height` hay các thuộc tính gây tính toán lại bố cục.
- **Nhịp thời gian:** `140–200ms` (`ease-out`) cho nút bấm/hover kèm phản hồi nhấn `active:scale-[0.97]`; tối đa `260ms` cho hộp thoại và menu di động.
- **Giảm chuyển động:** Bọc toàn ứng dụng trong `<MotionConfig reducedMotion="user">` kết hợp quy tắc `@media (prefers-reduced-motion: reduce)` trong `src/app/globals.css`.

### Tiêu Chuẩn Khả Năng Tiếp Cận (100/100 Lighthouse A11y)

- **Độ tương phản:** Chữ chính `#F5F5F5` trên `#1A1A1A` (~13:1 AAA); chữ đỏ `#FF3347` trên `#1A1A1A` (4.8:1 AA).
- **Vùng chạm:** Tối thiểu `44×44px` (`min-h-11 min-w-11`) cho mọi nút tương tác trên cảm ứng.
- **Bàn phím & Trình đọc màn hình:** Có `<SkipLink />` nhảy tới `#main-content`, điều hướng phím mũi tên trên thanh tab, nhãn `aria-label` đa ngôn ngữ cho các nút chỉ chứa biểu tượng, và dùng `AlertDialog` thay cho `window.confirm`.
- **Chế độ ẩn tỷ số:** Mọi tỷ số, huy hiệu kết quả và tóm tắt bàn thắng đều tuân thủ thuộc tính `html[data-spoiler-free]` trước lần vẽ đầu tiên.
