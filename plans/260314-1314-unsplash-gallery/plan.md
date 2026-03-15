---
title: "Unsplash Gallery Feature"
description: "Liverpool FC image gallery with curated Unsplash photos, masonry grid, and lightbox"
status: pending
priority: P2
effort: 3h
branch: master
tags: [gallery, unsplash, images, ui]
created: 2026-03-14
---

# Unsplash Gallery Feature

## Summary

Dedicated `/gallery` route for Liverpool FC photography sourced from Unsplash (CC0).
Curated ~30-40 images stored as JSON metadata. Masonry grid with category filters and
lightbox viewer. Follows existing Dark Stadium theme and codebase conventions.

## Key Decision: Reuse `yet-another-react-lightbox`

The `AnfieldGallery` component (`src/components/history/anfield-gallery.tsx`) already
uses `yet-another-react-lightbox` with zoom plugin. The new gallery will reuse this
dependency rather than using shadcn Dialog, keeping lightbox UX consistent across the app.

## Architecture

```
src/
├── app/gallery/
│   ├── page.tsx              # Server component, reads JSON, SEO metadata
│   └── loading.tsx           # Skeleton fallback
├── components/gallery/
│   ├── gallery-grid.tsx      # Client: masonry grid + filter + lightbox
│   └── gallery-skeleton.tsx  # Skeleton placeholder
├── data/
│   └── gallery.json          # Curated image metadata (Unsplash URLs)
├── lib/
│   └── unsplash.ts           # Server-only Unsplash API client (optional search)
└── messages/
    ├── en.json               # + Gallery.* keys
    └── vi.json               # + Gallery.* keys
```

## Phases

| # | Phase | Effort | Status | File |
|---|-------|--------|--------|------|
| 1 | Data layer + Unsplash API client | 1h | pending | [phase-01](./phase-01-data-and-api.md) |
| 2 | Gallery UI: page, grid, filter, lightbox | 1.5h | pending | [phase-02](./phase-02-gallery-ui.md) |
| 3 | Integration: navbar, SEO, polish | 0.5h | pending | [phase-03](./phase-03-integration-polish.md) |

## Dependencies

- `yet-another-react-lightbox` -- already installed (v3.29.1)
- `next/image` -- Unsplash domain already in `next.config.ts` remotePatterns
- No new npm packages needed

## Env Variables

- `UNSPLASH_ACCESS_KEY` -- optional, only needed for search/explore API
- Gallery works without it using curated JSON data
