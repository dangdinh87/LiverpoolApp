# Phase 02: Gallery UI -- Page, Grid, Filter, Lightbox

## Context

- [Plan overview](./plan.md)
- [Phase 01: Data](./phase-01-data-and-api.md) (prerequisite)
- Pattern reference: `src/components/history/anfield-gallery.tsx` (existing gallery in History tab)
- Pattern reference: `src/app/news/page.tsx` (server page with hero banner)

## Overview

Build `/gallery` route with responsive masonry grid, category filter chips, and
lightbox viewer. Heavily based on existing `AnfieldGallery` component patterns but
as standalone page with hero, better layout, and Unsplash attribution.

## Key Insights

1. **Reuse `yet-another-react-lightbox`** (already installed, v3.29.1) instead of shadcn Dialog
   - Consistent UX with History > Gallery tab
   - Zoom, keyboard nav, swipe already work
2. **CSS Grid masonry** via `grid-template-rows: masonry` (experimental) with fallback to fixed-aspect grid
   - Simpler: just use uniform aspect-ratio grid like AnfieldGallery does (proven pattern)
3. **Server/client split**: page.tsx reads JSON (server), passes to client grid component
4. **i18n**: category labels and page text via `next-intl`

## Requirements

- [ ] Create `src/app/gallery/page.tsx` -- server component with hero + metadata
- [ ] Create `src/app/gallery/loading.tsx` -- skeleton fallback
- [ ] Create `src/components/gallery/gallery-grid.tsx` -- client component (grid + filter + lightbox)
- [ ] Create `src/components/gallery/gallery-skeleton.tsx` -- skeleton UI
- [ ] Add `Gallery.*` keys to `src/messages/en.json` and `vi.json`
- [ ] Responsive: 2 cols mobile, 3 cols tablet, 4-5 cols desktop
- [ ] Unsplash attribution on each image hover + lightbox

## Architecture

### Page flow

```
/gallery (route)
  ├── page.tsx (server)
  │   ├── import gallery.json
  │   ├── generateMetadata() for SEO
  │   └── render <GalleryGrid images={data} />
  ├── loading.tsx
  │   └── render <GallerySkeleton />
  └── GalleryGrid (client)
      ├── category filter chips (useState)
      ├── responsive grid with Next/Image
      ├── hover overlay: zoom icon + photographer credit
      ├── lightbox (yet-another-react-lightbox)
      └── Unsplash attribution footer
```

### `src/app/gallery/page.tsx`

```typescript
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import galleryData from "@/data/gallery.json";
import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { makePageMeta } from "@/lib/seo";
import type { GalleryImage } from "@/lib/types/gallery";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Gallery.metadata");
  const title = t("title");
  const description = t("description");
  return { title, description, ...makePageMeta(title, description) };
}

export default async function GalleryPage() {
  const t = await getTranslations("Gallery");
  const images = galleryData as GalleryImage[];

  return (
    <div className="min-h-screen bg-stadium-bg text-white">
      {/* Hero */}
      <div className="relative h-[300px] md:h-[360px] pt-28 flex items-end overflow-hidden">
        {/* Background from first image or static asset */}
        <div className="absolute inset-0 bg-gradient-to-t from-stadium-bg via-stadium-bg/80 to-transparent" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 w-full">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-px bg-lfc-red" />
            <p className="font-barlow text-lfc-red uppercase tracking-[0.3em] text-xs font-bold">
              {t("hero.label")}
            </p>
          </div>
          <h1 className="font-bebas text-5xl md:text-7xl tracking-widest leading-none mb-4">
            {t("hero.title")}
          </h1>
          <p className="font-inter text-stadium-muted text-sm max-w-xl">{t("hero.description")}</p>
        </div>
      </div>

      {/* Gallery */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <GalleryGrid images={images} />
      </div>
    </div>
  );
}
```

### `src/components/gallery/gallery-grid.tsx`

Client component following `AnfieldGallery` patterns:
- `useState` for category filter and lightbox index
- `useMemo` for filtered images
- `useCallback` for broken image tracking
- `yet-another-react-lightbox` with Zoom + Captions plugins
- Attribution overlay on hover (photographer name)
- Filter chips styled identically to AnfieldGallery

```typescript
"use client";
import { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { ZoomIn, Camera, ExternalLink } from "lucide-react";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Captions from "yet-another-react-lightbox/plugins/captions";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/captions.css";
import type { GalleryImage, GalleryCategory } from "@/lib/types/gallery";

const CATEGORIES: { key: GalleryCategory | "all"; labelKey: string }[] = [
  { key: "all", labelKey: "all" },
  { key: "anfield", labelKey: "anfield" },
  { key: "players", labelKey: "players" },
  { key: "matches", labelKey: "matches" },
  { key: "fans", labelKey: "fans" },
];

interface Props { images: GalleryImage[]; }

export function GalleryGrid({ images }: Props) {
  // ... filter, lightbox, broken image tracking (same pattern as AnfieldGallery)
}
```

### Responsive Grid

```
grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5
```

Each cell: `aspect-square` with `object-cover`, matching AnfieldGallery.

### Lightbox Attribution

In lightbox slides, include photographer credit as caption:

```typescript
slides={filtered.map(img => ({
  src: img.srcFull,
  title: img.alt,
  description: `Photo by ${img.photographer}`,
}))}
```

## Related Code Files

- `src/components/history/anfield-gallery.tsx` -- primary pattern reference
- `src/app/history/page.tsx` -- hero banner pattern
- `src/app/news/page.tsx` -- server page with data fetch pattern
- `src/components/ui/dialog.tsx` -- NOT used (lightbox lib preferred)
- `src/lib/animation-variants.ts` -- fadeUp for entry animations

## Implementation Steps

1. Add i18n keys to `src/messages/en.json` and `vi.json`:
   ```json
   "Gallery": {
     "metadata": { "title": "Gallery", "description": "Liverpool FC photo gallery" },
     "hero": { "label": "Photography", "title": "Gallery", "description": "..." },
     "categories": { "all": "All", "anfield": "Anfield", "players": "Players", "matches": "Matches", "fans": "Fans" },
     "attribution": "Photos from Unsplash",
     "photoBy": "Photo by"
   }
   ```
2. Create `src/components/gallery/gallery-skeleton.tsx` -- grid of skeleton rectangles
3. Create `src/components/gallery/gallery-grid.tsx` -- client component
   - Copy filter chip pattern from AnfieldGallery
   - Adapt grid layout (same responsive breakpoints)
   - Add photographer credit on hover overlay
   - Wire up lightbox with Captions plugin for attribution
   - Add Unsplash attribution footer link
4. Create `src/app/gallery/loading.tsx` -- imports GallerySkeleton
5. Create `src/app/gallery/page.tsx` -- server component, imports JSON, renders GalleryGrid
6. Install `yet-another-react-lightbox/plugins/captions` CSS (already available, just import)

## Todo

- [ ] Add Gallery i18n keys (en + vi)
- [ ] Create gallery-skeleton.tsx
- [ ] Create gallery-grid.tsx (client)
- [ ] Create loading.tsx
- [ ] Create page.tsx (server)
- [ ] Test responsive layout at all breakpoints
- [ ] Verify lightbox with attribution

## Success Criteria

- `/gallery` renders with all curated images
- Category filter works (shows count per category)
- Lightbox opens with zoom + photographer credit
- Responsive: 2/3/4/5 column layout at breakpoints
- Broken images hidden gracefully (same as AnfieldGallery)
- `npm run build` succeeds
- Dark Stadium theme applied consistently

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Captions plugin CSS conflict | Low | Scoped styles, test visually |
| Large image payloads on mobile | Medium | Use `w=800` for grid, lazy loading, Next/Image |
| Grid layout inconsistency across browsers | Low | CSS Grid well-supported, fallback aspect-square |

## Security Considerations

- No user input processed -- static data only
- Image URLs are hardcoded in JSON (no injection vector)
- `unoptimized` flag on Next/Image for external Unsplash URLs (same as AnfieldGallery)

## Next Steps

After this phase, proceed to [Phase 03: Integration & Polish](./phase-03-integration-polish.md).
