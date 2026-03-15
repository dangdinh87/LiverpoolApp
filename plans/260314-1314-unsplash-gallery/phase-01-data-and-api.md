# Phase 01: Data Layer + Unsplash API Client

## Context

- [Plan overview](./plan.md)
- Existing pattern: `src/data/trophies.json` (static JSON imported directly)
- Existing pattern: `src/lib/football/` (server-only, React.cache)
- Existing gallery: `src/components/history/anfield-gallery.tsx` (hardcoded images array)

## Overview

Create curated gallery data file and optional Unsplash API client.
Primary data source is JSON; API client is for future "explore more" feature.

## Key Insights

1. `images.unsplash.com` already in `next.config.ts` remotePatterns -- no config change needed
2. Unsplash free tier: 50 req/hour. Curated JSON avoids API dependency entirely
3. Follow `trophies.json` pattern: static import, no async fetch needed
4. Unsplash requires attribution (photographer name + link) per their guidelines

## Requirements

- [ ] Create `src/data/gallery.json` with 30-40 curated Liverpool FC images
- [ ] Create `src/lib/unsplash.ts` server-only API client with `React.cache()`
- [ ] Add `UNSPLASH_ACCESS_KEY` to `.env.example`
- [ ] Define TypeScript types for gallery data

## Architecture

### `src/data/gallery.json`

```json
[
  {
    "id": "unsplash-photo-id",
    "src": "https://images.unsplash.com/photo-xxx?w=800&q=80",
    "srcFull": "https://images.unsplash.com/photo-xxx?w=1920&q=85",
    "alt": "Anfield Stadium at sunset",
    "category": "anfield",
    "photographer": "John Doe",
    "photographerUrl": "https://unsplash.com/@johndoe",
    "unsplashUrl": "https://unsplash.com/photos/xxx"
  }
]
```

Categories: `"anfield"`, `"players"`, `"matches"`, `"fans"`

### `src/lib/unsplash.ts`

```typescript
import "server-only";
import { cache } from "react";

const UNSPLASH_BASE = "https://api.unsplash.com";

export interface UnsplashPhoto {
  id: string;
  urls: { raw: string; full: string; regular: string; small: string; thumb: string };
  alt_description: string | null;
  user: { name: string; links: { html: string } };
  links: { html: string };
}

export const searchPhotos = cache(async (query: string, perPage = 20): Promise<UnsplashPhoto[]> => {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) { console.warn("[unsplash] No API key"); return []; }

  const url = `${UNSPLASH_BASE}/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}`;
  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${key}` },
    next: { revalidate: 86400 }, // 24h cache
  });

  if (!res.ok) { console.error("[unsplash]", res.status); return []; }
  const data = await res.json();
  return data.results ?? [];
});
```

### Types (`src/lib/types/gallery.ts` or inline in gallery.json import)

```typescript
export interface GalleryImage {
  id: string;
  src: string;        // w=800 for grid thumbnails
  srcFull: string;     // w=1920 for lightbox
  alt: string;
  category: GalleryCategory;
  photographer: string;
  photographerUrl: string;
  unsplashUrl: string;
}

export type GalleryCategory = "anfield" | "players" | "matches" | "fans";
```

## Related Code Files

- `src/data/trophies.json` -- pattern reference for static JSON
- `src/lib/football/index.ts` -- pattern reference for React.cache server-only barrel
- `next.config.ts` -- already has `images.unsplash.com` in remotePatterns
- `.env.example` -- add UNSPLASH_ACCESS_KEY

## Implementation Steps

1. Create `src/lib/types/gallery.ts` with `GalleryImage` and `GalleryCategory` types
2. Create `src/data/gallery.json` -- curate 30-40 Liverpool FC photos from Unsplash
   - Search Unsplash for: "Anfield", "Liverpool FC", "Premier League Liverpool", "Anfield Stadium"
   - Include both `w=800` (grid) and `w=1920` (lightbox) URLs
   - Categorize into: anfield, players, matches, fans
   - Include photographer attribution per Unsplash guidelines
3. Create `src/lib/unsplash.ts` with `server-only` import and `searchPhotos()` function
4. Add `UNSPLASH_ACCESS_KEY` to `.env.example` with comment
5. Optionally create i18n-friendly Vietnamese alt descriptions in `gallery.vi.json`

## Todo

- [ ] Research Unsplash photos for Liverpool FC (manual curation)
- [ ] Create types file
- [ ] Create gallery.json with curated data
- [ ] Create unsplash.ts API client
- [ ] Update .env.example

## Success Criteria

- `gallery.json` loads without error, all image URLs are valid
- `unsplash.ts` compiles with `server-only` guard
- TypeScript strict mode passes
- `npm run build` succeeds

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Unsplash images removed/broken | Medium | Include 40+ images, broken image handling in UI |
| Unsplash API rate limit (50/hr) | Low | Curated JSON as primary; API is optional |
| Unsplash TOS changes | Low | CC0 license, attribution in UI |

## Security Considerations

- `UNSPLASH_ACCESS_KEY` is server-only (no `NEXT_PUBLIC_` prefix)
- Never expose API key to client bundle
- `server-only` import guard prevents client-side import

## Next Steps

After this phase, proceed to [Phase 02: Gallery UI](./phase-02-gallery-ui.md).
