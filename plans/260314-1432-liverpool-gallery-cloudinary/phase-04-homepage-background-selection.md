# Phase 4: Homepage Background Selection

## Context
- [Main plan](./plan.md) | [Phase 1](./phase-01-database-admin-foundation.md) | [Phase 2](./phase-02-expand-image-collection.md) | [Phase 3](./phase-03-update-gallery-ui.md)
- Depends on all prior phases (DB, seeded data, admin UI)
- Current hero: hardcoded `url('/assets/lfc/stadium/anfield-champions-league.webp')` in `hero.tsx`
- `site_settings` table exists from Phase 1
- `is_homepage_eligible` field on `gallery_images` from Phase 1

## Overview

Allow admin to select a gallery image as the homepage hero background. Admin sees a "Set as Homepage" button on eligible (landscape) images in the gallery. Homepage hero.tsx dynamically reads the selected image from `site_settings`, falling back to the current hardcoded asset. Also add all remaining i18n keys for admin actions.

## Key Insights

1. **hero.tsx is a client component** (`"use client"`, uses Framer Motion) -- cannot directly call Supabase server functions
2. **Solution**: Fetch hero background in the homepage server component (`page.tsx`), pass URL as prop to `<Hero />`
3. **`is_homepage_eligible`** auto-determined: images with aspect ratio >= 1.5 (landscape) are eligible. Set during upload/seed
4. **site_settings key**: `homepage_hero_image` stores `{ gallery_image_id: string, cloudinary_url: string }`
5. **Caching**: Homepage already uses `revalidate = 1800` (30min ISR). Hero background updates propagate within 30min
6. **Cloudinary transformations**: Can append `/w_1920,q_auto,f_auto/` to URL for optimized hero delivery

## Requirements

- [ ] Create API route `POST /api/gallery/homepage` to set homepage image (admin only)
- [ ] Add "Set as Homepage" button to gallery-content.tsx for admin on eligible images
- [ ] Update hero.tsx to accept optional `backgroundUrl` prop
- [ ] Update homepage page.tsx to fetch hero background from site_settings
- [ ] Add Cloudinary transformation for hero-sized delivery
- [ ] Add all i18n keys for admin actions (en + vi)
- [ ] Fallback to hardcoded image when no selection exists

## Architecture

### Data flow

```
Admin Flow:
  Gallery grid -> admin clicks "Set as Homepage" on eligible image
  -> POST /api/gallery/homepage { galleryImageId: "uuid" }
  -> API route: verify admin, look up image, upsert site_settings
  -> Toast: "Homepage background updated"

Render Flow:
  Homepage page.tsx (server, revalidate=1800)
  -> getSiteSetting('homepage_hero_image')
  -> If found: pass cloudinary_url to <Hero backgroundUrl={url} />
  -> If not found: <Hero /> uses default hardcoded image
  -> hero.tsx uses backgroundUrl ?? defaultImage
```

### API route: `/api/gallery/homepage`

```typescript
// src/app/api/gallery/homepage/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { isAdminEmail } from '@/lib/constants';
import { setSiteSetting } from '@/lib/gallery/queries';

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { galleryImageId } = await req.json();
  if (!galleryImageId) {
    return NextResponse.json({ error: 'galleryImageId required' }, { status: 400 });
  }

  // Look up the image to get its URL
  const { data: image, error } = await supabase
    .from('gallery_images')
    .select('id, cloudinary_url, is_homepage_eligible')
    .eq('id', galleryImageId)
    .single();

  if (error || !image) {
    return NextResponse.json({ error: 'Image not found' }, { status: 404 });
  }

  // Store in site_settings
  await setSiteSetting('homepage_hero_image', {
    gallery_image_id: image.id,
    cloudinary_url: image.cloudinary_url,
  });

  return NextResponse.json({ success: true });
}
```

### Hero component update

```typescript
// src/components/home/hero.tsx
const DEFAULT_HERO_BG = '/assets/lfc/stadium/anfield-champions-league.webp';

interface HeroProps {
  backgroundUrl?: string;
}

export function Hero({ backgroundUrl }: HeroProps) {
  const heroImage = backgroundUrl || DEFAULT_HERO_BG;
  // ...
  // Replace hardcoded URL:
  style={{ backgroundImage: `url('${heroImage}')` }}
}
```

### Homepage page.tsx update

```typescript
// src/app/(home)/page.tsx or src/app/page.tsx
import { getSiteSetting } from '@/lib/gallery/queries';

// In component:
const heroSetting = await getSiteSetting<{
  gallery_image_id: string;
  cloudinary_url: string;
}>('homepage_hero_image');

const heroBackgroundUrl = heroSetting?.cloudinary_url;

// Pass to Hero:
<Hero backgroundUrl={heroBackgroundUrl} />
```

### "Set as Homepage" button in gallery-content.tsx

```typescript
// Only visible on images where isHomepageEligible is true AND isAdmin is true
{isAdmin && img.isHomepageEligible && (
  <button
    onClick={(e) => {
      e.stopPropagation();
      handleSetHomepage(img.id);
    }}
    className="absolute bottom-8 right-2 p-1.5 bg-lfc-gold/80 text-black opacity-0 group-hover:opacity-100 transition-opacity hover:bg-lfc-gold z-10"
    title={t('admin.setHomepage')}
  >
    <Home className="w-3.5 h-3.5" />
  </button>
)}
```

### Cloudinary optimized hero URL

For hero backgrounds, append transformation to the Cloudinary URL:
```typescript
function heroOptimizedUrl(cloudinaryUrl: string): string {
  // Insert transformation before /upload/ path
  return cloudinaryUrl.replace(
    '/upload/',
    '/upload/w_1920,h_1080,c_fill,q_auto,f_auto/'
  );
}
```

This ensures the hero image is always delivered at 1920x1080 with auto quality/format.

## Related Code Files

| File | Role | Action |
|------|------|--------|
| `src/app/api/gallery/homepage/route.ts` | **NEW** | Admin-only endpoint to set homepage image |
| `src/components/home/hero.tsx` | Homepage hero | **MODIFY** -- accept optional backgroundUrl prop |
| `src/app/page.tsx` | Homepage server component | **MODIFY** -- fetch hero setting, pass to Hero |
| `src/components/gallery/gallery-content.tsx` | Gallery grid | **MODIFY** -- add "Set as Homepage" button |
| `src/components/gallery/gallery-page.tsx` | Gallery wrapper | **MODIFY** -- add onSetHomepage callback |
| `src/messages/en.json` | English i18n | **MODIFY** -- add admin action keys |
| `src/messages/vi.json` | Vietnamese i18n | **MODIFY** -- add admin action translations |
| `src/lib/gallery/queries.ts` | DB queries | Existing from Phase 1 (getSiteSetting used) |

## Implementation Steps

1. **Create `src/app/api/gallery/homepage/route.ts`**
   - POST handler with admin email check
   - Accept `{ galleryImageId }` body
   - Look up image in gallery_images table
   - Upsert `site_settings` with key `homepage_hero_image`
   - Return success/error

2. **Update `src/components/home/hero.tsx`**
   - Add `HeroProps` interface with optional `backgroundUrl`
   - Define `DEFAULT_HERO_BG` constant
   - Use `backgroundUrl || DEFAULT_HERO_BG` in style
   - No other changes to animation/layout

3. **Update homepage `src/app/page.tsx`**
   - Import `getSiteSetting` from `@/lib/gallery/queries`
   - Fetch `homepage_hero_image` setting
   - Apply Cloudinary transformation for hero size
   - Pass `backgroundUrl` prop to `<Hero />`
   - Wrapped in try/catch with null fallback

4. **Update `src/components/gallery/gallery-content.tsx`**
   - Add `onSetHomepage?: (id: string) => void` prop
   - Add `Home` icon import from lucide-react
   - Show "Set as Homepage" button on eligible images when admin
   - Position: bottom-right corner (above alt text overlay)

5. **Update `src/components/gallery/gallery-page.tsx`**
   - Add `handleSetHomepage` function that calls `POST /api/gallery/homepage`
   - Pass callback to GalleryContent
   - Show toast/feedback on success

6. **Add i18n keys to `src/messages/en.json`**
   ```json
   "Gallery": {
     "categories": {
       "history": "History"
     },
     "admin": {
       "delete": "Delete Image",
       "deleteConfirm": "Delete this image? This cannot be undone.",
       "deleteSuccess": "Image deleted",
       "setHomepage": "Set as Homepage Background",
       "setHomepageSuccess": "Homepage background updated",
       "uploadOnly": "Admin Only"
     }
   }
   ```

7. **Add i18n keys to `src/messages/vi.json`**
   ```json
   "Gallery": {
     "categories": {
       "history": "Lịch sử"
     },
     "admin": {
       "delete": "Xoá ảnh",
       "deleteConfirm": "Xoá ảnh này? Hành động không thể hoàn tác.",
       "deleteSuccess": "Đã xoá ảnh",
       "setHomepage": "Đặt làm ảnh nền trang chủ",
       "setHomepageSuccess": "Đã cập nhật ảnh nền trang chủ",
       "uploadOnly": "Chỉ quản trị viên"
     }
   }
   ```

## Todo

- [ ] Create /api/gallery/homepage route
- [ ] Update hero.tsx to accept backgroundUrl prop
- [ ] Update homepage page.tsx to fetch hero setting
- [ ] Add "Set as Homepage" button to gallery-content.tsx
- [ ] Wire up callback in gallery-page.tsx
- [ ] Add all admin i18n keys (en + vi)
- [ ] Test: admin sets homepage bg, verify it appears on homepage
- [ ] Test: delete homepage image, verify fallback works
- [ ] Test: non-admin cannot see homepage button or call API

## Success Criteria

1. Admin can click "Set as Homepage" on eligible gallery images
2. Homepage hero shows selected Cloudinary image (optimized for 1920px)
3. Falls back to default local image when no selection exists
4. Non-admin users cannot see the "Set as Homepage" button
5. API returns 403 for non-admin POST to /api/gallery/homepage
6. All admin action strings translated in both en.json and vi.json
7. Homepage updates visible within ISR revalidation window (30min)

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Hero image loads slowly from Cloudinary | Cloudinary auto-quality + CDN; fallback to local image on error |
| Selected image gets deleted from gallery | Check in hero.tsx: if URL fails to load, fall back to default |
| site_settings table empty on first deploy | Fallback to default hardcoded image -- no crash |
| ISR cache shows stale hero image | 30min revalidation is acceptable; admin understands delay |

## Security Considerations

- `/api/gallery/homepage` route checks admin email server-side
- RLS on `site_settings` table blocks non-admin writes
- `galleryImageId` is validated against `gallery_images` table before storing
- No user-controlled HTML/JS in the background URL (it's always a Cloudinary URL from the DB)

## Unresolved Questions

1. **Should admin be able to reset to default?** Current plan: admin can only select from gallery images. To reset, they'd need to remove the `homepage_hero_image` row from site_settings manually (or we add a "Reset to Default" button). Recommendation: add a simple reset option.

2. **Image preloading**: Should the hero background be preloaded via `<link rel="preload">`? The current local image benefits from being bundled. Cloudinary images would need preload hints for optimal LCP. Consider adding preload in the `<head>` via metadata.
