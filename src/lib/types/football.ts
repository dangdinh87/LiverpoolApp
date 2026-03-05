// Canonical football data types — shared by all providers (FPL, Football-Data.org, mock).
// Originally based on API-Football v3 shapes, now provider-agnostic.

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
  league: { id: number; name: string; country?: string; logo?: string; flag?: string | null; season: number };
  games: {
    appearences: number | null;
    lineups: number | null;
    minutes: number | null;
    number: number | null;
    position: string | null; // "Attacker", "Defender", etc. — from /players endpoint
    rating: string | null;
    captain: boolean;
  };
  substitutes: { in: number | null; out: number | null; bench: number | null };
  goals: {
    total: number | null;
    assists: number | null;
    conceded: number | null;
    saves: number | null;
  };
  passes: { total: number | null; key: number | null; accuracy: string | null };
  tackles: { total: number | null; blocks: number | null; interceptions: number | null };
  duels: { total: number | null; won: number | null };
  dribbles: { attempts: number | null; success: number | null; past: number | null };
  fouls: { drawn: number | null; committed: number | null };
  cards: { yellow: number; yellowred: number | null; red: number };
  shots: { total: number | null; on: number | null };
  penalty: { won: number | null; commited: number | null; scored: number | null; missed: number | null; saved: number | null };
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

// ─── Fixture Events (goals, cards, subs) ────────────────────────────────────

export interface FixtureEvent {
  time: { elapsed: number; extra: number | null };
  team: { id: number; name: string; logo: string };
  player: { id: number | null; name: string | null };
  assist: { id: number | null; name: string | null };
  type: "Goal" | "Card" | "subst" | "Var" | string;
  detail: string; // "Normal Goal", "Penalty", "Yellow Card", "Red Card", "Substitution 1", etc.
  comments: string | null;
}

// ─── Fixture Lineups ────────────────────────────────────────────────────────

export interface LineupPlayer {
  id: number;
  name: string;
  number: number;
  pos: string; // "G", "D", "M", "F"
  grid: string | null; // e.g. "1:1", "2:3"
}

export interface FixtureLineup {
  team: { id: number; name: string; logo: string; colors: unknown };
  formation: string; // e.g. "4-3-3"
  startXI: { player: LineupPlayer }[];
  substitutes: { player: LineupPlayer }[];
  coach: { id: number; name: string; photo: string };
}

// ─── Fixture Statistics ─────────────────────────────────────────────────────

export interface FixtureStatItem {
  type: string; // "Shots on Goal", "Ball Possession", "Total passes", etc.
  value: number | string | null;
}

export interface FixtureTeamStats {
  team: { id: number; name: string; logo: string };
  statistics: FixtureStatItem[];
}

// ─── Injuries ───────────────────────────────────────────────────────────────

export interface Injury {
  player: { id: number; name: string; photo: string; type: string; reason: string };
  team: { id: number; name: string; logo: string };
  fixture: { id: number; date: string };
  league: { id: number; name: string; season: number };
}

// ─── Team Info ──────────────────────────────────────────────────────────────

export interface TeamInfo {
  team: {
    id: number;
    name: string;
    code: string | null;
    country: string;
    founded: number;
    national: boolean;
    logo: string;
  };
  venue: {
    id: number;
    name: string;
    address: string;
    city: string;
    capacity: number;
    surface: string;
    image: string;
  };
}

// ─── Coach ──────────────────────────────────────────────────────────────────

export interface CoachCareer {
  team: { id: number; name: string; logo: string };
  start: string;
  end: string | null;
}

export interface Coach {
  id: number;
  name: string;
  firstname: string;
  lastname: string;
  age: number;
  birth: { date: string; place: string; country: string };
  nationality: string;
  height: string | null;
  weight: string | null;
  photo: string;
  team: { id: number; name: string; logo: string };
  career: CoachCareer[];
}
