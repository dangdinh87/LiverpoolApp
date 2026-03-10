# Code Review — News UI (Phase 02 + 03)

**Date:** 2026-03-05
**Reviewer:** code-reviewer subagent
**Score: 8.2 / 10**

---

## Scope

| File | Type | LOC |
|------|------|-----|
| `src/components/news/news-feed.tsx` | NEW (client) | 233 |
| `src/app/news/page.tsx` | MODIFIED (server) | 100 |
| `src/app/news/loading.tsx` | MODIFIED (server) | 44 |
| `src/components/home/news-section.tsx` | MODIFIED (client) | 176 |
| `src/lib/rss-parser.ts` | Reference only | 441 |
| `next.config.ts` | Reference only | 37 |

---

## Overall Assessment

Solid, clean implementation. The server/client boundary is handled correctly (`import type` for server-only types). Layout hierarchy (Hero → Medium grid → Compact list) is clear and well-structured. The main issues are a duplicated `SOURCE_CONFIG`, a missing `prefers-reduced-motion` guard in `news-section.tsx`, and minor accessibility gaps.

---

## Critical Issues

None.

---

## High Priority Findings

### H1 — `SOURCE_CONFIG` Duplicated Across Two Client Components

`news-feed.tsx:8-16` and `news-section.tsx:10-16` both define the same `Record<NewsSource, {label, color}>` constant. They diverge slightly: the server-side `SOURCE_CONFIG` in `rss-parser.ts` also includes a `language` field not present in the client copies. The client copies strip `language` (acceptable since language is already on `NewsArticle`), but two copies means two maintenance points.

**Fix:** Extract into a shared non-server file, e.g. `src/lib/news-config.ts`:

```ts
// src/lib/news-config.ts — no server-only import
import type { NewsSource } from "@/lib/rss-parser"; // import type is fine

export const SOURCE_BADGE_CONFIG: Record<NewsSource, { label: string; color: string }> = {
  bbc:       { label: "BBC",      color: "bg-[#BB1919]/20 text-[#FF6B6B]" },
  guardian:  { label: "Guardian", color: "bg-[#052962]/20 text-[#6B9AFF]" },
  bongda:    { label: "Bongda",   color: "bg-emerald-500/20 text-emerald-400" },
  "24h":     { label: "24h",      color: "bg-orange-500/20 text-orange-400" },
  bongdaplus:{ label: "BD+",      color: "bg-sky-500/20 text-sky-400" },
};
```

Both client components import from there. DRY violation resolved; `import type` from `rss-parser` is erased at compile so no server-only boundary is breached.

---

### H2 — External Images: Potential for Unwhitelisted Hosts at Runtime

`sanitizeUrl()` in `rss-parser.ts` only validates `https?://` prefix — it does NOT validate the hostname. If a Vietnamese RSS source embeds an image from a CDN not in `next.config.ts` `remotePatterns`, the `<Image>` component will throw a 400 at runtime (or a build-time warning in strict mode).

Bongdaplus is scraped (not RSS), so thumbnail URLs are unpredictable (`data-src` from arbitrary CDNs).

**Options (pick one):**
1. Add a broader wildcard for bongdaplus CDNs once their actual CDN hostnames are known.
2. Use `<img>` (plain HTML) with `referrerpolicy="no-referrer"` only for bongdaplus thumbnails, falling back to the `ImageFallback` component for Next.js `<Image>` failures.
3. Server-side: validate thumbnail hostname against an allowlist before surfacing to the client.

Option 3 is cleanest — add hostname validation in `sanitizeUrl()`:

```ts
const ALLOWED_IMG_HOSTS = new Set([
  "ichef.bbci.co.uk",
  "i.guim.co.uk",
  "media.guim.co.uk",
  "bongda.com.vn",
  "cdn.24h.com.vn",
  "bongdaplus.vn",
  // add known bongdaplus CDN hostnames
]);

function sanitizeImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return ALLOWED_IMG_HOSTS.has(parsed.hostname) ? url : undefined;
  } catch {
    return undefined;
  }
}
```

---

## Medium Priority Improvements

### M1 — `formatRelativeDate` Duplicated

`news-feed.tsx:23-35` (has 7-day fallback to locale date) and `news-section.tsx:22-30` (stops at days). Two implementations, slightly different behavior. Extract to `src/lib/news-config.ts` alongside `SOURCE_BADGE_CONFIG`.

---

### M2 — `Badge` / `ArticleBadge` Component Duplicated

`news-feed.tsx:37-52` defines `ArticleBadge`. `news-section.tsx:32-47` defines `Badge`. Identical markup, identical logic. Even if `NewsFeed` replaces `NewsSection` on the dedicated news page, the homepage still uses `NewsSection` with its own `Badge`.

Consolidate: export `ArticleBadge` from `news-feed.tsx` (or from `news-config.ts`) and import it in `news-section.tsx`.

---

### M3 — Hero Card: `aspect-[21/9]` Redundant Comment

`news-feed.tsx:77`:
```tsx
<div className="relative aspect-[21/9] sm:aspect-[21/9] w-full">
```
`sm:aspect-[21/9]` repeats the base value — the breakpoint override does nothing. Remove it.

---

### M4 — Missing `prefers-reduced-motion` Guard (news-section.tsx)

`news-section.tsx` uses `whileInView` Framer Motion animations. Per `docs/code-standards.md` accessibility checklist, `prefers-reduced-motion` must be respected. `news-feed.tsx` has no animations (good). But `news-section.tsx` animates every card on the homepage without checking motion preferences.

**Fix:**
```tsx
import { useReducedMotion } from "framer-motion";

// Inside component:
const shouldReduceMotion = useReducedMotion();

<motion.a
  initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
  whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
  ...
>
```

---

### M5 — `cursor-pointer` on `<a>` Elements is Redundant

`news-feed.tsx:123`, `news-section.tsx:91`, `news-section.tsx:140`. Anchor tags get `cursor: pointer` by default in all modern browsers. The class is harmless but unnecessary noise.

---

### M6 — `news-section.tsx` Not Replaced by `NewsFeed` (Intentional But Undocumented)

`NewsSection` (homepage preview, 3-card grid, 2-col featured) and `NewsFeed` (full page, hero+6grid+compact) serve different layouts. This is correct and intentional, but the comment in `news-feed.tsx:7` says "Source config duplicated here to avoid importing server-only module" — this only explains the config duplication, not why two separate components exist. A brief comment above `NewsSection` clarifying its scope (homepage preview, max N articles) would prevent future confusion.

---

## Low Priority Suggestions

### L1 — `loading.tsx` Secondary Grid Hardcoded to 6, Compact List to 4

`loading.tsx` skeletons show 6 medium cards and 4 compact items. `NewsFeed` uses `articles.slice(1, 7)` (6) and `articles.slice(7)` (remainder from 20 total = up to 13). The compact skeleton only shows 4, creating a visible layout shift when real content loads. Consider either matching the count or using an indeterminate shimmer.

### L2 — Hero Banner Background Image via Inline Style

`news/page.tsx:22-25`:
```tsx
style={{
  backgroundImage: "url('/assets/lfc/fans/fans-anfield-crowd.webp')",
}}
```
Per code standards: "No inline styles." This is the only case of an inline style across the reviewed files. Use a Tailwind arbitrary-value class or extract to a CSS custom property. Since the image is local/public, it could also be a Next.js `<Image>` with `objectFit="cover"` and `fill`.

### L3 — `<a>` Inside `motion.a` is Implicit Semantic

`news-section.tsx:83`: `motion.a` renders as `<a>`. The `href` is the external article link, which is correct. But since `motion.a` is inside a grid that uses `Link` for internal navigation at the header level, the mixing of `<Link>` and `<a>` is intentional — just note that screen readers will treat these as links (correct).

### L4 — Attribution Links Could Be One Loop

`news/page.tsx:50-95`: Five hardcoded attribution `<a>` blocks. Low priority but a `SOURCES.map()` would eliminate the repetition:

```tsx
const ATTRIBUTION = [
  { href: "https://...", label: "BBC Sport" },
  // ...
];
{ATTRIBUTION.map(({ href, label }, i) => (
  <Fragment key={href}>
    {i > 0 && ", "}
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-lfc-red hover:underline">
      {label}
    </a>
  </Fragment>
))}
```

---

## Positive Observations

- **Server/client boundary clean:** `import type` from `rss-parser` is correctly used in all client components — types are erased at compile, no server-only leakage.
- **`rel="noopener noreferrer"`** on all external links — correct.
- **`sanitizeUrl()`** strips non-HTTP(S) URLs — prevents `javascript:` injection.
- **`priority` on HeroCard image** — correct for LCP element.
- **`loading="lazy"` on MediumCard/secondary images** — correct.
- **`sizes` prop set correctly** on all `<Image>` usages — prevents oversized downloads.
- **ISR revalidate 1800** matches memory/project spec (30 min).
- **Empty state** handled gracefully in `NewsFeed` with user-friendly message.
- **`deduplicateArticles`** URL normalization is thorough (strips protocol, www, trailing slash).
- **`Promise.allSettled`** ensures per-source graceful failure.
- **`getNews` wrapped in `React.cache()`** — correct for server deduplication.
- **`loading.tsx` structure** accurately mirrors the real layout's three zones (hero, grid, compact).
- **`ImageFallback` component** extracted and reused within `news-feed.tsx` — good DRY practice within the file.
- **`CompactItem` `last:border-0`** — clean CSS-only last-item handling.

---

## Recommended Actions

1. **(H1 + M1 + M2 — DRY)** Extract `SOURCE_BADGE_CONFIG`, `formatRelativeDate`, and `ArticleBadge` to `src/lib/news-config.ts`. Import in both `news-feed.tsx` and `news-section.tsx`. ~30 min.
2. **(H2 — Security)** Add hostname allowlist validation in `sanitizeUrl()` (or a new `sanitizeImageUrl()`). ~20 min.
3. **(M4 — A11y)** Add `useReducedMotion()` guard in `news-section.tsx`. ~10 min.
4. **(M3 — Cleanup)** Remove redundant `sm:aspect-[21/9]` in `news-feed.tsx:77`. ~1 min.
5. **(M5 — Cleanup)** Remove `cursor-pointer` from `<a>` elements. ~2 min.
6. **(L2 — Standards)** Replace inline `backgroundImage` style in `news/page.tsx` with a Next.js `<Image fill>` or Tailwind arbitrary class. ~10 min.
7. **(L1 — Polish)** Bump compact skeleton count to ~8-10 to reduce layout shift.

---

## Metrics

| Metric | Value |
|--------|-------|
| Files reviewed | 4 primary + 2 reference |
| LOC analyzed | ~553 |
| Critical issues | 0 |
| High priority | 2 |
| Medium priority | 6 |
| Low priority | 4 |
| Inline style violations | 1 (L2) |
| DRY violations | 3 (H1, M1, M2) |
| A11y gaps | 1 (M4) |
| Security concern | 1 (H2) |

---

## Unresolved Questions

1. **Bongdaplus CDN hostname(s):** The scraper returns arbitrary `src`/`data-src` values. What CDN hostnames does bongdaplus.vn actually use for article images? Without knowing them, `next/image` will throw at runtime for those thumbnails.
2. **`NewsSection` article count:** Homepage passes `articles` from `getNews(20)` — the section slices `articles[0]` + `rest` (up to 19 more). Is showing potentially 19 cards on the homepage intentional, or should a `limit` prop cap it?
