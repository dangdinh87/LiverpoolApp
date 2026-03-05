---
phase: 3
title: "Data Enhancement & Polish"
status: Planned
effort: 1.5h
depends: [phase-01, phase-02]
---

# Phase 03 — Data Enhancement & Polish

## Context
- Parent plan: [plan.md](plan.md)
- Current pages missing 2025-26 data (api-football stuck on 2024)

## Overview
Enhance existing pages with FPL 2025-26 data. Update stats/standings/fixtures to show current season. Add features the app currently lacks.

## Requirements

### 1. Update existing pages to 2025-26
- `/stats` — Update header "2024/25" → "2025/26", use FPL top scorers/assists
- `/standings` — Use FPL team data (position, points, W/D/L derived)
- `/fixtures` — Show 2025-26 fixtures from FPL
- `/season` — Update to 2025/26 dashboard

### 2. Add missing features (data from FPL that app doesn't show yet)
- **Injury/availability widget** on squad page sidebar — FPL has `status`, `news`, `chance_of_playing_*`
- **xG/xA stats** on stats page — FPL has expected_goals, expected_assists for all players
- **Form indicator** — FPL `form` field (last 5 GWs points average)
- **Price/value data** — FPL `now_cost`, `cost_change_*` (unique to FPL)
- **Current Gameweek info** — show on homepage (GW number, deadline)

### 3. Homepage enhancement
- Show current GW number + next deadline in hero/bento
- Add "Top Performers This GW" mini-widget

## Implementation Steps

### 1. Stats page update
- Change season labels to 2025/26
- FPL provider already returns topScorers/topAssists in correct format
- Add xG/xA columns to Liverpool Scorers table

### 2. Injury widget integration
- Wire existing `injury-widget.tsx` component to FPL injury data
- Show on `/squad` page sidebar or as banner
- Filter: status != 'a' (injured/doubtful/suspended/unavailable)

### 3. Homepage GW widget
- Fetch current event from bootstrap
- Display: "Gameweek {N}" + deadline countdown
- "Top LFC performers" — top 3 Liverpool players by event_points

### 4. Env var documentation
- Update .env.example with new vars
- Document provider switching in README-like comments

## Todo
- [ ] Update stats page season labels + add xG/xA
- [ ] Wire injury widget to FPL data
- [ ] Add GW info to homepage
- [ ] Update .env.example
- [ ] Final build + type check

## Success Criteria
- All pages show 2025-26 data when FPL provider active
- Injury widget displays on squad page
- xG/xA visible on stats page
- Homepage shows current gameweek
- No regressions on existing pages
