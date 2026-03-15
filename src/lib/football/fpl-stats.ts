// FPL (Fantasy Premier League) — per-player Premier League stats.
// Free, no API key needed. Single call fetches ALL PL players.
// Matched to local squad via name similarity.

import "server-only";

// ─── Configuration ──────────────────────────────────────────────────────────

const FPL_API = "https://fantasy.premierleague.com/api/bootstrap-static/";
const FPL_LFC_TEAM_ID = 12; // Liverpool's FPL team ID
const REVALIDATE_SEC = 21_600; // 6h cache
const FETCH_TIMEOUT_MS = 15_000;

// ─── FPL element shape (only fields we use) ─────────────────────────────────

export interface FplPlayerStats {
  fplId: number;
  webName: string;
  firstName: string;
  secondName: string;
  elementType: number; // 1=GK, 2=DEF, 3=MID, 4=FWD
  minutes: number;
  starts: number;
  goalsScored: number;
  assists: number;
  cleanSheets: number;
  goalsConceded: number;
  ownGoals: number;
  penaltiesSaved: number;
  penaltiesMissed: number;
  yellowCards: number;
  redCards: number;
  saves: number;
  bonus: number;
  bps: number;
  influence: number;
  creativity: number;
  threat: number;
  expectedGoals: number;
  expectedAssists: number;
  expectedGoalInvolvements: number;
  expectedGoalsConceded: number;
  totalPoints: number;
  pointsPerGame: number;
  selectedByPercent: number;
  form: number;
}

// ─── Raw FPL element ────────────────────────────────────────────────────────

interface FplElement {
  id: number;
  web_name: string;
  first_name: string;
  second_name: string;
  known_name: string | null;
  element_type: number;
  team: number;
  minutes: number;
  starts: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  own_goals: number;
  penalties_saved: number;
  penalties_missed: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  bonus: number;
  bps: number;
  influence: string;
  creativity: string;
  threat: string;
  expected_goals: string;
  expected_assists: string;
  expected_goal_involvements: string;
  expected_goals_conceded: string;
  total_points: number;
  points_per_game: string;
  selected_by_percent: string;
  form: string;
}

interface FplBootstrapResponse {
  elements: FplElement[];
}

// ─── Mapper ─────────────────────────────────────────────────────────────────

function mapFplElement(e: FplElement): FplPlayerStats {
  return {
    fplId: e.id,
    webName: e.web_name,
    firstName: e.first_name,
    secondName: e.second_name,
    elementType: e.element_type,
    minutes: e.minutes,
    starts: e.starts,
    goalsScored: e.goals_scored,
    assists: e.assists,
    cleanSheets: e.clean_sheets,
    goalsConceded: e.goals_conceded,
    ownGoals: e.own_goals,
    penaltiesSaved: e.penalties_saved,
    penaltiesMissed: e.penalties_missed,
    yellowCards: e.yellow_cards,
    redCards: e.red_cards,
    saves: e.saves,
    bonus: e.bonus,
    bps: e.bps,
    influence: parseFloat(e.influence) || 0,
    creativity: parseFloat(e.creativity) || 0,
    threat: parseFloat(e.threat) || 0,
    expectedGoals: parseFloat(e.expected_goals) || 0,
    expectedAssists: parseFloat(e.expected_assists) || 0,
    expectedGoalInvolvements: parseFloat(e.expected_goal_involvements) || 0,
    expectedGoalsConceded: parseFloat(e.expected_goals_conceded) || 0,
    totalPoints: e.total_points,
    pointsPerGame: parseFloat(e.points_per_game) || 0,
    selectedByPercent: parseFloat(e.selected_by_percent) || 0,
    form: parseFloat(e.form) || 0,
  };
}

// ─── Name matching ──────────────────────────────────────────────────────────

/** Normalize name for matching (lowercase, remove accents, trim) */
function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Match a local player name to FPL data using multiple strategies */
function findFplMatch(
  localName: string,
  fplPlayers: FplPlayerStats[]
): FplPlayerStats | null {
  const norm = normalizeName(localName);
  const parts = norm.split(/\s+/);
  const lastName = parts[parts.length - 1];

  // Strategy 1: exact full name match (first + second)
  for (const p of fplPlayers) {
    const fplFull = normalizeName(`${p.firstName} ${p.secondName}`);
    if (fplFull === norm) return p;
  }

  // Strategy 2: web_name (display name) match
  for (const p of fplPlayers) {
    if (normalizeName(p.webName) === norm) return p;
    // Last name only match
    if (normalizeName(p.webName) === lastName) return p;
  }

  // Strategy 3: last name match against secondName
  for (const p of fplPlayers) {
    if (normalizeName(p.secondName) === lastName) return p;
  }

  // Strategy 4: first name + last name partial match
  for (const p of fplPlayers) {
    const fplFirst = normalizeName(p.firstName);
    const fplSecond = normalizeName(p.secondName);
    if (parts.some((part) => part === fplFirst) && parts.some((part) => part === fplSecond)) {
      return p;
    }
  }

  return null;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** Cached LFC FPL players — single fetch for all */
let _fplCache: FplPlayerStats[] | null = null;
let _fplCacheTime = 0;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h in-memory

/** Fetch all Liverpool FPL player stats */
async function fetchLfcFplStats(): Promise<FplPlayerStats[]> {
  const now = Date.now();
  if (_fplCache && now - _fplCacheTime < CACHE_TTL_MS) {
    return _fplCache;
  }

  const res = await fetch(FPL_API, {
    next: { revalidate: REVALIDATE_SEC },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) throw new Error(`[fpl-stats] HTTP ${res.status}`);

  const data: FplBootstrapResponse = await res.json();
  const lfcPlayers = data.elements
    .filter((e) => e.team === FPL_LFC_TEAM_ID)
    .map(mapFplElement);

  _fplCache = lfcPlayers;
  _fplCacheTime = now;

  if (process.env.NODE_ENV === "development") {
    console.info(`[fpl-stats] Cached ${lfcPlayers.length} Liverpool players`);
  }

  return lfcPlayers;
}

/** Get FPL stats for a specific player by local squad name */
export async function getFplPlayerStats(
  playerName: string
): Promise<FplPlayerStats | null> {
  try {
    const lfcPlayers = await fetchLfcFplStats();
    return findFplMatch(playerName, lfcPlayers);
  } catch (err) {
    console.error("[fpl-stats] Failed:", err);
    return null;
  }
}

/** Get all Liverpool FPL player stats (for stats page, etc.) */
export async function getAllFplStats(): Promise<FplPlayerStats[]> {
  try {
    return await fetchLfcFplStats();
  } catch (err) {
    console.error("[fpl-stats] Failed:", err);
    return [];
  }
}
