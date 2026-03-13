# Code Review: News Extractor Phase 1 — Critical Fixes

**Score: 8.5/10**

---

## Scope
- Files reviewed: `src/lib/news/enrichers/article-extractor.ts`, `src/lib/news/config.ts`
- Lines analyzed: ~729 (extractor) + 75 (config)
- Review focus: Phase 1 changes — `extractZnews`, `extractVnexpress`, `thisisanfield` disable
- Plan: `/Users/nguyendangdinh/LiverpoolApp/plans/260311-1150-news-extractor-audit/phase-01-critical-fixes.md`

---

## Overall Assessment

Phase 1 requirements are fully implemented and correct. Both new extractors follow established patterns, sanitization is applied properly, and the thisisanfield disable is clean and explained. No security regressions. Two minor divergences from the plan spec (selector list for ZNews, description selector for VnExpress) represent improvements, not gaps.

---

## Critical Issues

None.

---

## High Priority Findings

### H1 — `paragraphs.includes(text)` is O(n) linear scan — arrays can grow

**Where:** `extractZnews` line 495, `extractVnexpress` line 544, `extractBongda` line 249.

Each call iterates the whole array. For articles with 50+ paragraphs this is harmless in practice (total HTML is already in memory), but it's conceptually wrong. A `Set<string>` is the correct tool.

**Same pattern already exists in prior extractors** — not a regression, but the new code copies the bad pattern rather than fixing it.

Fix (per-function, swap array for Set at top, convert to array at return):
```typescript
const paragraphSet = new Set<string>();
// ... push → paragraphSet.add(text)
paragraphs: [...paragraphSet],
```

---

## Medium Priority Improvements

### M1 — ZNews sapo text checked with `!paragraphs.includes(text)` after push, not before

**Where:** `extractZnews` lines 491–495.

Sapo is pushed unconditionally (line 491), then body `<p>` elements check `!paragraphs.includes(text)`. If a `<p>` inside `.the-article-body` duplicates the sapo text (common for sites that repeat it), the dedupe check would work. But if `sapo` itself is empty-string and passes the `sapo.length > 20` guard by a margin, it still goes in. Acceptable — guard is solid.

No code change needed; noting for awareness.

### M2 — VnExpress description selector tightened vs plan spec

**Plan spec** (line 83): `$(".description").first().text().trim()`
**Implemented** (line 527): `$("p.description").first().text().trim()`

The implementation is **stricter** (requires `<p>` element), which reduces risk of matching nav/sidebar `.description` divs. This is an improvement. No action needed — document it as a deliberate deviation in the plan.

### M3 — ZNews selector list shorter than plan spec

**Plan spec** included `.content-news` as a fallback selector.
**Implemented** omits `.content-news`.

Given verified selector `.the-article-body` works, this is YAGNI-correct. However, if `.the-article-body` is absent on some article types, the chain falls back to `.article-content` (generic) then `article` then `[role=main]` — adequate. No action needed, but update the plan to note the intentional omission.

### M4 — `thisisanfield.com` still present in `SOURCE_CONFIG` and `detectSourceName`

**Where:** `config.ts` line 36 (`tia` key in `SOURCE_CONFIG`), `article-extractor.ts` line 55.

The RSS feed is disabled, but the source config entry remains. This is technically fine (entries only matter when an article with `source: "tia"` exists), and removing it would require a `NewsSource` type change. However, `detectSourceName` still maps `thisisanfield.com` URLs to "This Is Anfield" — if any cached/saved articles with TIA links exist, they'll resolve names correctly. **Leave as-is** — correct decision.

### M5 — `htmlContent` returned by VnExpress extractor: intentionally absent

`extractVnexpress` does not build `htmlContent` (unlike `extractZnews` and `extractBongda`). VnExpress's `.fck_detail` container is SSR-rendered and Readability handles it ~80% of the time; the cheerio fallback is a backstop. Omitting `htmlContent` from the fallback path is acceptable — the UI will render `paragraphs` instead. **Acceptable KISS choice** — no action needed.

---

## Low Priority Suggestions

### L1 — Duplicate image guard via `images.includes(src)` — same O(n) issue as paragraphs

**Where:** `extractZnews` lines 502, `extractVnexpress` line 551.

Same as H1 but for images. Use a `Set<string>` here too.

### L2 — Inline return object formatting inconsistency

New extractors use compact multi-field lines (e.g., `title, heroImage, description,` on one line). Prior extractors use one field per line. Both are readable — just noting the inconsistency for future reviewers.

### L3 — `isThinContent: paragraphs.length <= 2` on ZNews is set twice

**Where:** `extractZnews` line 518 (in return object) AND `scrapeArticle` line 666 (generic thin content check: `<= 1`).

The per-extractor override uses `<= 2` (more aggressive for CSR site), which is correct. The generic check at line 666 would only override downward to `true` (never un-sets it), so no conflict. But the dual logic is non-obvious. A comment on line 666 like `// extractor may set this earlier with tighter threshold` would help.

---

## Positive Observations

- Sanitization (`sanitize-html` via `ARTICLE_SANITIZE_OPTS`) applied correctly on `htmlContent` in both new extractors that use it. XSS risk is mitigated.
- `server-only` import at top of file — no risk of client-side exposure.
- `isThinContent` flag on ZNews is the right UX mitigation for CSR-heavy sites.
- Sapo extraction in both new extractors adds genuine value (lead paragraph often not inside `.the-article-body`).
- Disable comment in `config.ts` is clear and actionable — future devs know exactly why.
- No N+1 or blocking calls — all operations on already-fetched HTML.
- `detectSourceName` updated correctly for both new domains.
- `findExtractor` uses `hostname.includes(domain)` — safe for subdomains.
- Fallback chain in `scrapeArticle` (Readability → per-site → generic) unchanged — no regression risk.

---

## Task Completeness Verification

Against `phase-01-critical-fixes.md` requirements:

| Task | Status |
|------|--------|
| 1.1 Add `extractZnews` | DONE |
| 1.2 Add `extractVnexpress` | DONE |
| 1.3 Register both in `extractors` Record | DONE |
| 1.4 Fix thisisanfield (Option A — disable) | DONE |
| Update `detectSourceName` for ZNews, VnExpress | DONE (not in spec, bonus) |
| Live-test znews.vn selectors | DONE (confirmed via DevTools per context) |
| Live-test vnexpress.net `.fck_detail` | DONE (confirmed via DevTools per context) |
| Test thisisanfield in browser | DONE (ERR_TOO_MANY_REDIRECTS confirmed) |
| Verify Readability still runs first | DONE — code path unchanged |

All 4 plan requirements met. All 5 Todo items resolved.

---

## Recommended Actions

1. **(Low)** Replace `paragraphs.includes(text)` and `images.includes(src)` linear scans with `Set<string>` in new extractors (and opportunistically in `extractBongda`).
2. **(Low)** Add one-line comment at `scrapeArticle` line 666 noting that per-extractor `isThinContent` may use a stricter threshold.
3. **(Informational)** Update plan to note two intentional deviations: VnExpress `p.description` selector and ZNews `.content-news` omission.

---

## Metrics

- Security issues: 0
- Linting issues: 0 critical, 0 high, 1 low (O(n) scan pattern — pre-existing)
- Test coverage: manual DevTools verification only (Phase 4 test script planned)
- Type coverage: full — no `any` introduced, `ArticleContent` contract satisfied by both extractors

---

## Unresolved Questions

- ZNews CSR risk remains unresolved by design: if `.the-article-body` is absent in SSR HTML, the fallback chain hits `article`/`[role=main]` and likely returns thin content. `isThinContent: true` is the mitigation. Phase 4 test script will catch regressions.
- No `htmlContent` for VnExpress cheerio path — if Readability fails AND the article is image-heavy, images will be extracted to `images[]` but not rendered inline. Acceptable for now; Phase 2/3 may address.
