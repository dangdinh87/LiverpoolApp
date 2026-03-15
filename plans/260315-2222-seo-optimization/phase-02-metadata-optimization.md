# Phase 02 — Per-Page Metadata Optimization

> [<- Phase 01](./phase-01-seo-infrastructure.md) | [plan.md](./plan.md) | [Phase 03 ->](./phase-03-structured-data.md)

## Overview
| Field | Value |
|-------|-------|
| Date | 2026-03-15 |
| Priority | P2 |
| Effort | 2.5h |
| Status | done |
| Review | 8/10 — approved |
| Depends on | Phase 01 |

Optimize `generateMetadata()` on every page with keyword-rich titles/descriptions, canonical URLs, hreflang alternates, and proper OG images. Target both Vietnamese and English search queries.

## Key Insights
- All pages already use `generateMetadata()` or static `metadata` — good foundation
- Titles use `%s | Liverpool FC Viet Nam` template from layout — keep this
- Current descriptions are generic. Need target keywords per page
- Missing: canonical URLs per page, hreflang alternates, OG images for most pages
- Homepage uses static `metadata` — fine, but should add canonical + alternates

## Requirements
1. Every page has `canonical` URL in metadata
2. Every page has `alternates.languages` for vi/en hreflang
3. Titles include primary target keywords (Vietnamese + English)
4. Descriptions are 150-160 chars with call-to-action language
5. Dynamic pages (`/news/[...slug]`, `/player/[id]`, `/fixtures/[id]`) have unique metadata per item
6. OG image set for pages that have hero images

## Target Keywords by Page

| Page | Primary Keywords (VI) | Primary Keywords (EN) |
|------|----------------------|----------------------|
| `/` (home) | Liverpool FC Viet Nam, tin tuc Liverpool | Liverpool FC news, fan site |
| `/squad` | doi hinh Liverpool 2025, cau thu Liverpool | Liverpool squad, players |
| `/player/[id]` | {playerName} Liverpool, thong ke {player} | {playerName} stats, profile |
| `/fixtures` | lich thi dau Liverpool, ket qua Liverpool | Liverpool fixtures, results |
| `/fixtures/[id]` | {home} vs {away}, ket qua tran dau | match result, highlights |
| `/standings` | bang xep hang Ngoai hang Anh, BXH Liverpool | Premier League table, standings |
| `/news` | tin tuc Liverpool moi nhat, bong da Anh | Liverpool FC news, transfer |
| `/news/[...slug]` | dynamic from article title | dynamic from article title |
| `/stats` | thong ke Liverpool, ban thang Liverpool | Liverpool statistics, goals |
| `/history` | lich su Liverpool FC, danh hieu Liverpool | Liverpool history, trophies |
| `/gallery` | hinh anh Liverpool, anh Liverpool FC | Liverpool photos, gallery |

## Related Code Files
- `src/app/page.tsx` — homepage static metadata
- `src/app/squad/page.tsx` — uses `makePageMeta()`
- `src/app/player/[id]/page.tsx` — has `generateMetadata` already (good)
- `src/app/fixtures/page.tsx` — uses `makePageMeta()`
- `src/app/fixtures/[id]/page.tsx` — has `generateMetadata` but minimal
- `src/app/standings/page.tsx` — uses `makePageMeta()`
- `src/app/news/page.tsx` — uses `makePageMeta()`
- `src/app/news/[...slug]/page.tsx` — has rich `generateMetadata` (best current example)
- `src/app/news/digest/[date]/page.tsx` — has `generateMetadata` but no OG
- `src/app/stats/page.tsx` — uses `makePageMeta()`
- `src/app/history/page.tsx` — uses `makePageMeta()`
- `src/app/gallery/page.tsx` — uses `makePageMeta()`
- `src/app/about/page.tsx` — check current state
- `src/app/chat/page.tsx` — low priority (noindex candidate)
- `src/messages/en.json`, `src/messages/vi.json` — i18n metadata strings

## Implementation Steps

### 1. Update all `makePageMeta()` call sites
Every page currently calling `makePageMeta(title, desc)` should switch to the enhanced version:
```ts
return {
  title,
  description,
  ...makePageMeta(title, description, { path: "/squad" }),
};
```
This auto-adds canonical + hreflang alternates (from Phase 01 enhancements).

**Pages to update:** `/squad`, `/fixtures`, `/standings`, `/news`, `/stats`, `/history`, `/gallery`, `/about`

### 2. Homepage (`src/app/page.tsx`)
- Convert static `metadata` to include `alternates: { canonical, languages }`
- Add OG image: `/assets/lfc/stadium/anfield-champions-league.webp` (or site OG default)
- Keep existing Vietnamese-first title/description (good for target audience)

### 3. Player detail (`src/app/player/[id]/page.tsx`)
- Already has good `generateMetadata` — add:
  - `alternates: { canonical: getCanonical(\`/player/${id}\`) }`
  - Vietnamese description variant using player bio data when locale is VI
  - Keywords in description: "{name} — doi hinh Liverpool FC, thong ke mua giai"

### 4. Fixture detail (`src/app/fixtures/[id]/page.tsx`)
- Currently returns bare `{ title, description }` — enhance:
  - Add OG type `"article"`, include team logos as images
  - Add `alternates` with canonical
  - Richer description: include score if match completed, date if upcoming
  - Format: "{home} {score} {away} — {competition} {round} | Liverpool FC Viet Nam"

### 5. News article (`src/app/news/[...slug]/page.tsx`)
- Already the best `generateMetadata` — add:
  - `alternates: { canonical: getCanonical(\`/news/${slug.join("/")}\`) }`
  - Ensure `publishedTime` and `modifiedTime` in OG metadata

### 6. Digest page (`src/app/news/digest/[date]/page.tsx`)
- Add OG metadata (type: article, publishedTime)
- Add canonical + hreflang alternates
- Richer description from digest summary

### 7. Update i18n metadata strings
In `src/messages/en.json` and `vi.json`, ensure each page's metadata title/description includes target keywords naturally:
- `Squad.metadata.title`: "Liverpool FC Squad 2025/26 — Players & Positions" (EN)
- `Squad.metadata.title`: "Doi hinh Liverpool FC 2025/26 — Cau thu & Vi tri" (VI)
- Similar for all pages

### 8. Chat page — add `robots: { index: false }`
- `/chat` is interactive, no SEO value. Prevent indexing.

## Todo
- [x] Update `makePageMeta()` calls on 8 static pages to include `path`
- [x] Add canonical + hreflang alternates to homepage static metadata
- [ ] Enhance fixture detail `generateMetadata` with score/date/OG — **NOT DONE**
- [x] Add canonical + alternates to news article and digest pages
- [ ] Update i18n metadata strings with target keywords (en.json + vi.json) — **NOT DONE** (titles generic, not keyword-enriched)
- [x] Add `robots: { index: false, follow: false }` to `/chat` layout
- [ ] Verify all pages render correct `<link rel="canonical">` and `<link rel="alternate" hreflang="">`

## Review Notes (2026-03-15)
- **M1 (medium):** `alternates` set twice in homepage and digest page — redundant, no functional bug. Remove explicit `alternates: getHreflangAlternates(...)` lines since `makePageMeta({ path })` already handles this internally.
- **M2 (low):** `getHreflangAlternates` import unused in homepage after M1 fix.
- **L1:** i18n titles not keyword-enriched per plan Step 7.
- **L2:** `/fixtures/[id]` metadata bare (no canonical, alternates, OG) — plan TODO missed.
- **L4:** `siteName` hardcoded in `player/[id]/page.tsx` — DRY violation.

## Success Criteria
- Every indexable page has unique canonical URL in `<head>`
- Every page has hreflang alternates for vi + en
- Google Search Console shows 0 "duplicate without canonical" issues
- All page titles are under 60 chars, descriptions under 160 chars
- Target keywords appear naturally in titles/descriptions

## Risk Assessment
- **Low.** Metadata changes are additive, no rendering impact
- i18n string changes may need translator review for Vietnamese quality
- Cookie-based locale means Google sees same URL for both languages — acceptable limitation

## Security Considerations
- None. Metadata is server-rendered, no user input in static page metadata

## Next Steps
Phase 03 adds JSON-LD structured data to all pages using the enhanced metadata as context.
