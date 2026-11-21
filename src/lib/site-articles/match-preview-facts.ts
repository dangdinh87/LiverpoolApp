import "server-only";
import { getFixtureById, getFixtures, getStandings } from "@/lib/football";
import { computeH2H } from "@/lib/football/fdo-h2h";
import { getCurrentSeasonYear } from "@/lib/football/current-season";
import { getMatchResult, type Fixture, type Standing } from "@/lib/types/football";
import { COMPETITION_ALIASES } from "./match-review-facts";
import type { HomeAway, MatchPreviewFacts } from "./types";

const LFC_ID = 40;
const FINISHED = new Set(["FT", "AET", "PEN"]);

/**
 * Assemble everything a pre-match preview article may state.
 *
 * Built exclusively from local fixtures and standings data so downstream
 * generation can never invent kick-off times, form runs, or head-to-head scores.
 */
export function buildMatchPreviewFacts(
  fixture: Fixture,
  seasonFixtures: Fixture[],
  prevFixtures: Fixture[],
  standings: Standing[],
): MatchPreviewFacts {
  const { teams, league, fixture: meta } = fixture;
  const liverpoolSide = teams.home.id === LFC_ID ? "home" : "away";
  const opponentId = liverpoolSide === "home" ? teams.away.id : teams.home.id;

  const liverpoolForm = [...seasonFixtures]
    .filter((f) => FINISHED.has(f.fixture.status.short))
    .sort((a, b) => b.fixture.date.localeCompare(a.fixture.date))
    .slice(0, 5)
    .map((m) => getMatchResult(m))
    .filter((r): r is "W" | "D" | "L" => r !== null);

  const lfcRow = standings.find((s) => s.team.id === LFC_ID) ?? null;
  const opponentRow = standings.find((s) => s.team.id === opponentId) ?? null;

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
      home: m.homeTeam,
      away: m.awayTeam,
      score: [h, a] as HomeAway,
    };
  });

  const venue = meta.venue.name ?? (liverpoolSide === "home" ? "Anfield" : null);

  return {
    kind: "preview",
    competition: league.name,
    competitionAliases: COMPETITION_ALIASES[league.name] ?? [],
    round: league.round || null,
    venue,
    kickOff: meta.date,
    home: { name: teams.home.name },
    away: { name: teams.away.name },
    liverpoolSide,
    liverpoolForm,
    opponentForm,
    headToHead,
    table: lfcRow ? { position: lfcRow.rank, points: lfcRow.points, played: lfcRow.all.played } : null,
    opponentTable: opponentRow
      ? { position: opponentRow.rank, points: opponentRow.points, played: opponentRow.all.played }
      : null,
  };
}

/** Fetch season fixtures, H2H history, and standings for an upcoming fixture preview. */
export async function loadMatchPreviewFacts(fixtureId: number): Promise<MatchPreviewFacts | null> {
  const fixture = await getFixtureById(fixtureId);
  if (!fixture) return null;

  const season = fixture.league.season || getCurrentSeasonYear();
  const [seasonFixtures, prevFixtures, standings] = await Promise.all([
    getFixtures().catch(() => [] as Fixture[]),
    season > 0 ? getFixtures(season - 1).catch(() => [] as Fixture[]) : Promise.resolve([] as Fixture[]),
    getStandings().catch(() => [] as Standing[]),
  ]);

  return buildMatchPreviewFacts(fixture, seasonFixtures, prevFixtures, standings);
}
