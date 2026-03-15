---
phase: 1
title: "ESPN Lineup Data Layer"
status: pending
effort: 30min
---

# Phase 01: ESPN Lineup Data Layer

## Context

- [plan.md](./plan.md) -- parent plan
- `src/lib/football/espn-events.ts` -- existing ESPN client
- `src/lib/types/football.ts` -- canonical `FixtureLineup`, `LineupPlayer` types

## Overview

Add ESPN roster type definitions to `espn-events.ts`, extend `EspnSummary` to include
`rosters`, create a `getEspnMatchLineups(fixtureDate)` function that maps ESPN roster
data to the canonical `FixtureLineup[]` type.

## Key Insights

- ESPN summary endpoint (`/summary?event={id}`) already returns `rosters` array
- `fetchSummary()` already calls this endpoint but `EspnSummary` interface omits `rosters`
- ESPN roster entry has: `starter` bool, `jersey` string, `athlete.displayName`, `position.abbreviation`
- ESPN position abbreviations: `"G"`, `"D"`, `"M"`, `"F"` -- maps directly to `LineupPlayer.pos`
- Some positions use longer names ("Goalkeeper", "Defender") -- need fallback mapping
- No `grid` data from ESPN -- set to `null`
- ESPN team ID "364" -> canonical LFC ID 40 via existing `espnTeamId()` helper

## Requirements

1. Add ESPN roster interfaces (`EspnRosterEntry`, `EspnRosterTeam`)
2. Extend `EspnSummary` with `rosters?: EspnRosterTeam[]`
3. Create position mapping function
4. Create `getEspnMatchLineups(fixtureDate: string): Promise<FixtureLineup[]>`
5. Return `[]` on any failure (graceful)

## Architecture

```
fixtureDate
  -> resolveEspnId(fixtureDate)  [existing]
  -> fetchSummary(espnId)         [existing, now returns rosters]
  -> mapEspnRosters(summary.rosters)
  -> FixtureLineup[]
```

No new fetch calls needed. Reuses the same summary endpoint already cached at 1h.

## Related Code Files

- `src/lib/football/espn-events.ts` -- sole file modified in this phase
- `src/lib/types/football.ts` -- reference types (read-only)

## Implementation Steps

### Step 1: Add ESPN roster interfaces

Add after existing `EspnBoxscoreTeam` interface (~line 55):

```typescript
interface EspnRosterEntry {
  starter: boolean;
  jersey: string;
  athlete: { id: string; displayName: string };
  position: { abbreviation: string; name?: string };
}

interface EspnRosterTeam {
  team: { id: string; displayName: string; logo?: string };
  formation?: string;
  coach?: { displayName: string }[];
  roster: EspnRosterEntry[];
}
```

### Step 2: Extend EspnSummary

Add `rosters` field to existing `EspnSummary` interface:

```typescript
interface EspnSummary {
  // ... existing fields ...
  rosters?: EspnRosterTeam[];
}
```

### Step 3: Add position mapping helper

```typescript
function mapEspnPosition(abbr: string): string {
  if (abbr === "G") return "G";
  if (abbr.includes("D") || abbr.includes("B")) return "D"; // "D", "CB", "LB", "RB"
  if (abbr.includes("M")) return "M"; // "M", "CM", "CDM", "CAM", "LM", "RM"
  if (abbr.includes("F") || abbr.includes("W") || abbr.includes("S")) return "F"; // "F", "FW", "LW", "RW", "ST"
  return "M"; // safe default
}
```

### Step 4: Create getEspnMatchLineups function

Export a new public function:

```typescript
export async function getEspnMatchLineups(fixtureDate: string): Promise<FixtureLineup[]> {
  try {
    const espnId = await resolveEspnId(fixtureDate);
    if (!espnId) return [];

    const summary = await fetchSummary(espnId);
    if (!summary?.rosters?.length) return [];

    return summary.rosters.map((r) => {
      const starters = r.roster.filter((p) => p.starter);
      const subs = r.roster.filter((p) => !p.starter);

      return {
        team: {
          id: espnTeamId(r.team.id),
          name: r.team.displayName,
          logo: r.team.logo ?? "",
          colors: null,
        },
        formation: r.formation ?? "",
        startXI: starters.map((p) => ({
          player: {
            id: parseInt(p.athlete.id, 10) || 0,
            name: p.athlete.displayName,
            number: parseInt(p.jersey, 10) || 0,
            pos: mapEspnPosition(p.position.abbreviation),
            grid: null,
          },
        })),
        substitutes: subs.map((p) => ({
          player: {
            id: parseInt(p.athlete.id, 10) || 0,
            name: p.athlete.displayName,
            number: parseInt(p.jersey, 10) || 0,
            pos: mapEspnPosition(p.position.abbreviation),
            grid: null,
          },
        })),
        coach: {
          id: 0,
          name: r.coach?.[0]?.displayName ?? "",
          photo: "",
        },
      };
    });
  } catch (err) {
    console.error("[espn] getEspnMatchLineups failed:", err);
    return [];
  }
}
```

### Step 5: Update fetchSummary validation

Currently `fetchSummary` skips responses lacking `keyEvents` or `boxscore.teams`. The
roster-only case (pre-match lineups announced, match not started) may have rosters but
no keyEvents. Update the validation check:

```typescript
if (data.keyEvents?.length || data.boxscore?.teams?.length || data.rosters?.length) {
  return data;
}
```

## Todo

- [ ] Add `EspnRosterEntry` and `EspnRosterTeam` interfaces
- [ ] Extend `EspnSummary` with `rosters` field
- [ ] Add `mapEspnPosition()` helper
- [ ] Create `getEspnMatchLineups()` function
- [ ] Update `fetchSummary()` validation to include rosters check
- [ ] Add `FixtureLineup` to the import from types

## Success Criteria

- `getEspnMatchLineups("2026-03-08")` returns `FixtureLineup[]` with 2 teams
- Each team has 11 starters, subs, formation string, coach name
- Position mapping correct: GK -> "G", defenders -> "D", midfielders -> "M", forwards -> "F"
- Returns `[]` for future matches with no lineup data
- Returns `[]` on API errors without throwing

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| ESPN changes roster JSON shape | Low | Medium | Graceful fallback returns `[]`; types are optional |
| Position abbreviations differ from expected | Low | Low | Safe default to "M"; covers common abbreviations |
| fetchSummary cache returns stale data without rosters | Low | Low | 1h revalidation; rosters appear ~1h before kickoff |

## Security Considerations

- No secrets handled; ESPN API is public, no key
- All data server-only (`import "server-only"`)
- No user input involved (fixtureDate comes from trusted fixture data)

## Next Steps

Proceed to [Phase 02](./phase-02-wire-lineup-barrel-and-page.md) to wire the new
function through the barrel and fixture detail page.
