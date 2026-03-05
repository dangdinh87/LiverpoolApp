// Football-Data.org v4 — matches, form derivation, coach.
// Supplements fdo-standings.ts with match data and team info.
// Free tier: 10 req/min. All endpoints require FOOTBALL_DATA_ORG_KEY.

import "server-only";
import type { Fixture, Coach } from "@/lib/types/football";

const FDO_BASE = "https://api.football-data.org/v4";
const FETCH_TIMEOUT_MS = 10_000;

const FDO_LFC_ID = 64;
const CANONICAL_LFC_ID = 40;

// ─── FDO response shapes ────────────────────────────────────────────────────

interface FdoMatchTeam {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
}

interface FdoMatch {
  id: number;
  utcDate: string;
  status: string; // SCHEDULED, TIMED, IN_PLAY, PAUSED, FINISHED, POSTPONED, etc.
  matchday: number | null;
  stage: string;
  homeTeam: FdoMatchTeam;
  awayTeam: FdoMatchTeam;
  score: {
    winner: string | null;
    duration: string;
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
  };
  competition: {
    id: number;
    name: string;
    code: string;
    emblem: string;
  };
  referees: { id: number; name: string; type: string; nationality: string }[];
}

interface FdoMatchesResponse {
  matches: FdoMatch[];
}

interface FdoCoachRaw {
  id: number;
  firstName: string | null;
  lastName: string;
  name: string;
  dateOfBirth: string | null;
  nationality: string;
  contract: { start: string | null; until: string | null } | null;
}

interface FdoTeamResponse {
  id: number;
  name: string;
  shortName: string;
  crest: string;
  coach: FdoCoachRaw;
}

// ─── Fetcher (shared with fdo-standings via same pattern) ───────────────────

async function fdoFetch<T>(path: string, revalidate: number): Promise<T> {
  const key = process.env.FOOTBALL_DATA_ORG_KEY;
  if (!key) throw new Error("[fdo] FOOTBALL_DATA_ORG_KEY not set");

  const res = await fetch(`${FDO_BASE}${path}`, {
    headers: { "X-Auth-Token": key },
    next: { revalidate },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) throw new Error(`[fdo] HTTP ${res.status} on ${path}`);
  return res.json();
}

// ─── Status mapping ─────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { short: string; long: string }> = {
  SCHEDULED: { short: "NS", long: "Not Started" },
  TIMED: { short: "NS", long: "Not Started" },
  IN_PLAY: { short: "LIVE", long: "In Play" },
  PAUSED: { short: "HT", long: "Half Time" },
  EXTRA_TIME: { short: "ET", long: "Extra Time" },
  PENALTY_SHOOTOUT: { short: "PEN", long: "Penalty Shootout" },
  FINISHED: { short: "FT", long: "Match Finished" },
  POSTPONED: { short: "PST", long: "Postponed" },
  SUSPENDED: { short: "SUSP", long: "Suspended" },
  CANCELLED: { short: "CANC", long: "Cancelled" },
  AWARDED: { short: "FT", long: "Awarded" },
};

function mapStatus(fdoStatus: string): { short: string; long: string; elapsed: number | null } {
  const mapped = STATUS_MAP[fdoStatus] ?? { short: "NS", long: fdoStatus };
  return { ...mapped, elapsed: fdoStatus === "FINISHED" ? 90 : null };
}

// ─── Team ID mapping ────────────────────────────────────────────────────────

function mapTeamId(fdoId: number): number {
  return fdoId === FDO_LFC_ID ? CANONICAL_LFC_ID : fdoId;
}

// ─── Fixture mapper ─────────────────────────────────────────────────────────

function mapMatchToFixture(m: FdoMatch): Fixture {
  const status = mapStatus(m.status);
  const hGoals = m.score.fullTime.home;
  const aGoals = m.score.fullTime.away;

  return {
    fixture: {
      id: m.id,
      date: m.utcDate,
      venue: { id: null, name: null, city: null },
      status: { long: status.long, short: status.short, elapsed: status.elapsed },
    },
    league: {
      id: m.competition.id,
      name: m.competition.name,
      country: "England",
      logo: m.competition.emblem,
      season: 2025,
      round: m.matchday ? `Matchday ${m.matchday}` : m.stage,
    },
    teams: {
      home: {
        id: mapTeamId(m.homeTeam.id),
        name: m.homeTeam.name,
        logo: m.homeTeam.crest,
        winner: m.score.winner === "HOME_TEAM" ? true : m.score.winner === "AWAY_TEAM" ? false : null,
      },
      away: {
        id: mapTeamId(m.awayTeam.id),
        name: m.awayTeam.name,
        logo: m.awayTeam.crest,
        winner: m.score.winner === "AWAY_TEAM" ? true : m.score.winner === "HOME_TEAM" ? false : null,
      },
    },
    goals: { home: hGoals, away: aGoals },
    score: {
      halftime: m.score.halfTime,
      fulltime: m.score.fullTime,
      extratime: { home: null, away: null },
      penalty: { home: null, away: null },
    },
  };
}

// ─── Public: Form derivation ────────────────────────────────────────────────

/**
 * Fetch all finished PL matches and derive last-5 form for each team.
 * Returns Map<canonical_team_id, form_string> e.g. Map(40 → "WDWLW")
 */
export async function derivePLFormMap(): Promise<Map<number, string>> {
  const data = await fdoFetch<FdoMatchesResponse>(
    "/competitions/PL/matches?status=FINISHED",
    21600, // 6h — same as standings
  );

  // Group matches by team, sorted by date
  const teamMatches = new Map<number, { date: string; result: "W" | "D" | "L" }[]>();

  for (const m of data.matches) {
    const hGoals = m.score.fullTime.home ?? 0;
    const aGoals = m.score.fullTime.away ?? 0;

    const hResult: "W" | "D" | "L" = hGoals > aGoals ? "W" : hGoals < aGoals ? "L" : "D";
    const aResult: "W" | "D" | "L" = aGoals > hGoals ? "W" : aGoals < hGoals ? "L" : "D";

    const hId = mapTeamId(m.homeTeam.id);
    const aId = mapTeamId(m.awayTeam.id);

    if (!teamMatches.has(hId)) teamMatches.set(hId, []);
    if (!teamMatches.has(aId)) teamMatches.set(aId, []);

    teamMatches.get(hId)!.push({ date: m.utcDate, result: hResult });
    teamMatches.get(aId)!.push({ date: m.utcDate, result: aResult });
  }

  const formMap = new Map<number, string>();

  for (const [teamId, matches] of teamMatches) {
    const sorted = matches.sort((a, b) => a.date.localeCompare(b.date));
    const last5 = sorted.slice(-5).map((m) => m.result).join("");
    formMap.set(teamId, last5);
  }

  return formMap;
}

// ─── Public: Cross-competition LFC fixtures ─────────────────────────────────

/** Fetch all Liverpool matches across all competitions. Cache 1h. */
export async function getFdoLfcFixtures(): Promise<Fixture[]> {
  const data = await fdoFetch<FdoMatchesResponse>(
    `/teams/${FDO_LFC_ID}/matches`,
    3600, // 1h
  );

  return data.matches.map(mapMatchToFixture);
}

// ─── Public: Coach info ─────────────────────────────────────────────────────

/** Fetch Liverpool coach from team endpoint. Cache 24h. */
export async function getFdoCoach(): Promise<Coach | null> {
  const data = await fdoFetch<FdoTeamResponse>(
    `/teams/${FDO_LFC_ID}`,
    86400, // 24h
  );

  const c = data.coach;
  if (!c) return null;

  const age = c.dateOfBirth
    ? Math.floor((Date.now() - new Date(c.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : 0;

  return {
    id: c.id,
    name: c.name,
    firstname: c.firstName ?? "",
    lastname: c.lastName,
    age,
    birth: {
      date: c.dateOfBirth ?? "",
      place: "",
      country: c.nationality,
    },
    nationality: c.nationality,
    height: null,
    weight: null,
    photo: "/assets/lfc/players/arne-slot.webp",
    team: { id: CANONICAL_LFC_ID, name: data.name, logo: data.crest },
    career: [],
  };
}
