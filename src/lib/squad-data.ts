// Local squad data from liverpoolfc.com (replaces API-Football for squad/player)
import squadJson from "@/data/squad.json";
import playerBiosVi from "@/data/player-bios.vi.json";
import { POSITION_DISPLAY, POSITION_ORDER, type PlayerPosition } from "@/lib/squad-positions";

// ─── Types ──────────────────────────────────────────────────────────────────


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
  height: string;         // e.g. "191 cm"
  weight: string;         // e.g. "91 kg"
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

export { POSITION_DISPLAY, POSITION_ORDER };
export type { PlayerPosition };

// ─── Data access ────────────────────────────────────────────────────────────

// squad.json entries added for newer signings omit `honors`; normalize once so
// every consumer can rely on the typed `string[]` (the player page crashed on it).
export function normalizeSquad(raw: SquadData): SquadData {
  return {
    ...raw,
    players: raw.players.map((p) => ({ ...p, honors: p.honors ?? [] })),
  };
}

const data: SquadData = normalizeSquad(squadJson as SquadData);

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

/**
 * Route slug for a player named exactly as the squad data names them.
 *
 * Matched on the exact string on purpose: fan ratings are stored under the name
 * the match lineup feed gives, and `getPlayerFanRating` reads them back with
 * `.eq("player_name", player.name)` using this file's spelling. The two only
 * ever meet when those strings are identical, so a looser match here would
 * revalidate pages that cannot show the rating anyway. (That the feature
 * depends on two separate sources agreeing on a name is a pre-existing
 * fragility, not something this lookup introduces.)
 */
export function getPlayerSlugByName(name: string): string | null {
  return data.players.find((p) => p.name === name)?.slug ?? null;
}

/** Get the head coach */
export function getCoach(): LfcCoach {
  return data.coach;
}

/** The handful of entities the bios actually contain. */
const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

/**
 * Flatten a bio to plain text, keeping paragraph breaks as blank lines.
 *
 * English bios are stored as HTML fragments (<p>, <a>, <strong>, <em>, <br>)
 * while Vietnamese ones are plain prose. Callers render the string as text, so
 * the markup was escaped and printed to the reader — a player page showed
 * "</p><p>Woodman left St." under the Biography heading — and the same string
 * fed meta descriptions for players with no Vietnamese bio.
 *
 * Tags are dropped rather than rendered: the text is treated as data, so
 * nothing in the data file can inject markup into the page.
 */
function flattenBioMarkup(raw: string): string {
  if (!/<[a-z/]/i.test(raw)) return raw.trim();
  return raw
    // Block boundaries become blank lines so callers can split on them.
    .replace(/<\/p\s*>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z#0-9]+;/gi, (e) => HTML_ENTITIES[e.toLowerCase()] ?? e)
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .trim();
}

/** Get player bio by locale (falls back to English), as plain text. */
export function getPlayerBio(slug: string, locale: string): string {
  if (locale === "vi") {
    const viBio = (playerBiosVi as Record<string, string>)[slug];
    if (viBio) return flattenBioMarkup(viBio);
  }
  const player = getPlayerBySlug(slug);
  return flattenBioMarkup(player?.bio ?? "");
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
