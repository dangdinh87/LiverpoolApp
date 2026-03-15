# Phase 3: Update Gallery UI

## Context
- [Main plan](./plan.md) | [Phase 1](./phase-01-database-admin-foundation.md) | [Phase 2](./phase-02-expand-image-collection.md)
- Depends on Phase 1 (DB + admin helpers) and Phase 2 (seeded data)
- Current gallery reads from Cloudinary API with JSON fallback
- Current auth check: `isAuthenticated` boolean (any logged-in user can upload)
- Gallery already has masonry grid + lightbox + category filters

## Overview

Switch gallery data source from Cloudinary API to Supabase. Replace `isAuthenticated` with `isAdmin`. Add admin-only delete button on images. Add `history` category to upload form. Update the `GalleryImage` interface from `categories: string[]` to `category: string`.

## Key Insights

1. **Interface change `categories[]` to `category`** affects: gallery-page.tsx, gallery-content.tsx, gallery-upload.tsx, API route. Must update all simultaneously
2. **gallery-content.tsx filter logic** currently does `img.categories.includes(cat)` -- change to `img.category === cat`
3. **Admin delete** needs to delete from both Cloudinary and Supabase -- API route handles both
4. **gallery/page.tsx** currently does `revalidate = 1800` (30min ISR) -- keep this for Supabase reads too
5. **Existing lightbox** (yet-another-react-lightbox) stays unchanged
6. **`isAdmin` prop** flows: server page.tsx checks email -> passes to gallery-page.tsx -> passes to gallery-upload.tsx + gallery-content.tsx

## Requirements

- [ ] Update `GalleryImage` interface: `categories: string[]` -> `category: string`
- [ ] Switch data source: Cloudinary `listGalleryImages()` -> Supabase `listGalleryImagesFromDB()`
- [ ] Replace `isAuthenticated` with `isAdmin` prop throughout component tree
- [ ] Add `history` to upload form categories
- [ ] Add admin-only delete button on gallery images
- [ ] Update API route POST: persist to Supabase after Cloudinary upload
- [ ] Update API route DELETE: remove from both Supabase and Cloudinary
- [ ] Add admin email check to API routes (replace simple auth check)
- [ ] Keep gallery.json as fallback if Supabase returns empty/errors

## Architecture

### Component prop flow

```
gallery/page.tsx (server)
  |-- checks user.email === ADMIN_EMAIL
  |-- reads from Supabase (fallback: gallery.json)
  |-- maps GalleryImage DB type to client GalleryImage type
  |
  +-> GalleryPage (client)
        props: { images, isAdmin }
        |
        +-> GalleryUpload (client) -- only if isAdmin
        |     props: { onUploadComplete }
        |
        +-> GalleryContent (client)
              props: { images, isAdmin, onDelete? }
```

### Updated interfaces

```typescript
// Client-side GalleryImage (used in components)
interface GalleryImage {
  id: string;         // Supabase UUID
  src: string;        // cloudinary_url
  alt: string;
  category: string;   // single category (was categories[])
  width?: number;
  height?: number;
  cloudinaryId?: string;  // for delete operations
  isHomepageEligible?: boolean;  // for Phase 4 admin action
}
```

### Updated gallery/page.tsx data fetch

```typescript
import { listGalleryImagesFromDB } from '@/lib/gallery/queries';
import { isAdminEmail } from '@/lib/constants';
import galleryFallback from '@/data/gallery.json';

// In component:
let images;
try {
  const dbImages = await listGalleryImagesFromDB();
  if (dbImages.length > 0) {
    images = dbImages.map(img => ({
      id: img.id,
      src: img.cloudinary_url,
      alt: img.alt,
      category: img.category,
      width: img.width ?? undefined,
      height: img.height ?? undefined,
      cloudinaryId: img.cloudinary_public_id,
      isHomepageEligible: img.is_homepage_eligible,
    }));
  } else {
    images = galleryFallback; // seed not run yet
  }
} catch {
  images = galleryFallback;
}

const isAdmin = isAdminEmail(user?.email);
// Pass isAdmin instead of isAuthenticated
```

### Updated API route pattern

```typescript
// POST /api/gallery
import { isAdminEmail } from '@/lib/constants';
import { insertGalleryImage } from '@/lib/gallery/queries';

// Auth check:
if (!user || !isAdminEmail(user.email)) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// After Cloudinary upload, also persist to Supabase:
const dbRow = await insertGalleryImage({
  cloudinary_public_id: cloudinaryResult.id,
  cloudinary_url: cloudinaryResult.src,
  alt,
  category, // single category now
  width: cloudinaryResult.width,
  height: cloudinaryResult.height,
});

return NextResponse.json({
  image: {
    id: dbRow.id,
    src: dbRow.cloudinary_url,
    alt: dbRow.alt,
    category: dbRow.category,
  },
});
```

### Delete button design

Admin sees a trash icon on hover (top-left corner of each image card). Click triggers confirmation, then calls `DELETE /api/gallery` with `{ id }` (Supabase UUID).

```typescript
// In gallery-content.tsx, inside the image button:
{isAdmin && (
  <button
    onClick={(e) => {
      e.stopPropagation();
      handleDelete(img.id, img.cloudinaryId);
    }}
    className="absolute top-2 left-2 p-1.5 bg-red-600/80 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
    title="Delete"
  >
    <Trash2 className="w-3.5 h-3.5" />
  </button>
)}
```

### Upload form category update

```typescript
// gallery-upload.tsx
const CATEGORIES = ["anfield", "squad", "matches", "fans", "legends", "trophies", "history"] as const;

// Change from multi-select to single-select (radio-button style)
// Since DB uses single category, upload should too
const [category, setCategory] = useState<string>("anfield");

// FormData change:
formData.append("category", category); // was "categories"
```

## Related Code Files

| File | Role | Action |
|------|------|--------|
| `src/app/gallery/page.tsx` | Server page | **MODIFY** -- Supabase data source, isAdmin prop |
| `src/components/gallery/gallery-page.tsx` | Client wrapper | **MODIFY** -- isAdmin prop instead of isAuthenticated |
| `src/components/gallery/gallery-upload.tsx` | Upload form | **MODIFY** -- add history, single category, admin-only |
| `src/components/gallery/gallery-content.tsx` | Grid + lightbox | **MODIFY** -- single category filter, admin delete button |
| `src/app/api/gallery/route.ts` | API routes | **MODIFY** -- admin check, Supabase persistence, category change |
| `src/lib/gallery/queries.ts` | DB queries | Existing from Phase 1 |
| `src/lib/constants.ts` | Admin check | Existing from Phase 1 |
| `src/lib/cloudinary.ts` | Cloudinary SDK | No changes this phase |

## Implementation Steps

1. **Update `src/app/gallery/page.tsx`**
   - Import `listGalleryImagesFromDB` from `@/lib/gallery/queries`
   - Import `isAdminEmail` from `@/lib/constants`
   - Replace Cloudinary list with Supabase query (keep gallery.json fallback)
   - Map DB rows to client GalleryImage shape
   - Replace `isAuthenticated={!!user}` with `isAdmin={isAdmin}`

2. **Update `src/components/gallery/gallery-page.tsx`**
   - Rename prop `isAuthenticated` to `isAdmin`
   - Update GalleryImage interface: `categories: string[]` -> `category: string`
   - Add `onDelete` handler that calls `DELETE /api/gallery`
   - Pass `isAdmin` and `onDelete` to GalleryContent

3. **Update `src/components/gallery/gallery-upload.tsx`**
   - Add `"history"` to CATEGORIES array
   - Change from multi-category to single-category selection
   - Update FormData to send `category` (singular)
   - Add `history` key to categoryLabels
   - Update `onUploadComplete` callback to pass `category` string

4. **Update `src/components/gallery/gallery-content.tsx`**
   - Update GalleryImage interface: `category: string` (singular)
   - Add `"history"` to CATEGORIES filter array (now 8: all + 7)
   - Change filter: `img.categories.includes(cat)` -> `img.category === cat`
   - Change count: same pattern
   - Add `isAdmin` prop and `onDelete` callback prop
   - Add delete button (Trash2 icon) visible only for admin on hover
   - Add confirmation dialog before delete

5. **Update `src/app/api/gallery/route.ts`**
   - Import `isAdminEmail` from `@/lib/constants`
   - Import `insertGalleryImage`, `deleteGalleryImageFromDB` from `@/lib/gallery/queries`
   - POST: check admin email (not just auth), accept single `category`, upload to Cloudinary then insert into Supabase
   - DELETE: check admin email, accept `{ id }` (Supabase UUID), look up `cloudinary_public_id` from DB, delete from both
   - GET: can be removed or kept as backup (page.tsx reads from Supabase directly now)
   - Update VALID_CATEGORIES to include `"history"`

6. **Update i18n keys for `history` category**
   - `en.json`: add `Gallery.categories.history: "History"`
   - `vi.json`: add `Gallery.categories.history: "Lịch sử"`

## Todo

- [ ] Update gallery/page.tsx -- Supabase source + isAdmin
- [ ] Update gallery-page.tsx -- isAdmin prop
- [ ] Update gallery-upload.tsx -- single category, add history
- [ ] Update gallery-content.tsx -- single category filter, delete button
- [ ] Update API route -- admin check, Supabase persistence
- [ ] Add history category i18n keys
- [ ] Test: upload as admin, view as anon, delete as admin
- [ ] Test: non-admin sees no upload/delete buttons

## Success Criteria

1. Gallery page loads images from Supabase (visible in network tab: no Cloudinary API calls)
2. Falls back to gallery.json when Supabase is empty/errored
3. Only admin email sees upload form and delete buttons
4. Upload creates record in both Cloudinary and Supabase
5. Delete removes from both Cloudinary and Supabase
6. All 8 category filter chips work (all + 7 categories)
7. "History" category appears in upload form and filter
8. Non-admin user sees gallery but no admin controls

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Breaking change from `categories[]` to `category` | Update all files in same commit; test thoroughly |
| Supabase query fails on production | gallery.json fallback preserved |
| Admin check bypassed on client | RLS enforces admin check at DB level; API route also checks |
| Delete from Cloudinary succeeds but Supabase fails | Delete Supabase first, then Cloudinary; or handle partial failure |

## Security Considerations

- API routes check admin email server-side (not trusting client `isAdmin` prop)
- RLS double-checks at DB level for INSERT/UPDATE/DELETE
- `isAdmin` prop is display-only -- actual authorization happens server-side
- Delete endpoint accepts Supabase UUID (not Cloudinary public_id) -- lookup happens server-side

## Next Steps

After gallery UI updates are complete, proceed to [Phase 4: Homepage Background Selection](./phase-04-homepage-background-selection.md) for the admin homepage hero picker.
