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
| Tagline | Tin Liverpool mới nhất, đầy đủ ở một nơi | The latest Liverpool news, all in one place |
| Home headline | Tin Liverpool mới nhất, / đầy đủ ở một nơi. | The latest Liverpool news, / all in one place. |
| One sentence | Anfield Daily gom tin từ {n} tờ báo tiếng Anh và tiếng Việt, lọc trùng và tóm tắt thành bản tin mỗi ngày. | Anfield Daily gathers the news from {n} English and Vietnamese outlets, drops the duplicates and sums it up in a daily briefing. |

`{n}` is `NEWS_OUTLET_COUNT` (counted from the feed config), never a typed number.

## Logo

**Mark:** a pitch's centre circle seen from above — the halfway line, the
circle and the centre spot — white on a Liverpool-red rounded tile. Football at
a glance, and readable at 16 px. The halfway line is vertical and runs the full
height of the tile; never horizontal, because a bar across a ring is the London
Underground roundel. Drawn from `MARK` in `src/lib/brand.ts`; component
`BrandMark` (also used by both share images). Every static copy is generated:
run `npx tsx scripts/build-brand-icons.ts` after changing `MARK`.

| File | Shape |
|---|---|
| `public/brand/icon.svg`, `favicon-32.png`, `icon-192.png`, `icon-512.png`, `src/app/favicon.ico` | Rounded tile, transparent corners |
| `apple-touch-icon.png` | Full square (iOS rounds it; transparent corners would turn black) |
| `icon-maskable-512.png` | Full bleed; circle and spot at 88% inside the safe zone, halfway line edge to edge |

Google Search uses a favicon only if its size is a multiple of 48 px, so the
192 px PNG is declared alongside the SVG and the 32 px PNG.

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
| App icon | maskable copy keeps the circle inside the 0.4-radius zone (tested) |

**Don't:** use the club crest, Liver bird, Hillsborough flames or "YNWA" as our
mark · turn the halfway line horizontal · put text inside the tile · recolour the
tile or the lines · stretch or rotate the mark · set the wordmark in another font ·
put the logo on a busy photo without a dark scrim.

## Colour

| Token | Hex | Use |
|---|---|---|
| Red | `#C8102E` | Fills: mark tile, primary buttons, rules, live strip |
| Red (text) | `#FF3347` | Red text on dark (`text-brand`): passes AA (4.8:1 on surface) |
| Gold | `#F6EB61` | No longer a brand colour or part of the mark; kept for a few on-page highlights until the theme work decides its fate |
| Ink | `#0D0D0D` | Page background |
| Surface | `#1A1A1A` / `#252525` | Cards, raised surfaces |
| Muted | `#A0A0A0` | Secondary text |
| Line | `#2A2A2A` | Borders and dividers |

`#C8102E` is only 3:1 as text on dark: use it for fills, `#FF3347` for words.
The old pink text tint (`#FF5C75`) is retired.

## Type

| Face | Role |
|---|---|
| League Gothic (`font-bebas`) | Wordmark, section titles, scores, big numbers |
| Newsreader (`font-serif`) | Story and page headlines: home strapline, briefing, article titles, news cards |
| Inter (`font-inter`) | Body, UI |
| Barlow Condensed (`font-barlow`) | Short labels, buttons, table headers |

## Voice

- Plain and short. Lead with the news, not with us.
- Verbs that say what happens: "Đọc tin hôm nay", "Thêm vào lịch", "Dự đoán".
- No clickbait, no fake urgency. Scores and results respect spoiler-free mode.
- Always credit the outlet; link to the original. Say "không chính thức /
  unofficial" wherever the site could be mistaken for the club.
