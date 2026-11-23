import { describe, expect, it } from "vitest";
import { buildMatchPreviewFacts } from "@/lib/site-articles/match-preview-facts";
import { cleanClubName } from "@/lib/site-articles/match-review-facts";
import { validateDraft } from "@/lib/site-articles/validate-draft";
import type { FplPlayerStats } from "@/lib/football/fpl-stats";
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

function fplPlayer(over: Partial<FplPlayerStats>): FplPlayerStats {
  return {
    fplId: 1,
    webName: "Salah",
    firstName: "Mohamed",
    secondName: "Salah",
    elementType: 3,
    minutes: 900,
    starts: 10,
    goalsScored: 0,
    assists: 0,
    cleanSheets: 0,
    goalsConceded: 0,
    ownGoals: 0,
    penaltiesSaved: 0,
    penaltiesMissed: 0,
    yellowCards: 0,
    redCards: 0,
    saves: 0,
    bonus: 0,
    bps: 0,
    influence: 0,
    creativity: 0,
    threat: 0,
    expectedGoals: 0,
    expectedAssists: 0,
    expectedGoalInvolvements: 0,
    expectedGoalsConceded: 0,
    totalPoints: 0,
    pointsPerGame: 0,
    selectedByPercent: 0,
    form: 0,
    status: "a",
    news: "",
    newsAdded: null,
    chanceOfPlayingNextRound: 100,
    ...over,
  };
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
    goalsDiff: -8,
    group: null,
    form: "WDLWW",
    status: null,
    description: null,
    all: { played: 11, win: 6, draw: 2, lose: 3, goals: { for: 16, against: 24 } },
    home: { played: 5, win: 4, draw: 0, lose: 1, goals: { for: 9, against: 8 } },
    away: { played: 6, win: 2, draw: 2, lose: 2, goals: { for: 7, against: 16 } },
  },
] as Standing[];

const fplPlayers: FplPlayerStats[] = [
  fplPlayer({
    fplId: 1,
    firstName: "Mohamed",
    secondName: "Salah",
    webName: "M.Salah",
    goalsScored: 8,
    assists: 5,
    minutes: 960,
  }),
  fplPlayer({
    fplId: 2,
    firstName: "Cody",
    secondName: "Gakpo",
    webName: "Gakpo",
    goalsScored: 4,
    assists: 2,
    minutes: 720,
  }),
  fplPlayer({
    fplId: 3,
    firstName: "Alisson",
    secondName: "Becker",
    webName: "Alisson",
    status: "i",
    news: "Hamstring injury",
    chanceOfPlayingNextRound: 0,
    minutes: 540,
  }),
  fplPlayer({
    fplId: 4,
    firstName: "Ibrahima",
    secondName: "Konate",
    webName: "Konate",
    status: "d",
    news: "Knock",
    chanceOfPlayingNextRound: 50,
    minutes: 810,
  }),
];

describe("cleanClubName", () => {
  it("strips redundant FC and AFC prefixes/suffixes cleanly", () => {
    expect(cleanClubName("Liverpool FC")).toBe("Liverpool");
    expect(cleanClubName("Manchester United FC")).toBe("Manchester United");
    expect(cleanClubName("AFC Bournemouth")).toBe("Bournemouth");
    expect(cleanClubName("FC Porto")).toBe("Porto");
  });
});

describe("buildMatchPreviewFacts", () => {
  it("assembles cleaned names, form, recent matches, H2H, table context, injuries, and key players", () => {
    const facts = buildMatchPreviewFacts(
      fixture(),
      finishedMatches.slice(0, 2),
      [finishedMatches[2]],
      standings,
      fplPlayers,
    );

    expect(facts.kind).toBe("preview");
    expect(facts.venue).toBe("Anfield");
    expect(facts.home.name).toBe("Liverpool");
    expect(facts.away.name).toBe("Manchester United");
    expect(facts.liverpoolForm).toEqual(["W", "D"]);
    expect(facts.opponentForm).toEqual(["W", "W", "L", "D", "W"]);
    expect(facts.recentLiverpoolMatches).toEqual([
      {
        date: "2026-11-08",
        opponent: "Arsenal",
        venue: "home",
        score: [2, 0],
        result: "W",
        competition: "Premier League",
      },
      {
        date: "2026-11-01",
        opponent: "Manchester City",
        venue: "away",
        score: [1, 1],
        result: "D",
        competition: "Premier League",
      },
    ]);
    expect(facts.headToHead).toEqual([
      { date: "2025-12-14", home: "Liverpool", away: "Manchester United", score: [3, 1] },
    ]);
    expect(facts.table).toEqual({
      position: 1,
      points: 28,
      played: 11,
      won: 9,
      drawn: 1,
      lost: 1,
      goalsFor: 24,
      goalsAgainst: 6,
      goalDifference: 18,
      homeRecord: { played: 6, win: 6, draw: 0, lose: 0, goalsFor: 15, goalsAgainst: 2 },
      awayRecord: { played: 5, win: 3, draw: 1, lose: 1, goalsFor: 9, goalsAgainst: 4 },
    });
    expect(facts.tableContext).toEqual({
      leader: { name: "Liverpool", points: 28 },
      fourthPlace: { name: "Manchester United", points: 20 },
    });
    expect(facts.injuries).toEqual([
      { player: "Alisson Becker", status: "i", news: "Hamstring injury", chanceOfPlayingNextRound: 0 },
      { player: "Ibrahima Konate", status: "d", news: "Knock", chanceOfPlayingNextRound: 50 },
    ]);
    expect(facts.keyPlayers).toEqual([
      { name: "Mohamed Salah", goals: 8, assists: 5, minutes: 960 },
      { name: "Cody Gakpo", goals: 4, assists: 2, minutes: 720 },
    ]);
    expect(facts.competitionAliases).toContain("Ngoại hạng Anh");
  });

  it("allows rich English and Vietnamese preview drafts (injuries, key players, negative GD, points gap)", () => {
    const gapStandings = [
      standings[0],
      { ...standings[1], rank: 19, points: 5, goalsDiff: -8 },
    ] as Standing[];
    const facts = buildMatchPreviewFacts(
      fixture(),
      finishedMatches.slice(0, 2),
      [finishedMatches[2]],
      gapStandings,
      fplPlayers,
    );

    const enDraft = {
      title: "Liverpool vs Manchester United: title pace meets relegation trouble",
      excerpt: "Liverpool sit top with a 23-point advantage ahead of welcoming Manchester United to Anfield.",
      metaTitle: "Liverpool vs Manchester United preview",
      metaDescription: "Team news, form and key threats as Liverpool host Manchester United.",
      sections: [
        {
          heading: "Table stakes",
          body: "Liverpool hold 28 points after 11 matches, 23 points clear of Manchester United with a -8 goal difference.",
        },
        {
          heading: "Injuries and key threats",
          body: "Alisson Becker misses out while Ibrahima Konate is rated at 50 percent. Mohamed Salah leads Liverpool with 13 goal contributions.",
        },
        {
          heading: "Head-to-head",
          body: "Liverpool beat Arsenal 2-0 before beating United 3-1 at Anfield last December.",
        },
      ],
    };

    const viDraft = {
      title: "Nhận định Liverpool vs Manchester United tại Anfield",
      excerpt: "Liverpool dẫn đầu bảng với cách biệt 23 điểm trước màn tiếp đón Manchester United ở Ngoại hạng Anh.",
      metaTitle: "Nhận định Liverpool vs Manchester United",
      metaDescription: "Phong độ, lực lượng chấn thương và điểm nhấn trước trận Liverpool gặp Manchester United.",
      sections: [
        {
          heading: "Cuộc đua ngôi đầu",
          body: "Liverpool dẫn đầu với 28 điểm sau 11 vòng, hơn Manchester United 23 điểm khi đối thủ có hiệu số -8.",
        },
        {
          heading: "Lực lượng và ngòi nổ",
          body: "Chấn thương khiến Alisson Becker vắng mặt còn Ibrahima Konate chỉ đạt khả năng 50 phần trăm. Mohamed Salah đóng góp 8 bàn và 5 kiến tạo.",
        },
      ],
    };

    expect(validateDraft(enDraft, facts)).toEqual({ ok: true, problems: [] });
    expect(validateDraft(viDraft, facts)).toEqual({ ok: true, problems: [] });
  });
});
