---
phase: 2
title: "Wire Lineup in Barrel & Page"
status: pending
effort: 15min
---

# Phase 02: Wire Lineup in Barrel & Page

## Context

- [plan.md](./plan.md) -- parent plan
- [Phase 01](./phase-01-espn-lineup-data-layer.md) -- ESPN data layer (prerequisite)
- `src/lib/football/index.ts` -- barrel exports
- `src/app/fixtures/[id]/page.tsx` -- fixture detail page

## Overview

Update barrel to import `getEspnMatchLineups` and modify `getFixtureLineups` to accept
`fixtureDate` param. Try ESPN first, fall back to provider stub. Update fixture detail
page to pass `f.date` when calling `getFixtureLineups`.

## Key Insights

- Current `getFixtureLineups` signature: `cache((id: number) => provider.getFixtureLineups(id))`
- Follows same pattern as `getFixtureEvents` which already accepts optional `fixtureDate`
- Fixture detail page already has `f.date` available at the call site (line 65)
- `LineupSection` component works correctly, just receives empty arrays currently

## Requirements

1. Import `getEspnMatchLineups` in barrel
2. Change `getFixtureLineups` to accept optional `fixtureDate` param
3. Try ESPN lineup first when `fixtureDate` provided, fallback to provider
4. Update fixture detail page call to pass `f.date`

## Architecture

```
getFixtureLineups(fixtureId, f.date)
  -> if fixtureDate: try getEspnMatchLineups(fixtureDate)
  -> if espn returned data: return it
  -> fallback: provider.getFixtureLineups(fixtureId)  // returns []
```

Mirrors the existing `getFixtureEvents` pattern exactly.

## Related Code Files

- `src/lib/football/index.ts` -- modify import + `getFixtureLineups`
- `src/app/fixtures/[id]/page.tsx` -- modify call site

## Implementation Steps

### Step 1: Update barrel import

In `src/lib/football/index.ts`, add `getEspnMatchLineups` to the ESPN import:

```typescript
import { getEspnMatchEvents, getEspnMatchDetail, getEspnCupFixtures, getEspnMatchLineups } from "./espn-events";
```

### Step 2: Update getFixtureLineups in barrel

Replace line 100:

```typescript
// Before:
export const getFixtureLineups = cache((id: number) => provider.getFixtureLineups(id));

// After:
export const getFixtureLineups = cache(async (id: number, fixtureDate?: string) => {
  if (fixtureDate) {
    try {
      const espnLineups = await getEspnMatchLineups(fixtureDate);
      if (espnLineups.length > 0) return espnLineups;
    } catch (err) {
      console.error("[football] ESPN lineups failed:", err);
    }
  }
  return provider.getFixtureLineups(id);
});
```

### Step 3: Update fixture detail page

In `src/app/fixtures/[id]/page.tsx`, line 65, pass `f.date`:

```typescript
// Before:
getFixtureLineups(fixtureId),

// After:
getFixtureLineups(fixtureId, f.date),
```

Note: `getFixtureLineups` is already called for both finished and upcoming matches
(no `isFinished` gate), which is correct -- lineups can be announced before kickoff.

## Todo

- [ ] Add `getEspnMatchLineups` to import in `index.ts`
- [ ] Update `getFixtureLineups` signature and implementation
- [ ] Update fixture detail page to pass `f.date`

## Success Criteria

- Fixture detail page for a finished match shows lineup data
- Fixture detail page for an upcoming match (no lineup yet) shows no lineup section (empty array)
- No TypeScript errors from signature change
- Pattern matches existing `getFixtureEvents` implementation

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `React.cache` key changes with new param | None | None | `cache()` uses all args as key; old callers unaffected |
| Other callers of `getFixtureLineups` break | Low | Low | New param is optional; existing call sites still work |

## Security Considerations

- No new security surface; same server-only pattern
- `fixtureDate` comes from fixture data fetched server-side

## Next Steps

Proceed to [Phase 03](./phase-03-build-verification.md) to verify build and test
with live ESPN data.
