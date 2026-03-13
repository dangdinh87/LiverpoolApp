# Vietnamese News Sources Audit — Complete

## Status
✅ **AUDIT COMPLETE** — 9 Vietnamese sources tested

## Key Findings

### Working Sources (1)
- **24h.com.vn**: SSR ✅ Has dedicated `extractVietnamese` extractor → Working

### Sources Needing Dedicated Extractors (5)
| Source | Container(s) | Priority | Effort |
|--------|-------------|----------|--------|
| VnExpress | `.fck_detail, <article>` | HIGH | Low |
| Tuổi Trẻ | `.detail-content, .content-detail` | HIGH | Low |
| Thanh Niên | `.detail-content` | HIGH | Low |
| Dân Trí | `<article>` | MEDIUM | Low |
| VietNamNet | `.news-detail, .content-detail, <article>` | MEDIUM | Low |

### Broken Sources (2)
| Source | Issue | Workaround |
|--------|-------|-----------|
| ZNews (znews.vn) | CSR only — 0 content in SSR | Mark `isThinContent`, use Readability |
| Webthethao | No clear container — mixed content | Use Readability fallback |

### Broken by Design (2)
| Source | Status |
|--------|--------|
| Bóng Đá (bongda.com.vn) | CSR — already marked `isThinContent` |
| Bóng Đá+ (bongdaplus.vn) | CSR — already marked `isThinContent` |

---

## Code Files Involved
- **Article Extractor**: `/Users/nguyendangdinh/LiverpoolApp/src/lib/news/enrichers/article-extractor.ts` (lines 352-403: `extractVietnamese` function)
- **RSS Config**: `/Users/nguyendangdinh/LiverpoolApp/src/lib/news/config.ts` (lines 14-26: RSS feeds)

---

## Implementation Roadmap

### Phase 1: Consolidate Working Sources
Merge 24h/tuoitre/thanhnien/dantri into single `extractVietnameseNews` extractor:
```javascript
function extractVietnameseNews($, url) {
  // Try: .detail-content → .content-detail → <article>
  // Extract p tags, figure/figcaption, handle data-src/data-original
  // Return paragraphs + images
}
```

### Phase 2: Add VnExpress Handler
```javascript
function extractVnexpress($, url) {
  // Primary: .fck_detail
  // Fallback: <article>
}
```

### Phase 3: Add VietNamNet Handler
```javascript
function extractVietnamnet($, url) {
  // Try: .news-detail → .content-detail → <article>
}
```

### Phase 4: CSR Sources
- ✅ Already handled: bongda, bongdaplus marked with `isThinContent: true`
- znews: add to extractors map, fallback to Readability
- webthethao: use Readability (no special structure found)

---

## Testing Checklist
- [ ] Verify 24h extraction still works after consolidation
- [ ] Test new extractors with real Liverpool articles
- [ ] Confirm image extraction (lazy-loaded & normal)
- [ ] Test figure/figcaption extraction
- [ ] Verify Readability fallback for CSR sources

---

## Detailed Audit Report
**File**: `/Users/nguyendangdinh/LiverpoolApp/plans/260311-1150-news-extractor-audit/research/researcher-vi-sources-audit.md`

Contains per-source analysis, HTML patterns, and technical details.
