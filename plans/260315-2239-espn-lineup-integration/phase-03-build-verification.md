---
phase: 3
title: "Build Verification"
status: pending
effort: 15min
---

# Phase 03: Build Verification

## Context

- [plan.md](./plan.md) -- parent plan
- [Phase 01](./phase-01-espn-lineup-data-layer.md) -- ESPN data layer
- [Phase 02](./phase-02-wire-lineup-barrel-and-page.md) -- barrel + page wiring

## Overview

Run `npm run build` to verify no TypeScript or Next.js errors. Optionally run dev
server to test with live ESPN data for a recent finished match.

## Key Insights

- Build catches: unused imports, type mismatches, server/client boundary violations
- Fixture detail page is `force-dynamic`, so it fetches at request time
- ESPN data is free and public, no mock needed for manual testing

## Requirements

1. `npm run build` passes without errors
2. No new TypeScript warnings related to lineup code
3. Manual verification: fixture detail page renders lineup section

## Related Code Files

- All files from Phase 01 + 02

## Implementation Steps

### Step 1: TypeScript check

```bash
npx tsc --noEmit
```

Verify no errors in:
- `src/lib/football/espn-events.ts`
- `src/lib/football/index.ts`
- `src/app/fixtures/[id]/page.tsx`

### Step 2: Full build

```bash
npm run build
```

Expected: clean build, no errors.

### Step 3: Manual smoke test

```bash
npm run dev
```

1. Navigate to `/fixtures` or `/season`
2. Click a recently finished match
3. Verify "Lineups" section appears with:
   - Two columns (home / away)
   - Team name + formation string
   - 11 starters with shirt number + position label
   - Substitutes list
   - Coach name
4. Click an upcoming match (no lineup yet) -- verify no lineup section shown

### Step 4: Edge case check

- Match with no ESPN data (e.g., very old fixture) -- should show no lineup (graceful `[]`)
- ESPN timeout -- should log error and return `[]`

## Todo

- [ ] Run `npx tsc --noEmit` -- no errors
- [ ] Run `npm run build` -- passes
- [ ] Manual test: finished match shows lineups
- [ ] Manual test: upcoming match shows no lineups
- [ ] Verify console logs: no unexpected ESPN errors

## Success Criteria

- Build passes with zero errors
- Fixture detail page renders lineups for finished Liverpool matches
- No regression in events, stats, or match detail sections
- Graceful degradation when lineup data unavailable

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Build fails from unrelated changes | Low | Low | Fix unrelated issues separately |
| ESPN returns unexpected roster format | Low | Low | Graceful fallback; already tested API shape |

## Security Considerations

- No deployment step in this phase
- No env var changes needed

## Next Steps

After verification, commit changes with:
```
feat(fixtures): add ESPN lineup data to fixture detail pages
```

No further phases needed. Feature is complete.
