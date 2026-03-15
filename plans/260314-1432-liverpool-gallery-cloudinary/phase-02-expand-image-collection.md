# Phase 2: Expand Image Collection

## Context
- [Main plan](./plan.md) | [Phase 1](./phase-01-database-admin-foundation.md)
- Depends on Phase 1 (Supabase tables must exist)
- Current `gallery.json`: 42 images across 4 categories (`anfield`, `squad`, `legends`, `trophies`/`matches`)
- Target: ~200 images across 7 categories

## Overview

Curate ~200 Wikipedia Commons Liverpool FC images, update `gallery.json` as seed data with normalized categories, and create a seed script that bulk-uploads images to Cloudinary and inserts metadata into Supabase.

## Key Insights

1. **Wikipedia Commons images are CC/public domain** -- safe for fan site use with attribution
2. **Cloudinary `upload` supports URL sources** -- no need to download files first; pass Wikipedia URL directly
3. **Current `uploadGalleryImage()` accepts Buffer or base64** -- need to add URL upload path for seed script
4. **Seed script should be idempotent** -- skip images already in Supabase (check `cloudinary_public_id` uniqueness)
5. **Cloudinary free tier: 25 credits/month** -- uploading 200 images (~10MB avg) uses ~2-3 credits. Well within limits
6. **Rate limiting**: Cloudinary has no hard rate limit on uploads but batch in small groups (5 concurrent) to be safe

## Requirements

- [ ] Research and curate ~200 Wikipedia Commons Liverpool FC images
- [ ] Update `gallery.json` with normalized categories (7 categories, `squad` not `players`)
- [ ] Add `uploadFromUrl()` to cloudinary.ts for seed script use
- [ ] Create `scripts/seed-gallery.ts` that reads gallery.json, uploads to Cloudinary, inserts into Supabase
- [ ] Handle duplicates gracefully (ON CONFLICT skip)
- [ ] Add npm script `seed:gallery` to package.json

## Architecture

### Updated gallery.json structure

```json
[
  {
    "id": "anfield-2017-aerial",
    "src": "https://upload.wikimedia.org/...",
    "alt": "Anfield Stadium -- Aerial 2017",
    "category": "anfield"
  }
]
```

**Change from current**: `categories: string[]` becomes `category: string` (single value). Simplifies seed logic and aligns with DB schema.

### Target image distribution (~200 total)

| Category | Count | Content examples |
|----------|-------|-----------------|
| anfield | ~35 | Stadium views, Kop, stands, Shankly Gates, This Is Anfield, pitch, night matches, Main Stand expansion |
| squad | ~30 | Current players (Salah, Van Dijk, Alisson, TAA, Diaz, Gakpo, Szoboszlai, Mac Allister, etc.) |
| legends | ~40 | Gerrard, Dalglish, Rush, Fowler, Carragher, Torres, Suarez, Klopp, Paisley, Shankly, Coutinho, Henderson, Mane, Firmino, Alonso, Kuyt, Hyppia |
| matches | ~25 | Match action, lineups, celebrations, famous games |
| fans | ~20 | Kop atmosphere, YNWA banners, fan mosaics, tifo, crowd shots |
| trophies | ~25 | CL trophies, PL trophy 2020, FA Cup, League Cup, UEFA cups, trophy lifts |
| history | ~25 | Historic moments, old Anfield, club founding, programme covers, old kits, Hillsborough memorial |

### Cloudinary URL upload addition

```typescript
// Add to src/lib/cloudinary.ts
export async function uploadFromUrl(
  url: string,
  options: { publicId: string; category: string; alt: string },
) {
  const result = await cloudinary.uploader.upload(url, {
    folder: GALLERY_FOLDER,
    public_id: options.publicId,
    tags: [options.category, 'lfc-gallery'],
    context: `alt=${options.alt}|category=${options.category}`,
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    overwrite: false, // don't overwrite existing
    unique_filename: false,
  });
  return {
    publicId: result.public_id,
    url: result.secure_url,
    width: result.width,
    height: result.height,
  };
}
```

### Seed script design

```typescript
// scripts/seed-gallery.ts
// Run with: npx tsx scripts/seed-gallery.ts

// 1. Load gallery.json
// 2. For each image:
//    a. Upload to Cloudinary via URL (skip if already exists)
//    b. Insert into Supabase gallery_images (ON CONFLICT DO NOTHING)
// 3. Log progress and summary

// Uses Supabase service role key (not anon key) since script runs outside browser auth
// Concurrent uploads: 5 at a time using p-limit or simple batching
```

**Important**: Seed script uses `SUPABASE_SERVICE_ROLE_KEY` (not anon key) because it runs in CLI without auth session. RLS bypassed via service role.

### Supabase client for seed script

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // service role bypasses RLS
);
```

## Related Code Files

| File | Role | Action |
|------|------|--------|
| `src/data/gallery.json` | Seed data | **MODIFY** -- expand to ~200 images, normalize categories |
| `src/lib/cloudinary.ts` | Cloudinary SDK | **MODIFY** -- add `uploadFromUrl()` |
| `scripts/seed-gallery.ts` | Seed script | **NEW** -- bulk upload + DB insert |
| `package.json` | Scripts | **MODIFY** -- add `seed:gallery` script |

## Implementation Steps

1. **Research and curate images**
   - Browse Wikipedia Commons categories: `Liverpool F.C.`, `Anfield`, `Liverpool F.C. players`
   - Collect ~200 image URLs with descriptive alt text
   - Assign single category per image
   - Verify image loads (no 404s)
   - Prefer landscape images for variety; mark wide stadium shots as homepage-eligible

2. **Update `src/data/gallery.json`**
   - Change schema from `categories: string[]` to `category: string`
   - Rename `players` to `squad` where applicable
   - Add `is_homepage_eligible: true` on wide landscape stadium/atmosphere images
   - Add ~158 new entries (42 existing + 158 new = ~200)

3. **Add `uploadFromUrl()` to `src/lib/cloudinary.ts`**
   - Accept URL + publicId + category + alt
   - Use `overwrite: false` to skip existing
   - Return public_id, secure_url, width, height

4. **Create `scripts/seed-gallery.ts`**
   - Load `.env` via `dotenv/config`
   - Read gallery.json
   - Create Supabase client with service role key
   - For each image in batches of 5:
     - Try Cloudinary upload (catch "already exists" errors gracefully)
     - Insert into `gallery_images` with `ON CONFLICT (cloudinary_public_id) DO NOTHING`
   - Log: total, uploaded, skipped, failed
   - Exit with code 1 if any critical failures

5. **Add npm script**
   ```json
   "seed:gallery": "tsx scripts/seed-gallery.ts"
   ```

6. **Run seed script**
   - Verify Cloudinary has images
   - Verify Supabase `gallery_images` has ~200 rows
   - Spot-check a few URLs load correctly

## Todo

- [ ] Curate ~200 Wikipedia Commons Liverpool images
- [ ] Update gallery.json with new images + normalized categories
- [ ] Add uploadFromUrl() to cloudinary.ts
- [ ] Write seed-gallery.ts script
- [ ] Add seed:gallery npm script
- [ ] Run seed and verify data in both Cloudinary and Supabase

## Success Criteria

1. `gallery.json` contains ~200 entries with single `category` field
2. All 7 categories represented with reasonable distribution
3. Seed script runs idempotently (re-run produces same result)
4. `gallery_images` table has ~200 rows after seeding
5. Cloudinary `lfc-gallery` folder has ~200 images
6. At least 10-15 images marked `is_homepage_eligible`
7. No broken image URLs

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Wikipedia rate limits during bulk upload | Cloudinary fetches from URL (their servers, not ours); batch in groups of 5 |
| Some Wikipedia images are low resolution | Prefer images with 800px+ width; skip thumbnails |
| Cloudinary upload failures | Retry logic in seed script; idempotent re-run |
| gallery.json too large for git | 200 entries ~50KB -- fine for git |
| `tsx` not installed | Add as devDependency if not present; or use `ts-node` |

## Security Considerations

- Seed script uses `SUPABASE_SERVICE_ROLE_KEY` -- only for local CLI use, never exposed to client
- Script reads from `.env` file (already in `.gitignore`)
- No user input in seed script -- all data from curated JSON file
- Wikipedia Commons images are freely licensed -- check each image's license page

## Next Steps

After seeding completes, proceed to [Phase 3: Update Gallery UI](./phase-03-update-gallery-ui.md) to switch the gallery page to read from Supabase and add admin controls.
