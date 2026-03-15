---
title: "Liverpool Gallery: Cloudinary + Supabase + Admin"
description: "Expand gallery to ~200 images on Cloudinary, persist in Supabase, admin-only upload, homepage bg selection"
status: pending
priority: P2
effort: 6h
branch: master
tags: [gallery, cloudinary, supabase, admin, homepage]
created: 2026-03-14
---

# Liverpool Gallery: Cloudinary + Supabase + Admin

## Overview

Expand the existing gallery feature from a Cloudinary-only store (42 fallback images in `gallery.json`) to a full-stack image management system. Images persist in both Cloudinary (storage/CDN) and Supabase (metadata/querying). Upload/delete restricted to admin. Admin can select gallery images as the homepage hero background.

## Current State

| Layer | What exists | Gap |
|-------|------------|-----|
| **Storage** | `src/lib/cloudinary.ts` — upload/delete/list via Cloudinary SDK | No DB persistence; metadata only in Cloudinary context fields |
| **Fallback data** | `src/data/gallery.json` — 42 Wikipedia Commons images | Acts as runtime fallback, not seed data |
| **Server page** | `src/app/gallery/page.tsx` — fetches Cloudinary, falls back to JSON | No admin check, just `isAuthenticated` |
| **Client wrapper** | `src/components/gallery/gallery-page.tsx` — holds state, shows upload for authenticated | Needs `isAdmin` instead of `isAuthenticated` |
| **Upload form** | `src/components/gallery/gallery-upload.tsx` — 6 categories, posts to `/api/gallery` | Missing `history` category; no admin gate |
| **Grid + lightbox** | `src/components/gallery/gallery-content.tsx` — masonry, 7 filter categories | Reads from props, no delete/admin actions |
| **API routes** | `src/app/api/gallery/route.ts` — GET/POST/DELETE, auth check only | No admin email check; no Supabase persistence |
| **Homepage hero** | `src/components/home/hero.tsx` — hardcoded local image | No dynamic background selection |
| **i18n** | Gallery namespace exists in en.json + vi.json | Needs admin action keys |

## Architecture Decisions

### 1. Dual-store: Cloudinary + Supabase
- **Cloudinary** = image storage + CDN delivery (transformations, optimization)
- **Supabase `gallery_images`** = metadata, categories, sort order, homepage eligibility
- Source of truth for listing = Supabase (faster queries, no Cloudinary API rate limits)
- Cloudinary `public_id` is the link between both stores

### 2. Admin = email check, not role system
- Single admin: `nguyendangdinh47@gmail.com`
- Define `ADMIN_EMAIL` constant in `src/lib/constants.ts` (not secret, no env var)
- Server check: `user.email === ADMIN_EMAIL`
- Client: pass `isAdmin` boolean from server component
- RLS: `auth.jwt()->>'email' = 'nguyendangdinh47@gmail.com'`

### 3. Homepage bg via `site_settings` table
- Key-value table for site-wide settings
- `homepage_hero_image` key stores `{ gallery_image_id, cloudinary_url }`
- Fallback to current hardcoded image if no row exists

### 4. Category alignment
Unified 7 categories everywhere: `anfield`, `squad`, `matches`, `fans`, `legends`, `trophies`, `history`
- `gallery-upload.tsx` currently has 6 (missing `history`) -- add it
- `gallery-content.tsx` filter already has 7 (no `history` but has `all`) -- add `history` to filter, keep `all`
- `gallery.json` currently uses `anfield`, `players`, `legends`, `history` -- normalize to `squad` instead of `players`

### 5. Seed script approach
- `gallery.json` becomes seed data (not runtime fallback)
- Seed script uploads each image URL to Cloudinary + inserts row in Supabase
- Run once manually; skip duplicates via `ON CONFLICT`

## Phases

| Phase | Title | Effort | Link |
|-------|-------|--------|------|
| 1 | [Database & Admin Foundation](./phase-01-database-admin-foundation.md) | 1.5h | DB migration, admin constant, gallery service module |
| 2 | [Expand Image Collection](./phase-02-expand-image-collection.md) | 1.5h | Curate ~200 images, update gallery.json, seed script |
| 3 | [Update Gallery UI](./phase-03-update-gallery-ui.md) | 2h | Admin-only upload/delete, read from Supabase, category alignment |
| 4 | [Homepage Background Selection](./phase-04-homepage-background-selection.md) | 1h | Admin picks hero bg, dynamic hero.tsx, i18n for admin keys |

## Key Files (will be modified or created)

### New files
- `supabase/migrations/005_gallery.sql` -- gallery_images + site_settings tables
- `src/lib/constants.ts` -- ADMIN_EMAIL, GALLERY_CATEGORIES
- `src/lib/gallery/queries.ts` -- server-only Supabase CRUD for gallery_images
- `scripts/seed-gallery.ts` -- bulk upload seed data to Cloudinary + Supabase

### Modified files
- `src/lib/cloudinary.ts` -- add `uploadFromUrl()` for seed script
- `src/data/gallery.json` -- expand to ~200 images, normalize categories
- `src/app/gallery/page.tsx` -- read from Supabase, pass `isAdmin`
- `src/components/gallery/gallery-page.tsx` -- accept `isAdmin` prop
- `src/components/gallery/gallery-upload.tsx` -- add `history` category
- `src/components/gallery/gallery-content.tsx` -- add delete button, "Set as Homepage" for admin
- `src/app/api/gallery/route.ts` -- admin email check, Supabase persistence
- `src/components/home/hero.tsx` -- dynamic bg from site_settings
- `src/messages/en.json` -- admin action i18n keys
- `src/messages/vi.json` -- Vietnamese translations for admin keys

## Data Flow (after implementation)

```
Upload Flow (admin only):
  Admin uploads file via gallery-upload.tsx
  -> POST /api/gallery
  -> Check auth.email === ADMIN_EMAIL
  -> uploadGalleryImage() to Cloudinary (get public_id, url, dimensions)
  -> INSERT into Supabase gallery_images
  -> Return combined result to client

Read Flow (public):
  gallery/page.tsx (server)
  -> Supabase: SELECT * FROM gallery_images ORDER BY sort_order, created_at DESC
  -> Fallback: gallery.json if Supabase empty/error
  -> Pass images + isAdmin to GalleryClient

Delete Flow (admin only):
  Admin clicks delete on image
  -> DELETE /api/gallery with { id }
  -> Check admin email
  -> deleteGalleryImage() from Cloudinary
  -> DELETE FROM gallery_images WHERE id = ?
  -> Remove from client state

Homepage Selection (admin only):
  Admin clicks "Set as Homepage" on landscape image
  -> POST /api/gallery/homepage with { gallery_image_id }
  -> UPSERT site_settings SET value = { gallery_image_id, cloudinary_url }
  -> hero.tsx reads from site_settings on each render (ISR cached)
```

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Wikipedia Commons images go offline | Medium | Gallery.json stays as fallback seed; Cloudinary stores copies |
| Cloudinary free tier limits (25 credits/mo) | Low | ~200 images well within limits; transformations are cheap |
| Supabase RLS misconfiguration | Low | Test RLS policies with non-admin account; unit test admin check |
| Seed script partial failure | Medium | Idempotent (ON CONFLICT skip); can re-run safely |
