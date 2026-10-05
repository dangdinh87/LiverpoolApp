import { describe, expect, it } from "vitest";
import { mapMatchToFixture } from "@/lib/football/fdo-matches";

type MatchInput = Parameters<typeof mapMatchToFixture>[0];

function match(overrides: Partial<MatchInput>): MatchInput {
  return {
    id: 1,
    utcDate: "2025-03-11T20:00:00Z",
    status: "FINISHED",
    matchday: null,
    stage: "LAST_16",
    homeTeam: { id: 64, name: "Liverpool FC", shortName: "Liverpool", tla: "LIV", crest: "" },
    awayTeam: { id: 524, name: "Paris Saint-Germain FC", shortName: "PSG", tla: "PSG", crest: "" },
    score: {
      winner: "AWAY_TEAM",
      duration: "REGULAR",
      fullTime: { home: 0, away: 1 },
      halfTime: { home: 0, away: 0 },
    },
    competition: { id: 2001, name: "UEFA Champions League", code: "CL", emblem: "" },
    referees: [],
    season: { startDate: "2024-08-01" },
    ...overrides,
  } as MatchInput;
}

describe("mapMatchToFixture", () => {
  it("scores a shootout as regular + extra time, with the penalties separate", () => {
    // Real FDO payload for Liverpool v PSG, 11 Mar 2025.
    const f = mapMatchToFixture(
      match({
        score: {
          winner: "AWAY_TEAM",
          duration: "PENALTY_SHOOTOUT",
          fullTime: { home: 1, away: 5 },
          halfTime: { home: 0, away: 0 },
          regularTime: { home: 0, away: 1 },
          extraTime: { home: 0, away: 0 },
          penalties: { home: 1, away: 4 },
        },
      }),
    );
    expect(f.goals).toEqual({ home: 0, away: 1 });
    expect(f.score.penalty).toEqual({ home: 1, away: 4 });
    expect(f.fixture.status.short).toBe("PEN");
  });

  it("still removes the penalties when FDO omits regularTime", () => {
    const f = mapMatchToFixture(
      match({
        score: {
          winner: "AWAY_TEAM",
          duration: "PENALTY_SHOOTOUT",
          fullTime: { home: 1, away: 5 },
          halfTime: { home: 0, away: 0 },
          penalties: { home: 1, away: 4 },
        },
      }),
    );
    expect(f.goals).toEqual({ home: 0, away: 1 });
  });

  it("marks extra-time finishes AET and keeps fullTime as the score", () => {
    const f = mapMatchToFixture(
      match({
        score: {
          winner: "HOME_TEAM",
          duration: "EXTRA_TIME",
          fullTime: { home: 2, away: 1 },
          halfTime: { home: 1, away: 0 },
          regularTime: { home: 1, away: 1 },
          extraTime: { home: 1, away: 0 },
        },
      }),
    );
    expect(f.goals).toEqual({ home: 2, away: 1 });
    expect(f.fixture.status.short).toBe("AET");
  });

  it("tags a fixture with its own season, not the current one", () => {
    expect(mapMatchToFixture(match({})).league.season).toBe(2024);
  });

  it("leaves a regular finish untouched", () => {
    const f = mapMatchToFixture(match({}));
    expect(f.goals).toEqual({ home: 0, away: 1 });
    expect(f.fixture.status.short).toBe("FT");
    expect(f.score.penalty).toEqual({ home: null, away: null });
  });
});
