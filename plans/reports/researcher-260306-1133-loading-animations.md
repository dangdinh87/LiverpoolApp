# Research Report: Premium Loading Screen Animations 2025–2026
**Date:** 2026-03-06
**Context:** Liverpool FC fan site — React 19 + Framer Motion 12 + Tailwind CSS v4 + Next.js 16
**Theme:** `#0D0D0D` bg · `#C8102E` red · `#F6EB61` gold
**Existing loader:** `src/components/ui/lfc-loader.tsx` (crest flip-in + light beams + pulsing dots)

---

## Executive Summary

The current `LfcLoader` is solid but uses a "logo bounce + dots" pattern that's circa-2022. The 2025 frontier has moved to **sequential scene-building** — each frame of a loading screen tells part of a story. Five techniques stand out as implementable with pure CSS + Framer Motion (no canvas/WebGL), ranked by visual impact and brand fit for LFC:

1. **SVG Stroke Path Draw** — progressively draw the LFC crest or "YNWA" text
2. **Cinematic Curtain Split** — two panels slide apart to reveal content (stadium walk-out metaphor)
3. **Scan-Line / Data Reveal** — horizontal red line sweeps top→bottom revealing content row by row
4. **Staggered Letter Assembly** — "LIVERPOOL" shatters in from random positions with spring physics
5. **Aurora Gradient Pulse** — animated conic-gradient mesh breathing behind the crest

Current loader already does #3 partially (light beams) and none of the others. All 5 can compose together or be used independently.

---

## Technique 1: SVG Stroke Path Draw (HIGHEST IMPACT)

**What:** Animate `stroke-dashoffset` from full path length → 0, making a shape appear to be drawn by an invisible pen. Use on a simplified LFC crest outline or "YNWA" lettering.

**Why it's elite:** Used by Apple keynote intros, F1, and premium sports brands. Feels hand-crafted. Works perfectly with red `#C8102E` stroke on dark background.

**Core CSS Keyframe Pattern:**
```css
/* In globals.css */
@keyframes draw-path {
  from { stroke-dashoffset: var(--path-length); }
  to   { stroke-dashoffset: 0; }
}

.svg-draw {
  stroke-dasharray: var(--path-length);
  stroke-dashoffset: var(--path-length);
  animation: draw-path 1.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}
```

**Framer Motion Implementation:**
```tsx
// components/ui/svg-draw-loader.tsx
"use client";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useRef } from "react";

// Simplified LFC shield outline (approximate — replace with real SVG path)
const SHIELD_PATH = "M50,5 L95,20 L95,55 C95,78 75,95 50,100 C25,95 5,78 5,55 L5,20 Z";
const LIVER_BIRD_PATH = "M50,25 C45,20 38,22 36,28 C33,34 37,40 42,38 C38,44 40,52 50,55 C60,52 62,44 58,38 C63,40 67,34 64,28 C62,22 55,20 50,25 Z";

export function SvgDrawLoader({ onComplete }: { onComplete?: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stadium-bg">
      <svg width="120" height="120" viewBox="0 0 100 110" fill="none">
        {/* Shield outline — draws first */}
        <motion.path
          d={SHIELD_PATH}
          stroke="#C8102E"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.6, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
        />
        {/* Inner bird — draws second */}
        <motion.path
          d={LIVER_BIRD_PATH}
          stroke="#F6EB61"
          strokeWidth="1.5"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: "easeInOut", delay: 1.2 }}
          onAnimationComplete={onComplete}
        />
      </svg>
    </div>
  );
}
```

**Key: Framer Motion's `pathLength` prop** (0→1) is the modern way — no manual `stroke-dashoffset` calculation needed. It auto-computes path length via `getTotalLength()`.

**Performance:** GPU-accelerated (SVG transforms). No layout reflows. ✅
**Complexity:** 2/5
**Timing:** Total ~2.8s. Shield draws (1.6s) then bird fills in (1.2s, overlap from 1.2s mark).

**Enhancement — fill fade after draw:**
```tsx
// After pathLength hits 1, fill the shape
<motion.path
  d={SHIELD_PATH}
  fill="#C8102E"
  fillOpacity={0}
  animate={{ fillOpacity: [0, 0, 0.15] }}  // keyframe: hold at 0 until draw done
  transition={{ duration: 2.5, times: [0, 0.7, 1] }}
/>
```

---

## Technique 2: Cinematic Curtain Split (MOST LFC-RELEVANT)

**What:** Screen starts as two red panels covering left/right halves. They slide away (like stadium tunnel doors opening) to reveal the page behind. Metaphor: walking out of the tunnel at Anfield.

**Why it's elite:** Used in Juventus, Real Madrid official sites. The "tunnel walk" maps perfectly to LFC narrative. Zero lag because content renders behind the curtain simultaneously.

**Framer Motion Implementation:**
```tsx
// components/ui/curtain-loader.tsx
"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

const panelVariants = {
  initial: { scaleX: 1 },
  exit: (direction: "left" | "right") => ({
    scaleX: 0,
    transition: {
      duration: 0.9,
      ease: [0.76, 0, 0.24, 1],  // dramatic ease-in-out
      delay: 0.3,
    },
  }),
};

export function CurtainLoader({
  isReady,
  children,
}: {
  isReady: boolean;
  children: React.ReactNode;
}) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (isReady) {
      const t = setTimeout(() => setShow(false), 400); // brief hold after ready
      return () => clearTimeout(t);
    }
  }, [isReady]);

  return (
    <div className="relative overflow-hidden">
      {children}
      <AnimatePresence>
        {show && (
          <>
            {/* Left curtain — origin right edge */}
            <motion.div
              key="left"
              className="fixed inset-y-0 left-0 w-1/2 z-50 bg-lfc-red origin-right flex items-center justify-end pr-2"
              variants={panelVariants}
              initial="initial"
              exit="exit"
              custom="left"
            >
              {/* Optional: white stripe on inner edge */}
              <div className="w-[3px] h-full bg-white/20" />
            </motion.div>

            {/* Right curtain — origin left edge */}
            <motion.div
              key="right"
              className="fixed inset-y-0 right-0 w-1/2 z-50 bg-lfc-red origin-left flex items-center justify-start pl-2"
              variants={panelVariants}
              initial="initial"
              exit="exit"
              custom="right"
            >
              <div className="w-[3px] h-full bg-white/20" />
            </motion.div>

            {/* Center LFC crest — visible while curtains are closed */}
            <motion.div
              key="crest"
              className="fixed inset-0 z-[51] flex items-center justify-center pointer-events-none"
              exit={{ opacity: 0, transition: { duration: 0.3 } }}
            >
              <motion.p
                className="font-bebas text-6xl text-white tracking-[0.2em]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                LFC
              </motion.p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
```

**Usage in layout or page:**
```tsx
// app/layout.tsx or specific pages
<CurtainLoader isReady={dataLoaded}>
  <PageContent />
</CurtainLoader>
```

**Variant — vertical split (top/bottom, like pitch opening):**
```tsx
// Top panel: origin bottom, exits upward
// Bottom panel: origin top, exits downward
// scaleY: 0 instead of scaleX: 0
// Add `perspective` and slight `rotateX` for 3D feel
```

**Performance:** Two `div` elements, CSS transform only. ✅
**Complexity:** 2/5

---

## Technique 3: Scan-Line Reveal (DATA SCAN / TACTICAL BOARD)

**What:** A single horizontal red line sweeps top→bottom. Everything above the line is visible; below is dark/hidden. Feels like a radar scan or tactical board loading. Very unique for a sports site.

**Framer Motion Implementation:**
```tsx
// components/ui/scan-reveal.tsx
"use client";
import { motion, useScroll } from "framer-motion";

export function ScanReveal({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden">
      {/* Actual content — revealed by clip path */}
      <motion.div
        initial={{ clipPath: "inset(0 0 100% 0)" }}
        animate={{ clipPath: "inset(0 0 0% 0)" }}
        transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1], delay: 0.5 }}
      >
        {children}
      </motion.div>

      {/* Scan line overlay */}
      <motion.div
        className="absolute left-0 right-0 h-[2px] bg-lfc-red pointer-events-none z-10"
        style={{
          boxShadow: "0 0 20px 4px rgba(200,16,46,0.8), 0 0 60px 8px rgba(200,16,46,0.3)",
        }}
        initial={{ top: "0%" }}
        animate={{ top: "100%" }}
        transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1], delay: 0.5 }}
      />
    </div>
  );
}
```

**Enhancement — text character scramble during scan:**
```tsx
// Each text element scrambles random chars, then resolves to real text as scan line passes
// Requires a custom hook: useScrambleText()
// Pattern: setInterval replacing chars with random ASCII, stop when scan line passes element's y
```

**Performance:** `clipPath` is GPU-accelerated in Chrome/Safari. ✅
**Complexity:** 2/5
**Browser compat:** All modern browsers. `clip-path` has full support.

---

## Technique 4: Staggered Letter Assembly with Spring Physics

**What:** "LIVERPOOL" or "YNWA" letters fly in from random positions/rotations with spring physics, assemble into the word. Letters can come from all directions simultaneously like a puzzle solving itself.

**Why it's 2025:** Spring-based motion (not easing curves) feels organic. Framer Motion's spring system makes this trivial. Used heavily in FIFA / EA Sports FC UI in 2024.

**Framer Motion Implementation:**
```tsx
// components/ui/letter-assembly.tsx
"use client";
import { motion } from "framer-motion";

const WORD = "LIVERPOOL";

// Random starting positions — pre-computed for SSR safety
const RANDOM_ORIGINS = [
  { x: -300, y: -200, rotate: -45 },
  { x: 250, y: -150, rotate: 30 },
  { x: -180, y: 300, rotate: -20 },
  { x: 200, y: 200, rotate: 60 },
  { x: -250, y: 100, rotate: -90 },
  { x: 300, y: -100, rotate: 45 },
  { x: -100, y: -300, rotate: -30 },
  { x: 150, y: 250, rotate: 80 },
  { x: -200, y: -100, rotate: 15 },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
};

const letterVariants = (origin: { x: number; y: number; rotate: number }) => ({
  hidden: {
    x: origin.x,
    y: origin.y,
    rotate: origin.rotate,
    opacity: 0,
    scale: 0.3,
  },
  visible: {
    x: 0,
    y: 0,
    rotate: 0,
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 120,
      damping: 14,
      mass: 0.8,
    },
  },
});

export function LetterAssembly({ onComplete }: { onComplete?: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stadium-bg">
      <motion.div
        className="flex items-baseline gap-0"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        onAnimationComplete={onComplete}
      >
        {WORD.split("").map((char, i) => (
          <motion.span
            key={i}
            className="font-bebas text-[12vw] leading-none text-white"
            style={{
              // Alternating red/white for visual rhythm
              color: i === 0 || i === 5 ? "#C8102E" : "white",
              textShadow: "0 0 40px rgba(200,16,46,0.4)",
            }}
            variants={letterVariants(RANDOM_ORIGINS[i])}
          >
            {char}
          </motion.span>
        ))}
      </motion.div>

      {/* Gold underline draws in after letters assemble */}
      <motion.div
        className="absolute h-[3px] bg-gradient-to-r from-transparent via-lfc-gold to-transparent"
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: "60vw", opacity: 1 }}
        transition={{ delay: 1.0, duration: 0.8, ease: "easeOut" }}
        style={{ top: "58%" }}
      />
    </div>
  );
}
```

**Key parameters:**
- `stiffness: 120` — snappy but not rigid
- `damping: 14` — slight overshoot (bounces once)
- `mass: 0.8` — lighter letters = faster settle
- `staggerChildren: 0.06` — 60ms between each letter start

**Performance:** All transforms. ✅
**Complexity:** 2/5

---

## Technique 5: Aurora / Conic-Gradient Mesh Animation

**What:** Animated `conic-gradient` or `radial-gradient` blobs that shift position/hue slowly behind the crest. The "aurora borealis" look — but in LFC red/gold. No canvas, pure CSS `@keyframes` on `background-position`.

**Why it's 2025:** Apple.com uses this for Apple Intelligence promos. Vercel's new dashboard uses it. It adds depth without weight.

**CSS Implementation (goes in globals.css):**
```css
@keyframes aurora-shift {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes blob-move {
  0%   { transform: translate(0, 0) scale(1); }
  33%  { transform: translate(30px, -20px) scale(1.1); }
  66%  { transform: translate(-20px, 30px) scale(0.95); }
  100% { transform: translate(0, 0) scale(1); }
}

.aurora-bg {
  position: absolute;
  inset: -50%;
  background:
    radial-gradient(ellipse 60% 50% at 20% 40%, rgba(200,16,46,0.4) 0%, transparent 60%),
    radial-gradient(ellipse 50% 60% at 80% 60%, rgba(246,235,97,0.15) 0%, transparent 60%),
    radial-gradient(ellipse 70% 40% at 50% 80%, rgba(200,16,46,0.2) 0%, transparent 60%);
  filter: blur(40px);
  animation: blob-move 8s ease-in-out infinite;
}
```

**React Component:**
```tsx
// components/ui/aurora-background.tsx
export function AuroraBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Primary red blob */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: "60%",
          height: "60%",
          top: "10%",
          left: "-10%",
          background: "radial-gradient(circle, rgba(200,16,46,0.35) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
        animate={{
          x: [0, 40, -20, 0],
          y: [0, -30, 20, 0],
          scale: [1, 1.15, 0.95, 1],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Gold accent blob */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: "40%",
          height: "40%",
          bottom: "5%",
          right: "0%",
          background: "radial-gradient(circle, rgba(246,235,97,0.2) 0%, transparent 70%)",
          filter: "blur(50px)",
        }}
        animate={{
          x: [0, -30, 15, 0],
          y: [0, 20, -25, 0],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
    </div>
  );
}
```

**Performance:** `filter: blur()` can cause GPU layer promotion. Use `will-change: transform` on blob divs. On mobile, reduce blur radius to 30px. ✅
**Complexity:** 1/5 — simplest to add, biggest ambient impact.

---

## Composite: The "Anfield Walk-Out" Full Loader (RECOMMENDED)

Combine techniques for maximum impact. Total duration: ~3.2s.

```
0.0s  Aurora background begins breathing
0.0s  Curtain panels cover screen (red, full-width)
0.2s  SVG crest draws itself on top of curtain
1.8s  Crest draw complete → gold line appears below
2.2s  Curtain panels split apart (tunnel opens)
2.5s  "LIVERPOOL" letters spring-assemble
3.0s  Scan line sweeps page content into view
3.2s  Loading complete, AnimatePresence exits loader
```

**Sequencing with Framer Motion:**
```tsx
// Use `useAnimate()` for imperative sequencing
import { useAnimate } from "framer-motion";

const sequence = [
  ["#svg-crest", { pathLength: 1 }, { duration: 1.6, at: 0.2 }],
  ["#gold-line", { width: 120, opacity: 1 }, { duration: 0.5, at: 1.8 }],
  ["#curtain-left", { scaleX: 0 }, { duration: 0.9, ease: [0.76,0,0.24,1], at: 2.2 }],
  ["#curtain-right", { scaleX: 0 }, { duration: 0.9, ease: [0.76,0,0.24,1], at: 2.2 }],
];
// animate(sequence) from useAnimate hook
```

---

## What Makes a Loading Screen PREMIUM vs Amateur

| Amateur | Premium (2025) |
|---------|---------------|
| Spinner / rotating circle | Sequential scene building |
| Instant logo appear | SVG draw or spring assembly |
| Generic color scheme | Brand color integration in every element |
| Bounce easing (`bounce` keyword) | Custom cubic-bezier or spring physics |
| Single animation layer | 3–4 layered elements (bg + mid + fg) |
| Same animation loop forever | Animation that completes and exits cleanly |
| `opacity: 0 → 1` only | Transform + opacity + clip-path combined |
| Hard cut to page | Transition INTO the page (curtain/scan) |

**The single biggest upgrade from current LfcLoader:** Add the curtain exit transition. Currently the loader just disappears — the curtain split makes the page feel like it's "opening" not just "loading."

---

## Current LfcLoader Assessment

**What works well:**
- `rotateY: 90 → 0` flip-in for crest: genuinely good
- Light beams: atmospheric, brand-appropriate
- Red glow pulse: correct
- Staggered dots: standard but fine

**What to upgrade:**
1. Exit transition — currently hard cuts. Add `AnimatePresence` + curtain exit
2. Light beams are `div` based — could be SVG `line` elements for crisper look
3. No `onComplete` callback — hard to chain with page content reveal
4. YNWA text appears all at once — could stagger word by word

**Minimal high-impact upgrade (2 additions to existing code):**
```tsx
// 1. Wrap FullScreenLoader in AnimatePresence with exit animation
exit={{ opacity: 0, scale: 1.05, transition: { duration: 0.4 } }}

// 2. Before exiting, animate two curtain panels out (add as motion.divs)
// This alone makes it feel 10x more cinematic
```

---

## Performance Reference

| Technique | GPU? | Layout Reflow? | Mobile Safe? |
|-----------|------|---------------|--------------|
| SVG pathLength | Yes | No | Yes |
| Curtain scaleX | Yes | No | Yes |
| clipPath scan | Yes | No | Yes (reduce area) |
| Spring letters | Yes | No | Yes |
| Aurora blobs + blur | Yes | No | Reduce blur on mobile |

**Rule:** Only animate `transform`, `opacity`, `clipPath`. Never animate `width/height/top/left` directly (use `scaleX` instead of `width`, `translateY` instead of `top`).

**Exception in current code:** The red accent line animates `width: 0 → 120` — this IS a layout property. Should be `scaleX: 0 → 1` with `transform-origin: left`.

---

## Framer Motion 12 Specific Notes (Current Version: 12.34.4)

- `pathLength` on SVG paths: works natively, no plugins
- `useAnimate()`: imperative sequencing — best for complex loading choreography
- `AnimatePresence mode="wait"`: ensures exit animation completes before next mounts
- Spring type: `{ type: "spring", visualDuration: 0.5, bounce: 0.2 }` — new API in FM 11+ (more intuitive than stiffness/damping)
- `motion.div` with `layout` prop: smooth layout changes during load transition

---

## Resources

- Framer Motion docs — `pathLength`: https://www.framer.com/motion/motion-value/
- Framer Motion `useAnimate`: https://www.framer.com/motion/use-animate/
- CSS `clip-path` browser support: https://caniuse.com/css-clip-path (97.5% global)
- SVG `getTotalLength()` — how pathLength works under the hood: MDN Web Docs
- CodePen: search "svg stroke animation loader" — community examples
- Awwwards — loading animations section for 2025 inspiration

---

## Unresolved Questions

1. Does the app have an actual LFC crest SVG path (not a `.webp` image)? The SVG draw technique requires a proper SVG with `<path>` elements. Current loader uses `/assets/lfc/crest.webp` — would need a SVG version or a custom abstract shield shape.
2. Where exactly is `LfcLoader` rendered? (In `loading.tsx` files?) — determines whether `AnimatePresence` wrapping should be at layout level or per-page.
3. Should the loading screen appear on every navigation or only on initial app load? Different answer suggests different implementation (route-level `loading.tsx` vs. a top-level `Suspense` wrapper).
4. What is the minimum acceptable load time before the loader shows? Sub-200ms loads probably shouldn't show a full cinematic intro.
5. Is there a LFC crest SVG available under fair-use / fan-art license? The existing crest is `.webp` — for SVG draw, a simplified abstract shield (not trademark infringing) may be preferable.
