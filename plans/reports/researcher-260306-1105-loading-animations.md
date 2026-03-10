# Research Report: Loading Animations for Liverpool FC Fan App

**Date:** 2026-03-06
**Scope:** Loading screens, skeleton patterns, CSS/SVG animations — football theme, dark stadium design

---

## Executive Summary

The app already has a solid foundation: `Skeleton` component with `animate-pulse`, `shimmer` keyframe, `pulse-red` keyframe, `glow-red` utility, `text-gradient-red`, and `subtleZoom`. Framer Motion v12 is installed with per-letter reveal animations in Hero.

The gap: all `loading.tsx` files are **generic grey pulse skeletons** with zero LFC personality. The opportunity is to inject brand identity into the loading state — not just visual fidelity but emotional connection. This report gives concrete, implementable ideas ranked by impact-vs-effort.

---

## Current State Audit

| File | Pattern | Brand Score |
|---|---|---|
| `squad/loading.tsx` | grey pulse grid | 0/5 |
| `fixtures/loading.tsx` | grey pulse list | 0/5 |
| `standings/loading.tsx` | grey pulse table | 0/5 |
| `players/loading.tsx` | grey pulse table | 0/5 |
| `stats/loading.tsx` | grey pulse blocks | 0/5 |
| `profile/loading.tsx` | grey pulse form | 0/5 |
| `player/[id]/loading.tsx` | grey pulse detail | 0/5 |

**Skeleton component:** `animate-pulse rounded-none bg-stadium-surface2` — correct dark theme, but shimmer from `globals.css` is NOT used (`.skeleton` class vs `Skeleton` component).

**Animations already in `globals.css`:**
- `pulse-red` — red glow ripple
- `shimmer` — 200% background sweep (not wired to Skeleton component)
- `subtleZoom` — used in Hero background
- `fadeSlideIn` — used in tab panels

---

## Concept Inventory

### Concept A — Red Shimmer Skeleton (Highest ROI, Lowest Effort)

Upgrade the `Skeleton` component to use a **red-tinted shimmer** instead of plain grey pulse. One-line change, massive brand lift.

**Implementation:**

```css
/* globals.css — new keyframe */
@keyframes shimmer-red {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
```

```tsx
// src/components/ui/skeleton.tsx
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-none",
        className
      )}
      style={{
        background: "linear-gradient(90deg, #1a1a1a 25%, #2a1015 50%, #1a1a1a 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer-red 1.8s ease-in-out infinite",
      }}
    />
  );
}
```

The `#2a1015` midpoint is a near-black red — subtle, not garish. Keeps accessibility contrast while injecting brand color.

---

### Concept B — Staggered Skeleton Reveal (Medium Effort, High Impact)

Rather than all skeletons appearing simultaneously, stagger them with Framer Motion. Feels intentional, not broken.

```tsx
// Wrapper for any loading.tsx
import { motion } from "framer-motion";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 8 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

// Usage in squad/loading.tsx
<motion.div
  variants={container}
  initial="hidden"
  animate="show"
  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
>
  {Array.from({ length: 20 }).map((_, i) => (
    <motion.div key={i} variants={item} className="...skeleton card...">
      <Skeleton className="h-52 w-full rounded-none" />
      <div className="p-4">
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </motion.div>
  ))}
</motion.div>
```

---

### Concept C — Soccer Ball Bounce Spinner (Thematic, Replaces Generic Spinners)

SVG soccer ball with CSS bounce animation. Use as page-level fallback or data-fetching indicator.

```tsx
// src/components/ui/football-spinner.tsx
"use client";

export function FootballSpinner({ size = 40 }: { size?: number }) {
  return (
    <div
      className="flex flex-col items-center gap-3"
      style={{ "--size": `${size}px` } as React.CSSProperties}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        className="animate-[ball-bounce_0.8s_ease-in-out_infinite]"
        style={{ filter: "drop-shadow(0 4px 8px rgba(200,16,46,0.4))" }}
      >
        {/* Ball body */}
        <circle cx="20" cy="20" r="18" fill="#f5f5f5" />
        {/* Pentagon patches — simplified soccer ball pattern */}
        <polygon points="20,6 25,12 23,18 17,18 15,12" fill="#1a1a1a" />
        <polygon points="33,15 36,21 32,26 27,24 26,18" fill="#1a1a1a" />
        <polygon points="7,15 4,21 8,26 13,24 14,18" fill="#1a1a1a" />
        <polygon points="13,30 17,28 23,28 27,30 24,36" fill="#1a1a1a" />
        {/* Red accent ring */}
        <circle cx="20" cy="20" r="18" fill="none" stroke="#c8102e" strokeWidth="1.5" opacity="0.6" />
      </svg>
      {/* Shadow squish */}
      <div
        className="bg-lfc-red/20 rounded-full animate-[shadow-squish_0.8s_ease-in-out_infinite]"
        style={{ width: size * 0.6, height: 4 }}
      />
    </div>
  );
}
```

```css
/* globals.css */
@keyframes ball-bounce {
  0%, 100% { transform: translateY(0) scaleX(1) scaleY(1); }
  40%       { transform: translateY(-24px) scaleX(0.95) scaleY(1.05); }
  60%       { transform: translateY(-20px) scaleX(0.95) scaleY(1.05); }
  80%       { transform: translateY(0) scaleX(1.1) scaleY(0.9); }
}

@keyframes shadow-squish {
  0%, 100% { transform: scaleX(1);   opacity: 0.3; }
  40%, 60% { transform: scaleX(0.5); opacity: 0.1; }
  80%       { transform: scaleX(1.3); opacity: 0.5; }
}
```

**Use cases:** data fetch pending states inside page (not full-page), error retry button loading state.

---

### Concept D — Stadium Floodlight Sweep (High Drama, Page-Level)

A full-screen splash loading screen that mimics stadium floodlights activating before a match. Used as a **first-visit intro** or route transition, not every page load.

```tsx
// src/components/ui/stadium-intro.tsx
"use client";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

export function StadiumIntro({ onComplete }: { onComplete: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9999] bg-stadium-bg flex items-center justify-center overflow-hidden"
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        onAnimationComplete={onComplete}
      >
        {/* Floodlight beams — 4 corners */}
        {["-45deg", "45deg", "-135deg", "135deg"].map((angle, i) => (
          <motion.div
            key={i}
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `conic-gradient(from ${angle} at ${i < 2 ? "0% 0%" : "100% 0%"}, transparent 0deg, rgba(246,235,97,0.03) 8deg, transparent 16deg)`,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.6] }}
            transition={{ duration: 1.2, delay: 0.3 + i * 0.15, ease: "easeOut" }}
          />
        ))}

        {/* Central red glow halo */}
        <motion.div
          className="absolute w-96 h-96 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(200,16,46,0.15) 0%, transparent 70%)" }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 2, 1.5], opacity: [0, 0.8, 0.4] }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />

        {/* Crest reveal */}
        <div className="relative z-10 flex flex-col items-center gap-4">
          <motion.div
            initial={{ scale: 0.3, opacity: 0, rotateY: 90 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            transition={{ duration: 0.7, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{ filter: "drop-shadow(0 0 40px rgba(200,16,46,0.6))" }}
          >
            <Image src="/assets/lfc/crest.webp" alt="LFC" width={80} height={100} />
          </motion.div>

          {/* YNWA text stagger */}
          <motion.p
            initial={{ opacity: 0, letterSpacing: "0.5em" }}
            animate={{ opacity: 1, letterSpacing: "0.3em" }}
            transition={{ duration: 0.8, delay: 1.0 }}
            className="font-barlow text-lfc-red uppercase text-sm tracking-[0.3em]"
          >
            You'll Never Walk Alone
          </motion.p>

          {/* Red progress bar */}
          <motion.div
            className="w-48 h-0.5 bg-stadium-surface2 overflow-hidden mt-2"
          >
            <motion.div
              className="h-full bg-lfc-red"
              initial={{ scaleX: 0, originX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.8, delay: 0.6, ease: "easeInOut" }}
            />
          </motion.div>
        </div>

        {/* Bottom red accent line */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-0.5"
          style={{ background: "linear-gradient(90deg, transparent, #c8102e, transparent)" }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.0, delay: 0.8 }}
        />
      </motion.div>
    </AnimatePresence>
  );
}
```

**Usage pattern:** Check `sessionStorage` — show once per session, not every navigation.

```tsx
// app/layout.tsx client wrapper
"use client";
import { useState, useEffect } from "react";
import { StadiumIntro } from "@/components/ui/stadium-intro";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem("lfc-intro-shown")) {
      setShowIntro(true);
      sessionStorage.setItem("lfc-intro-shown", "1");
    }
  }, []);

  return (
    <>
      {showIntro && <StadiumIntro onComplete={() => setShowIntro(false)} />}
      {children}
    </>
  );
}
```

---

### Concept E — Red Line Progress Bar (Minimal, Always-On)

Thin top-of-page red progress bar, like NProgress but Framer Motion. Fires on every route change.

```tsx
// src/components/ui/route-progress.tsx
"use client";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

export function RouteProgress() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setKey(k => k + 1);
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, [pathname]);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          key={key}
          className="fixed top-0 left-0 right-0 z-[9998] h-0.5 origin-left"
          style={{ background: "linear-gradient(90deg, #c8102e, #f6eb61)" }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 0.9 }}
          exit={{ scaleX: 1, opacity: 0 }}
          transition={{
            scaleX: { duration: 0.5, ease: "easeOut" },
            opacity: { duration: 0.3, delay: 0.1 },
          }}
        />
      )}
    </AnimatePresence>
  );
}
```

Place in `layout.tsx` (already a server component — wrap in client boundary or add to the existing `NavbarClient`).

---

### Concept F — Pitch Pattern Skeleton Background

For squad grid and fixtures, replace plain grey skeleton with a subtle **grass stripe pattern** as the background. Reinforces football context.

```css
/* globals.css */
@keyframes shimmer-pitch {
  0%   { background-position: -200% 0, 0 0; }
  100% { background-position:  200% 0, 0 0; }
}

.skeleton-pitch {
  background-image:
    linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.03) 50%, transparent 70%),
    repeating-linear-gradient(
      0deg,
      rgba(255,255,255,0.01) 0px,
      rgba(255,255,255,0.01) 20px,
      transparent 20px,
      transparent 40px
    );
  background-size: 200% 100%, 100% 40px;
  background-color: #1a1a1a;
  animation: shimmer-pitch 2s linear infinite;
}
```

Usage: `<Skeleton className="skeleton-pitch h-52 w-full" />` on squad card images.

---

### Concept G — Match Score Ticker Skeleton

For fixtures loading — instead of a plain box, show the structural shape of a match card with team badge circles and score dashes:

```tsx
// inline in fixtures/loading.tsx
function MatchCardSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-4 border border-stadium-border bg-stadium-surface">
      {/* Home team */}
      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
      <Skeleton className="h-4 w-20 flex-1" />
      {/* Score */}
      <div className="flex items-center gap-1 px-3">
        <Skeleton className="h-6 w-6" />
        <span className="text-stadium-muted text-xs">-</span>
        <Skeleton className="h-6 w-6" />
      </div>
      {/* Away team */}
      <Skeleton className="h-4 w-20 flex-1 text-right" />
      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
    </div>
  );
}
```

---

### Concept H — Standing Row Skeleton with Position Highlight

For standings loading — highlight LFC's position row (row 1 in a championship scenario) with a red left border:

```tsx
// in standings/loading.tsx
{Array.from({ length: 20 }).map((_, i) => (
  <div
    key={i}
    className={`flex items-center gap-4 px-6 py-3 border-b border-stadium-border/40 ${
      i === 0 ? "border-l-2 border-l-lfc-red bg-lfc-red/5" : ""
    }`}
  >
    <Skeleton className={`h-4 w-6 ${i === 0 ? "bg-lfc-red/20" : ""}`} />
    <Skeleton className="h-6 w-6 rounded-full flex-shrink-0" />
    <Skeleton className="h-4 flex-1" />
    {/* stat columns */}
    {[6, 6, 6, 8, 8, 8, 8].map((w, j) => (
      <Skeleton key={j} className={`h-4 w-${w} ${i === 0 ? "bg-lfc-red/20" : ""}`} />
    ))}
  </div>
))}
```

---

## Recommended Implementation Priority

| Priority | Concept | Effort | Impact | Notes |
|---|---|---|---|---|
| 1 | A — Red Shimmer Skeleton | 15 min | High | Global upgrade, 1 file change |
| 2 | E — Route Progress Bar | 30 min | High | Professional UX pattern |
| 3 | B — Staggered Reveal | 1 hr | Medium | Squad + players grids |
| 4 | H — Standings row highlight | 20 min | Medium | Brand storytelling |
| 5 | G — Match Score Ticker | 30 min | Medium | fixtures/loading.tsx only |
| 6 | C — Football Spinner | 45 min | Medium | For inline async states |
| 7 | F — Pitch Pattern | 30 min | Low-Med | Subtle, optional |
| 8 | D — Stadium Intro | 2 hrs | High* | *One-time, high drama |

---

## Code Patterns — Framer Motion Reference

### Stagger container pattern (reusable)
```tsx
// src/lib/animation-variants.ts
export const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

export const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.3 } },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  show:   { opacity: 1, scale: 1, transition: { duration: 0.4, ease: [0.16,1,0.3,1] } },
};
```

### Framer Motion + Tailwind CSS tip
Framer Motion `style` prop and Tailwind classes co-exist cleanly. Use Tailwind for static styles, FM `initial/animate/exit` for dynamic. Avoid mixing FM's `animate` with Tailwind `transition-*` on same element.

### AnimatePresence for loading.tsx
Next.js App Router `loading.tsx` renders as a Suspense fallback — it unmounts when data resolves. To animate OUT (fade the skeleton away), wrap content in `AnimatePresence` in the **page** component, not the loading component itself.

```tsx
// app/squad/page.tsx
import { AnimatePresence } from "framer-motion";

// Animate the real content in on mount — the skeleton just disappears
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.4 }}
>
  <SquadGrid players={players} />
</motion.div>
```

---

## Design Principles Applied

1. **Loading should feel Liverpool** — red/dark shimmer, not grey corporate pulse
2. **Structure before style** — skeleton must match real content layout (no layout shift)
3. **One-time drama, always-on subtlety** — stadium intro is a treat, not a chore; route progress is always there
4. **KISS** — shimmer skeleton upgrade (Concept A) gives 80% of the brand lift for 5% of the work
5. **YAGNI** — no need for Lottie, GSAP, or Three.js; Framer Motion + CSS is sufficient

---

## Assets Available in Codebase

- `/assets/lfc/crest.webp` — for crest in stadium intro
- `glow-red` CSS utility — reuse on spinner and intro
- `text-gradient-red` — reuse for "Loading..." text
- `pulse-red` keyframe — already in globals.css, wire to badge/indicator
- `shimmer` keyframe — already in globals.css, just not used by Skeleton component

---

## Unresolved Questions

1. Should the stadium intro be shown to all users or only authenticated users?
2. Is there a preferred route transition style (slide, fade, none) for mobile vs desktop?
3. Does the red shimmer look acceptable in light mode (`.light` theme)? May need a separate light-mode skeleton color (`#e8e8e8` shimmer midpoint).
4. Framer Motion v12 introduced `motion` from `"framer-motion/react"` import path — check if current v12.34.4 requires this split or still supports direct import (current Hero uses `"framer-motion"` directly, which works).
