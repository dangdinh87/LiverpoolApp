import "server-only";
import {
  getFixtureById,
  getFixtureEvents,
  getFixtureLineups,
  getFixtureStatistics,
  getStandings,
} from "@/lib/football";
import type {
  Fixture,
  FixtureEvent,
  FixtureLineup,
  FixtureTeamStats,
  Standing,
} from "@/lib/types/football";
import type { CardFact, GoalFact, HomeAway, MatchReviewFacts } from "./types";

/** Liverpool, in the normalised ids the football layer hands out. */
const LFC_ID = 40;

/**
 * Other names for the competitions this site covers.
 *
 * Mirrors the labels in src/messages/*.json; kept here as data because the
 * facts must be readable without an i18n runtime.
 */
const COMPETITION_ALIASES: Record<string, string[]> = {
  "Premier League": ["Ngoại hạng Anh", "EPL"],
  "UEFA Champions League": ["Champions League", "Cúp C1", "C1"],
  "FA Cup": ["Cúp FA"],
  "EFL Cup": ["Carabao Cup", "Cúp Liên đoàn"],
  "Carabao Cup": ["EFL Cup", "Cúp Liên đoàn"],
};

/** Statistic labels the providers use, mapped to the fields we report. */
const STAT_LABELS = {
  possession: "Ball Possession",
  shots: "Total Shots",
  onTarget: "Shots on Goal",
  corners: "Corner Kicks",
} as const;

/** Read one statistic as a home/away pair, or null when a side is missing it. */
function statPair(
  stats: FixtureTeamStats[],
  homeId: number,
  label: string,
): HomeAway | null {
  const read = (teamId: number): number | null => {
    const team = stats.find((s) => s.team.id === teamId);
    const item = team?.statistics.find((x) => x.type === label);
    if (item?.value === null || item?.value === undefined) return null;
    const n = typeof item.value === "number" ? item.value : Number(String(item.value).replace("%", ""));
    return Number.isFinite(n) ? n : null;
  };
  const away = stats.find((s) => s.team.id !== homeId)?.team.id;
  const h = read(homeId);
  const a = away === undefined ? null : read(away);
  return h === null || a === null ? null : [h, a];
}

/** Goals, in match order, with the minute stoppage time included. */
function goalsFrom(events: FixtureEvent[]): GoalFact[] {
  return events
    .filter((e) => e.type === "Goal" && e.player.name)
    .map((e) => ({
      minute: (e.time.elapsed ?? 0) + (e.time.extra ?? 0),
      scorer: e.player.name as string,
      assist: e.assist.name ?? null,
      team: e.team.name,
      kind: /penalty/i.test(e.detail) ? "penalty" : /own/i.test(e.detail) ? "own goal" : "goal",
    }))
    .sort((a, b) => a.minute - b.minute);
}

function cardsFrom(events: FixtureEvent[]): CardFact[] {
  return events
    .filter((e) => e.type === "Card" && e.player.name)
    .map((e) => ({
      minute: (e.time.elapsed ?? 0) + (e.time.extra ?? 0),
      player: e.player.name as string,
      team: e.team.name,
      colour: /red/i.test(e.detail) ? "red" : "yellow",
    }))
    .sort((a, b) => a.minute - b.minute);
}

/**
 * Assemble everything a match report may state.
 *
 * Pure, so it can be tested against recorded fixtures without a network call,
 * and so the one place that decides what is true stays readable. A missing
 * input narrows what the article can say rather than inventing a stand-in:
 * every optional field here is a sentence the writer simply will not get to
 * write.
 */
export function buildMatchReviewFacts(
  fixture: Fixture,
  events: FixtureEvent[],
  lineups: FixtureLineup[],
  stats: FixtureTeamStats[],
  standings: Standing[],
): MatchReviewFacts {
  const { teams, goals, score, league } = fixture;
  const liverpoolSide = teams.home.id === LFC_ID ? "home" : "away";
  const lfcGoals = liverpoolSide === "home" ? goals.home : goals.away;
  const oppGoals = liverpoolSide === "home" ? goals.away : goals.home;

  const lfcLineup = lineups.find((l) => l.team.id === LFC_ID) ?? null;
  const row = standings.find((s) => s.team.id === LFC_ID) ?? null;

  return {
    kind: "review",
    competition: league.name,
    competitionAliases: COMPETITION_ALIASES[league.name] ?? [],
    round: league.round || null,
    venue: fixture.fixture.venue.name,
    kickOff: fixture.fixture.date,
    home: { name: teams.home.name, score: goals.home ?? 0 },
    away: { name: teams.away.name, score: goals.away ?? 0 },
    liverpoolSide,
    result: (lfcGoals ?? 0) > (oppGoals ?? 0) ? "win" : (lfcGoals ?? 0) === (oppGoals ?? 0) ? "draw" : "loss",
    halfTime:
      score.halftime.home === null || score.halftime.away === null
        ? null
        : { home: score.halftime.home, away: score.halftime.away },
    goals: goalsFrom(events),
    cards: cardsFrom(events),
    formation: lfcLineup?.formation ?? null,
    starters: lfcLineup?.startXI.map((s) => s.player.name) ?? [],
    coach: lfcLineup?.coach?.name ?? null,
    substitutes: lfcLineup?.substitutes.map((s) => s.player.name) ?? [],
    stats: stats.length
      ? {
          possession: statPair(stats, teams.home.id, STAT_LABELS.possession),
          shots: statPair(stats, teams.home.id, STAT_LABELS.shots),
          onTarget: statPair(stats, teams.home.id, STAT_LABELS.onTarget),
          corners: statPair(stats, teams.home.id, STAT_LABELS.corners),
        }
      : null,
    table: row ? { position: row.rank, points: row.points, played: row.all.played } : null,
  };
}

/** Fetch what a match report needs and assemble it. */
export async function loadMatchReviewFacts(fixtureId: number): Promise<MatchReviewFacts | null> {
  const fixture = await getFixtureById(fixtureId);
  if (!fixture) return null;
  const date = fixture.fixture.date;
  const [events, lineups, stats, standings] = await Promise.all([
    getFixtureEvents(fixtureId, date),
    getFixtureLineups(fixtureId, date),
    getFixtureStatistics(fixtureId),
    getStandings().catch(() => [] as Standing[]),
  ]);
  return buildMatchReviewFacts(fixture, events, lineups, stats, standings);
}
