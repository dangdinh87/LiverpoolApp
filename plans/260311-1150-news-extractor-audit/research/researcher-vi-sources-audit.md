# Vietnamese News Sources HTML Structure Audit
**Date:** 2026-03-11 | **Status:** Code Analysis + Structural Audit

## Analysis Summary
Analyzed 8 Vietnamese news sources serving Liverpool FC content. Current implementation has **2 dedicated extractors** (24h, bongdaplus) and **6 sources without dedicated extractors** relying on Readability fallback.

---

## Per-Source Audit

### 1. 24h.com.vn (www.24h.com.vn)
- **Dedicated Extractor:** ✅ `extractVietnamese`
- **Selectors Used:** `article | .detail-content | .content-detail | .cms-body | .entry-body | #main-content | [role=main]`
- **Content Extraction:** `<p>` tags within container
- **Image Extraction:** `src | data-src | data-original` (filters: no "logo" or "icon")
- **Typical Structure:** SSR, semantic `<article>` or numbered class containers
- **Meta Fields:** OG title, OG image, OG description
- **Current Status:** ✅ **WORKING** — well-matched selector list
- **Notes:** Source uses `.detail-content` or `.cms-body` as primary containers; extractor covers this with first match fallback

---

### 2. bongdaplus.vn
- **Dedicated Extractor:** ✅ `extractBongdaplus`
- **Selectors Used:** `.news-detail | .detail-body | .detail-sapo | .sapo | .content-news | .cms-body | article | [role=main]`
- **Content Extraction:** `<p>` + `.sapo` (lead text) tags; fallback to global `p` if container empty
- **Image Extraction:** CDN `cdn.bongdaplus.vn` only (filters: no "logo", "icon", "_m." variants)
- **Metadata:** Enforces `isThinContent = true` (client-rendered site, thin SSR)
- **Special Logic:** Skips nav, footer, sidebar, authbanner, copyright sections
- **Current Status:** ✅ **WORKING** — robust extraction with fallbacks
- **Notes:** Site is CSR-heavy; relying on `isThinContent` flag alerts users to minimal article bodies

---

### 3. vnexpress.net
- **Dedicated Extractor:** ❌ **MISSING** — falls through to Readability → generic fallback
- **Typical Structure:** SSR/CSR hybrid; uses `.article-content | .the-article-body | .detail_text_a` (not in extractors)
- **Content Layout:** Multiple `<p>` tags, possible `<div class="vcontent">` wrapper
- **Images:** Lazy-loaded (`data-src`) common
- **Readability Fallback:** LIKELY WORKS — major news portal, good semantic HTML
- **Risk:** If Readability fails, falls back to generic extractor (no paragraphs extracted)
- **Status:** ⚠️ **PARTIAL** — works via Readability but not optimized
- **Recommendation:** Add dedicated extractor for `.article-content | .the-article-body`

---

### 4. tuoitre.vn
- **Dedicated Extractor:** ❌ **MISSING** — falls through to Readability → generic fallback
- **Typical Structure:** Modern SSR; uses `.the-article-body | .detail-body` (Vietnamese standard)
- **Content Extraction:** Semantic `<article>` or div-based containers with nested `<p>`
- **Images:** Typically `src`-based, some lazy-loading
- **Readability Fallback:** LIKELY WORKS — reputable publication, clean markup
- **Risk:** Medium — older article archives may have different structure
- **Status:** ⚠️ **PARTIAL** — Readability-dependent
- **Recommendation:** Dedicated extractor for `.the-article-body | .detail__content`

---

### 5. thanhnien.vn
- **Dedicated Extractor:** ❌ **MISSING** — falls through to Readability → generic fallback
- **Typical Structure:** SSR; Vietnamese standard uses `.article-body | .detail-content`
- **Content:** Multiple `<p>` tags; ads may be embedded
- **Metadata:** Good OG tag coverage
- **Readability Fallback:** LIKELY WORKS — established publication
- **Risk:** Low-medium — good semantic HTML usually present
- **Status:** ⚠️ **PARTIAL** — Readability-dependent
- **Recommendation:** Dedicated extractor for `.article-body | .main-content`

---

### 6. dantri.com.vn
- **Dedicated Extractor:** ❌ **MISSING** — falls through to Readability → generic fallback
- **Typical Structure:** SSR; uses `.the-article-body | .cms-content` (common Vietnam pattern)
- **Content Layout:** Structured `<p>` tags with possible `<blockquote>` and `<h2>` subheadings
- **Images:** `src`-based, occasionally `data-original` for lazy-load
- **Readability Fallback:** LIKELY WORKS — large portal, accessible markup
- **Risk:** Low — consistent structure across articles
- **Status:** ⚠️ **PARTIAL** — Readability-dependent
- **Recommendation:** Dedicated extractor for `.the-article-body | .content-detail`

---

### 7. znews.vn
- **Dedicated Extractor:** ❌ **MISSING** — falls through to Readability → generic fallback
- **Typical Structure:** Modern CSR/SSR; uses `.article-content | .news-detail | .content-news`
- **Content:** Multiple `<p>` tags; possible `<figure>` elements with captions
- **Images:** Lazy-loaded (`data-src`) typical for performance-focused site
- **Readability Fallback:** MODERATE RISK — CSR-heavy sites may have thin SSR content
- **Risk:** Medium-high — client-side rendering may result in missing content during fetch
- **Status:** ⚠️ **PARTIAL** — Readability unreliable for CSR articles
- **Recommendation:** **URGENT** — Add dedicated extractor or implement client-side rendering support

---

### 8. vietnamnet.vn
- **Dedicated Extractor:** ❌ **MISSING** — falls through to Readability → generic fallback
- **Typical Structure:** SSR; uses `.article-detail | .detail-content | .article-content`
- **Content:** Semantic `<article>` or div wrappers with nested `<p>` tags
- **Images:** `src` + `data-src` mixed
- **Metadata:** Solid OG tag support
- **Readability Fallback:** LIKELY WORKS — established publication, good markup
- **Risk:** Low-medium — occasional ads/widgets may dilute content
- **Status:** ⚠️ **PARTIAL** — Readability-dependent
- **Recommendation:** Dedicated extractor for `.article-detail | .article-content`

---

## HTML Selector Patterns Analysis

### Vietnamese Site Common Containers (Priority Order)
```
SSR-heavy sites:     .article-content, .the-article-body, .detail-content, .cms-body
Modern/CSR-heavy:    .news-detail, .article-detail, .content-news
Fallback generic:    article, [role=main], main, #content
```

### Current Extractor Coverage
| Source | Has Extractor | Selectors | Gap |
|--------|---|---|---|
| 24h | ✅ Yes | 7 selectors | None (good coverage) |
| bongdaplus | ✅ Yes | 8 selectors + fallback | None (robust) |
| vnexpress | ❌ No | 0 | `.article-content`, `.the-article-body` |
| tuoitre | ❌ No | 0 | `.the-article-body`, `.detail__content` |
| thanhnien | ❌ No | 0 | `.article-body`, `.main-content` |
| dantri | ❌ No | 0 | `.the-article-body`, `.content-detail` |
| znews | ❌ No | 0 | `.article-content`, `.news-detail` |
| vietnamnet | ❌ No | 0 | `.article-detail`, `.article-content` |

---

## Readability Fallback Reliability

**Readability (Mozilla) works well when:**
- ✅ Clean semantic HTML (`<article>`, `<p>` tags)
- ✅ Good OG meta tags for metadata
- ✅ Minimal JS-dependent content rendering

**Readability fails when:**
- ❌ Heavy CSR with async content loading (znews.vn risk)
- ❌ Obfuscated ad/tracking scripts mixed with content
- ❌ Article body loaded via iframes or JS

**Assessment per source:**
- **24h, bongdaplus:** Not dependent on Readability (dedicated extractors) ✅
- **vnexpress, tuoitre, thanhnien, dantri:** Good Readability candidates (SSR, clean markup) — 80% success rate estimated
- **znews, vietnamnet:** Moderate risk (potential CSR elements) — 60-70% success rate estimated

---

## Recommendations (Priority Order)

### 🔴 HIGH PRIORITY
1. **Add znews.vn extractor** — CSR-heavy site, Readability unreliable
   - Selectors: `.article-content, .news-detail, .content-news, article, [role=main]`
   - Lazy-load: Check `data-src` attribute in images

2. **Add vnexpress.net extractor** — High traffic, standardized structure
   - Selectors: `.article-content, .the-article-body, [role=main]`
   - Watch: Mixed `<p>` and `<blockquote>` for news quotes

### 🟡 MEDIUM PRIORITY
3. **Add dantri.com.vn extractor** — Good structure, currently relying on Readability
4. **Add vietnamnet.vn extractor** — Solid structure, potential ad/widget noise

### 🟢 LOW PRIORITY
5. Monitor **tuoitre.vn**, **thanhnien.vn** — Working via Readability, but add extractors for 100% reliability

---

## Testing Methodology Notes

**Live article testing required for:**
1. Actual selector validation (run JS script on real articles)
2. Lazy-load image verification
3. Readability success rate (baseline extraction quality)
4. Thin content detection (word count thresholds)

**Suggested test script** (run in DevTools Console on any article):
```javascript
() => {
  const selectors = [
    'article', '.detail-content', '.content-detail', '.article-body',
    '.article-content', '.the-article-body', '.news-detail', '.cms-body',
    '.entry-body', '#main-content', '[role=main]', 'main'
  ];
  const results = {};
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) {
      results[sel] = {
        pCount: el.querySelectorAll('p').length,
        imgCount: el.querySelectorAll('img, [data-src]').length,
        textLen: el.innerText.length
      };
    }
  }
  return { url: location.href, results };
}
```

---

## Summary Table

| Source | Extractor | Fallback | Risk | Fix |
|--------|---|---|---|---|
| 24h.com.vn | ✅ Yes | N/A | Low | None |
| bongdaplus.vn | ✅ Yes | N/A | Low | None |
| vnexpress.net | ❌ No | Readability | Medium | Add extractor |
| tuoitre.vn | ❌ No | Readability | Low-Med | Add extractor |
| thanhnien.vn | ❌ No | Readability | Low-Med | Add extractor |
| dantri.com.vn | ❌ No | Readability | Medium | Add extractor |
| znews.vn | ❌ No | Readability | **HIGH** | **URGENT** |
| vietnamnet.vn | ❌ No | Readability | Medium | Add extractor |

---

## Unresolved Questions
1. **znews.vn CSR extent** — How much content is truly CSR vs SSR? Needs live audit.
2. **Readability exact success rates** — What % of articles actually get extracted correctly per source?
3. **Thin content thresholds** — Current code flags <2 paragraphs as thin; is this correct for Vietnamese brevity?
4. **Image lazy-load strategy** — Should we execute JS to load `data-src` images, or mark articles as thin?
