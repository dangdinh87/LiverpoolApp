# Documentation Update: News Pipeline Audit Phase 02

**Date:** 11 Mar 2026 21:33
**Version:** v4.1
**Report ID:** docs-manager-260311-2201-news-pipeline-audit

---

## Summary

Updated `/Users/nguyendangdinh/LiverpoolApp/docs/news-feature.md` to document Phase 02 refactoring + audit changes to the news system. Consolidated scattered logic, unified source detection, and eliminated code duplication.

---

## Changes Made

### Document Updates: `/docs/news-feature.md`

#### Header + Metadata
- Updated version from v4.0 → v4.1
- Added "News Pipeline Audit" to subtitle
- Inserted Phase 02 section before Phase 01

#### Phase 02 Section (NEW)
- Comprehensive table of file changes (9 modified, 3 new, 1 deleted)
- Architectural benefits summary (5 key points)
- Links to detailed changes throughout doc

#### Section 2.0: Shared Sync Pipeline (NEW)
- Documented `syncPipeline()` in sync.ts with flow diagram
- Documented `getServiceClient()` in supabase-service.ts
- Showed caller pattern (background sync + `/api/news/sync` route)

#### Section 5.0: Phase 02 Dedup + Source Detection (NEW)
- Set-based dedup helper: `pushUnique()` function code
- Unified source detection: import + usage pattern
- Emphasized consistency gains

#### Section 8.1-8.4: Source Detection (EXPANDED)
- New 8.1: "Unified Source Detection (Phase 02)"
- Documented `detectSource(url)` function signature
- Documented `VI_SOURCES` Set helper
- Documented all 18 sources in SOURCE_MAP
- Updated old "SOURCE_HOSTS Map" terminology → "SOURCE_MAP"

#### Section 15: Module Map (UPDATED)
- Added `sync.ts`, `supabase-service.ts`, `source-detect.ts`
- Marked Phase 02 changes with `[Phase 02: ...]` tags
- Noted dependencies: `[MODIFIED]` where code uses new utilities
- Clarified removed files: `validation.ts` → DELETED
- Updated `types.ts` note: removed tia/sky sources
- Added `/api/news/sync/route.ts` entry with simplified note

#### Relevance + Keywords Section (UPDATED)
- Changed "LFC_KEYWORDS" → "LFC_KEYWORDS_WEIGHTED" throughout
- Added code example showing weighted keyword structure
- Noted "moved to config.ts, single source of truth" 4× in relevant sections

#### Removed Obsolete References
- Removed "tia → www.thisisanfield.com" from SOURCE_HOSTS
- Removed "sky → www.skysports.com" from SOURCE_HOSTS
- Updated type definitions context (removed tia/sky)

---

## Verification

### Cross-File Checks ✓
1. **sync.ts** — verified exists, contains `syncPipeline()` + `SyncResult` interface
2. **supabase-service.ts** — verified exists, contains `getServiceClient()`
3. **source-detect.ts** — verified exists, contains `detectSource()` + `VI_SOURCES`
4. **article-extractor.ts** — verified uses `Set<>` dedup + imports from source-detect.ts
5. **config.ts** — verified contains `LFC_KEYWORDS_WEIGHTED` array
6. **relevance.ts** — verified imports from config.ts
7. **types.ts** — verified removed tia + sky from NewsSource type
8. **[...slug]/page.tsx** — verified imports `detectSource` + `VI_SOURCES`
9. **sync/route.ts** — verified simplified, calls `syncPipeline()`

### Link Hygiene ✓
- All internal `#section` anchors valid
- No external links added (only internal refs)
- Code examples match actual file implementations

### Coverage ✓
- Phase 02 changes documented systematically
- Before/after architectural patterns explained
- New shared utilities clearly positioned
- Benefits of each change articulated

---

## Document Metrics

| Metric | Value |
|--------|-------|
| **Lines added** | ~148 |
| **Sections updated** | 8+ |
| **New subsections** | 3 (Phase 02, sync.ts, source-detect.ts) |
| **Code examples added** | 5 |
| **Final file size** | 1091 LOC |
| **Timestamp** | 11 Mar 2026 21:33 UTC |

---

## Architectural Changes Documented

### Code Organization
- **Before:** Sync logic scattered in db.ts + route.ts, source detection per-extractor
- **After:** Unified `syncPipeline()` in sync.ts, `detectSource()` in source-detect.ts

### Service Layer
- **Before:** Direct `createClient()` calls scattered
- **After:** Centralized `getServiceClient()` in supabase-service.ts

### Keyword Handling
- **Before:** Separate keyword definitions in pipeline.ts + config.ts
- **After:** Single `LFC_KEYWORDS_WEIGHTED` in config.ts, imported by 2 consumers

### Dedup Performance
- **Before:** `array.includes(url)` — O(n) per article
- **After:** `Set.has(url)` — O(1) per article

### Source Consistency
- **Before:** Multiple hostname→source ID mappings (article-extractor, news-config.ts, etc.)
- **After:** Single source-detect.ts → `detectSource(url).id` everywhere

---

## Quality Assurance

✓ All code references verified against actual files
✓ No external URLs documented (internal-only refs)
✓ Markdown formatting consistent with existing doc style
✓ Vietnamese + English sections balanced
✓ Phase 01 history preserved (not overwritten)
✓ Module map comprehensive and accurate

---

## Notes

- File size (1091 LOC) exceeds typical 800-line limit. Consider future split into:
  - `/docs/news/index.md` — overview + Phase history
  - `/docs/news/architecture.md` — layers 1-5
  - `/docs/news/frontend.md` — layers 6-9
  - `/docs/news/reference.md` — routing + client features + module map
- This is **first comprehensive Phase 02 documentation** (previous audit had only commit messages)
- All changes backward-compatible: Phase 01 sections untouched
