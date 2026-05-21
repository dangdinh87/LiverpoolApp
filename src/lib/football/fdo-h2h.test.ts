import { describe, expect, it } from "vitest";
import { computeH2H } from "./fdo-h2h";
import type { Fixture, FixtureStatus } from "@/lib/types/football";

function fixture({
  id,
  date,
  status = "FT",
  home,
  away,
  goals,
  competition = "Premier League",
}: {
  id: number;
  date: string;
  status?: FixtureStatus;
  home: { id: number; name: string };
  away: { id: number; name: string };
  goals: { home: number | null; away: number | null };
  competition?: string;
}): Fixture {
  return {
    fixture: {
      id,
      date,
      venue: { id: null, name: null, city: null },
      status: { short: status, long: status, elapsed: status === "FT" ? 90 : null },
    },
    league: {
      id: 0,
      name: competition,
      country: "England",
      logo: "",
      season: 2025,
      round: "",
    },
    teams: {
      home: { ...home, logo: "", winner: null },
      away: { ...away, logo: "", winner: null },
    },
    goals,
    score: {
      halftime: { home: null, away: null },
      fulltime: goals,
      extratime: { home: null, away: null },
      penalty: { home: null, away: null },
    },
  };
}

describe("computeH2H", () => {
  it("matches the same opponent across FDO and ESPN IDs by normalized team name", () => {
    const record = computeH2H([
      fixture({
        id: 1,
        date: "2026-04-25T14:00:00Z",
        home: { id: 40, name: "Liverpool FC" },
        away: { id: 354, name: "Crystal Palace FC" },
        goals: { home: 3, away: 1 },
      }),
      fixture({
        id: 2,
        date: "2025-10-29T19:45:00Z",
        home: { id: 40, name: "Liverpool" },
        away: { id: 384, name: "Crystal Palace" },
        goals: { home: 0, away: 3 },
        competition: "Carabao Cup",
      }),
      fixture({
        id: 3,
        date: "2026-08-15T14:00:00Z",
        status: "NS",
        home: { id: 384, name: "Crystal Palace" },
        away: { id: 40, name: "Liverpool" },
        goals: { home: null, away: null },
      }),
    ], 384);

    expect(record).toMatchObject({
      totalMatches: 2,
      liverpoolWins: 1,
      draws: 0,
      opponentWins: 1,
      liverpoolGoals: 3,
      opponentGoals: 4,
    });
    expect(record?.lastMeetings.map((meeting) => meeting.score)).toEqual(["3-1", "0-3"]);
  });
});
