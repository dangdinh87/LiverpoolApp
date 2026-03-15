# Brainstorm: Gallery Ảnh Liverpool — Unsplash API + Curated

## Vấn đề
Cần feature gallery ảnh Liverpool (fan art, ảnh chụp, wallpaper) trong app. User ban đầu muốn dùng Pinterest nhưng không khả thi.

## Yêu cầu
- ~20-50 ảnh curated, ít update
- Route: `/gallery`
- Hợp pháp, miễn phí, không vi phạm ToS

## Phương án đã đánh giá

### ❌ Pinterest API — Loại bỏ
- Không có public search API
- Cần OAuth + duyệt đơn (mất ngày/tuần)
- ToS cấm hiển thị ảnh user-uploaded trong app bên thứ ba
- Mỗi ảnh cần xin phép tác giả gốc

### ❌ Scrape/Crawl Pinterest — Loại bỏ
- Vi phạm ToS, rủi ro pháp lý
- Pinterest chặn scraping tích cực

### ✅ Unsplash API + Curated (CHỌN)
- **Ưu điểm**: Free, CC0 license, 76+ ảnh Liverpool có sẵn, 50 req/h (demo), 5000 req/h (production)
- **Nhược điểm**: Phụ thuộc community upload
- **Cách dùng**: Search "Liverpool FC" → pick 30-40 ảnh đẹp → lưu metadata JSON → hiển thị gallery

### ~ Pexels API — Backup
- Tương tự Unsplash, CC0 license, 200 req/h
- Ít ảnh Liverpool hơn

### ~ Static Gallery — Kết hợp
- Download ảnh vào `/public/` hoặc Supabase Storage
- Zero runtime dependency

## Giải pháp chọn: Unsplash API + Curated

### Kiến trúc
```
/gallery (route)
├── page.tsx (server component, đọc curated JSON)
├── gallery-grid.tsx (client component, masonry/grid layout)
├── gallery-lightbox.tsx (client component, xem ảnh lớn)
└── gallery-filter.tsx (client component, filter by category)

/src/data/gallery.json (curated image metadata)
/src/lib/unsplash.ts (Unsplash API client, server-only)
```

### Luồng hoạt động
1. **Build time**: Curate ảnh từ Unsplash → lưu metadata vào `gallery.json`
2. **Runtime**: Server component đọc JSON → render gallery grid
3. **Optional**: "Explore more" button gọi Unsplash API real-time

### Tech stack bổ sung
- Masonry layout: CSS Grid hoặc `react-masonry-css`
- Lightbox: `yet-another-react-lightbox` hoặc custom dialog
- Image optimization: Next.js `<Image />` với Unsplash CDN

### Unsplash API setup
- Đăng ký app tại unsplash.com/developers
- Free: 50 requests/hour (demo), 5000/hour (production)
- Env var: `UNSPLASH_ACCESS_KEY`

## Rủi ro & Giảm thiểu
| Rủi ro | Mức | Giảm thiểu |
|--------|-----|------------|
| Unsplash ít ảnh Liverpool | Thấp | Kết hợp nhiều keyword: "Liverpool FC", "Anfield", "Premier League" |
| API rate limit | Thấp | Dùng curated JSON, chỉ gọi API khi "explore more" |
| Ảnh bị xóa khỏi Unsplash | Rất thấp | Lưu backup vào Supabase Storage |

## Tiêu chí thành công
- [ ] Gallery page load < 2s
- [ ] 30+ ảnh Liverpool chất lượng cao
- [ ] Responsive grid (mobile/tablet/desktop)
- [ ] Lightbox xem ảnh lớn
- [ ] Filter theo category (Anfield, Players, Matches, Fan Art)

## Bước tiếp theo
→ Tạo implementation plan chi tiết
