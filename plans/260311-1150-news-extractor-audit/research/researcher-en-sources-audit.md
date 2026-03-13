# News Extractor HTML Structure Audit — English Sources
**Date**: 11 Mar 2026 | **Testing Framework**: Cheerio server-side parsing  
**Scope**: 7 English Liverpool FC news sources — real article testing

---

## Audit Results

### 1. liverpoolfc.com
- **URL tested**: `https://www.liverpoolfc.com/news/galatasaray-1-0-liverpool-watch-champions-league-action-and-full-match`
- **Rendering**: SSR (Next.js + JSON in `#__NEXT_DATA__`)
- **Container**: `main` selector works (5,144 chars, 3 `<p>` tags), OR `#__NEXT_DATA__` JSON parsing for structured content
- **Paragraph structure**: `<p>` tags + `<iframe>` embeds (videos)
- **Image structure**: `<img src>` within `main`, `figure` count: 0 in main
- **OG tags**: Present (`og:title`, `og:image`)
- **Current extractor**: MATCH — Uses `#__NEXT_DATA__` → `article.body[]`, fallback to `main` → `p`
- **Status**: ✅ Working (SSR + JSON both viable)
- **Fix needed**: None — dual extraction paths ensure robustness

---

### 2. bbc.com/sport
- **URL tested**: Attempted `https://www.bbc.com/sport/football/teams/liverpool` (landing page only; specific article unreachable during audit)
- **Rendering**: CSR (JavaScript-heavy, likely React/Preact)
- **Container**: Likely `article` or `[role=main]` (typical BBC structure)
- **Paragraph structure**: `<p>` tags (standard BBC article markup)
- **Image structure**: `<img src>` elements (BBC CDN: `bbcimg.co.uk`)
- **OG tags**: Expected to be present
- **Current extractor**: LIKELY MATCH — `article` or `[role=main]` → `p`
- **Status**: ⚠️ Partial — CSR may cause timing issues if scraper doesn't wait for JS execution
- **Fix needed**: Ensure scraper waits for DOM hydration; BBC uses client-side rendering

---

### 3. theguardian.com
- **URL tested**: `https://www.theguardian.com/football/2026/mar/10/galatasaray-liverpool-champions-league-last-16-first-leg-match-report`
- **Rendering**: SSR (server-rendered HTML, no `#__NEXT_DATA__`)
- **Container**: `article` selector works perfectly (8,002 chars, **17 `<p>` tags**, 5 `<figure>` elements)
- **Paragraph structure**: `<p>` tags — primary content unit, good density
- **Image structure**: `<figure>` + `<img src='https://i.guim.co.uk/...'` within figures, proper caption support
- **OG tags**: Present (`og:title`, `og:image`)
- **Current extractor**: MATCH — `article` → `p` works, bonus: `figure` structure for rich images
- **Status**: ✅ Working (clean SSR, rich semantic markup)
- **Fix needed**: None — Guardian HTML is well-structured for cheerio parsing

---

### 4. thisisanfield.com
- **URL tested**: Redirect error (`net::ERR_TOO_MANY_REDIRECTS`) — site unreachable
- **Rendering**: Unknown (WordPress suspected)
- **Container**: Likely `.entry-content` or `.post-content` (WordPress standard)
- **Current extractor**: UNKNOWN — code assumes WordPress structure
- **Status**: ❌ Broken — Site has redirect loop; requires investigation before deployment
- **Fix needed**: Test alternative domain or verify site availability; confirm WordPress plugin hasn't broken structure

---

### 5. anfieldwatch.co.uk
- **URL tested**: `https://www.anfieldwatch.co.uk` — page loaded successfully
- **Rendering**: SSR (static WordPress site)
- **Container**: Likely `.entry-content` or `article` (WordPress standard)
- **Paragraph structure**: Likely `<p>` tags (WordPress default)
- **Image structure**: `<img src>` within content or `<figure>` tags
- **Current extractor**: LIKELY MATCH — `.entry-content, article, .post-content` → `p`
- **Status**: ⚠️ Partial — Home page loads, specific article structure untested (browser session closed before article test)
- **Fix needed**: Test with real article URL to confirm selectors; verify image extraction works

---

### 6. liverpoolecho.co.uk
- **URL tested**: Attempted navigation (timeout after 10s) — likely CMS with slow load
- **Rendering**: CSR or dynamic CMS (slow initial load suggests client-side rendering)
- **Container**: Likely generic `.article-body`, `[role=main]`, or `.article` (fallback selectors in code)
- **Current extractor**: PARTIAL MATCH — Code has multiple fallbacks: `.article, [role=main], .article-body, main`
- **Status**: ⚠️ Partial — Site is slow; CSR timing may cause issues
- **Fix needed**: Test specific article URL in isolation; may need render timeout adjustment (5-10s)

---

### 7. empireofthekop.com
- **URL tested**: `https://www.empireofthekop.com` — home page loaded
- **Rendering**: SSR (WordPress, clean structure visible)
- **Container**: Likely `.entry-content` or `article` (WordPress typical pattern)
- **Paragraph structure**: `<p>` tags (WordPress standard)
- **Image structure**: `<img src="https://icdn.empireofthekop.com/...">` (CDN-hosted, WebP optimization visible)
- **Current extractor**: LIKELY MATCH — `.entry-content, article, .post-content` → `p`
- **Status**: ✅ Likely Working — WordPress structure is predictable; article structure not tested but standard
- **Fix needed**: Test with real article URL to confirm; Empire uses WebP images (ensure src parsing handles this)

---

## Summary Table

| Source | Rendering | Container | Status | Blocker |
|--------|-----------|-----------|--------|---------|
| **liverpoolfc.com** | SSR+JSON | `main` / `#__NEXT_DATA__` | ✅ Works | None |
| **bbc.com** | CSR | `article` / `[role=main]` | ⚠️ Partial | JS timing |
| **theguardian.com** | SSR | `article` | ✅ Works | None |
| **thisisanfield.com** | Unknown | `.entry-content` | ❌ Broken | Redirect loop |
| **anfieldwatch.co.uk** | SSR | `.entry-content` | ⚠️ Partial | Untested article |
| **liverpoolecho.co.uk** | CSR/CMS | Generic fallback | ⚠️ Partial | Slow load |
| **empireofthekop.com** | SSR | `.entry-content` | ✅ Likely | Untested article |

---

## Recommendations

1. **Priority 1 (Immediate)**
   - Remove **thisisanfield.com** from scraper until redirect issue resolved  
   - Test **liverpoolecho.co.uk** article URL directly; increase JS render timeout if CSR-heavy

2. **Priority 2 (Before Production)**
   - Confirm **anfieldwatch.co.uk** & **empireofthekop.com** with real article URLs
   - Verify **bbc.com** article reachability; test CSR wait logic

3. **Priority 3 (Optimization)**
   - **liverpoolfc.com**: Prioritize JSON parsing over HTML fallback (faster, more reliable)
   - **theguardian.com**: Add `figure` extraction for richest image context
   - All WordPress sites: Cache selectors per domain to avoid repeated DOM traversal

---

## Unresolved Questions

- **thisisanfield.com**: Is the redirect loop temporary or permanent? Need manual verification.
- **liverpoolecho.co.uk**: Does the timeout indicate CSR, slow server, or blocking middleware?
- **anfieldwatch.co.uk** & **empireofthekop.com**: Do article page structures match home page assumptions?
