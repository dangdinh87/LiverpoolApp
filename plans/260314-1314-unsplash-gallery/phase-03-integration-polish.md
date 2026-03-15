# Phase 03: Integration & Polish

## Context

- [Plan overview](./plan.md)
- [Phase 01: Data](./phase-01-data-and-api.md) (prerequisite)
- [Phase 02: Gallery UI](./phase-02-gallery-ui.md) (prerequisite)
- Navbar: `src/components/layout/navbar-client.tsx` (nav links array)

## Overview

Add Gallery link to navbar, configure SEO metadata, add loading skeleton,
and polish for production readiness.

## Key Insights

1. Navbar uses inline array of links in `navbar-client.tsx` (lines 118-125 desktop, 323-329 mobile)
   - NOT using `NAV_LINKS` constant (dead code at line 29-36)
   - Must add to both desktop and mobile nav arrays
2. Sitemap at `src/app/sitemap.xml/route.ts` needs `/gallery` added
3. Gallery is static content (JSON), can use ISR or `force-static`
4. No auth required -- public page

## Requirements

- [ ] Add `/gallery` link to navbar (desktop + mobile)
- [ ] Add `/gallery` to sitemap
- [ ] Configure page caching (`force-static` or long revalidation)
- [ ] Add loading.tsx skeleton
- [ ] Verify image loading performance
- [ ] Add `prefers-reduced-motion` respect for hover animations
- [ ] Test keyboard navigation in lightbox

## Architecture

### Navbar Change

Add to desktop nav array (around line 122 in navbar-client.tsx):

```typescript
{ href: "/gallery", label: t("gallery") || "Gallery" },
```

Place between "The Club" and "About" links.

Add same to mobile nav array (around line 328).

Add i18n key: `Common.nav.gallery` to en.json/vi.json.

### Sitemap

Add to `src/app/sitemap.xml/route.ts`:

```typescript
{ url: `${baseUrl}/gallery`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 }
```

### Page Caching

```typescript
// src/app/gallery/page.tsx
export const revalidate = 86400; // 24h -- static JSON rarely changes
```

Or `force-static` since data is imported at build time.

## Related Code Files

- `src/components/layout/navbar-client.tsx` -- lines 118-125 (desktop), 323-329 (mobile)
- `src/app/sitemap.xml/route.ts` -- add gallery route
- `src/messages/en.json` -- add `Common.nav.gallery`
- `src/messages/vi.json` -- add `Common.nav.gallery`

## Implementation Steps

1. Add `Common.nav.gallery` i18n keys:
   - en.json: `"gallery": "Gallery"`
   - vi.json: `"gallery": "B\u1ed9 S\u01b0u T\u1eadp \u1ea2nh"` (or "Th\u01b0 Vi\u1ec7n \u1ea2nh")
2. Update `navbar-client.tsx`:
   - Add `{ href: "/gallery", label: t("gallery") || "Gallery" }` to desktop nav array (after history)
   - Add same to mobile nav array
3. Update `sitemap.xml/route.ts` -- add `/gallery` entry
4. Set `export const revalidate = 86400` or `force-static` in page.tsx
5. Verify `loading.tsx` skeleton shows during navigation
6. Test:
   - Desktop nav: Gallery link appears, active underline works
   - Mobile nav: Gallery link in sheet
   - Lightbox: keyboard arrows, Escape, zoom work
   - Images: lazy load, no layout shift (aspect-square)
   - SEO: meta title/description render correctly

## Todo

- [ ] Add nav i18n keys
- [ ] Update navbar-client.tsx (desktop + mobile)
- [ ] Update sitemap
- [ ] Set page caching
- [ ] Manual QA: responsive, lightbox, keyboard nav
- [ ] Verify `npm run build` passes

## Success Criteria

- Gallery link visible in navbar (desktop + mobile)
- Active state underline on `/gallery` route
- Sitemap includes `/gallery`
- Page builds statically or with ISR
- Lighthouse: no CLS issues, images lazy-loaded
- Full keyboard accessibility in lightbox

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Navbar crowding with new link | Low | 7 links is reasonable; test at narrow desktop (768px) |
| Build failure from i18n key mismatch | Medium | Add keys to both en.json and vi.json simultaneously |

## Security Considerations

- No new API endpoints exposed
- No user data processed
- Static content only

## Unresolved Questions

1. **Navbar placement**: Should Gallery go between "The Club" and "About", or replace/nest under "The Club" (since History already has a Gallery tab)?
   - Recommendation: separate top-level link for discoverability, but consider whether both galleries (Anfield photos + Unsplash curated) should coexist or if this replaces the History Gallery tab
2. **Category naming**: "Fan Art" was mentioned in requirements but Unsplash may not have fan art (user-generated). Changed to "Fans" (fan photos at Anfield). Confirm with stakeholder.
3. **i18n for image alt text**: Should gallery.json have locale variants (gallery.vi.json) like trophies.json? Or keep English-only alt text?
