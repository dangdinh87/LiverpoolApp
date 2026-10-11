import { describe, expect, it } from "vitest";
import { buildMatchReviewFacts } from "@/lib/site-articles/match-review-facts";
import { validateDraft } from "@/lib/site-articles/validate-draft";
import type {
  Fixture,
  FixtureEvent,
  FixtureLineup,
  FixtureTeamStats,
  Standing,
} from "@/lib/types/football";

const LFC = { id: 40, name: "Liverpool", logo: "", winner: true };
const CITY = { id: 50, name: "Manchester City", logo: "", winner: false };

function fixture(overrides: Partial<Fixture> = {}): Fixture {
  return {
    fixture: {
      id: 1,
      date: "2026-10-11T15:30:00Z",
      venue: { id: 1, name: "Anfield", city: "Liverpool" },
      status: { long: "Match Finished", short: "FT", elapsed: 90 },
    },
    league: { id: 39, name: "Premier League", country: "England", logo: "", season: 2026, round: "Matchday 6" },
    teams: { home: LFC, away: CITY },
    goals: { home: 2, away: 1 },
    score: {
      halftime: { home: 1, away: 1 },
      fulltime: { home: 2, away: 1 },
      extratime: { home: null, away: null },
      penalty: { home: null, away: null },
    },
    ...overrides,
  } as Fixture;
}

const events: FixtureEvent[] = [
  { time: { elapsed: 78, extra: null }, team: { id: 40, name: "Liverpool", logo: "" }, player: { id: 1, name: "Cody Gakpo" }, assist: { id: null, name: null }, type: "Goal", detail: "Normal Goal", comments: null },
  { time: { elapsed: 23, extra: null }, team: { id: 40, name: "Liverpool", logo: "" }, player: { id: 2, name: "Mohamed Salah" }, assist: { id: 3, name: "Florian Wirtz" }, type: "Goal", detail: "Normal Goal", comments: null },
  { time: { elapsed: 41, extra: null }, team: { id: 50, name: "Manchester City", logo: "" }, player: { id: 4, name: "Erling Haaland" }, assist: { id: null, name: null }, type: "Goal", detail: "Penalty", comments: null },
  { time: { elapsed: 66, extra: null }, team: { id: 40, name: "Liverpool", logo: "" }, player: { id: 5, name: "Ryan Gravenberch" }, assist: { id: null, name: null }, type: "Card", detail: "Yellow Card", comments: null },
];

const lineups = [
  {
    team: { id: 40, name: "Liverpool", logo: "", colors: null },
    formation: "4-3-3",
    startXI: [{ player: { id: 9, name: "Alisson Becker", number: 1, pos: "G", grid: null } }],
    substitutes: [],
    coach: { id: 1, name: "Arne Slot", photo: "" },
  },
] as unknown as FixtureLineup[];

const stats = [
  { team: { id: 40, name: "Liverpool", logo: "" }, statistics: [
    { type: "Ball Possession", value: "54%" }, { type: "Total Shots", value: 14 },
    { type: "Shots on Goal", value: 6 }, { type: "Corner Kicks", value: 7 } ] },
  { team: { id: 50, name: "Manchester City", logo: "" }, statistics: [
    { type: "Ball Possession", value: "46%" }, { type: "Total Shots", value: 11 },
    { type: "Shots on Goal", value: 4 }, { type: "Corner Kicks", value: 5 } ] },
] as FixtureTeamStats[];

const standings = [
  { rank: 2, team: { id: 40, name: "Liverpool", logo: "" }, points: 13, goalsDiff: 5, group: null, form: "WWDLW", status: null, description: null,
    all: { played: 6, win: 4, draw: 1, lose: 1, goals: { for: 12, against: 7 } },
    home: { played: 3, win: 3, draw: 0, lose: 0, goals: { for: 7, against: 2 } },
    away: { played: 3, win: 1, draw: 1, lose: 1, goals: { for: 5, against: 5 } } },
] as Standing[];

describe("buildMatchReviewFacts", () => {
  it("reads the scoreline from Liverpool's side of the fixture", () => {
    const facts = buildMatchReviewFacts(fixture(), events, lineups, stats, standings);
    expect(facts.home).toEqual({ name: "Liverpool", score: 2 });
    expect(facts.liverpoolSide).toBe("home");
    expect(facts.result).toBe("win");
  });

  it("calls it a loss when Liverpool are away and behind", () => {
    const away = fixture({
      teams: { home: CITY, away: LFC },
      goals: { home: 3, away: 1 },
    } as Partial<Fixture>);
    const facts = buildMatchReviewFacts(away, [], [], [], []);
    expect(facts.liverpoolSide).toBe("away");
    expect(facts.result).toBe("loss");
  });

  it("puts goals in match order with assists and penalties marked", () => {
    const facts = buildMatchReviewFacts(fixture(), events, lineups, stats, standings);
    expect(facts.goals.map((g) => g.minute)).toEqual([23, 41, 78]);
    expect(facts.goals[0].assist).toBe("Florian Wirtz");
    expect(facts.goals[1].kind).toBe("penalty");
  });

  it("adds stoppage time into the minute", () => {
    const late: FixtureEvent[] = [{ ...events[0], time: { elapsed: 90, extra: 4 } }];
    const facts = buildMatchReviewFacts(fixture(), late, [], [], []);
    expect(facts.goals[0].minute).toBe(94);
  });

  it("reads percentages and counts as numbers", () => {
    const facts = buildMatchReviewFacts(fixture(), events, lineups, stats, standings);
    expect(facts.stats?.possession).toEqual([54, 46]);
    expect(facts.stats?.onTarget).toEqual([6, 4]);
  });

  it("narrows what can be said rather than inventing a stand-in", () => {
    // A match with no lineup, stats or table feed must still produce usable
    // facts — the article simply has fewer sentences available to it.
    const facts = buildMatchReviewFacts(fixture(), events, [], [], []);
    expect(facts.formation).toBeNull();
    expect(facts.starters).toEqual([]);
    expect(facts.stats).toBeNull();
    expect(facts.table).toBeNull();
    expect(facts.goals).toHaveLength(3);
  });

  it("produces facts the validator accepts a faithful draft against", () => {
    // The two halves of the pipeline have to agree: anything the builder
    // reports must be sayable without tripping the validator.
    const facts = buildMatchReviewFacts(fixture(), events, lineups, stats, standings);
    const report = validateDraft(
      {
        title: "Liverpool 2-1 Manchester City",
        excerpt: "Mohamed Salah and Cody Gakpo scored at Anfield.",
        metaTitle: "Liverpool 2-1 Manchester City",
        metaDescription: "Mohamed Salah and Cody Gakpo scored in a 2-1 win.",
        sections: [{ heading: "How it went", body: "Mohamed Salah scored on 23 and Cody Gakpo on 78. Liverpool sit 2nd on 13 points." }],
      },
      facts,
    );
    expect(report.problems).toEqual([]);
  });
});
