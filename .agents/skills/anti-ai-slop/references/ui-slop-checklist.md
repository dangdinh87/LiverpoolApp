# UI & Layout Slop Checklist

Review each item against rendered mobile (`390x844`) and desktop (`1440x900`) screens.

## 1. Stacked Sub-Navigation
- **Slop:** Two horizontal nav rows back-to-back below `PageHero` (e.g., `SectionSubNav` pill bar stacked directly above `MatchCentreNav` or `HistoryNav`).
- **Fix:** Keep strictly one sub-navigation row per page. Add missing links directly into that single nav when needed, or omit `SectionSubNav` on routes that already render their own nav.

## 2. Redundant Summary Strips
- **Slop:** Adding a 4-tile `DataPulseStrip` directly above `StandingsSummary` or `SeasonOverview` showing the exact same rank, points, W-D-L, or form figures.
- **Fix:** Render each summary metric once per page. If a page lacks an overview entirely (e.g., `/squad` or `/fixtures`), keep one tight 1px hairline strip whose cells use real numbers only.

## 3. Zero-Value or Label-Only KPI Tiles
- **Slop:** Rendering a 4-column KPI box where one cell reads `0 Out on Loan` or `Injury Watch / Check current squad status` without an actual count.
- **Fix:** Filter out zero/empty KPI entries before rendering (`items.filter(...)`), and let the remaining cards fill cleanly or show a text link instead.

## 4. Cookie-Cutter "Connected Sections" 4-Card Walls
- **Slop:** Identical dark bordered boxes stamped at the bottom of every route with top red/gold bars, shouting badges (`INTERACTIVE`, `TABLE`, `PLATFORM`), verbose marketing blurbs, and oversized headings (`Explore <Site> / Connected Sections`).
- **Fix:** Use a quiet 1px hairline ledger (`border-y border-[var(--line)] gap-px bg-[var(--line)]`) with compact section heading, clean link titles, live figures when available, and concise single-line descriptions — or link straight from contextual entities in the article/table itself.

## 5. Mobile Above-the-Fold Bloat
- **Slop:** Stacking hero + sub-nav + 4-tile strip + filter bar before the user sees the primary list or table on a `390px` screen.
- **Fix:** Keep mobile heroes compact (`pb-4`), avoid duplicate bars, and never inject generic widgets ahead of the primary content when the hero + single nav already orient the reader.
