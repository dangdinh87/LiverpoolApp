# Anfield Daily brand refresh (B + D)

Status: draft for owner review · 2026-10-14 · branch `feat/upgrade`

## What the owner decided

| Area | Decision |
|---|---|
| Name | Unchanged: **Anfield Daily**. |
| Direction | "B + D": the calm and trust of a premium sports paper, with the tidiness of a news app. Keep the old site's stadium feel and follow Liverpool FC's own style: red, lots of white space, bold and clean type. |
| Logo | **Centre circle**: the pitch's centre circle seen from above, the halfway line running vertically, white on a Liverpool-red rounded tile. Replaces the folded-pages "A". |
| Colour | Liverpool red `#C8102E` is the only brand colour. Gold stops being a brand colour. |
| Theme | Follows the reader's device (light or dark), with a toggle. Today the site is dark only. |
| Type | **League Gothic** (kept) for the wordmark, scores and big numbers. **Newsreader** (new) for article and page headlines. **Inter** (kept) for body text and UI. |
| Voice | Short and plain, the news first; always name the source and how many outlets were merged; no clickbait. |

Fixed constraints that still apply: the positioning from `CLAUDE.md` (news gathered, de-duplicated and summed up; never "for fans far from home"). Nothing may look like the club crest, the Liver bird, the Hillsborough flames, "You'll Never Walk Alone" or the London Underground roundel. The halfway line is vertical and stays inside the tile, so the mark does not read as the roundel.

## Mark

512 box, the same box as `MARK` today:

| Part | Value |
|---|---|
| Tile | `rect` 512 × 512, `rx` 120, fill `#C8102E` |
| Halfway line | `rect` x 239.2, y 0, w 33.6, h 512, fill `#FFFFFF` |
| Centre circle | `circle` cx 256, cy 256, r 112, no fill, stroke `#FFFFFF`, width 33.6 |
| Centre spot | `circle` cx 256, cy 256, r 32, fill `#FFFFFF` |

- One mark for every size. It was checked at 16, 32 and 48 px on light and dark grounds, and the circle and line stay distinct at 16 px.
- Maskable app icon: the art scales to the existing `maskableScale` inside the safe zone. The line runs the full tile height, so on the maskable copy it is clipped by the mask, which is expected.
- Rules: never horizontal line (roundel), never add text inside the tile, never recolour the tile, never put the mark on a busy photo without a scrim.

**Wordmark:** unchanged. ANFIELD DAILY in League Gothic caps, tracking 0.18em, the short red rule under the first letters. **Lockup:** mark left, wordmark right, as today.

## Colour tokens

Semantic tokens, each with a light and a dark value. Components use only these.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | `#FFFFFF` | `#0E0F12` | Page |
| `--surface` | `#F5F5F6` | `#17181C` | Cards, digest box |
| `--surface-2` | `#ECEDEF` | `#202228` | Raised or hovered surfaces |
| `--foreground` | `#101114` | `#F4F4F5` | Main text |
| `--muted` | `#6B6F78` | `#9A9CA3` | Secondary text |
| `--border` | `#E6E7EA` | `#26282E` | Lines |
| `--brand` | `#C8102E` | `#C8102E` | Fills: mark, primary button, live strip |
| `--brand-hover` | `#9E0B23` | `#E01A3A` | Button hover |
| `--brand-text` | `#B00D28` | `#FF4D61` | Red words; both pass WCAG AA on their own page colour |

`#C8102E` is a fill colour only; as text on the dark page it fails AA, hence `--brand-text`.

**Gold:** removed from the mark and from brand fills. It stays available as `--highlight` (`#F6EB61` on dark, `#8A6D00` on light) for the few places that mark "next" or "live now", never for large areas. Open question 1 below.

## Type

| Role | Face | Notes |
|---|---|---|
| Wordmark, scores, big stats | League Gothic | Unchanged class `font-bebas` (rename deferred) |
| Page and article headlines, story titles in lists | Newsreader 500/600 | New, via `next/font/google`, subsets `latin`, `latin-ext`, `vietnamese` |
| Body, navigation, buttons, tables | Inter | Unchanged |
| Short labels, table heads | Barlow Condensed | Kept where it is today; no new uses |

Every face above includes Vietnamese glyphs (checked against the Google Fonts CSS on 2026-10-14). Bebas Neue and Instrument Serif were rejected for lacking them.

## Work, in three phases

Each phase ships on its own and leaves the site working.

### Phase 1 · New identity on the current dark site

- `src/lib/brand.ts`: replace `MARK` with the centre-circle geometry; update the identity comments; remove gold from `BRAND`.
- `src/components/layout/brand-mark.tsx`, `src/app/opengraph-image.tsx`, `src/lib/og/story-card.tsx`: draw the new mark.
- `scripts/build-brand-icons.ts`: regenerate everything in `public/brand/` and `src/app/favicon.ico`.
- `src/lib/__tests__/brand.test.ts`: update the geometry and maskable-safe-zone checks.
- `src/app/[locale]/layout.tsx`: load Newsreader; add a `font-serif` utility in `globals.css`; apply it to the home hero headline, article and page titles, and story titles in news lists.
- `docs/brand.md`: rewrite the Logo, Colour and Type sections; add the "never" rules above.

### Phase 2 · Semantic colour tokens (no visual change)

- Define the tokens above in `globals.css` (dark values only at first) and map Tailwind colours to them (`bg-background`, `text-foreground`, `text-muted`, `border-border`, `bg-surface`, `text-brand`).
- Replace hard-coded dark styling across `src/`: about 441 `text-white`, 340 `text-stadium-muted`, 125 `bg/border/text-white/…`, 19 `bg-black`, plus `stadium-*` and literal hex colours. The `stadium-*` and `lfc-*` names become aliases of the new tokens, then go once nothing uses them.
- Done when the dark site looks identical before and after (Playwright screenshots of the route manifest).

### Phase 3 · Light theme and device default

- Add the light token values; `ThemeProvider` to `enableSystem` and `defaultTheme="system"`; a theme toggle in the navbar and in the mobile menu.
- Fix what the light theme reveals: images and gradients that assumed a dark page, charts (Recharts colours from tokens), the match ticker, the chat panel, shadcn components.
- `e2e/`: run the smoke sweep in both colour schemes.

## Testing

- Unit: brand geometry and icon-match tests (existing, updated), messages parity unchanged.
- E2E: the route sweep in dark (phase 2, before/after) and in both schemes (phase 3), with the existing console and network diagnostics.
- Manual: 16 px favicon in a real browser tab, maskable icon on Android, share image in a Facebook/Zalo link preview.

## Open questions

1. Gold: keep it as a small `--highlight` for "next match" and "live" markers (proposed), or remove it entirely?
2. The `font-bebas` class name is now misleading (it renders League Gothic). Rename it to `font-display` in phase 2, or leave it?
3. Phase 2 touches about 200 files. Do it in one pull request or split it by folder (home, news, fixtures, the rest)?
