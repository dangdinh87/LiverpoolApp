# Pinterest API & Image Search Research
**Date:** 2026-03-14 | **Scope:** Liverpool FC gallery feasibility (20-50 curated images)

---

## Executive Summary

**Verdict: Pinterest API is NOT recommended for your use case.** It offers no public search endpoint, requires business approval, and prohibits displaying images in third-party apps without copyright holder permission. **Recommended alternatives: Unsplash API (best), Pexels API (excellent), or manual curation + static hosting.**

---

## 1. Pinterest API v5 Availability

### Search API Status
- **PUBLIC SEARCH API: NOT AVAILABLE**
  - V5 has a `search_partner_pins` endpoint, but it's **NOT for public keyword search**
  - This endpoint is limited to business partners and specific use cases
  - Developer community confirms: "Search is not publicly exposed" (per Pinterest Business Community forums)

### What V5 Actually Offers
- User authentication & profile management
- Pin creation/updating (requires user authorization)
- Board operations
- Analytics & insights
- Conversion tracking
- **NO general keyword search for discovering pins**

### Practical Impact
❌ Cannot build "search Liverpool FC wallpapers" feature
❌ Cannot bulk-import pins via API search
❌ Cannot programmatically discover new content

---

## 2. Authentication Requirements

### OAuth 2.0 Flow Required
If you wanted to use Pinterest's limited endpoints:

1. **Register your app** at developers.pinterest.com
2. **OAuth 2.0 flow:**
   - Redirect user to Pinterest auth
   - User grants permission
   - Receive access token + refresh token
   - Token valid for extended period (refresh supported)
3. **Keep secrets secure** (app secret, tokens out of code)

### Barrier to Entry
- Requires business account approval (not trivial)
- Approval process can take time
- Intended for business/merchant integrations, not public image galleries

---

## 3. Rate Limits & Pricing

### Free Tier
- **Rate limits:** Published docs exist at `developers.pinterest.com/docs/reference/rate-limits/` but specifics not publicly detailed
- **Pricing model:** Freemium structure, but API is primarily for business/advertiser integrations
- **Hidden cost:** Requires approval process (time investment)

### Reality Check
- Not designed for "image gallery" use cases
- Oriented toward merchants, advertisers, content creators managing their own pins
- Rate limits likely insufficient for gallery refresh operations without explicit approval

---

## 4. Terms of Service: Copyright & Display

### Critical Issue: Cannot Display Pinterest Images

**From Pinterest ToS & Community Guidelines:**
- Pinterest images are **user-uploaded copyrighted content**
- Original creators own exclusive rights
- Using images in third-party apps **violates ToS** unless you have explicit copyright holder permission
- Pinterest is a "mood board" — images belong to original creators

### Legal Reality
❌ Cannot legally scrape/display Pinterest images in your app
❌ No licensing agreement with original photographers
❌ Each image would need individual copyright clearance

**This is a showstopper for image gallery use.**

---

## 5. Recommended Alternatives

### ⭐ **#1: Unsplash API** (BEST FOR YOUR USE CASE)

**Why it's perfect:**
- ✅ Free high-quality HD photos (5M+ library)
- ✅ Public search API with keyword support
- ✅ **Free licensing:** CC0 (public domain equivalent) — no attribution required
- ✅ Commercial use explicitly allowed
- ✅ Can legally display in apps

**Rate Limits:**
- Demo: 50 req/hour
- Production (approved): 5,000 req/hour
- **Completely free tier exists**

**Liverpool FC Content:**
- 76+ Liverpool FC images available
- High quality, curated

**Code Example:**
```typescript
// Search Liverpool FC images
const response = await fetch(
  `https://api.unsplash.com/search/photos?query=liverpool+fc&client_id=YOUR_KEY&per_page=20`
);
const { results } = await response.json();
```

**Setup:**
1. Register at `unsplash.com/developers`
2. Create app → get `Access Key`
3. Start building (no approval wait)

---

### ⭐ **#2: Pexels API** (EXCELLENT ALTERNATIVE)

**Comparable to Unsplash:**
- ✅ Free, high-quality stock photos
- ✅ Public search API
- ✅ **Free license:** CC0 — commercial use OK, no attribution needed
- ✅ Fast, reliable

**Rate Limits:**
- 200 req/hour, 20k req/month (free tier)
- Can request unlimited access

**Liverpool FC:**
- Check availability for niche sports queries

**Setup:**
1. Visit `pexels.com/api`
2. Get API key (instant)
3. Start using

---

### ⭐ **#3: Flickr API** (LIMITED — REQUIRES PRO)

**Status in 2025:**
- ❌ API keys now **require Flickr Pro subscription** (changed recently)
- ✅ Public domain pool exists (`flickr.com/groups/publicdomain/`)
- ❌ Download restrictions for free users (< 1024px)
- ⚠️ Not viable unless you pay for Pro

---

### ❌ **Google Custom Search API** (NOT RECOMMENDED)

**Why it fails:**
- ❌ Closed to new customers (sunsetting Jan 1, 2027)
- ❌ Free tier: only 100 queries/day (too low)
- ❌ Paid tier required for real use
- ❌ Overkill for your use case

---

## 6. Practical Implementation Strategy

### Option A: Unsplash API (Recommended)
**For dynamic, keyword-searchable gallery:**

```typescript
// pages/api/gallery.ts
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const query = new URL(req.url).searchParams.get('q') || 'liverpool fc';

  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${query}&per_page=30&client_id=${process.env.UNSPLASH_ACCESS_KEY}`
  );

  const data = await res.json();
  return NextResponse.json(data.results.map(photo => ({
    id: photo.id,
    url: photo.urls.regular,
    author: photo.user.name,
    downloadUrl: photo.links.download,
    description: photo.description
  })));
}
```

**Pros:** Live search, always fresh, legally compliant
**Cons:** Dependent on external API, may show non-Liverpool images for broad searches

---

### Option B: Static Curated Gallery (Simplest)
**For 20-50 hand-picked Liverpool FC images:**

1. Manually curate 30-40 best Liverpool FC images from Unsplash (via web UI)
2. Download originals + store in `/public/images/gallery/`
3. Create static JSON manifest with metadata:

```json
[
  {
    "id": "1",
    "src": "/images/gallery/anfield-1.jpg",
    "title": "Anfield Stadium",
    "photographer": "John Smith",
    "unsplashUrl": "https://unsplash.com/photos/...",
    "license": "Unsplash License (CC0)"
  }
]
```

4. Render from JSON (zero runtime API calls, fast, reliable)

**Pros:** Zero API dependencies, fast, full control, legally clean (Unsplash CC0)
**Cons:** Manual curation, static (requires redeploy to update)

---

### Option C: Hybrid (Best UX + Performance)
1. **Static gallery:** 30-50 hand-picked Liverpool images (curated from Unsplash)
2. **Dynamic search:** Unsplash API search bar for users to explore beyond curated set
3. **Caching:** Cache search results via Supabase/Redis

---

## Implementation Comparison

| Feature | Unsplash API | Pexels API | Pinterest | Static JSON | Flickr |
|---------|------------|-----------|----------|-------------|--------|
| **Search API** | ✅ Yes | ✅ Yes | ❌ No | N/A | ⚠️ Pro only |
| **Free Tier** | ✅ Full | ✅ Full | ❌ Limited | ✅ Yes | ❌ Pro |
| **Legal Display** | ✅ CC0 | ✅ CC0 | ❌ Copyright issues | ✅ Yes | ✅ If CC0 |
| **Setup Time** | 5 min | 5 min | Days (approval) | 1 hour (curation) | N/A |
| **Live Updates** | ✅ Yes | ✅ Yes | N/A | ❌ Manual | ❌ Manual |
| **Rate Limits** | 5k/hour (free) | 200/hour | Unknown | ∞ | ❌ Requires $ |
| **Viability Score** | 10/10 | 9/10 | 1/10 | 8/10 | 3/10 |

---

## Recommendations

### For Your Liverpool App

**Short Term (MVP, 1 week):**
1. **Go with Static Curated Gallery** (Option B)
   - Manually select 30-40 best Liverpool images from Unsplash web UI
   - Download originals → store in `/public/images/gallery/`
   - Create `lib/galleryData.ts` with JSON manifest
   - Build `/gallery` page component to render them
   - **Time:** ~2 hours curation + 1 hour coding
   - **Cost:** $0
   - **Compliance:** ✅ Unsplash CC0 License

**Medium Term (1-2 months):**
2. **Add Unsplash API search** (Option C)
   - Add `/api/search/images` endpoint
   - Create "Explore More" section with search bar
   - Keep static curated gallery as homepage hero
   - **Improves UX** without breaking static-first approach

**Long Term:**
3. **Monitor user behavior** — if gallery becomes central feature, consider full dynamic approach

---

## Code Snippet: Start Here

```typescript
// lib/galleryData.ts
export const liverpoolGallery = [
  {
    id: 'anfield-1',
    src: '/images/gallery/anfield-aerial.jpg',
    alt: 'Anfield Stadium aerial view',
    title: 'Anfield Home',
    photographer: 'John Smith',
    unsplashUrl: 'https://unsplash.com/photos/...',
    license: 'Unsplash License (CC0 - Free for commercial use)'
  },
  // ... 30-50 more images
];

// pages/gallery.tsx
import { liverpoolGallery } from '@/lib/galleryData';
import Image from 'next/image';

export default function Gallery() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {liverpoolGallery.map(img => (
        <div key={img.id} className="relative group">
          <Image
            src={img.src}
            alt={img.alt}
            width={300}
            height={300}
            className="object-cover rounded-lg"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition">
            <p className="text-white text-sm p-2">{img.title}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## Unresolved Questions

1. **Liverpool FC official image partnerships?** — Worth checking if LFC has deals with photo agencies (Getty, AFP) for official content
2. **User-generated content?** — Could you let users upload their own Liverpool FC photos? (Moderation needed)
3. **Budget for premium images?** — Could Shutterstock/Getty be justified for official merch/commercial use?

---

## Sources

- [Pinterest API v5 Documentation](https://developers.pinterest.com/docs/api/v5/)
- [Pinterest Search Endpoint](https://developers.pinterest.com/docs/api/v5/search_partner_pins/)
- [Pinterest Terms of Service](https://policy.pinterest.com/en/terms-of-service)
- [Unsplash API Documentation](https://unsplash.com/documentation)
- [Unsplash Developers](https://unsplash.com/developers)
- [Pexels API](https://www.pexels.com/api/)
- [Pexels License](https://www.pexels.com/license/)
- [Flickr API Status 2025](https://www.flickr.com/services/api/)
- [Google Custom Search API Sunsetting](https://developers.google.com/custom-search/v1/overview)
- [Liverpool FC Images on Unsplash](https://unsplash.com/s/photos/liverpool-fc)
