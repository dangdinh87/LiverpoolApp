# Design System

**Dark Stadium** — ngôn ngữ hình ảnh của LiverpoolApp. Không gian đen sâu lấy cảm hứng từ Anfield về đêm, đỏ Liverpool là năng lượng, vàng dành riêng cho thành tích. Kiểu chữ condensed đậm mang tinh thần văn hóa in ấn ngày thi đấu.

---

## 1. Triết Lý Thiết Kế

- **Chỉ dark mode.** Không có light mode. `ThemeProvider` được cấu hình với `defaultTheme="dark"` và `enableSystem={false}`.
- **Màu vàng dùng có chủ ý.** Gold (`#F6EB61`) xuất hiện nhiều nhất một lần trong mỗi section — trophies, live badges, score highlights.
- **Typography là trọng tâm.** Text display cỡ lớn gánh phần lớn không gian; ưu tiên League Gothic / Bebas trước khi dùng các phần tử trang trí.
- **Đỏ là hành động.** Mọi CTA, trạng thái active, và phần tử tương tác đều dùng `#C8102E`.

---

## 2. Color Tokens

Tất cả tokens là CSS custom properties trong `src/app/globals.css`, được ánh xạ vào Tailwind qua `@theme inline`.

| Token | Hex | Tailwind class | Cách dùng |
|-------|-----|----------------|-------|
| `--stadium-bg` | `#0D0D0D` | `bg-stadium-bg` | Nền trang |
| `--stadium-surface` | `#1A1A1A` | `bg-stadium-surface` | Cards, navbar (khi cuộn), modals |
| `--stadium-surface2` | `#252525` | `bg-stadium-surface2` | Card hover, input focus bg |
| `--lfc-red` | `#C8102E` | `bg-lfc-red` / `text-lfc-red` | Hành động chính, trạng thái active, highlights |
| `--lfc-red-dark` | `#A00E24` | `bg-lfc-red-dark` | Hover state trên nút đỏ |
| `--lfc-gold` | `#F6EB61` | `bg-lfc-gold` / `text-lfc-gold` | Trophies, tỷ số, thành tích |
| `--stadium-muted` | `#A0A0A0` | `text-stadium-muted` | Text phụ, nhãn, placeholder |
| `--stadium-border` | `#2A2A2A` | `border-stadium-border` | Viền card, đường kẻ, input |

### Utilities bổ sung

```css
/* Red glow — dùng khi hover card và shadow nút */
box-shadow: 0 0 24px rgba(200, 16, 46, 0.25);   /* shadow-red-glow */
box-shadow: 0 0 48px rgba(200, 16, 46, 0.35);   /* shadow-red-glow-lg */

/* Lớp phủ đỏ bán trong suốt (badge backgrounds, hàng Liverpool trong bảng xếp hạng) */
background: rgba(200, 16, 46, 0.10);            /* bg-lfc-red/10 */
```

---

## 3. Typography

Ba font được load trong `src/app/layout.tsx` qua `next/font/google`.

| Font | Variable | Tailwind class | Vai trò |
|------|----------|----------------|------|
| League Gothic | `--font-bebas` | `font-bebas` | Tiêu đề hero, số thống kê, tên cầu thủ |
| Inter | `--font-inter` | `font-inter` | Body text, UI, forms, nav links |
| Barlow Condensed | `--font-barlow` | `font-barlow` | Sub-headlines, nhãn thống kê, position badges, chữ hoa |

### Thang chữ (type scale)

```css
/* Display — Bebas/League Gothic */
font-bebas text-[clamp(4rem,12vw,10rem)] tracking-wide   /* hero title */
font-bebas text-[clamp(3rem,8vw,7rem)]                   /* section header */
font-bebas text-[clamp(2rem,5vw,4rem)]                   /* card headline */
font-bebas text-6xl                                       /* stat number */

/* Labels — Barlow Condensed */
font-barlow text-xs font-semibold uppercase tracking-widest  /* position badge, metadata */
font-barlow text-sm font-semibold uppercase tracking-wide    /* section label */

/* Body — Inter */
font-inter text-base leading-relaxed    /* article body */
font-inter text-sm leading-normal       /* UI text, buttons */
font-inter text-xs                      /* helper text, timestamps */
```

### Quy tắc sử dụng

- Tên cầu thủ, tiêu đề section, số thống kê → `font-bebas`
- Tất cả nhãn chữ hoa (vị trí, giải đấu, ngày) → `font-barlow`
- Navigation, forms, body copy, tooltips → `font-inter`
- Không bao giờ kết hợp `font-bebas` và `font-barlow` trong cùng một element inline

---

## 4. shadcn/ui Components

Style: `new-york`. Thư viện icon: `lucide`. Màu gốc: `neutral`. Cấu hình trong `components.json`.

### Đã cài đặt (`src/components/ui/`)

`alert-dialog`, `avatar`, `badge`, `button`, `dialog`, `dropdown-menu`, `input`, `popover`, `scroll-area`, `select`, `sheet`, `skeleton`, `tabs`, `tooltip`

Additions tự tạo: `error-boundary`, `lfc-loader`, `toast-notification`

### Thêm component mới

```bash
npx shadcn@latest add card
npx shadcn@latest add table accordion separator
```

Lệnh này ghi source của component vào `src/components/ui/`. Không cài tay — luôn dùng CLI để cấu hình variant và imports nhất quán.

Pattern import:

```typescript
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
```

---

## 5. Các Pattern Component

### Buttons

Luôn dùng component `Button` của shadcn làm gốc. Override bằng `className` + `cn()` cho các variant tùy chỉnh.

```tsx
// Primary — Liverpool Red (override variant mặc định)
<Button className="bg-lfc-red hover:bg-lfc-red-dark text-white font-barlow uppercase tracking-widest hover:shadow-red-glow active:scale-95">
  Join The Kop
</Button>

// Ghost / secondary
<Button variant="ghost" className="border border-stadium-border text-stadium-muted hover:border-lfc-red hover:text-white font-barlow uppercase tracking-widest">
  View Squad
</Button>

// Icon button — luôn thêm aria-label
<Button variant="ghost" size="icon" aria-label="Open menu">
  <Menu className="w-5 h-5" />
</Button>
```

### Cards

```tsx
<div className="relative bg-stadium-surface border border-stadium-border rounded-lg overflow-hidden
                hover:border-lfc-red hover:shadow-red-glow transition-all duration-300 cursor-pointer group">
  {/* Watermark số áo */}
  <span className="absolute right-2 bottom-2 font-bebas text-[8rem] leading-none text-white/5 select-none pointer-events-none">
    {number}
  </span>
  <div className="relative z-10 p-4">
    {/* nội dung */}
  </div>
</div>
```

### Badges

```tsx
// Trận đấu đang diễn ra
<span className="inline-flex items-center gap-1.5 bg-lfc-red/20 border border-lfc-red text-lfc-red font-barlow text-xs uppercase tracking-widest px-3 py-1 rounded-full">
  <span className="w-1.5 h-1.5 rounded-full bg-lfc-red animate-pulse" />
  Live
</span>

// Kết quả trận đấu
<span className={cn(
  'font-barlow font-semibold text-xs px-2 py-0.5 rounded',
  result === 'W' && 'bg-green-500/20 text-green-400',
  result === 'D' && 'bg-yellow-500/20 text-yellow-400',
  result === 'L' && 'bg-red-500/20 text-red-400',
)}>{result}</span>
```

### Form inputs

```tsx
<Input
  className="bg-stadium-surface border-stadium-border text-white placeholder:text-stadium-muted
             focus:border-lfc-red focus:ring-2 focus:ring-lfc-red/15 transition-all"
  placeholder="Email address"
/>
```

### Navbar (hành vi cuộn)

```tsx
// Trong suốt → stadium-surface khi cuộn (Framer Motion)
<motion.nav
  className="fixed top-0 w-full z-50"
  animate={{ backgroundColor: scrollY > 50 ? '#1A1A1A' : 'transparent' }}
  transition={{ duration: 0.3 }}
>
```

Gạch chân link active:

```tsx
<Link className="relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-lfc-red after:scale-x-0 data-[active]:after:scale-x-100 after:transition-transform" />
```

---

## 6. Khoảng Cách & Layout

### Chiều rộng container

| Tên | Giá trị | Cách dùng |
|------|-------|-------|
| `max-w-[1440px]` | 1440px | Wrapper ngoài cùng |
| `max-w-[1280px]` | 1280px | Container nội dung |
| `max-w-[960px]` | 960px | Hẹp (articles, auth) |

### Padding section

```tsx
<section className="py-20">   {/* section thông thường */}
<section className="py-32">   {/* hero / feature section */}
```

### Bento grid (trang chủ)

Lưới 12 cột, khoảng cách 1rem. Các class span có sẵn:

```css
.bento-2x2 { grid-column: span 6; grid-row: span 2; }
.bento-1x2 { grid-column: span 3; grid-row: span 2; }
.bento-2x1 { grid-column: span 6; grid-row: span 1; }
.bento-1x1 { grid-column: span 3; grid-row: span 1; }
/* Mobile: tất cả widgets full-width */
@media (max-width: 768px) { .bento-grid > * { grid-column: span 12; } }
```

### Templates trang

| Trang | Layout |
|------|--------|
| Trang chủ | Hero → BentoGrid widgets → Stats bar → Footer |
| Squad | Tab lọc vị trí → lưới cầu thủ 3 cột (desktop) / 2 (tablet) / 1 (mobile) |
| Fixtures | Tab lọc → danh sách timeline dọc |
| Standings | Selector giải đấu → bảng đầy đủ với progress bars inline |
| Auth | Card căn giữa toàn trang → logo → form |

---

## 7. Animation Presets

Định nghĩa variants trong `src/lib/animation-variants.ts` (hoặc inline cho trường hợp dùng một lần). Luôn truyền `viewport={{ once: true }}` cho animation kích hoạt khi cuộn.

```typescript
export const fadeUp = {
  hidden:  { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

export const cardHover = {
  rest:  { scale: 1 },
  hover: { scale: 1.02, transition: { duration: 0.2 } },
};

export const slideInLeft = {
  hidden:  { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] } },
};
```

### CSS keyframes (Tailwind)

| Class | Hiệu ứng | Trường hợp dùng |
|-------|--------|----------|
| `animate-pulse` | Fade in/out opacity | Chấm tròn live badge |
| `animate-pulse-red` | LFC red pulse | Live indicator, cảnh báo |
| `animate-score-flash` | Flash vàng → trắng | Ghi bàn |

---

## 8. Chỉ Dark Mode

Trang web này chỉ dark mode. Cấu hình `ThemeProvider`:

```tsx
// src/app/layout.tsx
<ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
  {children}
</ThemeProvider>
```

Không thêm class điều kiện cho light mode (không cần tiền tố `dark:` — mọi thứ đều dark theo mặc định). Nếu component từ shadcn dùng tiền tố `dark:`, hãy kiểm tra xem nó có render đúng trong stadium theme không.

### Phân lớp nền

```
Trang:    bg-stadium-bg (#0D0D0D)
Cards:   bg-stadium-surface (#1A1A1A) + border-stadium-border
Hover:   bg-stadium-surface2 (#252525)
Modals:  bg-stadium-surface + backdrop-blur-md
```

---

## 9. Icons

Dùng **Lucide React** độc quyền. Không dùng emoji làm icon. Không dùng thư viện icon nào khác.

```typescript
import { ChevronRight, Trophy, Calendar, Users, BarChart2, Heart } from 'lucide-react';
```

Kích thước tiêu chuẩn:

| Ngữ cảnh | Size class |
|---------|-----------|
| Navbar | `w-5 h-5` |
| Card icons | `w-4 h-4` |
| Hero / feature | `w-6 h-6` |
| Stat cards | `w-8 h-8` |

---

## 10. Nền Hero

```css
/* Gradient overlay trên ảnh hero */
background: linear-gradient(
  to top,
  #0D0D0D 0%,
  rgba(13, 13, 13, 0.75) 40%,
  rgba(13, 13, 13, 0.3) 70%,
  transparent 100%
);
```

---

## 11. Accessibility

| Quy tắc | Cách thực hiện |
|------|---------------|
| Độ tương phản màu | Trắng `#FFFFFF` trên `#1A1A1A` = ~13:1 (AAA). Đỏ `#C8102E` trên nền tối cho chữ lớn = 4.6:1 (AA). |
| Focus rings | `focus-visible:ring-2 focus-visible:ring-lfc-red focus-visible:ring-offset-2 focus-visible:ring-offset-stadium-bg` |
| Touch targets | Tối thiểu 44×44px trên tất cả phần tử tương tác |
| Icon buttons | Luôn có `aria-label` |
| Skip link | `<a href="#main" className="sr-only focus:not-sr-only">Skip to content</a>` trong layout |
| Reduced motion | CSS override toàn cục; Framer Motion tuân thủ `prefers-reduced-motion` |
| Semantic HTML | `<button>`, `<nav>`, `<main>`, `<article>`, `<section>` — không bao giờ dùng `<div onClick>` |
