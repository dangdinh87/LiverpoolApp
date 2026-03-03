// TypeScript types for API-Football v3 responses
// Reference: https://www.api-football.com/documentation-v3

// ─── Player ───────────────────────────────────────────────────────────────────

export interface Player {
  id: number;
  name: string;
  firstname: string;
  lastname: string;
  age: number;
  number: number | null;
  position: "Goalkeeper" | "Defender" | "Midfielder" | "Attacker";
  photo: string;
  nationality: string;
  height: string | null;
  weight: string | null;
  injured: boolean;
}

export interface PlayerStats {
  player: Player;
  statistics: PlayerStatistic[];
}

export interface PlayerStatistic {
  team: { id: number; name: string; logo: string };
  league: { id: number; name: string; season: number };
  games: {
    appearences: number | null;
    lineups: number | null;
    minutes: number | null;
    rating: string | null;
  };
  goals: {
    total: number | null;
    assists: number | null;
    conceded: number | null;
    saves: number | null;
  };
  passes: { total: number | null; accuracy: string | null };
  tackles: { total: number | null };
  cards: { yellow: number; red: number };
  shots: { total: number | null; on: number | null };
  dribbles: { attempts: number | null; success: number | null };
}

// Position display label map
export const POSITION_LABELS: Record<Player["position"], string> = {
  Goalkeeper: "GK",
  Defender: "DEF",
  Midfielder: "MID",
  Attacker: "FWD",
};

// ─── Fixture / Match ──────────────────────────────────────────────────────────

export type FixtureStatus =
  | "NS"   // Not Started
  | "1H"   // First Half
  | "HT"   // Half Time
  | "2H"   // Second Half
  | "ET"   // Extra Time
  | "P"    // Penalty in Progress
  | "FT"   // Full Time
  | "AET"  // After Extra Time
  | "PEN"  // After Penalties
  | "CANC" // Cancelled
  | "PST"  // Postponed
  | string; // catch-all

export interface Fixture {
  fixture: {
    id: number;
    date: string; // ISO 8601
    venue: { id: number | null; name: string | null; city: string | null };
    status: { long: string; short: FixtureStatus; elapsed: number | null };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    season: number;
    round: string;
  };
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null };
    away: { id: number; name: string; logo: string; winner: boolean | null };
  };
  goals: { home: number | null; away: number | null };
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
    extratime: { home: number | null; away: number | null };
    penalty: { home: number | null; away: number | null };
  };
}

// Match result from Liverpool's perspective
export type MatchResult = "W" | "D" | "L" | "NS";

export function getMatchResult(
  fixture: Fixture,
  teamId: number = 40
): MatchResult {
  const { fixture: f, teams, goals } = fixture;
  if (f.status.short !== "FT") return "NS";
  if (goals.home === null || goals.away === null) return "NS";
  const isHome = teams.home.id === teamId;
  const lfcGoals = isHome ? goals.home : goals.away;
  const oppGoals = isHome ? goals.away : goals.home;
  if (lfcGoals > oppGoals) return "W";
  if (lfcGoals < oppGoals) return "L";
  return "D";
}

// ─── Standings ────────────────────────────────────────────────────────────────

export interface Standing {
  rank: number;
  team: { id: number; name: string; logo: string };
  points: number;
  goalsDiff: number;
  group: string | null;
  form: string | null; // e.g., "WWDLW"
  status: string | null;
  description: string | null;
  all: StandingRecord;
  home: StandingRecord;
  away: StandingRecord;
}

export interface StandingRecord {
  played: number;
  win: number;
  draw: number;
  lose: number;
  goals: { for: number; against: number };
}

// ─── Top Scorers ─────────────────────────────────────────────────────────────

export interface TopScorer {
  player: Player;
  statistics: PlayerStatistic[];
}
