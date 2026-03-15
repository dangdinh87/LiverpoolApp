---
title: "SEO Optimization — Liverpool FC Vietnam"
description: "Comprehensive SEO overhaul: structured data, sitemap, hreflang, per-page metadata, Core Web Vitals"
status: pending
priority: P1
effort: 12h
branch: master
tags: [seo, performance, i18n, structured-data]
created: 2026-03-15
---

# SEO Optimization Plan

## Goal
Transform the site from basic SEO (root-level metadata + minimal sitemap) to a fully optimized bilingual sports fan site with rich structured data, complete sitemap coverage, hreflang support, and Core Web Vitals tuning.

## Current State
- Root layout has WebSite/SportsTeam/Organization JSON-LD, basic OG/Twitter metadata
- `seo.ts` only provides `makePageMeta()` for OG/Twitter cards
- Sitemap covers static routes + player slugs; misses news articles, gallery, fixtures/[id], digest
- No hreflang tags, no per-page structured data, no BreadcrumbList
- No query param disallow in robots.txt

## Phases

| # | Phase | Effort | Status | File |
|---|-------|--------|--------|------|
| 1 | SEO Infrastructure | 2h | done | [phase-01](./phase-01-seo-infrastructure.md) |
| 2 | Per-Page Metadata Optimization | 2.5h | done | [phase-02](./phase-02-metadata-optimization.md) |
| 3 | Structured Data (JSON-LD) | 3h | done | [phase-03](./phase-03-structured-data.md) |
| 4 | Sitemap + Robots + Hreflang | 2.5h | pending | [phase-04](./phase-04-sitemap-robots-hreflang.md) |
| 5 | Core Web Vitals & Performance | 2h | pending | [phase-05](./phase-05-performance-cwv.md) |

## Priority Order
1. **Phase 1 + 3** (structured data infrastructure + implementation) — highest Google rich result impact
2. **Phase 4** (sitemap/hreflang) — indexation coverage + bilingual SEO
3. **Phase 2** (metadata) — keyword optimization per page
4. **Phase 5** (CWV) — ranking signal, but site likely already fast with SSR

## Success Metrics
- Google Rich Results Test passes for NewsArticle, SportsEvent, BreadcrumbList, Person
- Sitemap covers 100% of indexable URLs (static + dynamic)
- All pages have bidirectional hreflang (vi/en)
- Lighthouse SEO score >= 95
- Core Web Vitals: LCP < 2.5s, CLS < 0.1, INP < 200ms

## Validation Summary

**Validated:** 2026-03-15
**Questions asked:** 6

### Confirmed Decisions
- **i18n URL strategy:** Keep cookie-based (same URL for both locales). No path-based refactor.
- **AI bot blocking:** Allow all bots — no GPTBot/CCBot blocking in robots.txt
- **Sitemap article limit:** 90 days most recent (~500 articles max)
- **Chat widget:** Lazy-load GlobalChat via `next/dynamic` (reduce initial bundle)
- **Domain:** `https://www.liverpoolfcvn.blog` (not .vn — international domain)
- **Google Search Console:** Not set up yet — will configure after SEO implementation

### Action Items (plan adjustments needed)
- [ ] Phase 04: Remove AI bot blocks from robots.txt plan (user wants all bots allowed)
- [ ] Phase 04: Update `NEXT_PUBLIC_SITE_URL` references to `https://www.liverpoolfcvn.blog`
- [ ] All phases: Domain is `.blog` not `.vn` — adjust any .vn-specific SEO recommendations

## Research
- [Technical SEO & CWV](./research/researcher-01-technical-seo-nextjs.md)
- [Vietnamese SEO & Structured Data](./research/researcher-02-vietnamese-seo-structured-data.md)
