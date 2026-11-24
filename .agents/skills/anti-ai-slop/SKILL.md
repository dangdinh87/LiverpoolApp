---
name: anti-ai-slop
description: >-
  Audit and refactor UI layouts, bilingual EN/VI copy, cross-page navigation,
  and frontend components to eliminate generic AI-generated templates ("AI
  slop") — duplicate sub-navs, redundant KPI walls, zero-value placeholder
  tiles, cookie-cutter promo card grids, and cliché phrasing — in favour of
  crisp, authentic editorial craft.
---

# Anti-AI-Slop Editorial & UI Audit

Use this workflow whenever reviewing or refactoring pages, dashboards, navigation, or copy generated for web apps (especially dark editorial sports publications). Subtraction beats decoration: keep only elements that earn their pixels and match the product's voice.

## Workflow

1. **Audit Chrome & Density First**
   Before writing or adding UI on a route, list every existing:
   - Navigation bar / tab strip (`sticky`, pill bars, anchor bars, jump pills)
   - Summary / KPI strip (`<dl>`, stat tiles, highlights)
   - Footer / cross-link section
   - Brand & club emblems

2. **Apply Hard Subtraction Rules (UI & Layout)**
   - **Max 1 local sub-navigation bar per page**: Extend existing route navigation (`MatchCentreNav`, `HistoryNav`, anchor pills) rather than stacking a second horizontal bar above or below it.
   - **Zero duplicate KPI strips & zero empty/zero tiles**: Never stack a second stat strip above an existing summary (`StandingsSummary`, `SeasonOverview`, `History` club facts). Omit any metric card whose live value is `0`, `"—"`, or label-only filler copy.
   - **No boilerplate 4-card promo walls**: Strip loud "Explore / Connected Sections" boxes (`uppercase badge` + `coloured top accent bar` + `arrow` + `card wall`) from page footers. Replace them with a quiet 1px hairline editorial directory or contextual inline links attached directly to real domain entities (player names, opponents, injury counts, next kick-off).
   - **Eliminate nested borders & decorative noise**: Never put bordered boxes inside bordered boxes without clear grouping, nor decorative badges that carry no filtering or status meaning.
   - **Anchor real domain identity**: Show authentic team/club iconography (e.g. Liverpool FC crest accents on club and match heroes while preserving editorial publication separation in nav/brand marks) instead of generic dark rectangular cards.

3. **Scrub Bilingual Copy (EN & VI)**
   - Consult [copy-slop-blacklist.md](./references/copy-slop-blacklist.md).
   - Replace meta-marketing words (`Pulse`, `Hub`, `Explore`, `Connected Sections`, `Interactive`, `Platform`, `Nhịp đập`, `Chuyên mục liên kết`, `Khám phá`) with factual newsroom labels (`Season at a glance`, `More from the club`, `Toàn cảnh mùa giải`, `Xem thêm về Liverpool`).
   - Tighten card descriptions to single-line concrete facts.

4. **Keep Code & Architecture Clean**
   - Avoid giant catch-all preset wrappers when route-specific inline links communicate better.
   - Guard optional stats at the data layer instead of passing `"—"` or placeholder text just to fill a 4-column grid.

5. **Verify**
   - Check every changed route on mobile (`390x844`) and desktop (`1440x900`) — confirm zero horizontal overflow, clean visual hierarchy above the fold, and crisp contrast.
   - Run `npx tsc --noEmit && npm test && npm run lint` before reporting completion.

## References
- [UI & Layout Slop Checklist](./references/ui-slop-checklist.md)
- [Bilingual Copy Slop Blacklist](./references/copy-slop-blacklist.md)
