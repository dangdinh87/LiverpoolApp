# Research: Liverpool FC News Aggregator — Sources, Caching & Content Extraction

Date: 2026-03-06 | Codebase: Next.js 16 + Supabase + Vercel hobby/pro

---

## 1. Liverpool FC News Sources Assessment

### Currently Active Sources

| Source | Method | RSS URL | LFC-specific | Quality | Issues |
|---|---|---|---|---|---|
| BBC Sport | RSS | `feeds.bbci.co.uk/sport/football/teams/liverpool/rss.xml` | Yes (team feed) | High | None — solid |
| The Guardian | RSS | `theguardian.com/football/liverpool/rss` | Yes (tag feed) | High | None — solid |
| LFC Official | Scraper (__NEXT_DATA__) | N/A | Yes | High | Fragile — Next.js structure can change silently |
| Bongda.com.vn | RSS | `bongda.com.vn/liverpool.rss` | Yes | Medium | OK |
| 24h.com.vn | RSS + keyword filter | `cdn.24h.com.vn/upload/rss/bongda.rss` | Partial (filtered) | Medium | Low signal/noise |
| Bongdaplus.vn | Scraper (cheerio) | None found | Partial | Medium | Client-rendered — minimal content in static HTML |

### Potential Additions

| Source | RSS Available | RSS URL | Paywall | LFC-specific | Difficulty | Verdict |
|---|---|---|---|---|---|---|
| Sky Sports | Yes | `skysports.com/rss/12040` (general) | No | Partial — mix of all sports | Easy | **ADD** — general feed, filter "Liverpool" |
| This Is Anfield | Yes | `thisisanfield.com/feed` | No | Yes — LFC fan site | Easy | **ADD** — high LFC signal, free WordPress RSS |
| Liverpool Echo | Yes | `liverpoolecho.co.uk/sport/football/liverpool-fc/?service=rss` (Mirror pattern) | Partial (some behind reg-wall) | Yes | Easy | **ADD** — best local coverage |
| Anfield Watch | Yes | `anfieldwatch.co.uk/feed` | No | Yes — LFC fan site | Easy | **ADD** — lightweight, LFC-only |
| Goal.com | Likely no | No public RSS found in 2025 | No | Partial | Scraping = hard (CSR) | Skip |
| ESPN FC | No | No public RSS found | No | Partial | Scraping = hard | Skip |
| The Athletic | No | No public RSS | Yes — full paywall | Yes | Blocked | Skip |
| Football365 | Yes | `football365.com/feed` | No | Partial | Easy | Optional — low LFC density |

### Recommended Additions (prioritized)
1. **This Is Anfield** — `https://www.thisisanfield.com/feed` — LFC-specific, high quality, free WordPress RSS
2. **Liverpool Echo** — Mirror Group RSS pattern, best local journalism, slight reg-wall risk
3. **Sky Sports** — `https://www.skysports.com/rss/12040` — add keyword filter "liverpool"
4. **Anfield Watch** — `https://www.anfieldwatch.co.uk/feed` — niche but 100% LFC

### Drop Candidates
- **Bongdaplus.vn** — client-rendered, cheerio scraper yields near-zero content body, high maintenance. Either drop or accept as thumbnail-only cards.
- **24h.com.vn** — low precision filter. Many non-LFC articles pass through. Acceptable if keyword filter is tightened.

---

## 2. Caching & Data Persistence Strategies

### Current State
- ISR `revalidate: 1800` (30 min) on the news page
- `React.cache()` deduplicates per-request within a single render
- No persistent storage — every ISR cycle re-fetches all sources

### Should Articles Be Stored in Supabase PostgreSQL?

**Pros:**
- Enables incremental fetch (only pull articles newer than `max(pubDate)`)
- Deduplication persists across deploys/cold starts
- Can serve stale data if sources go down
- Enables future features (search, bookmarks, read tracking)

**Cons:**
- Schema + migration overhead
- Supabase free tier: 500MB storage — news text is tiny but image URLs add up over months
- Requires a background job or cron to populate (not available on Vercel hobby without external trigger)
- Adds latency to the critical path unless decoupled from SSR

**Verdict:** Worth it if planning long-term. For a fan site now: **defer DB persistence**, use a simpler Redis/KV cache layer first.

### Vercel KV vs Upstash Redis

| Factor | Vercel KV | Upstash Redis |
|---|---|---|
| Free tier | 256MB, 30K requests/month | 10K commands/day free |
| Pricing model | Per GB + per request | Per command |
| Latency | Edge-native, low | HTTP-based, ~5-10ms |
| Next.js integration | First-class (`@vercel/kv`) | Official SDK (`@upstash/redis`) |
| Connection model | HTTP (serverless-safe) | HTTP (serverless-safe) |
| Verdict | **Simpler if already on Vercel** | Better value if high command volume |

For a fan site with ISR and minimal traffic: **Vercel KV is the pragmatic choice** — one less vendor, simpler billing, native `next/cache` integration. If already on Supabase, use Upstash (avoids Vercel lock-in).

### Incremental Fetching Pattern

```typescript
// Pattern: store last fetch timestamp per source
const lastFetch = await kv.get<string>(`news:lastFetch:${source}`);
const articles = await fetchFeed(url);
const newOnly = lastFetch
  ? articles.filter(a => new Date(a.pubDate) > new Date(lastFetch))
  : articles;
await kv.set(`news:lastFetch:${source}`, new Date().toISOString());
```

- RSS feeds return 10-20 items — filtering by pubDate is sufficient
- Don't bother with ETags/If-Modified-Since: RSS servers rarely implement them correctly

### Deduplication Strategies

- **URL normalization** (current approach): strip protocol/www/trailing slash → fast, O(n), works well for same-source dedup
- **Title similarity** (fuzzy): `fast-fuzzy` or Levenshtein — catches cross-source rewrites but adds ~50ms per article pair, O(n²) — overkill for <100 articles
- **Recommendation**: Keep URL dedup. Add title-prefix dedup (first 60 chars normalized) as a cheap second pass.

```typescript
const titleKey = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60);
```

### Cache Invalidation

- **ISR `revalidate: 1800`** is correct for news — no need for on-demand revalidation unless breaking news matters
- For fresher UX without revalidation cost: cache articles in KV with 30min TTL, serve from KV on all requests, background-refresh when stale
- Pattern: **stale-while-revalidate** via `next/cache` `revalidateTag()` triggered by a webhook or cron

### API Budget (100 req/day API-Football)
This constraint applies to the football API, not news sources. News RSS feeds are unlimited. No conflict.

---

## 3. Article Content Extraction Best Practices

### @mozilla/readability (Node.js)

- **Package**: `@mozilla/readability` — actively maintained (Mozilla), last release 2024
- **Requires**: `jsdom` for DOM parsing (or `linkedom` as lighter alternative)
- **Works server-side**: Yes — no browser needed
- **Returns**: `{ title, content, textContent, excerpt, byline, siteName, lang }`
- **Accuracy**: High for server-rendered articles (BBC, Guardian, LFC), poor for client-rendered (bongdaplus)
- **Size**: `jsdom` adds ~5MB to bundle — acceptable for server-side only; use dynamic import

```typescript
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

const dom = new JSDOM(html, { url });
const reader = new Readability(dom.window.document);
const article = reader.parse(); // { title, content, textContent, excerpt }
```

- **Verdict**: Replace per-site cheerio extractors with Readability as primary + cheerio as fallback for structure-specific extraction. Reduces maintenance significantly.

### Client-Rendered Sites (Bongdaplus) Without Headless Browser

No good solution without a browser. Options ranked:

1. **Google AMP cache** (`https://cdn.ampproject.org/c/s/{domain}/{path}`) — Works only if the site has an AMP version. Bongdaplus does not have AMP. **Not applicable.**
2. **Google Cache** (`webcache.googleusercontent.com`) — **Deprecated and removed in 2024.** Not available.
3. **Archive.org Wayback Machine API** — Returns cached HTML. Too slow (2-5s latency), unreliable for fresh articles.
4. **Accept degraded content** — For bongdaplus: serve OG meta only (title + og:image + og:description). Already partially implemented in `extractBongdaplus()`.
5. **Pre-rendered proxy service** — Prerender.io, BrowserlessIO ($) — adds cost/complexity for a fan site. Not worth it.

**Recommendation**: Drop bongdaplus article body extraction. Keep it as a news card source (title + thumbnail from OG meta). Document this limitation.

### HTML Sanitization

| Library | Server-side | Bundle size | Maintenance | Use case |
|---|---|---|---|---|
| `sanitize-html` | Yes — Node-native | Small | Active | Server-side news content cleaning |
| `DOMPurify` | Requires jsdom | Larger | Active | Browser or when jsdom already present |

**Use `sanitize-html`** for stripping unsafe tags from scraped content before rendering. DOMPurify is browser-first; `sanitize-html` is the server-native choice.

```typescript
import sanitizeHtml from 'sanitize-html';
const clean = sanitizeHtml(article.content, {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
  allowedAttributes: { 'a': ['href'], 'img': ['src', 'alt'] },
});
```

### CSS Selector Patterns That Reliably Identify Article Body

Ranked by prevalence across sports news sites:

```
article                          // Semantic HTML5 — BBC, Guardian, LFC
[role="main"]                    // Accessibility landmark — common fallback
.article-body                    // Generic CMS pattern
.entry-content                   // WordPress default
.cms-body                        // Vietnamese news sites (24h, bongda)
.detail-content                  // Common Vietnamese/Asian news CMS
[data-testid*="article"]         // React-based sites with test IDs
.story-body                      // Guardian legacy
[class*="ArticleBody"]           // CSS-in-JS naming (Sky Sports, Athletic)
```

Order of preference: try semantic first, then landmark, then class-based.

---

## Unresolved Questions

1. **Liverpool Echo RSS URL**: The Mirror Group pattern (`?service=rss`) needs verification — the actual URL `liverpoolecho.co.uk/sport/football/liverpool-fc/?service=rss` should be tested to confirm it returns valid RSS.
2. **LFC Official stability**: The `__NEXT_DATA__` path `data.props.pageProps.data.newsPage.results` — how often does LFC update their Next.js data shape? Should there be a version hash check?
3. **This Is Anfield rate limiting**: WordPress sites sometimes throttle RSS fetching if polled too frequently. Need to test at 30min intervals.
4. **Bongdaplus long-term**: If the scraper value is minimal (OG meta only), is it worth keeping at all for a primarily English-audience fan site?
5. **Readability + jsdom bundle impact**: jsdom is ~5MB — acceptable for server route handlers but needs verification it doesn't affect cold start on Vercel serverless functions significantly.
6. **Vercel KV availability on hobby plan**: Free tier limits (30K req/month) — at ISR 1800s that's ~1440 revalidations/day. Need to count KV reads/writes per revalidation cycle to avoid hitting limits.

---

## Sources
- [rss.feedspot.com — Liverpool RSS Feeds](https://rss.feedspot.com/liverpool_rss_feeds/)
- [This Is Anfield](https://www.thisisanfield.com/)
- [Sky Sports RSS](https://www.skysports.com/rss/12040)
- [@mozilla/readability npm](https://www.npmjs.com/package/@mozilla/readability)
- [Upstash Redis + Next.js](https://upstash.com/blog/nextjs-caching-with-redis)
- [Supabase + Next.js caching](https://supabase.com/blog/fetching-and-caching-supabase-data-in-next-js-server-components)
- [Google AMP Cache docs](https://developers.google.com/amp/cache/overview)
- [WebcrawlerAPI Readability guide](https://webcrawlerapi.com/blog/how-to-extract-article-or-blogpost-content-in-js-using-readabilityjs)
