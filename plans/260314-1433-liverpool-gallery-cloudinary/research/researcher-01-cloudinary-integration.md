---
title: "Cloudinary Integration with Next.js App Router"
type: research
date: 2026-03-14
---

## Executive Summary

Cloudinary provides a flexible, free-tier-friendly solution for gallery management. Free plan offers 25 monthly credits (equivalent to 25,000 transformations, 25GB storage, OR 25GB bandwidth—mix/match as needed). Critical: exceeding 25 credits = account suspension (no overage billing). Best approach for ~200 images: combine folders (organization + SEO) + tags (API retrieval). Use Node.js SDK v2 for server uploads, CldUploadWidget for admin uploads.

---

## 1. Cloudinary Node.js SDK v2 (Server-Side Uploads)

### Setup
- Import v2 as `cloudinary`, configure with `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- Create config file in project root, export for reuse across app
- Use with Next.js Server Actions (`"use server"` directive)

### Upload Method
```
cloudinary.uploader.upload(buffer/base64, {
  folder: "gallery/category",
  tags: ["category", "tag"],
  resource_type: "auto",
  transformation: {...}
})
```

### Process Flow (Server Action)
1. Receive file from form data
2. Convert to buffer/Base64 string
3. Call `cloudinary.uploader.upload()`
4. Return optimized URL with transformations

### Key Features
- Folder support for organization (e.g., `gallery/anfield-moments`, `gallery/legends`)
- Tags for retrieval via API
- Automatic transformations during upload
- Returns public URL + secure metadata

---

## 2. CldUploadWidget (Client Admin Uploads)

### Two Approaches

**Unsigned Uploads (Simple)**
- Enable unsigned uploads in Cloudinary console
- Provide `uploadPreset` to component
- Minimal security, useful for trusted admins

**Signed Uploads (Secure)**
- Create server endpoint returning signed request
- Pass `signatureEndpoint` to widget
- Server validates + signs requests before upload
- **Recommended** for production

### Configuration Example
```javascript
<CldUploadWidget
  uploadPreset="YOUR_PRESET"
  // OR
  signatureEndpoint="/api/sign-upload"
  options={{
    folder: "gallery",
    tags: ["admin-upload"],
    multiple: true,
    maxFiles: 50
  }}
  onSuccess={handleUploadSuccess}
/>
```

### Event Handling
- `onSuccess` callback: fires on upload completion, receives results
- Access uploaded URL, public_id, transformation info
- Can trigger DB updates or cache invalidation

### Directive
- Add `"use client"` at top (client component)
- Supported in Next.js 13+ App Router

---

## 3. URL Transformations

### Auto-Format & Quality
- `f_auto`: Deliver optimal format (WebP/AVIF/PNG) for browser
- `q_auto`: Smart quality selection (q_auto:good balance)
  - `q_auto:eco`: Aggressive (smaller file, lower quality)
  - `q_auto:best`: Conservative (larger file, better quality)

### Responsive Images
- `w_auto`: Responsive width (must be in delivery URL, not named transforms)
- Step sizing: `w_auto:breakpoints_200_1600_100` (200-1600px, 100px steps)

### Blur Placeholders (LQIP)
- `w_100/e_blur:1000,q_auto,f_webp`: Low-quality blur
- Reduce size (w_100) + reduce quality + force WebP format
- ~2-5KB for placeholders vs ~50-200KB full image

### Common Transform Chain
```
/c_fill,w_800,h_600,q_auto,f_auto/gallery/image.jpg
```

---

## 4. Free Tier Limits

### Monthly Credit System
- **25 credits/month** (account suspension if exceeded, no overage billing)
- **1 credit = 1,000 transformations OR 1GB storage OR 1GB bandwidth**
- Mix/match allocation (e.g., 5 transforms + 10GB storage + 10GB bandwidth)

### Practical Calculations
- ~200 images × 5KB placeholder = 1GB storage
- ~200 full images × 100KB = 20GB storage (exceeds free tier)
- Transformations: ~200 images × 10 transform variants = 2,000 transforms/month
- **Verdict**: Free tier supports 200 images with responsible transform usage + CloudFront CDN caching

### Recommendation
- Use free tier for dev/low-traffic scenarios
- For production gallery, budget $25-75/month (Pro/Plus plan)

---

## 5. Best Practices for ~200 Images

### Folder Structure
```
gallery/
  ├── anfield-moments/
  ├── legends/
  ├── trophies/
  └── historic-moments/
```
- Folders enable permission control + SEO-friendly URLs
- Comfortable Media Library navigation
- No performance degradation with deep nesting

### Tags Strategy
```
cloudinary.uploader.upload(file, {
  folder: "gallery/anfield-moments",
  tags: ["anfield", "stadium", "2024", "iconic"]
})
```
- Tags enable API filtering: `cloudinary.api.resources_by_tag("iconic")`
- Complementary to folders (not either/or)
- Improves searchability without folder proliferation

### Naming Convention
- `YYYYMMDD-descriptive-name.jpg` (supports sorting, reduces collisions)
- Alt: `category-001-name.jpg` (explicit numbering for display order)

### Collections (Optional)
- Group images from different folders for campaigns/events
- Useful for curated galleries (e.g., "Top 20 Moments")
- No performance impact, can be deleted without affecting assets

### Avoid
- Storing metadata in public_id (use DB + tags instead)
- Creating 100+ top-level folders (use subcategories)
- Relying on folder paths in URLs (fragile, use public_id + CDN caching)

---

## Implementation Checklist

- [ ] Create Cloudinary account, get cloud_name + API keys
- [ ] Install `cloudinary` npm package
- [ ] Create server config file, import into Server Actions
- [ ] Build Server Action for file upload (signed or unsigned)
- [ ] Create CldUploadWidget admin component
- [ ] Add transformation presets (blur, responsive, format)
- [ ] Set up folder structure (4-6 categories max)
- [ ] Tag strategy: minimum 2-3 tags per upload
- [ ] Test with 10 images, verify storage/bandwidth usage
- [ ] Set up Supabase table to track gallery metadata (public_id, tags, folder, created_at)
- [ ] Monitor monthly credits (check dashboard weekly)

---

## Unresolved Questions

- How to handle real-time sync between Supabase metadata + Cloudinary asset updates?
- Should admin upload endpoint be protected by role-based auth (admin-only) or API key auth?
- Best CDN caching strategy for transformed URLs (ETags, Cache-Control headers)?

---

## Sources

- [How to Use Next.js and Cloudinary to Upload, Transform, and Moderate Your Images](https://cloudinary.com/blog/next-js-cloudinary-upload-transform-moderate-images)
- [How to Upload Image to Cloudinary NextJS Using NextJS App Router](https://cloudinary.com/blog/cloudinary-image-uploads-using-nextjs-app-router)
- [Uploading Images and Videos to Cloudinary Using Next.js Server-Side, Multer, and Xata Database](https://cloudinary.com/blog/uploading-images-videos-next-js-server-side-multer-xata)
- [Upload Assets With Server Actions in a Next.js App (Video Tutorial)](https://cloudinary.com/documentation/upload_assets_with_server_actions_nextjs_tutorial)
- [Node.js SDK – Node.js Upload + Image, Video Transformations](https://cloudinary.com/documentation/node_integration)
- [CldUploadWidget Configuration - Next Cloudinary](https://next.cloudinary.dev/clduploadwidget/configuration)
- [Getting Started with CldUploadWidget - Next Cloudinary](https://next.cloudinary.dev/clduploadwidget/basic-usage)
- [Upload Widget Documentation](https://cloudinary.com/documentation/upload_widget)
- [Image Transformations for Developers](https://cloudinary.com/documentation/image_transformations)
- [Transformation URL API Reference](https://cloudinary.com/documentation/transformation_reference)
- [Image Optimization](https://cloudinary.com/documentation/image_optimization)
- [Low Quality Image Placeholders (LQIP) Explained](https://cloudinary.com/blog/low_quality_image_placeholders_lqip_explained)
- [Blurred image placeholder with Next.js image and Cloudinary](https://dev.to/nicolaserny/blurred-image-placeholder-with-nextjs-image-and-cloudinary-4dhm)
- [Cloudinary Pricing Plans](https://cloudinary.com/pricing)
- [Cloudinary Pricing & Plans (March 2026)](https://www.saasworthy.com/product/cloudinary/pricing)
- [Cloudinary's Free Plan: What You Get and Where the Limits Lie](https://www.oreateai.com/blog/cloudinarys-free-plan-what-you-get-and-where-the-limits-lie-eda96a8da7df5fdb8a5c413a2cab5f84)
- [How does Cloudinary count my plan's quotas](https://support.cloudinary.com/hc/en-us/articles/203125631-How-does-Cloudinary-count-my-plan-s-quotas-and-what-does-every-quota-mean)
- [Assets (Digital Asset Management) - Organizing and Sharing Assets using Folders and Collections](https://cloudinary.com/documentation/dam_folders_collections_sharing)
- [Folder Modes](https://cloudinary.com/documentation/folder_modes)
- [Tags vs Folders - Cloudinary Support](https://support.cloudinary.com/hc/en-us/community/posts/201388322-tags-vs-folders-)
- [Best Image Organizing Tools in 2026](https://cloudinary.com/guides/image-effects/image-organizer)
- [Asset structure - Folders (Video Tutorial)](https://cloudinary.com/documentation/assets_onboarding_folders_tutorial)
- [How to Use Collections to Organize Your Assets](https://support.cloudinary.com/hc/en-us/articles/360011372060-How-to-Use-Collections-to-Organize-Your-Assets)
