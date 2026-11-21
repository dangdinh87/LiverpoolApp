import { describe, expect, it } from "vitest";
import { buildMatchPreviewFacts } from "@/lib/site-articles/match-preview-facts";
import { validateDraft } from "@/lib/site-articles/validate-draft";
import type { Fixture, Standing } from "@/lib/types/football";

const LFC = { id: 40, name: "Liverpool FC", logo: "", winner: null };
const UTD = { id: 66, name: "Manchester United FC", logo: "", winner: null };

function fixture(overrides: Partial<Fixture> = {}): Fixture {
  return {
    fixture: {
      id: 560645,
      date: "2026-11-22T16:30:00Z",
      venue: { id: null, name: null, city: null },
      status: { long: "Not Started", short: "NS", elapsed: null },
    },
    league: {
      id: 39,
      name: "Premier League",
      country: "England",
      logo: "",
      season: 2026,
      round: "Matchday 12",
    },
    teams: { home: LFC, away: UTD },
    goals: { home: null, away: null },
    score: {
      halftime: { home: null, away: null },
      fulltime: { home: null, away: null },
      extratime: { home: null, away: null },
      penalty: { home: null, away: null },
    },
    ...overrides,
  } as Fixture;
}

const finishedMatches: Fixture[] = [
  {
    ...fixture({
      fixture: {
        id: 560640,
        date: "2026-11-08T16:30:00Z",
        venue: { id: 1, name: "Anfield", city: "Liverpool" },
        status: { long: "Match Finished", short: "FT", elapsed: 90 },
      },
      teams: {
        home: { ...LFC, winner: true },
        away: { id: 57, name: "Arsenal FC", logo: "", winner: false },
      },
      goals: { home: 2, away: 0 },
    }),
  },
  {
    ...fixture({
      fixture: {
        id: 560635,
        date: "2026-11-01T15:00:00Z",
        venue: { id: 2, name: "Etihad Stadium", city: "Manchester" },
        status: { long: "Match Finished", short: "FT", elapsed: 90 },
      },
      teams: {
        home: { id: 50, name: "Manchester City FC", logo: "", winner: null },
        away: { ...LFC, winner: null },
      },
      goals: { home: 1, away: 1 },
    }),
  },
  {
    ...fixture({
      fixture: {
        id: 550001,
        date: "2025-12-14T16:30:00Z",
        venue: { id: 1, name: "Anfield", city: "Liverpool" },
        status: { long: "Match Finished", short: "FT", elapsed: 90 },
      },
      teams: {
        home: { ...LFC, winner: true },
        away: { ...UTD, winner: false },
      },
      goals: { home: 3, away: 1 },
    }),
  },
];

const standings: Standing[] = [
  {
    rank: 1,
    team: { id: 40, name: "Liverpool FC", logo: "" },
    points: 28,
    goalsDiff: 18,
    group: null,
    form: "WWDWW",
    status: null,
    description: null,
    all: { played: 11, win: 9, draw: 1, lose: 1, goals: { for: 24, against: 6 } },
    home: { played: 6, win: 6, draw: 0, lose: 0, goals: { for: 15, against: 2 } },
    away: { played: 5, win: 3, draw: 1, lose: 1, goals: { for: 9, against: 4 } },
  },
  {
    rank: 4,
    team: { id: 66, name: "Manchester United FC", logo: "" },
    points: 20,
    goalsDiff: 5,
    group: null,
    form: "WDLWW",
    status: null,
    description: null,
    all: { played: 11, win: 6, draw: 2, lose: 3, goals: { for: 16, against: 11 } },
    home: { played: 5, win: 4, draw: 0, lose: 1, goals: { for: 9, against: 4 } },
    away: { played: 6, win: 2, draw: 2, lose: 2, goals: { for: 7, against: 7 } },
  },
] as Standing[];

describe("buildMatchPreviewFacts", () => {
  it("assembles form, H2H, venue fallback, table positions, and competition aliases", () => {
    const facts = buildMatchPreviewFacts(
      fixture(),
      finishedMatches.slice(0, 2),
      [finishedMatches[2]],
      standings,
    );

    expect(facts.kind).toBe("preview");
    expect(facts.venue).toBe("Anfield");
    expect(facts.liverpoolForm).toEqual(["W", "D"]);
    expect(facts.opponentForm).toEqual(["W", "W", "L", "D", "W"]);
    expect(facts.headToHead).toEqual([
      { date: "2025-12-14", home: "Liverpool FC", away: "Manchester United FC", score: [3, 1] },
    ]);
    expect(facts.table).toEqual({ position: 1, points: 28, played: 11 });
    expect(facts.opponentTable).toEqual({ position: 4, points: 20, played: 11 });
    expect(facts.competitionAliases).toContain("Ngoại hạng Anh");
  });

  it("allows well-formed English and Vietnamese preview drafts through validateDraft", () => {
    const facts = buildMatchPreviewFacts(
      fixture(),
      finishedMatches.slice(0, 2),
      [finishedMatches[2]],
      standings,
    );

    const enDraft = {
      title: "Liverpool FC vs Manchester United FC Preview",
      excerpt: "Liverpool FC host Manchester United FC at Anfield in Premier League Matchday 12.",
      metaTitle: "Liverpool FC vs Manchester United FC Preview",
      metaDescription: "Liverpool FC sit top with 28 points before facing Manchester United FC at Anfield.",
      sections: [
        {
          heading: "Table context",
          body: "Liverpool FC hold position 1 with 28 points after 11 matches, while Manchester United FC sit 4th on 20 points.",
        },
        {
          heading: "Head-to-head",
          body: "Liverpool FC beat Manchester United FC 3-1 at Anfield in the previous meeting.",
        },
      ],
    };

    const viDraft = {
      title: "Nhận định Liverpool FC vs Manchester United FC",
      excerpt: "Liverpool FC tiếp đón Manchester United FC tại Anfield ở vòng đấu Ngoại hạng Anh.",
      metaTitle: "Nhận định Liverpool FC vs Manchester United FC",
      metaDescription: "Liverpool FC dẫn đầu với 28 điểm sau 11 trận trước cuộc đối đầu Manchester United FC.",
      sections: [
        {
          heading: "Bối cảnh bảng điểm",
          body: "Liverpool FC đứng vị trí 1 với 28 điểm sau 11 trận tại Ngoại hạng Anh, còn Manchester United FC có 20 điểm ở vị trí 4.",
        },
        {
          heading: "Đối đầu gần đây",
          body: "Trong lần gặp trước, Liverpool FC thắng Manchester United FC 3-1 tại Anfield.",
        },
      ],
    };

    expect(validateDraft(enDraft, facts)).toEqual({ ok: true, problems: [] });
    expect(validateDraft(viDraft, facts)).toEqual({ ok: true, problems: [] });
  });
});
