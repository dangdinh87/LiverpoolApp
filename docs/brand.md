# Anfield Daily — brand

Liverpool news, read fast: stories from 20+ English and Vietnamese outlets,
gathered in one place, de-duplicated and summed up every day. Fixtures, results
and the table come alongside. Unofficial fan site.

Code: names and colours live in `src/lib/brand.ts` (`BRAND`, `MARK`, `WORDMARK`);
static copies of the art are in `public/brand/`. Change them there, nowhere else.

## Name

- **Anfield Daily**, two words, title case in running text; caps in the wordmark.
- Never "Liverpool" or "LFC" in the name (trademark risk). Anfield and Kop are fine.
- Never call the site "for fans abroad / far from home / everywhere". It is a
  news site: say what it does with the news.

## Positioning lines

| | Vietnamese | English |
|---|---|---|
| Tagline | Tin Liverpool nhanh · Tổng hợp và tóm tắt mỗi ngày | Liverpool news, fast · Gathered and summed up daily |
| Home headline | Khỏi mở 20 tab. / Tin Liverpool ở đây. | Skip the twenty tabs. / Liverpool news, here. |
| One sentence | Anfield Daily gom tin từ {n} tờ báo tiếng Anh và tiếng Việt, lọc trùng và tóm tắt thành bản tin mỗi ngày. | Anfield Daily gathers the news from {n} English and Vietnamese outlets, drops the duplicates and sums it up in a daily briefing. |

`{n}` is `NEWS_OUTLET_COUNT` (counted from the feed config), never a typed number.

## Logo

**Mark:** two pages folded into an "A" — the front page white, the page behind
in a pale shade of the fold — with a gold rule as the crossbar (the headline
rule of a front page), on a red rounded tile. It says "newspaper" and its A is
Anfield's initial. Drawn from `MARK` in `src/lib/brand.ts`; component
`BrandMark`. Every static copy is generated: run
`npx tsx scripts/build-brand-icons.ts` after changing `MARK`.

| File | Shape |
|---|---|
| `public/brand/icon.svg`, `favicon-32.png`, `icon-192.png`, `icon-512.png`, `src/app/favicon.ico` | Rounded tile, transparent corners |
| `apple-touch-icon.png` | Full square (iOS rounds it; transparent corners would turn black) |
| `icon-maskable-512.png` | Full bleed, art at 88% inside the safe zone |

**Wordmark:** ANFIELD DAILY in League Gothic caps, letter-spacing 0.18em, a red
rule under the first letters (19% of the width). Live text on the site
(`BrandWordmark`), embedded-font SVG for elsewhere
(`public/brand/anfield-daily-wordmark.svg`).

**Lockup:** mark left, wordmark right, gap ≈ 1/3 of the mark's width (`BrandLogo`).

| Rule | Value |
|---|---|
| Smallest mark | 16 px (favicon) |
| Smallest wordmark | 80 px wide |
| Clear space | ¼ of the mark's width on every side |
| App icon | maskable copy keeps every corner of the art inside the 0.4-radius zone (tested) |

**Don't:** use the club crest, Liver bird or "YNWA" as our mark · recolour the
pages or the rule · stretch, rotate or unfold the A · set the wordmark in another font ·
put the logo on a busy photo without a dark scrim.

## Colour

| Token | Hex | Use |
|---|---|---|
| Red | `#C8102E` | Fills: mark tile, primary buttons, rules, live strip |
| Red (text) | `#FF3347` | Red text on dark (`text-brand`): passes AA (4.8:1 on surface) |
| Gold | `#F6EB61` | Sparingly: the mark's rule, highlights, "next" markers |
| Ink | `#0D0D0D` | Page background |
| Surface | `#1A1A1A` / `#252525` | Cards, raised surfaces |
| Muted | `#A0A0A0` | Secondary text |
| Line | `#2A2A2A` | Borders and dividers |

`#C8102E` is only 3:1 as text on dark: use it for fills, `#FF3347` for words.
The old pink text tint (`#FF5C75`) is retired.

## Type

| Face | Role |
|---|---|
| League Gothic (`font-bebas`) | Wordmark, page titles, scores, big numbers |
| Inter (`font-inter`) | Body, headlines of stories, UI |
| Barlow Condensed (`font-barlow`) | Short labels, buttons, table headers |

## Voice

- Plain and short. Lead with the news, not with us.
- Verbs that say what happens: "Đọc tin hôm nay", "Thêm vào lịch", "Dự đoán".
- No clickbait, no fake urgency. Scores and results respect spoiler-free mode.
- Always credit the outlet; link to the original. Say "không chính thức /
  unofficial" wherever the site could be mistaken for the club.
