import "server-only";
import { getFixtureById, getFixtures, getStandings } from "@/lib/football";
import { getAllFplStats, type FplPlayerStats } from "@/lib/football/fpl-stats";
import { computeH2H } from "@/lib/football/fdo-h2h";
import { getCurrentSeasonYear } from "@/lib/football/current-season";
import { getMatchResult, type Fixture, type Standing, type StandingRecord } from "@/lib/types/football";
import { cleanClubName, COMPETITION_ALIASES } from "./match-review-facts";
import type { HomeAway, MatchPreviewFacts, PreviewSplitRecord, PreviewTableStats } from "./types";

const LFC_ID = 40;
const FINISHED = new Set(["FT", "AET", "PEN"]);
const INJURY_PRIORITY: Record<string, number> = { i: 0, s: 1, d: 2, u: 3, n: 4 };

function toSplitRecord(r: StandingRecord | undefined): PreviewSplitRecord | undefined {
  if (!r || r.played <= 0) return undefined;
  return {
    played: r.played,
    win: r.win,
    draw: r.draw,
    lose: r.lose,
    goalsFor: r.goals.for,
    goalsAgainst: r.goals.against,
  };
}

function toTableStats(row: Standing | null): PreviewTableStats | null {
  if (!row) return null;
  const homeRecord = toSplitRecord(row.home);
  const awayRecord = toSplitRecord(row.away);
  return {
    position: row.rank,
    points: row.points,
    played: row.all.played,
    won: row.all.win,
    drawn: row.all.draw,
    lost: row.all.lose,
    goalsFor: row.all.goals.for,
    goalsAgainst: row.all.goals.against,
    goalDifference: row.goalsDiff,
    ...(homeRecord ? { homeRecord } : {}),
    ...(awayRecord ? { awayRecord } : {}),
  };
}

function formatPlayerName(p: FplPlayerStats): string {
  return `${p.firstName} ${p.secondName}`.trim() || p.webName;
}

/**
 * Assemble everything a pre-match preview article may state.
 *
 * Built exclusively from local fixtures, standings, and FPL availability/player data so
 * downstream generation can never invent kick-off times, form runs, injuries, or scores.
 */
export function buildMatchPreviewFacts(
  fixture: Fixture,
  seasonFixtures: Fixture[],
  prevFixtures: Fixture[],
  standings: Standing[],
  fplPlayers: FplPlayerStats[] = [],
): MatchPreviewFacts {
  const { teams, league, fixture: meta } = fixture;
  const liverpoolSide = teams.home.id === LFC_ID ? "home" : "away";
  const opponentId = liverpoolSide === "home" ? teams.away.id : teams.home.id;

  const recentFinished = [...seasonFixtures]
    .filter((f) => FINISHED.has(f.fixture.status.short))
    .sort((a, b) => b.fixture.date.localeCompare(a.fixture.date))
    .slice(0, 5);

  const liverpoolForm = recentFinished
    .map((m) => getMatchResult(m))
    .filter((r): r is "W" | "D" | "L" => r === "W" || r === "D" || r === "L");

  const recentLiverpoolMatches = recentFinished
    .map((m) => {
      const result = getMatchResult(m);
      if (result !== "W" && result !== "D" && result !== "L") return null;
      const isHome = m.teams.home.id === LFC_ID;
      return {
        date: m.fixture.date.slice(0, 10),
        opponent: cleanClubName(isHome ? m.teams.away.name : m.teams.home.name),
        venue: (isHome ? "home" : "away") as "home" | "away",
        score: [m.goals.home ?? 0, m.goals.away ?? 0] as HomeAway,
        result,
        competition: m.league.name,
      };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);

  const lfcRow = standings.find((s) => s.team.id === LFC_ID) ?? null;
  const opponentRow = standings.find((s) => s.team.id === opponentId) ?? null;
  const leaderRow = standings.find((s) => s.rank === 1) ?? null;
  const fourthRow = standings.find((s) => s.rank === 4) ?? null;

  const opponentForm = opponentRow?.form
    ? opponentRow.form
        .replace(/[^WDL]/gi, "")
        .toUpperCase()
        .split("")
        .reverse()
        .slice(0, 5)
    : [];

  const h2h = computeH2H([...seasonFixtures, ...prevFixtures], opponentId);
  const headToHead = (h2h?.lastMeetings ?? []).slice(0, 5).map((m) => {
    const [h = 0, a = 0] = m.score.split("-").map(Number);
    return {
      date: m.date.slice(0, 10),
      home: cleanClubName(m.homeTeam),
      away: cleanClubName(m.awayTeam),
      score: [h, a] as HomeAway,
    };
  });

  const injuries = [...fplPlayers]
    .filter(
      (p) =>
        p.status &&
        p.status !== "a" &&
        (p.news.trim().length > 0 || p.status === "i" || p.status === "s" || p.status === "d"),
    )
    .sort(
      (a, b) =>
        (INJURY_PRIORITY[a.status] ?? 9) - (INJURY_PRIORITY[b.status] ?? 9) || b.minutes - a.minutes,
    )
    .slice(0, 6)
    .map((p) => ({
      player: formatPlayerName(p),
      status: p.status,
      news: p.news.trim(),
      chanceOfPlayingNextRound: p.chanceOfPlayingNextRound ?? null,
    }));

  const keyPlayers = [...fplPlayers]
    .filter((p) => p.goalsScored + p.assists > 0)
    .sort(
      (a, b) =>
        b.goalsScored + b.assists - (a.goalsScored + a.assists) ||
        b.goalsScored - a.goalsScored ||
        b.minutes - a.minutes,
    )
    .slice(0, 4)
    .map((p) => ({
      name: formatPlayerName(p),
      goals: p.goalsScored,
      assists: p.assists,
      minutes: p.minutes,
    }));

  const competitionAliases = [
    ...new Set([
      ...(COMPETITION_ALIASES[league.name] ?? []),
      ...recentLiverpoolMatches.flatMap((m) => COMPETITION_ALIASES[m.competition] ?? []),
    ]),
  ];

  const venue = meta.venue.name ?? (liverpoolSide === "home" ? "Anfield" : null);

  return {
    kind: "preview",
    competition: league.name,
    competitionAliases,
    round: league.round || null,
    venue,
    kickOff: meta.date,
    home: { name: cleanClubName(teams.home.name) },
    away: { name: cleanClubName(teams.away.name) },
    liverpoolSide,
    liverpoolForm,
    opponentForm,
    recentLiverpoolMatches,
    headToHead,
    table: toTableStats(lfcRow),
    opponentTable: toTableStats(opponentRow),
    tableContext: {
      leader: leaderRow ? { name: cleanClubName(leaderRow.team.name), points: leaderRow.points } : null,
      fourthPlace: fourthRow ? { name: cleanClubName(fourthRow.team.name), points: fourthRow.points } : null,
    },
    injuries,
    keyPlayers,
  };
}

/** Fetch season fixtures, H2H history, standings, and FPL squad availability/leaders for a preview. */
export async function loadMatchPreviewFacts(fixtureId: number): Promise<MatchPreviewFacts | null> {
  const fixture = await getFixtureById(fixtureId);
  if (!fixture) return null;

  const season = fixture.league.season || getCurrentSeasonYear();
  const [seasonFixtures, prevFixtures, standings, fplPlayers] = await Promise.all([
    getFixtures().catch(() => [] as Fixture[]),
    season > 0 ? getFixtures(season - 1).catch(() => [] as Fixture[]) : Promise.resolve([] as Fixture[]),
    getStandings().catch(() => [] as Standing[]),
    getAllFplStats().catch(() => [] as FplPlayerStats[]),
  ]);

  return buildMatchPreviewFacts(fixture, seasonFixtures, prevFixtures, standings, fplPlayers);
}
