---
title: "News Feature Rebuild"
description: "Multi-source RSS (EN+VN), image handling, hero+grid layout, language badges"
status: done
priority: P2
effort: 5h
branch: master
tags: [news, rss, scraping, ui, i18n]
created: 2026-03-05
---

# News Feature Rebuild

## Problem
Current news page: single BBC Sport RSS, no images, no VN sources, text-heavy UI.

## Solution
Multi-source news aggregation (EN + VN), modern Hero+Grid+List layout, language badges.

## Validated Requirements (from user interview)
- **Sources EN**: BBC Sport, The Guardian (LFC-specific RSS)
- **Sources VN**: Bongda.com.vn (RSS), 24h.com.vn (RSS filtered), Bongdaplus.vn (scraping)
- **No category filtering** — keep simple
- **Layout**: Hero + Grid + Compact List
- **Language badges**: VN / EN on each article
- **External links only** (no in-app reading)

## Phases

| # | Phase | Effort | Status |
|---|-------|--------|--------|
| 1 | [Multi-Source Backend](./phase-01-multi-source-backend.md) | 2h | **Done** |
| 2 | [News Page UI Redesign](./phase-02-news-page-redesign.md) | 2h | **Done** |
| 3 | [Homepage News Update](./phase-03-homepage-news-update.md) | 1h | **Done** |

## Architecture

```
Before:  getNews() -> BBC RSS -> NewsArticle[]
After:   getNews() -> [BBC, Guardian, Bongda, 24h, Bongdaplus] -> merge/dedup/sort -> NewsArticle[]
                       ↑ RSS ↑  ↑ RSS ↑    ↑ RSS ↑  ↑RSS+filter↑  ↑ scrape ↑
```

## Sources

| Source | Method | Lang | Feed URL |
|--------|--------|------|----------|
| BBC Sport | RSS | EN | `feeds.bbci.co.uk/.../liverpool/rss.xml` |
| Guardian | RSS | EN | `theguardian.com/football/liverpool/rss` |
| Bongda.com.vn | RSS | VN | `bongda.com.vn/liverpool.rss` |
| 24h.com.vn | RSS+filter | VN | `cdn.24h.com.vn/upload/rss/bongda.rss` |
| Bongdaplus.vn | Scraping | VN | `bongdaplus.vn/liverpool` |

## Risks
- Bongdaplus scraping fragile (site layout changes → fallback gracefully)
- 24h may have few LFC articles (filter by "Liverpool" keyword)
- VN RSS image formats may differ
