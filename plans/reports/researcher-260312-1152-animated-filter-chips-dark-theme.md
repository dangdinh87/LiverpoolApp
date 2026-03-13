# Animated Filter/Tab Chips in Dark-Themed Sports Apps
**Research Date:** 2026-03-12
**Focus:** Framer Motion patterns + animation parameters for segmented controls

---

## 1. LayoutId Sliding Background Pattern

**Concept:** Use Framer Motion's `layoutId` to animate a shared background element that "follows" the active tab without calculating positions.

**How It Works:**
- Render background motion div **only inside the active tab**
- Assign same `layoutId` to all instances of background
- Framer Motion auto-animates size/position when active state changes
- Cleaner than manual `offsetLeft`/`offsetWidth` calculations

**Benefits:**
- Smooth FLIP-based layout transitions
- Works across responsive layouts
- No need for refs or computed positions

---

## 2. Recommended Framer Motion Config Values

### **For Snappy + Smooth Feel (Default)**
```
stiffness: 100    // moderate responsiveness
damping: 10       // allows subtle bounce
mass: 1           // standard momentum
```
✓ Default values work well for most filter chips

### **For Extra Snappy (Quick interactions)**
```
stiffness: 150-200
damping: 12-15
mass: 1
```
Use when tab switching needs instant, crisp feedback.

### **For Buttery Smooth (More elegant)**
```
stiffness: 80
damping: 15-20
mass: 1
```
Use for premium feel with gentle deceleration.

### **Layout Animation (sliding background)**
```
transition: {
  layout: { duration: 0.2 }  // 200ms for snappy
}
// OR
transition: {
  layout: {
    type: "spring",
    stiffness: 130,
    damping: 20
  }
}
```

### **Duration Config (easing)**
```
// Hover/scale effects
duration: 0.15  // 150ms
ease: "easeOut" // quick entrance, natural exit

// Tab/filter changes
duration: 0.2-0.25  // 200-250ms
ease: "easeInOut"   // smooth throughout
```

**Duration Note:** Framer Motion uses **seconds**, not milliseconds.

---

## 3. Hover Micro-Interactions on Dark Backgrounds

**Design Pattern:**
- **Scale:** 1.02–1.05x on hover (avoid excessive jump)
- **Shadow:** Add subtle box-shadow for depth
- **Opacity:** 80–85% default → 100% on hover

**Implementation:**
```
whileHover: {
  scale: 1.03,
  boxShadow: "0 0 12px rgba(200, 16, 46, 0.3)"  // LFC Red glow
}
transition: {
  type: "spring",
  stiffness: 100,
  damping: 10
}
```

**Dark Background Shadow Tips:**
- Use dark-friendly shadows: `rgba(0, 0, 0, 0.4)` for depth
- Accent color shadows for active state: `rgba(200, 16, 46, 0.3)` (LFC Red with low opacity)
- Layer multiple shadows for 3D effect: combine blur radii 4px + 12px + 20px

---

## 4. Active State Glow/Shadow Effects

**Pattern: Layered Drop-Shadow Glow**

For active/selected chips:
```
boxShadow: [
  "0 0 4px rgba(200, 16, 46, 0.2)",    // inner subtle glow
  "0 0 12px rgba(200, 16, 46, 0.3)",   // mid-range glow
  "0 0 24px rgba(200, 16, 46, 0.15)"   // outer halo
].join(", ")
```

**Animated Pulsing Glow (optional):**
```
animate: {
  boxShadow: [
    "0 0 12px rgba(200, 16, 46, 0.3)",
    "0 0 20px rgba(200, 16, 46, 0.5)",
    "0 0 12px rgba(200, 16, 46, 0.3)"
  ]
}
transition: {
  duration: 2,
  repeat: Infinity,
  ease: "easeInOut"
}
```

**Variant-Based Approach (Recommended):**
Define `animate` + `whileHover` variants that swap shadow/opacity/scale in one unified motion.

---

## 5. Dark Background Color Strategy

**60–30–10 Rule for Sports Apps:**
- **60%** Background: `#0D0D0D` (stadium-bg)
- **30%** Secondary: `#1A1A1A` (surface containers)
- **10%** Accent: `#C8102E` (LFC Red) + `#F6EB61` (LFC Gold)

**Chip States:**
- **Default:** Stadium-surface (e.g., `#1A1A1A`), muted text
- **Hover:** Slight lightening + scale, shadow intensify
- **Active:** Stadium-surface2 highlight + glow accent, bold text

---

## 6. Modern 2025 Sports App Patterns

**Chip Layout:**
- Horizontally scrollable row for mobile
- Rounded corners: `16dp` (equivalent to `rounded-2xl` in Tailwind)
- Padding: `12px` sides
- Size: `32×32px` core + padding

**Real-time Feedback:**
- Instant visual response to clicks (no lag)
- Micro-animations on score/data updates
- Smooth state transitions without jarring jumps

**Voice/AI Features (Emerging):**
- Voice-triggered filters
- AI-driven personalized chip suggestions
- Gamified interaction patterns

---

## 7. Complete Config Cheat Sheet

| Use Case | Stiffness | Damping | Duration | Ease |
|----------|-----------|---------|----------|------|
| Filter chip hover | 100 | 10 | 0.15s | easeOut |
| Tab/chip active switch | 130 | 20 | 0.2s | easeInOut |
| Glow pulse | – | – | 2s | easeInOut |
| Extra snappy (sports scores) | 200 | 15 | 0.1s | easeOut |
| Buttery smooth (premium) | 80 | 18 | 0.25s | easeInOut |

---

## Unresolved Questions

- **Gesture support:** How should filter chips behave on touch (swipe vs. tap)?
- **Performance at scale:** Optimal chip count before animation jank on mid-range devices?
- **Accessibility:** ARIA labels + focus ring animations for keyboard nav?

---

## Sources
- [Segmented Control with Framer Motion - Samuel Kraft](https://samuelkraft.com/blog/segmented-control-framer-motion)
- [Layout Animation with Motion/Framer Motion](https://motion.dev/docs/react-layout-animations)
- [The Physics Behind Spring Animations - Maxime Heckel](https://blog.maximeheckel.com/posts/the-physics-behind-spring-animations/)
- [React Transitions - Motion Docs](https://motion.dev/docs/react-transitions)
- [Advanced Animation Patterns - Maxime Heckel](https://blog.maximeheckel.com/posts/advanced-animation-patterns-with-framer-motion/)
- [Filter UI Patterns 2025 - BricxLabs](https://bricxlabs.com/blogs/universal-search-and-filters-ui)
- [Sports App Design Trends 2025 - IIH Global](https://www.iihglobal.com/blog/top-sports-app-design-trends/)
- [Easing Functions - Motion Docs](https://www.framer.com/motion/easing-functions/)
