# Code Standards

Engineering conventions and quality checklists for **Anfield Daily** — Next.js 16.4 (App Router), React 19, TypeScript 5 (`strict`), Tailwind CSS v4, and Supabase.

---

## 1. Server vs Client Components

Default to **React Server Components**. Add `"use client"` only when a file requires state, effects, event listeners, or browser APIs.

### Server Components

```tsx
// src/app/[locale]/squad/page.tsx
import { setRequestLocale } from "next-intl/server";
import { getSquad } from "@/lib/football";

export default async function SquadPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const players = await getSquad();
  return <SquadGrid players={players} />;
}
```

- Always `await params` (Next.js 16 async route params) and call `setRequestLocale(locale)` in localised pages/layouts so routes prerender statically.
- Import server-only modules (`@/lib/football`, `@/lib/supabase-server`, `@/lib/news/*`) freely.
- Pass minimal, serialisable props across client boundaries.

### Client Components & i18n Namespace Discipline

- Declare `"use client"` at line 1.
- Whenever you add a new `useTranslations("Namespace")` call inside a client module graph, ensure that namespace is listed in `CLIENT_MESSAGE_NAMESPACES` (`src/components/providers/client-messages.ts`). `client-messages.test.ts` parses the full TypeScript import graph and fails `npm test` if a client namespace is missing.
- Keep individual modules focused (aim for `< 400–500` lines; split complex shells such as `NavbarClient` + `NavbarMobileSheet` or `CommentSection` + `CommentItem`).

---

## 2. Supabase & Environment Boundaries

### Three-Client Rule

| Module | Allowed In | Notes |
|---|---|---|
| `src/lib/supabase.ts` | `"use client"` components | Browser anon client |
| `src/lib/supabase-server.ts` | Server Components, Actions, Route Handlers | Guarded by `import "server-only"` |
| `src/lib/news/supabase-service.ts` | Cron routes & server-validated mutations | Service role; bypasses RLS |

Every Supabase client **must** configure `global: { fetch: createSupabaseFetch() }` and `db: { retry: false }`.

### Lazy Environment Access (`src/lib/env.ts`)

Cloudflare Workers populates runtime bindings per request rather than at module evaluation time. Read environment variables inside functions via `getEnv("KEY")` / `hasEnv("KEY")` instead of freezing `process.env.KEY` in top-level constants.

---

## 3. TypeScript & Data Hygiene

- `strict: true` and `noImplicitAny: true` are enforced. **Zero `: any` or `@ts-ignore`** in `src/`.
- Map external provider payloads into canonical types in `src/lib/types/football.ts` inside the provider layer.
- Derive the active season dynamically via `getCurrentSeasonYear()` / `getCurrentSeasonLabel()` (`src/lib/football/current-season.ts`) — never hardcode a season year.
- Read wall-clock time in UI via `useNowAfterMount()` (`src/hooks/use-now-after-mount.ts`) rather than calling `Date.now()` during render, avoiding SSR/hydration mismatches.

---

## 4. Naming Conventions

| Category | Convention | Example |
|---|---|---|
| Files & folders | `kebab-case` | `match-score-header.tsx`, `fdo-client.ts` |
| React components | `PascalCase` | `MatchScoreHeader`, `BrandMark` |
| Functions & hooks | `camelCase` | `pickClientMessages()`, `useSpoilerFree()` |
| Constants | `UPPER_SNAKE_CASE` | `NEWS_OUTLET_COUNT`, `SUPABASE_FETCH_TIMEOUT_MS` |
| Database tables & columns | `snake_case` | `site_articles`, `match_predictions`, `digest_date` |

---

## 5. API Route & Server Action Hardening

- **Cron authentication:** Wrap cron endpoints with `withCronAuth()` (`src/lib/cron.ts`), accepting `Authorization: Bearer <CRON_SECRET>` only (never URL query params).
- **Rate limiting:** Apply `checkRateLimit(getClientIP(req), ...)` (`src/lib/rate-limit.ts`), which prioritises `cf-connecting-ip` → `x-real-ip` → final `x-forwarded-for` hop with bounded memory (`MAX_ENTRIES = 2000`).
- **SSRF & URL validation:** Validate external article URLs with `isKnownNewsSourceUrl()` before server-side fetching, and restrict user avatar URLs to the authenticated user's storage prefix.
- **Error redaction:** Log detailed errors server-side (`console.error`), but return generic error codes/messages in `4xx`/`5xx` JSON responses — never leak raw `err.message` or stack traces to clients.

---

## 6. Styling & Motion Rules

- **Tailwind CSS v4 tokens:** Use semantic Dark Stadium classes (`bg-stadium-bg`, `bg-stadium-surface`, `border-stadium-border`, `bg-lfc-red`, `text-lfc-red-text` / `text-brand`, `text-stadium-muted`) defined in `src/app/globals.css` rather than raw hex values or `.module.css` files.
- **Numeric alignment:** Apply `tabular-nums` to all scores, league tables, timers, counts, and leaderboards.
- **Compositor-only motion:** Animate only `transform` and `opacity` (never `transition-all` or `transition-[width]`). Keep micro-interactions snappy (`140–200ms` with `active:scale-[0.97]`) and overlays `<= 260ms`.
- **Reduced motion:** Honour `prefers-reduced-motion: reduce` everywhere via `<MotionConfig reducedMotion="user">`, global CSS overrides, and `matchMedia` checks before smooth scrolling.

---

## 7. Brand & Copy Rules

- Read [`docs/brand.md`](../brand.md) before writing UI copy or prompts.
- Site name is **Anfield Daily** (`BRAND.name` from `src/lib/brand.ts`). Never use the Liverpool FC crest (`/assets/lfc/crest.webp`) as the site's own icon, avatar fallback, or error graphic — use `<BrandMark />` for brand identity and `<TeamCrest />` strictly for club match data.
- Maintain 100% key and ICU placeholder parity between `src/messages/en.json` and `src/messages/vi.json` (`messages-parity.test.ts`).

---

## 8. Pre-Commit Verification Checklist

- [ ] `npx tsc --noEmit` passes with 0 errors
- [ ] `npm run lint` passes with 0 errors and 0 warnings
- [ ] `npm test` passes (including `messages-parity.test.ts` and `client-messages.test.ts`)
- [ ] Interactive controls meet `>= 44×44px` mobile tap target size, carry visible `focus-visible` outlines, and use semantic HTML (`<button>`, `<nav>`, `<main>`, single `<h1>` per page)
- [ ] External links opening in a new tab include `rel="noopener noreferrer"`
- [ ] Scores and match outcomes respect spoiler-free mode (`spoiler-hide` / `SpoilerControls`)
