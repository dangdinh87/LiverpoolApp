import { describe, expect, it } from "vitest";
import { mapEspnEventToFixture, mapEventType } from "@/lib/football/espn-events";

type EspnEvent = Parameters<typeof mapEspnEventToFixture>[0];

function event(
  status: { name?: string; detail: string; state: string; completed: boolean },
  scores: [unknown, unknown] = [undefined, undefined],
  date = "2026-10-28T20:00Z",
): EspnEvent {
  return {
    id: "401921842",
    date,
    season: { displayName: "2026-27" },
    seasonType: { name: "Fourth Round" },
    competitions: [
      {
        status: { type: status },
        competitors: [
          { id: "364", homeAway: "home", winner: false, score: scores[0], team: { id: "364", displayName: "Liverpool", shortDisplayName: "Liverpool" } },
          { id: "363", homeAway: "away", winner: false, score: scores[1], team: { id: "363", displayName: "Chelsea", shortDisplayName: "Chelsea" } },
        ],
      },
    ],
  } as EspnEvent;
}

describe("mapEventType", () => {
  it("keeps own goals (ESPN type 'own-goal')", () => {
    expect(mapEventType("own-goal")).toEqual({ type: "Goal", detail: "Own Goal" });
    expect(mapEventType("goal---header")).toEqual({ type: "Goal", detail: "Header" });
  });
});

describe("mapEspnEventToFixture", () => {
  it("maps an upcoming cup tie and dates its season from the kickoff", () => {
    const f = mapEspnEventToFixture(event({ detail: "Wed, October 28th", state: "pre", completed: false }), "Carabao Cup", "");
    expect(f?.fixture.status.short).toBe("NS");
    expect(f?.league.season).toBe(2026);
    expect(f?.goals).toEqual({ home: null, away: null });
  });

  it("dates last season's cup run to last season", () => {
    const f = mapEspnEventToFixture(
      event({ detail: "FT", state: "post", completed: true }, [{ value: 4, displayValue: "4" }, { value: 1, displayValue: "1" }], "2026-01-13T19:45Z"),
      "FA Cup",
      "",
    );
    expect(f?.league.season).toBe(2025);
  });

  it("parses both object and string scores", () => {
    const f = mapEspnEventToFixture(event({ detail: "FT", state: "post", completed: true }, ["3", { value: 1, displayValue: "1" }]), "Carabao Cup", "");
    expect(f?.goals).toEqual({ home: 3, away: 1 });
  });

  it("does not count a postponed match as finished", () => {
    const named = mapEspnEventToFixture(event({ name: "STATUS_POSTPONED", detail: "Postponed", state: "post", completed: false }), "FA Cup", "");
    const unnamed = mapEspnEventToFixture(event({ detail: "Postponed", state: "post", completed: false }), "FA Cup", "");
    expect(named?.fixture.status.short).toBe("PST");
    expect(unnamed?.fixture.status.short).toBe("PST");
  });
});
