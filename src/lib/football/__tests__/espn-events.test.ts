import { describe, expect, it } from "vitest";
import { mapEspnEventToFixture, mapEventType, mapLiveSnapshot } from "@/lib/football/espn-events";

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

type Summary = Parameters<typeof mapLiveSnapshot>[0];

function summary(over: { clock?: string; name?: string; state?: string; period?: number; score?: [string, string]; keyEvents?: unknown[] } = {}): Summary {
  return {
    header: {
      competitions: [
        {
          status: { displayClock: over.clock ?? "19'", period: over.period ?? 1, type: { name: over.name ?? "STATUS_FIRST_HALF", state: over.state ?? "in" } },
          competitors: [
            { homeAway: "home", score: over.score?.[0] ?? "0", team: { id: "364", displayName: "Liverpool" } },
            { homeAway: "away", score: over.score?.[1] ?? "0", team: { id: "382", displayName: "Manchester City" } },
          ],
        },
      ],
    },
    keyEvents: over.keyEvents ?? [],
    boxscore: {
      teams: [
        { team: { id: "382", displayName: "Manchester City" }, statistics: [{ name: "possessionPct", displayValue: "45.7" }, { name: "totalShots", displayValue: "0" }] },
        { team: { id: "364", displayName: "Liverpool" }, statistics: [{ name: "possessionPct", displayValue: "54.3" }, { name: "totalShots", displayValue: "3" }, { name: "wonCorners", displayValue: "1" }] },
      ],
    },
    commentary: [
      { sequence: 0, time: { displayValue: "" }, text: "Lineups are announced." },
      { sequence: 19, time: { displayValue: "19'" }, text: "Corner, Manchester City." },
      { sequence: 18, time: { displayValue: "17'" }, text: "Handball." },
    ],
  } as Summary;
}

const keyEvent = (type: string, clock: string, teamId: string, player: string) => ({
  type: { type, text: type },
  clock: { value: 0, displayValue: clock },
  period: { number: 1 },
  scoringPlay: type.startsWith("goal"),
  team: { id: teamId, displayName: teamId === "364" ? "Liverpool" : "Manchester City" },
  participants: [{ athlete: { id: "1", displayName: player } }],
});

describe("mapLiveSnapshot", () => {
  it("reads clock, score, stats by team id and the newest commentary line", () => {
    const s = mapLiveSnapshot(summary({ keyEvents: [keyEvent("yellow-card", "8'", "364", "Ronald Araújo")] }));
    expect(s).toMatchObject({ state: "in", statusShort: "1H", clock: "19'", minute: 19, score: { home: 0, away: 0 } });
    expect(s?.stats).toEqual({ possession: [54, 46], shots: [3, 0], onTarget: [0, 0], corners: [1, 0] });
    expect(s?.events).toEqual([{ side: "home", kind: "yellow", minute: "8'", at: 8, player: "Ronald Araújo" }]);
    expect(s?.latest).toEqual({ minute: "19'", text: "Corner, Manchester City." });
  });

  it("maps half-time, stoppage time and full time", () => {
    expect(mapLiveSnapshot(summary({ clock: "HT", name: "STATUS_HALFTIME" }))?.statusShort).toBe("HT");
    const late = mapLiveSnapshot(summary({ clock: "90'+3'", name: "STATUS_SECOND_HALF", period: 2 }));
    expect(late).toMatchObject({ statusShort: "2H", minute: 93 });
    expect(mapLiveSnapshot(summary({ name: "STATUS_FULL_TIME", state: "post", period: 2 }))?.statusShort).toBe("FT");
  });

  it("moves an own goal to the side it counts for when the score says so", () => {
    const s = mapLiveSnapshot(summary({ score: ["1", "0"], keyEvents: [keyEvent("own-goal", "30'", "382", "Rúben Dias")] }));
    expect(s?.events[0]).toMatchObject({ kind: "own-goal", side: "home" });
  });

  it("returns null without a header", () => {
    expect(mapLiveSnapshot({} as Summary)).toBeNull();
  });
});
