// Local squad data from liverpoolfc.com (replaces API-Football for squad/player)
import squadJson from "@/data/squad.json";

// ─── Types ──────────────────────────────────────────────────────────────────

export type PlayerPosition = "goalkeeper" | "defender" | "midfielder" | "forward";

export interface LfcPlayer {
  id: number;
  name: string;
  shirtNumber: number;
  shirtName: string;
  slug: string;
  position: PlayerPosition;
  nationality: string;
  dateOfBirth: string; // ISO 8601
  onLoan: boolean;
  forever: boolean;
  photo: string;          // remote headshot (sm)
  photoLg: string;        // remote headshot (lg)
  bodyShot: string;       // remote body shot
  localPhoto: string;     // local headshot path
  localBodyShot: string;  // local body shot path
  bio: string;            // plain text biography
  honors: string[];
  metaDescription: string;
}

export interface LfcCoach {
  id: number;
  name: string;
  slug: string;
  nationality: string;
  photo: string;
  metaDescription: string;
}

export interface SquadData {
  lastUpdated: string;
  source: string;
  coach: LfcCoach;
  players: LfcPlayer[];
}

// ─── Position display ───────────────────────────────────────────────────────

export const POSITION_DISPLAY: Record<PlayerPosition, string> = {
  goalkeeper: "GK",
  defender: "DEF",
  midfielder: "MID",
  forward: "FWD",
};

export const POSITION_ORDER: Record<PlayerPosition, number> = {
  goalkeeper: 0,
  defender: 1,
  midfielder: 2,
  forward: 3,
};

// ─── Data access ────────────────────────────────────────────────────────────

const data = squadJson as SquadData;

/** Get all players (active squad, excludes on-loan and forever unless specified) */
export function getSquadPlayers(opts?: { includeLoans?: boolean; includeForever?: boolean }): LfcPlayer[] {
  return data.players.filter((p) => {
    if (!opts?.includeLoans && p.onLoan) return false;
    if (!opts?.includeForever && p.forever) return false;
    return true;
  });
}

/** Get all players including loans and forever */
export function getAllPlayers(): LfcPlayer[] {
  return data.players;
}

/** Get a single player by ID */
export function getPlayerById(id: number): LfcPlayer | null {
  return data.players.find((p) => p.id === id) ?? null;
}

/** Get a single player by slug */
export function getPlayerBySlug(slug: string): LfcPlayer | null {
  return data.players.find((p) => p.slug === slug) ?? null;
}

/** Get the head coach */
export function getCoach(): LfcCoach {
  return data.coach;
}

/** Calculate age from date of birth */
export function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}
