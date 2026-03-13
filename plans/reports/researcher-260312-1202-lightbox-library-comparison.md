# Lightbox Library Comparison: Next.js 15 + TypeScript + Tailwind

## Recommendation: **Yet Another React Lightbox (YARL)**

**Why YARL wins:**
- **Bundle size:** ~5KB gzipped (smallest core, optional plugins = no bloat)
- **Next.js native:** Designed for `next/image` + `next/dynamic` import support for code splitting
- **TypeScript:** Full first-class support
- **Keyboard/swipe/zoom:** All built-in; customizable
- **DRY advantage:** Minimal custom code needed vs. Framer Motion DIY approach
- **Integration:** Seamless with Tailwind/shadcn/ui ecosystem

---

## Library Breakdown

| Feature | YARL | PhotoSwipe 5 | Custom Framer Motion |
|---------|------|-------------|----------------------|
| Bundle (gzip) | ~5KB | ~10-15KB (core separable) | 0KB (already installed) |
| Next.js Image compat | Native | Requires wrapper | Manual setup |
| Keyboard (arrow/esc) | ✓ | ✓ | Build yourself |
| Swipe/touch | ✓ | ✓ | Build yourself |
| Zoom (pinch/double-tap) | ✓ | ✓ | Build yourself |
| Plugin ecosystem | Rich | Limited | N/A |
| Setup complexity | ~15min | ~30min | 2-3hrs minimum |
| Tailwind theming | ✓ | Partial | ✓ |

**PhotoSwipe 5:** Good alternative but heavier, less Next.js-optimized, requires separate JS file loading.

**Framer Motion DIY:** DON'T use unless zero-dependency is critical. Reinventing zoom logic, keyboard traps, accessibility = scope creep.

---

## Integration Pattern

```bash
npm install yet-another-react-lightbox
```

**Minimal setup (10 lines):**

```tsx
'use client';
import { useState } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';

export default function Gallery({ images }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  return (
    <>
      <button onClick={() => setOpen(true)}>View</button>
      <Lightbox
        open={open}
        close={() => setOpen(false)}
        slides={images.map(img => ({ src: img.src, alt: img.alt }))}
        index={index}
        onIndexChange={setIndex}
      />
    </>
  );
}
```

**Tailwind override (optional):**
Add to `globals.css` to match stadium theme:
```css
.yarl__root { --yarl-bg: #0D0D0D; --yarl-color: #F6EB61; }
```

---

## Next.js Image Integration

For optimized images, use Next.js Image component and pass `{src, width, height}` to YARL:

```tsx
import Image from 'next/image';

// Generate slides array
const slides = images.map(img => ({
  src: img.src,
  width: img.width,
  height: img.height,
  srcSet: [{src: img.src, width: img.width}]
}));
```

YARL respects aspect ratios; no dimension preset required (unlike PhotoSwipe).

---

## Decision Matrix

✅ **Choose YARL if:**
- Bundle size matters (stadium app loading on 4G)
- Want minimal custom code (DRY principle)
- Need quick iteration (shadcn/ui parity)
- Keyboard/swipe/zoom OOTB required

⚠️ **Choose PhotoSwipe if:**
- Already invested in PhotoSwipe for other projects
- Need advanced UI customization (rare)

❌ **Avoid custom Framer Motion unless:**
- Zero external dependency constraint (not your case)

---

## Unresolved Questions
- Will you need video lightbox in future? (YARL has plugin; PhotoSwipe doesn't OOB)
- Target devices (touch-heavy = swipe more important)?

---

## Sources
- [Yet Another React Lightbox – Official](https://yet-another-react-lightbox.com/)
- [Yet Another React Lightbox – Next.js Example](https://yet-another-react-lightbox.com/examples/nextjs)
- [Yet Another React Lightbox – Documentation](https://yet-another-react-lightbox.com/documentation)
- [Yet Another React Lightbox – GitHub](https://github.com/igordanchenko/yet-another-react-lightbox)
- [PhotoSwipe 5 – Getting Started](https://photoswipe.com/getting-started/)
- [PhotoSwipe – Zoom Level Documentation](https://photoswipe.com/adjusting-zoom-level/)
- [PhotoSwipe – Click and Tap Actions](https://photoswipe.com/click-and-tap-actions/)
- [Comparing the Top 3 React Lightbox Libraries – LogRocket](https://blog.logrocket.com/comparing-the-top-3-react-lightbox-libraries/)
- [Framer Motion – Complete React & Next.js Guide 2026](https://inhaq.com/blog/framer-motion-complete-guide-react-nextjs-developers)
