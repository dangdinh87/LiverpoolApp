# Phase 1: Database & Admin Foundation

## Context
- [Main plan](./plan.md)
- Existing migrations: `supabase/migrations/001_initial.sql` through `004_saved_articles.sql`
- Pattern: SQL files run via Supabase Dashboard SQL Editor (no Supabase CLI locally)
- Auth store: `src/stores/auth-store.ts` (zustand, persisted, has `email` field on `AuthUser`)

## Overview

Create the Supabase schema for gallery images and site settings, define the admin email constant, and build a server-only gallery service module for DB operations.

## Key Insights

1. **No config file exists yet** -- need `src/lib/constants.ts` for `ADMIN_EMAIL` and `GALLERY_CATEGORIES`
2. **Existing RLS pattern**: per-user `auth.uid()` checks. Gallery needs email-based admin check for writes, public anon reads
3. **No `server-only` import needed on migration SQL** -- only on TypeScript service modules
4. **Articles table uses no RLS** (server-only writes via service role). Gallery needs RLS since admin writes go through Supabase client (not service role)
5. **Existing `createServerSupabaseClient()` uses anon key with cookie auth** -- RLS will enforce admin check automatically

## Requirements

- [ ] Create `gallery_images` table with proper columns and indexes
- [ ] Create `site_settings` key-value table
- [ ] Write RLS policies: public SELECT, admin-only INSERT/UPDATE/DELETE
- [ ] Create `src/lib/constants.ts` with `ADMIN_EMAIL` and `GALLERY_CATEGORIES`
- [ ] Create `src/lib/gallery/queries.ts` -- server-only CRUD functions
- [ ] Create helper `isAdmin(email)` function

## Architecture

### Database Schema

```sql
-- File: supabase/migrations/005_gallery.sql

CREATE TABLE IF NOT EXISTS gallery_images (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cloudinary_public_id TEXT NOT NULL UNIQUE,
  cloudinary_url       TEXT NOT NULL,
  alt                  TEXT NOT NULL DEFAULT '',
  category             TEXT NOT NULL DEFAULT 'anfield',
  width                INT,
  height               INT,
  is_homepage_eligible BOOLEAN DEFAULT false,
  sort_order           INT DEFAULT 0,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_gallery_category ON gallery_images (category);
CREATE INDEX idx_gallery_sort ON gallery_images (sort_order, created_at DESC);
CREATE INDEX idx_gallery_homepage ON gallery_images (is_homepage_eligible) WHERE is_homepage_eligible = true;

CREATE TABLE IF NOT EXISTS site_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Design note**: Using single `category TEXT` instead of `categories TEXT[]` from the current interface. Reason: simpler queries, single-category assignment is cleaner for ~200 curated images. Images that conceptually span categories (e.g., Shankly Gates = anfield + legends) should pick the primary one. The current `categories: string[]` interface on the client will map to filtering by single category.

**Alternative considered**: Keep `categories TEXT[]` array. Rejected because it adds query complexity (`@>` operator, GIN index) for minimal UX benefit -- the masonry grid already filters by one category at a time.

### RLS Policies

```sql
-- gallery_images: public read, admin-only write
ALTER TABLE gallery_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view gallery images"
  ON gallery_images FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admin can insert gallery images"
  ON gallery_images FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt()->>'email' = 'nguyendangdinh47@gmail.com');

CREATE POLICY "Admin can update gallery images"
  ON gallery_images FOR UPDATE
  TO authenticated
  USING (auth.jwt()->>'email' = 'nguyendangdinh47@gmail.com');

CREATE POLICY "Admin can delete gallery images"
  ON gallery_images FOR DELETE
  TO authenticated
  USING (auth.jwt()->>'email' = 'nguyendangdinh47@gmail.com');

-- site_settings: public read, admin-only write
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view site settings"
  ON site_settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admin can manage site settings"
  ON site_settings FOR ALL
  TO authenticated
  USING (auth.jwt()->>'email' = 'nguyendangdinh47@gmail.com');
```

### Constants Module

```typescript
// src/lib/constants.ts
export const ADMIN_EMAIL = 'nguyendangdinh47@gmail.com';

export const GALLERY_CATEGORIES = [
  'anfield', 'squad', 'matches', 'fans', 'legends', 'trophies', 'history'
] as const;

export type GalleryCategory = (typeof GALLERY_CATEGORIES)[number];

export function isAdminEmail(email: string | null | undefined): boolean {
  return email === ADMIN_EMAIL;
}
```

### Gallery Service Module

```typescript
// src/lib/gallery/queries.ts
import 'server-only';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import type { GalleryCategory } from '@/lib/constants';

export interface GalleryImage {
  id: string;
  cloudinary_public_id: string;
  cloudinary_url: string;
  alt: string;
  category: GalleryCategory;
  width: number | null;
  height: number | null;
  is_homepage_eligible: boolean;
  sort_order: number;
  created_at: string;
}

/** List all gallery images, ordered by sort_order then newest first */
export async function listGalleryImagesFromDB(): Promise<GalleryImage[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('gallery_images')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Insert a gallery image row */
export async function insertGalleryImage(image: {
  cloudinary_public_id: string;
  cloudinary_url: string;
  alt: string;
  category: GalleryCategory;
  width?: number;
  height?: number;
  is_homepage_eligible?: boolean;
}): Promise<GalleryImage> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('gallery_images')
    .insert(image)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Delete a gallery image by id */
export async function deleteGalleryImageFromDB(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('gallery_images')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

/** Get a site setting by key */
export async function getSiteSetting<T>(key: string): Promise<T | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', key)
    .single();
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return (data?.value as T) ?? null;
}

/** Upsert a site setting */
export async function setSiteSetting(key: string, value: unknown): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('site_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw error;
}
```

## Related Code Files

| File | Role | Action |
|------|------|--------|
| `supabase/migrations/005_gallery.sql` | **NEW** | Create gallery_images + site_settings + RLS |
| `src/lib/constants.ts` | **NEW** | ADMIN_EMAIL, GALLERY_CATEGORIES, isAdminEmail() |
| `src/lib/gallery/queries.ts` | **NEW** | Server-only Supabase CRUD for gallery |
| `src/lib/supabase-server.ts` | Existing | Used by queries.ts (no changes) |
| `src/lib/cloudinary.ts` | Existing | No changes this phase |

## Implementation Steps

1. **Create `supabase/migrations/005_gallery.sql`**
   - `gallery_images` table with all columns
   - `site_settings` key-value table
   - Indexes on category, sort_order, homepage eligibility
   - RLS policies for public read + admin write on both tables
   - Run in Supabase Dashboard SQL Editor

2. **Create `src/lib/constants.ts`**
   - Export `ADMIN_EMAIL` string constant
   - Export `GALLERY_CATEGORIES` tuple
   - Export `GalleryCategory` type
   - Export `isAdminEmail()` helper

3. **Create `src/lib/gallery/queries.ts`**
   - `import 'server-only'`
   - `listGalleryImagesFromDB()` -- SELECT all, ordered
   - `insertGalleryImage()` -- INSERT + return row
   - `deleteGalleryImageFromDB()` -- DELETE by id
   - `getSiteSetting<T>()` -- generic key-value read
   - `setSiteSetting()` -- upsert key-value
   - Export `GalleryImage` interface

## Todo

- [ ] Write migration SQL file
- [ ] Run migration in Supabase Dashboard
- [ ] Create constants.ts
- [ ] Create gallery/queries.ts
- [ ] Verify RLS: test SELECT as anon, INSERT as non-admin (should fail), INSERT as admin (should pass)

## Success Criteria

1. `gallery_images` table exists with correct columns and indexes
2. `site_settings` table exists
3. RLS blocks non-admin writes; allows public reads
4. `listGalleryImagesFromDB()` returns empty array (no data yet)
5. `isAdminEmail()` correctly identifies admin vs non-admin
6. No lint errors, all types correct

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| JWT email claim not present in Supabase token | Supabase includes email in JWT by default; verify in Dashboard > Auth > JWT |
| RLS policy too permissive on site_settings | Using FOR ALL + email check; test with non-admin account |
| Migration conflicts with existing tables | Table names are unique (`gallery_images`, `site_settings`) |

## Security Considerations

- Admin email hardcoded in RLS policy AND in TypeScript constant -- must match exactly
- RLS enforced at DB level regardless of API route bugs
- No service role key used for gallery writes -- anon key + cookie auth + RLS
- `site_settings` value is JSONB -- validate structure in application code before insert

## Next Steps

After this phase, proceed to [Phase 2: Expand Image Collection](./phase-02-expand-image-collection.md) to populate the database with ~200 images via seed script.
