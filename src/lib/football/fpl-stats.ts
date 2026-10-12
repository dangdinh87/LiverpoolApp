// FPL (Fantasy Premier League) — per-player Premier League stats.
// Free, no API key needed. Single call fetches ALL PL players.
// Matched to local squad via name similarity.

import "server-only";

import { unstable_cache } from "next/cache";

// ─── Configuration ──────────────────────────────────────────────────────────

const FPL_API = "https://fantasy.premierleague.com/api/bootstrap-static/";
// FPL team ids are the alphabetical position of that season's 20 clubs, so they
// change every season (Liverpool was 12 last season; 12 is now Ipswich). Look
// the club up by its stable short name instead of hard-coding the id.
const FPL_LFC_SHORT_NAME = "LIV";
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

export interface FplElement {
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

interface FplTeam {
  id: number;
  name: string;
  short_name: string;
}

export interface FplBootstrapResponse {
  elements: FplElement[];
  teams: FplTeam[];
}

/** Liverpool's players from a bootstrap-static payload ([] if the club is absent). */
export function selectLiverpoolElements(data: FplBootstrapResponse): FplPlayerStats[] {
  const lfc = data.teams?.find((t) => t.short_name === FPL_LFC_SHORT_NAME);
  if (!lfc) {
    console.warn("[fpl-stats] Liverpool not found in FPL teams list");
    return [];
  }
  return data.elements.filter((e) => e.team === lfc.id).map(mapFplElement);
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

/**
 * Download bootstrap-static and keep only Liverpool.
 *
 * The fetch is deliberately uncached. `bootstrap-static` carries every player in
 * the league and is ~2.4MB, over the 2MB ceiling on a Next data-cache entry, so
 * asking Next to store it only produced "items over 2MB can not be cached" on
 * every single render — 44 times in one production build, each one re-downloading
 * and re-parsing the whole payload. What *is* cacheable is the ~25-player slice
 * we actually want, a few KB, so the caching moved one level out (see below).
 */
async function fetchLfcFplStatsUncached(): Promise<FplPlayerStats[]> {
  const res = await fetch(FPL_API, {
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) throw new Error(`[fpl-stats] HTTP ${res.status}`);

  const data: FplBootstrapResponse = await res.json();
  return selectLiverpoolElements(data);
}

/**
 * The Liverpool slice, shared across requests and server instances.
 *
 * Errors are left to propagate: a throw is never written to the cache, so a bad
 * response is retried on the next request instead of pinning an empty squad in
 * place for six hours. Both public callers below turn it into a safe fallback.
 */
const getCachedLfcFplStats = unstable_cache(
  fetchLfcFplStatsUncached,
  ["fpl-lfc-player-stats"],
  { revalidate: REVALIDATE_SEC },
);

/** Cached LFC FPL players — single fetch for all */
let _fplCache: FplPlayerStats[] | null = null;
let _fplCacheTime = 0;
const CACHE_TTL_MS = REVALIDATE_SEC * 1000; // in-memory tier, same window

/**
 * Fetch all Liverpool FPL player stats.
 *
 * Two tiers: a per-instance memo that costs nothing, then the shared data cache.
 * Without the second tier every cold instance paid the full 2.4MB download.
 */
async function fetchLfcFplStats(): Promise<FplPlayerStats[]> {
  const now = Date.now();
  if (_fplCache && now - _fplCacheTime < CACHE_TTL_MS) {
    return _fplCache;
  }

  const lfcPlayers = await getCachedLfcFplStats();

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
