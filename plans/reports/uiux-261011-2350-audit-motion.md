# UI/UX + motion audit — 2026-10-11

Dev server `localhost:3200`, 14 route × 390/1440 (crawl web-audit), trận LIV–MCI đang đá.
Ảnh + findings thô: `uiux-261011-audit/`.

Kết quả chung: 0 lỗi console, 0 page error, 0 route tràn ngang.

## Đã sửa

| Mức | Vấn đề | Sửa |
|---|---|---|
| P1 | `/fixtures/[id]` lúc live: tỷ số/phút đứng yên, Timeline + Statistics báo "No match events yet" (trang cache 5', events chỉ fetch khi FT) | `live-match-detail.tsx`: badge, tỷ số + đồng hồ, mép tiến trình, timeline (dùng lại `TimelineRow`), thống kê — chung 1 query live |
| P2 | Nút "Reds AI" lặp vô hạn 2 hiệu ứng (glow 2.5s + sweep 3s) trên mọi trang; probe đọc thành "đang tải" | Glow tĩnh, sáng hơn khi hover; sweep 1 lần sau 1.2s + mỗi lần hover. Đổi class `ai-btn-shimmer` → `ai-btn-sheen` |
| P2 | Không có phản hồi khi chạm trên mobile (chỉ có hover) | `.surface-interactive:active`, Button `active:scale-[0.97]` |
| P2 | Live card polling 30s/thẻ, server gọi ESPN no-store mỗi request | React Query 1 query chung, 60s, chỉ khi thẻ trên màn hình + tab hiện; đồng hồ tự chạy client; server `unstable_cache` 30s |
| P3 | `aria-hidden` trên nút back-to-top còn focus được | `inert` |
| P3 | 8 keyframe/class chết: marquee, pulse-red, fadeSlideIn, spin-border/@property, bird-float, hot-pulse, livePulse, subtleZoom | Xoá |

## Nhiễu (không sửa)

- `text-clipped` trên `.sr-only` (skip link, "Yellow card") — ẩn có chủ đích.
- `click-blocked` bởi bottom nav — nội dung cuộn dưới thanh fixed; trang có `pb-safe-nav`.
- `mixed-lang` "Sign In" — trang EN (mặc định), không phải VI.
- `fixed-eats-screen` /chat — khung chat toàn màn hình có chủ đích.
- `text-cut-vertical` tin tức — `line-clamp` có chủ đích.

## Còn mở

- Digest AI: "Tối nay22h30" thiếu khoảng trắng (nội dung LLM sinh ra, không phải UI).
- `Tv`, `tMatch` import/biến thừa sẵn có trong `next-match-widget.tsx`, `fixtures/[id]/page.tsx` (lint warning cũ).
- Trang `/fixtures/[id]` cache 5': nếu cache trước giờ bóng lăn, phần live chỉ xuất hiện sau lần revalidate kế tiếp.
