# News UI/UX Patterns Research

## Current Issues
- No images → page looks text-heavy and bare
- Single featured article, rest are uniform cards
- No categorization or filtering
- All links go external (no in-app reading)
- Homepage news section is minimal (title + date only)

## Modern Football News Layouts

### 1. Featured + Grid (ESPN/BBC pattern)
- Large hero card with image for latest article
- 2-col grid for remaining articles with thumbnails
- Clear visual hierarchy: featured > secondary > list

### 2. Category Tabs (FotMob/OneFootball)
- Tabs: All | Transfers | Match Reports | Injuries | Analysis
- Filter by source: BBC | Sky | Guardian | All
- Dynamic category detection from keywords in title

### 3. Card Variants
- **Hero card**: Full-width, large image, title overlay, snippet
- **Medium card**: Thumbnail left/top, title, source badge, time
- **Compact card**: No image, title + source + time (list style)
- **Source badge**: Small colored indicator per source

## Recommended Layout
```
┌─────────────────────────────────────────┐
│ [Hero image]                            │ Featured
│ Title overlay                           │ article
│ Source badge · Time                     │
├───────────────────┬─────────────────────┤
│ [img] Title       │ [img] Title         │ 2-col
│ Source · 2h ago   │ Source · 5h ago     │ secondary
├───────────────────┼─────────────────────┤
│ [img] Title       │ [img] Title         │
│ Source · 1d ago   │ Source · 1d ago     │
├───────────────────┴─────────────────────┤
│ Title only list items (older articles)  │ Compact
│ Title only list items                   │ list
└─────────────────────────────────────────┘
```

## Source Badges (Color Coding)
- BBC Sport: `#BB1919` (BBC red)
- Sky Sports: `#E10600` (Sky red)
- The Guardian: `#052962` (Guardian blue)
- Liverpool Echo: `#1D1D1B`
- Default/Other: stadium-muted

## Image Handling
- Hero card: aspect-ratio 16/9, object-cover, gradient overlay for text
- Medium card: aspect-ratio 16/9 thumbnail, 120px height
- Fallback: LFC-themed gradient placeholder with category icon
- Use `next/image` with `sizes` prop for responsive loading

## Dark Theme Considerations
- Cards: `bg-stadium-surface` with `border-stadium-border`
- Hover: `hover:border-lfc-red/40` (current pattern works well)
- Source badges: semi-transparent backgrounds with colored text
- Image overlays: gradient from transparent to stadium-bg
