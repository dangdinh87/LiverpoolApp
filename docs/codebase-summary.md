# Codebase Summary

High-level overview of Liverpool FC Vietnam fan site architecture and key systems.

---

## SEO Infrastructure (Phase 01-03)

Comprehensive SEO implementation with structured data, per-page optimization, and bilingual support.

**Core Components:**
- `src/lib/seo.ts`: 8 builder functions for JSON-LD schemas (BreadcrumbList, NewsArticle, SportsEvent, Person, ImageGallery, WebSite, SportsTeam, Organization)
- `src/components/seo/json-ld.tsx`: XSS-safe server component for structured data injection
- Per-page canonical URLs and hreflang alternates on all pages
- BreadcrumbList on 12 pages (squad, player, fixtures, standings, news, digest, stats, history, gallery, about)
- NewsArticle schema on 2 pages (article detail + daily digest)
- Person schema on player detail pages
- SportsEvent schema on match fixture pages
- ImageGallery schema on gallery page
- Chat page marked with `noindex` meta tag
- 19 SEO unit tests covering all builders and edge cases

**Coverage:**
- Structured data validated with Google Rich Results Test
- All dynamic pages have canonical URLs matching domain
- Bidirectional hreflang for EN/VI locale switching
- Breadcrumb trails render in search result snippets
- News articles eligible for Google News carousel

---
