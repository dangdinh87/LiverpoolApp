---
title: "Liverpool FC Fan Site"
description: "Premium dark-themed fan site with real-time data, auth, and stunning UI"
status: pending
priority: P1
effort: 16h
branch: main
tags: [nextjs, supabase, tailwind, football, api-football]
created: 2026-03-03
---

# Liverpool FC Fan Site

## Overview

10-page Next.js 15 App Router site with "Dark Stadium" design, API-Football data (team 40, league 39), Supabase auth/storage, ISR caching, and Framer Motion animations.

## Phases

| # | Phase | Effort | Status | File |
|---|-------|--------|--------|------|
| 1 | Project Setup & Infrastructure | 3h | `pending` | [phase-01-project-setup.md](./phase-01-project-setup.md) |
| 2 | Core Data Pages (Squad, Fixtures, Standings) | 4h | `pending` | [phase-02-core-data-pages.md](./phase-02-core-data-pages.md) |
| 3 | Homepage, Stats & News | 4h | `pending` | [phase-03-homepage-stats-news.md](./phase-03-homepage-stats-news.md) |
| 4 | Auth & User Profile | 3h | `pending` | [phase-04-auth-profile.md](./phase-04-auth-profile.md) |
| 5 | History, Polish & Deploy | 2h | `pending` | [phase-05-history-polish.md](./phase-05-history-polish.md) |

## Key Decisions

- **API proxy**: All API-Football calls go through `/api/football/` route handlers to hide API key
- **ISR strategy**: squad 24h, fixtures 1h, standings/stats 6h, news 30min
- **Auth**: Supabase Auth (email + Google OAuth), middleware-protected `/profile`
- **Static data**: `/data/*.json` for history/trophies/legends (no API needed)
- **Fonts**: `next/font/google` for Bebas Neue + Inter (no external requests)

## API-Football Reference

- Team ID: `40` (Liverpool FC)
- League ID: `39` (Premier League)
- Season: `2024`
- Free tier: 100 requests/day -- ISR caching is critical

## Tech Stack Summary

Next.js 15 | TypeScript | Tailwind CSS | shadcn/ui | Framer Motion | Supabase | API-Football | recharts | rss-parser | next-themes | Vercel
