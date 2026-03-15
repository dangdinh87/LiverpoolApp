# Code Review — Phase 04: Sitemap + Robots + Hreflang

**Date:** 2026-03-15
**Scope:** Sitemap/robots implementation for Liverpool FC Vietnam fan site

---

## Code Review Summary

### Scope
- Files reviewed: 4
  - `src/lib/news/db.ts` (lines 282-298, new function `getArticleSitemapData`)
  - `src/lib/news/digest.ts` (lines 264-277, new function `getAllDigestDates`)
  - `src/app/sitemap.xml/route.ts` (121 lines, full rewrite)
  - `src/app/robots.txt/route.ts` (17 lines, new)
- TypeScript: clean (`tsc --noEmit` — 0 errors)
- Lint: 0 errors in reviewed files (pre-existing errors elsewhere, unrelated)

### Overall Assessment

Solid implementation. All 4 files are clean, well-scoped, and correctly handle failures. XML structure is valid. hreflang strategy (same URL for both locales — cookie-based i18n) is correct per Google's guidance. Minor issues only.

---

## Critical Issues

None.

---

## High Priority Findings

**H1 — `encodeArticleSlug` includes query string in sitemap URL (potential `/*?*` self-block)**

In `sitemap.xml/route.ts:88`:
```ts
const slug = encodeArticleSlug(a.url);
```

`encodeArticleSlug` in `news-config.ts:83` includes `u.search` in the slug:
```ts
const path = (u.pathname + u.search).replace(/^\//, "");
```

If any article URL contains a query string (e.g., `?utm_source=rss`), the resulting sitemap URL will be `/news/bbc/sport/football/article?utm_source=rss`. That URL then matches the `Disallow: /*?*` rule in robots.txt — bots are told to crawl it (sitemap) but also told to ignore it (robots). This is a logical contradiction that could confuse crawlers.

**Fix:** Strip query params in `encodeArticleSlug` (or at sitemap build time):
```ts
const slug = encodeArticleSlug(a.url.split("?")[0]);
// or fix encodeArticleSlug to use u.pathname only
```

---

## Medium Priority Improvements

**M1 — `robots.txt` has redundant `/profile` and `/profile/` directives**

```
Disallow: /profile
Disallow: /profile/
```

A single `Disallow: /profile/` covers both (bots treat the path prefix as matching `/profile` too per RFC 9309 / Google's interpretation). The double entry is not harmful but is noise.

**M2 — `getFixtures()` called in sitemap with no `is_active` or date filter**

`sitemap.xml/route.ts:37` calls `getFixtures()` (Football-Data.org API, 10 req/min free tier). The sitemap is cached 1h, so this fires at most once per hour. However:
- If Football-Data.org is down, the fixture URLs are silently omitted (acceptable — `Promise.allSettled`)
- The function returns ALL fixtures (past + future). Past fixtures already have a canonical date, which is fine. But this means the sitemap will include fixtures from months ago that may have been indexed already as dead pages.
- Consider filtering to last 30 + next 60 days for freshness, but this is low risk given `priority: "0.5"` and `changefreq: "weekly"`.

**M3 — `getAllDigestDates` not wrapped in `React.cache()`**

`getArticleSitemapData` and `getAllDigestDates` are plain `async function` exports. The sitemap route calls them once, so dedup isn't needed. But for consistency with the rest of `digest.ts` (which uses `cache()` on `getDigestByDate`), and to protect against future double-calls from concurrent renders, wrapping in `cache()` would be idiomatic. Low priority since these are called once at request time in a Route Handler.

---

## Low Priority Suggestions

**L1 — `changefreq: "never"` for article/digest pages is semantically odd**

`"never"` signals the content will never change. While articles rarely update, Google ignores `changefreq` in practice. `"monthly"` is more accurate and conventional for archived content. Not a bug.

**L2 — Static routes use `today` as `lastmod` for all pages**

`/history`, `/about`, and `/gallery` are tagged with today's date every time the sitemap regenerates. For truly static pages this creates false freshness signals. Using a hardcoded date (e.g., last known deploy date) or omitting `lastmod` would be more honest. Google may discount `lastmod` when it changes too frequently with no real content update.

**L3 — `escapeXml` only escapes `&`, `<`, `>`**

Missing `"` → `&quot;` and `'` → `&apos;`. In practice, URLs passed through `siteUrl` and `encodeArticleSlug` won't contain raw quotes (they'd be percent-encoded), so this is not a real vulnerability. Safe to leave.

---

## Positive Observations

- `Promise.allSettled` pattern for DB calls is exactly right — sitemap degrades gracefully to static + player URLs without crashing.
- `getArticleSitemapData` correctly selects only 2 columns (`url, published_at`), avoids pulling the heavy `ARTICLE_COLUMNS` blob.
- `getAllDigestDates` caps at 90 rows — matches the article 90-day window, sensible.
- `is_active` filter on article sitemap query prevents surfacing soft-deleted articles to crawlers.
- hreflang pointing same URL for vi/en/x-default is the correct approach for cookie-based locale switching (not path/subdomain based).
- `Cache-Control: public, max-age=3600, s-maxage=3600` on sitemap is appropriate.
- robots.txt correctly blocks `/api/`, `/auth/`, `/chat`, and query-param URLs while leaving all public content open.
- No secrets, no service-role key exposed in output, no injection surface.

---

## Recommended Actions

1. **[H1 — Fix]** Strip query strings from article URLs before passing to `encodeArticleSlug` in sitemap builder, or update `encodeArticleSlug` to exclude `u.search`. Prevents sitemap↔robots contradiction.
2. **[M1 — Cleanup]** Remove the redundant `Disallow: /profile` line (keep `/profile/`).
3. **[M2 — Optional]** Filter fixtures to a date window (e.g., -30d to +90d) to keep sitemap focused on fresh/upcoming content.
4. **[L2 — Optional]** Use a fixed deploy date or omit `lastmod` for `/history`, `/about`, `/legal`.

---

## Metrics

- Type Coverage: 100% (clean `tsc --noEmit`)
- Linting Issues in reviewed files: 0
- Estimated sitemap URLs: ~620 (within 50K limit)
- DB queries: 2 lightweight (2-column selects, limited, indexed by date)

---

## Score: 8.5/10

Clean, pragmatic implementation. H1 is a real logical issue (sitemap lists URLs that robots.txt blocks). Everything else is polish.

---

## Unresolved Questions

- Does `encodeArticleSlug` ever produce URLs with query strings in production data? (Check RSS sources — some like Google News RSS include `?q=` in article URLs.) If yes, H1 becomes blocking.
