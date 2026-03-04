# Phase 04: Integration, Testing & Documentation

## Context Links

- Phase 01: [Provider Abstraction](./phase-01-provider-abstraction.md)
- Phase 02: [SofaScore Provider](./phase-02-sofascore-provider.md)
- Phase 03: [Advanced Caching](./phase-03-advanced-caching.md)
- Plan overview: [plan.md](./plan.md)

## Overview

Wire all pieces together, verify the system works end-to-end with each provider configuration, update environment documentation, and ensure smooth local development experience. This phase is about integration confidence, not new features.

## Key Insights

1. Three provider modes to test: `api-football`, `sofascore`, `mock`
2. The mock provider must work with zero env vars (default dev experience)
3. Switching providers must require ONLY an env var change -- no code changes
4. All 5 API-consuming pages must render correctly under each provider

## Requirements

- [ ] Verify all three providers work end-to-end
- [ ] Update `.env.example` with new variables + comments
- [ ] Factory auto-detects mock mode when no API keys set
- [ ] Error boundaries handle provider failures gracefully
- [ ] Console logging identifies active provider on startup

## Architecture

### Provider Auto-Detection Logic

```typescript
// In index.ts factory
function resolveProvider(): string {
  const explicit = process.env.FOOTBALL_DATA_PROVIDER;
  if (explicit) return explicit;

  // Auto-detect based on available keys
  if (process.env.API_FOOTBALL_KEY) return "api-football";
  return "mock"; // SofaScore needs explicit opt-in due to ToS risks
}
```

This means:
- Existing deploys with only `API_FOOTBALL_KEY` set continue to work unchanged
- SofaScore requires explicit `FOOTBALL_DATA_PROVIDER=sofascore` (no API key needed, but risky)
- Dev with no keys defaults to mock -- no config needed

### Startup Logging

```typescript
const provider = createProvider();
console.info(`[football] Provider: ${provider.name} | Cache: LRU(50)`);
```

### Updated `.env.example`

```env
# ─── Football Data Provider ────────────────────────────────────
# Provider selection (auto-detects if omitted):
#   "api-football"   — API-Football (100 req/day free)
#   "sofascore"  — SofaScore (1440 req/day free)
#   "mock"           — Local mock data (no API needed)
# FOOTBALL_DATA_PROVIDER=api-football

# API-Football (https://www.api-football.com/)
API_FOOTBALL_KEY=

# SofaScore — no API key needed, just set FOOTBALL_DATA_PROVIDER=sofascore

# Cache revalidation secret (for /api/revalidate endpoint)
REVALIDATE_SECRET=

# ─── Supabase ──────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# ─── Site ──────────────────────────────────────────────────────
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Related Code Files

| File | Role | Change |
|------|------|--------|
| `src/lib/football/index.ts` | Barrel | Add auto-detect + startup log |
| `.env.example` | Env template | Add new variables |
| `src/components/ui/error-boundary.tsx` | Error UI | Verify handles provider errors |
| `src/app/page.tsx` | Homepage | Verify works with all providers |
| `src/app/fixtures/page.tsx` | Fixtures | Verify works with all providers |
| `src/app/fixtures/[id]/page.tsx` | Detail | Verify works with all providers |
| `src/app/standings/page.tsx` | Standings | Verify works with all providers |
| `src/app/stats/page.tsx` | Stats | Verify works with all providers |

## Implementation Steps

1. **Add auto-detect logic** to `index.ts` factory
2. **Add startup console.info** logging active provider
3. **Update `.env.example`** with all new variables and comments
4. **Test: Mock provider** -- unset all API keys, run `npm run dev`, visit all 5 pages
5. **Test: API-Football provider** -- set `API_FOOTBALL_KEY`, run dev, visit all pages
6. **Test: SofaScore provider** -- set `FOOTBALL_DATA_PROVIDER=sofascore`, run dev, visit all pages
7. **Test: Explicit override** -- set `FOOTBALL_DATA_PROVIDER=mock` with API keys present, verify mock used
8. **Test: Build** -- `npm run build` with each provider config
9. **Test: LRU fallback** -- set invalid API key, verify stale cache serves data
10. **Test: Revalidation** -- call `POST /api/revalidate` with tag, verify fresh fetch
11. **Update MEMORY.md** with new architecture notes

## Testing Matrix

| Test | Mock | API-Football | SofaScore |
|------|------|-------------|-------------------|
| `/` Homepage renders | Must pass | Must pass | Must pass |
| `/fixtures` list renders | Must pass | Must pass | Must pass |
| `/fixtures/[id]` detail renders | Must pass | Must pass | Must pass (partial data OK) |
| `/standings` table renders | Must pass | Must pass | Must pass |
| `/stats` charts render | Must pass | Must pass | Must pass (may show fewer stats) |
| Build completes | Must pass | Must pass | Must pass |
| LRU fallback on failure | N/A | Must pass | Must pass |
| Console shows provider name | Must pass | Must pass | Must pass |

### Edge Cases to Verify

- SofaScore returns empty lineups for upcoming matches -- UI handles gracefully (already does)
- SofaScore returns no match statistics -- stats comparison section hides (already does)
- SofaScore returns no injuries -- injury widget shows empty state (already does)
- Switching providers mid-session -- LRU cache may have stale data from previous provider (acceptable, TTL-based eviction handles it)

## Todo List

- [ ] Add auto-detect provider logic to factory
- [ ] Add startup logging
- [ ] Update `.env.example`
- [ ] Test mock provider (all 5 pages)
- [ ] Test API-Football provider (all 5 pages)
- [ ] Test SofaScore provider (all 5 pages)
- [ ] Test explicit `FOOTBALL_DATA_PROVIDER` override
- [ ] Test `npm run build` with each config
- [ ] Test LRU fallback on API failure
- [ ] Test `/api/revalidate` endpoint
- [ ] Update project MEMORY.md

## Success Criteria

1. `npm run dev` with zero env vars renders all pages using mock data
2. Switching `FOOTBALL_DATA_PROVIDER` requires only env change + server restart
3. `npm run build` passes for all three provider modes
4. Console clearly shows which provider is active
5. LRU cache serves data when API is down
6. `.env.example` is accurate and documented

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Existing deploy breaks on upgrade | Medium | High | Default to `api-football` if `API_FOOTBALL_KEY` exists |
| Mock data drifts from real API shapes | Low | Medium | Mock provider uses same type contracts |
| SofaScore free tier changes | Low | High | Pin API version v4, monitor changelog |
| LRU key collision across providers | Low | Medium | Prefix cache keys: `{provider}:{endpoint}` |

## Security Considerations

- No API keys logged to console (only provider name)
- `/api/revalidate` protected by secret
- `.env.example` contains placeholders only, never real keys
- Mock mode safe for public demo deployments

## Unresolved Questions

1. **Should we add a health-check endpoint** (`/api/health`) that reports provider status + cache stats? Nice-to-have, not essential.
2. **Should LRU cache be shared across Vercel serverless instances?** No -- in-memory is per-instance. If multi-instance persistence is needed later, use Vercel KV or Redis. YAGNI for now.
3. **SofaScore team ID for Liverpool is 64** -- confirmed in their docs. But should we add a configurable mapping in case it changes? Over-engineering for now; hardcode with a comment.

## Next Steps

After this phase, the multi-provider system is complete. Potential future work:
- Add more providers (e.g., API-Sports v4 when released)
- Add Vercel KV as a durable cache layer
- Add webhook integration for real-time match updates
- Dashboard page showing provider health + cache metrics
