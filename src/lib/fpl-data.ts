// Server-only FPL data layer for /players pages.
// Fetches from FPL bootstrap-static + element-summary.
// ISR cache shared with fpl-provider.ts (same URL = same cache entry).

import "server-only";
import { cache } from "react";

const FPL_BASE = "https://fantasy.premierleague.com/api";
const FETCH_TIMEOUT_MS = 10_000;

// ─── FPL API shapes (internal) ─────────────────────────────────────────────────

interface FplTeamRaw {
  id: number;
  name: string;
  short_name: string;
  code: number;
}

interface FplElementRaw {
  id: number;
  first_name: string;
  second_name: string;
  web_name: string;
  known_name: string;
  team: number;
  team_code: number;
  element_type: number; // 1=GK, 2=DEF, 3=MID, 4=FWD
  status: string;
  news: string;
  chance_of_playing_next_round: number | null;
  chance_of_playing_this_round: number | null;
  squad_number: number | null;
  code: number;
  now_cost: number;
  cost_change_start: number;
  form: string;
  total_points: number;
  event_points: number;
  points_per_game: string;
  ep_next: string;
  value_season: string;
  minutes: number;
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
  starts: number;
  expected_goals: string;
  expected_assists: string;
  expected_goal_involvements: string;
  expected_goals_conceded: string;
  influence: string;
  creativity: string;
  threat: string;
  ict_index: string;
  selected_by_percent: string;
  dreamteam_count: number;
  transfers_in_event: number;
  transfers_out_event: number;
  birth_date: string;
  team_join_date: string;
}

interface FplBootstrapRaw {
  teams: FplTeamRaw[];
  elements: FplElementRaw[];
}

interface FplPlayerHistoryRaw {
  fixture: number;
  opponent_team: number;
  was_home: boolean;
  kickoff_time: string;
  team_h_score: number;
  team_a_score: number;
  round: number;
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  bonus: number;
  total_points: number;
  expected_goals: string;
  expected_assists: string;
  starts: number;
}

interface FplPastSeasonRaw {
  season_name: string;
  total_points: number;
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  yellow_cards: number;
  red_cards: number;
}

interface FplElementSummaryRaw {
  history: FplPlayerHistoryRaw[];
  history_past: FplPastSeasonRaw[];
}

// ─── Public types ───────────────────────────────────────────────────────────────

export type FplPosition = "GK" | "DEF" | "MID" | "FWD";

export interface FplPlayerRow {
  id: number;
  webName: string;
  firstName: string;
  lastName: string;
  teamId: number;
  teamName: string;
  teamShortName: string;
  teamBadge: string;
  position: FplPosition;
  photo: string;
  minutes: number;
  goals: number;
  assists: number;
  xG: number;
  xA: number;
  cleanSheets: number;
  yellowCards: number;
  redCards: number;
  form: string;
  totalPoints: number;
  price: number;
  status: string;
  news: string;
  selectedBy: string;
  isLiverpool: boolean;
}

export interface FplTeamOption {
  id: number;
  name: string;
  shortName: string;
  badge: string;
}

export interface FplMatchEntry {
  gameweek: number;
  opponentName: string;
  opponentBadge: string;
  wasHome: boolean;
  homeScore: number;
  awayScore: number;
  minutes: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  yellowCards: number;
  redCards: number;
  saves: number;
  bonus: number;
  totalPoints: number;
  xG: number;
  xA: number;
  started: boolean;
}

export interface FplPastSeason {
  season: string;
  totalPoints: number;
  minutes: number;
  goals: number;
  assists: number;
  cleanSheets: number;
}

/** Enhanced LFC player row with extra FPL fields for Liverpool-only views */
export interface LfcFplPlayer extends FplPlayerRow {
  squadNumber: number | null;
  knownName: string;
  pointsPerGame: number;
  expectedPointsNext: number;
  valueSeason: number;
  dreamteamCount: number;
  costChange: number;
  eventPoints: number;
  chanceNextRound: number | null;
  birthDate: string;
  joinDate: string;
  starts: number;
  saves: number;
  bonus: number;
  bps: number;
  goalsConceded: number;
  xGConceded: number;
  transfersInEvent: number;
  transfersOutEvent: number;
}

export interface FplPlayerDetail extends FplPlayerRow {
  squadNumber: number | null;
  saves: number;
  bonus: number;
  bps: number;
  starts: number;
  penaltiesMissed: number;
  penaltiesSaved: number;
  ownGoals: number;
  goalsConceded: number;
  influence: number;
  creativity: number;
  threat: number;
  ictIndex: number;
  matchHistory: FplMatchEntry[];
  pastSeasons: FplPastSeason[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

const POS_MAP: Record<number, FplPosition> = { 1: "GK", 2: "DEF", 3: "MID", 4: "FWD" };

function photoUrl(code: number): string {
  return `https://resources.premierleague.com/premierleague/photos/players/110x140/p${code}.png`;
}

function badgeUrl(code: number): string {
  return `https://resources.premierleague.com/premierleague/badges/t${code}.png`;
}

async function fplFetch<T>(path: string, revalidate: number): Promise<T> {
  const res = await fetch(`${FPL_BASE}${path}`, {
    next: { revalidate },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`[fpl-data] HTTP ${res.status} on ${path}`);
  return res.json();
}

// ─── Shared mapper ──────────────────────────────────────────────────────────────

const FPL_LFC_TEAM_ID = 12;

function mapElementToRow(el: FplElementRaw, team: FplTeamRaw | undefined): FplPlayerRow {
  return {
    id: el.id,
    webName: el.web_name,
    firstName: el.first_name,
    lastName: el.second_name,
    teamId: el.team,
    teamName: team?.name ?? "Unknown",
    teamShortName: team?.short_name ?? "???",
    teamBadge: team ? badgeUrl(team.code) : "",
    position: POS_MAP[el.element_type] ?? "MID",
    photo: photoUrl(el.code),
    minutes: el.minutes,
    goals: el.goals_scored,
    assists: el.assists,
    xG: parseFloat(el.expected_goals) || 0,
    xA: parseFloat(el.expected_assists) || 0,
    cleanSheets: el.clean_sheets,
    yellowCards: el.yellow_cards,
    redCards: el.red_cards,
    form: el.form,
    totalPoints: el.total_points,
    price: el.now_cost / 10,
    status: el.status,
    news: el.news,
    selectedBy: el.selected_by_percent,
    isLiverpool: el.team === FPL_LFC_TEAM_ID,
  };
}

// ─── Data fetchers ──────────────────────────────────────────────────────────────

/** Get all PL players + team list */
export const getAllFplPlayers = cache(async (): Promise<{
  players: FplPlayerRow[];
  teams: FplTeamOption[];
}> => {
  const data = await fplFetch<FplBootstrapRaw>("/bootstrap-static/", 1800);

  const teamMap = new Map<number, FplTeamRaw>();
  for (const t of data.teams) teamMap.set(t.id, t);

  const teams: FplTeamOption[] = data.teams
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((t) => ({
      id: t.id,
      name: t.name,
      shortName: t.short_name,
      badge: badgeUrl(t.code),
    }));

  const players: FplPlayerRow[] = data.elements.map((el) =>
    mapElementToRow(el, teamMap.get(el.team)),
  );

  return { players, teams };
});

/** Get only Liverpool players with enhanced FPL data for the /players page */
export const getLfcFplPlayers = cache(async (): Promise<LfcFplPlayer[]> => {
  const data = await fplFetch<FplBootstrapRaw>("/bootstrap-static/", 1800);

  const teamMap = new Map<number, FplTeamRaw>();
  for (const t of data.teams) teamMap.set(t.id, t);

  const lfcTeam = teamMap.get(FPL_LFC_TEAM_ID);

  return data.elements
    .filter((el) => el.team === FPL_LFC_TEAM_ID)
    .map((el) => ({
      ...mapElementToRow(el, lfcTeam),
      squadNumber: el.squad_number,
      knownName: el.known_name || `${el.first_name} ${el.second_name}`,
      pointsPerGame: parseFloat(el.points_per_game) || 0,
      expectedPointsNext: parseFloat(el.ep_next) || 0,
      valueSeason: parseFloat(el.value_season) || 0,
      dreamteamCount: el.dreamteam_count,
      costChange: el.cost_change_start / 10,
      eventPoints: el.event_points,
      chanceNextRound: el.chance_of_playing_next_round,
      birthDate: el.birth_date,
      joinDate: el.team_join_date,
      starts: el.starts,
      saves: el.saves,
      bonus: el.bonus,
      bps: el.bps,
      goalsConceded: el.goals_conceded,
      xGConceded: parseFloat(el.expected_goals_conceded) || 0,
      transfersInEvent: el.transfers_in_event,
      transfersOutEvent: el.transfers_out_event,
    }));
});

/** Get player detail + match history */
export const getFplPlayerDetail = cache(async (playerId: number): Promise<FplPlayerDetail | null> => {
  const [bootstrap, summary] = await Promise.all([
    fplFetch<FplBootstrapRaw>("/bootstrap-static/", 1800),
    fplFetch<FplElementSummaryRaw>(`/element-summary/${playerId}/`, 3600),
  ]);

  const el = bootstrap.elements.find((e) => e.id === playerId);
  if (!el) return null;

  const teamMap = new Map<number, FplTeamRaw>();
  for (const t of bootstrap.teams) teamMap.set(t.id, t);

  const team = teamMap.get(el.team);

  const matchHistory: FplMatchEntry[] = summary.history.map((h) => {
    const opp = teamMap.get(h.opponent_team);
    return {
      gameweek: h.round,
      opponentName: opp?.name ?? "Unknown",
      opponentBadge: opp ? badgeUrl(opp.code) : "",
      wasHome: h.was_home,
      homeScore: h.team_h_score,
      awayScore: h.team_a_score,
      minutes: h.minutes,
      goals: h.goals_scored,
      assists: h.assists,
      cleanSheets: h.clean_sheets,
      yellowCards: h.yellow_cards,
      redCards: h.red_cards,
      saves: h.saves,
      bonus: h.bonus,
      totalPoints: h.total_points,
      xG: parseFloat(h.expected_goals) || 0,
      xA: parseFloat(h.expected_assists) || 0,
      started: h.starts > 0,
    };
  });

  const pastSeasons: FplPastSeason[] = summary.history_past.map((s) => ({
    season: s.season_name,
    totalPoints: s.total_points,
    minutes: s.minutes,
    goals: s.goals_scored,
    assists: s.assists,
    cleanSheets: s.clean_sheets,
  }));

  return {
    ...mapElementToRow(el, team),
    squadNumber: el.squad_number,
    saves: el.saves,
    bonus: el.bonus,
    bps: el.bps,
    starts: el.starts,
    penaltiesMissed: el.penalties_missed,
    penaltiesSaved: el.penalties_saved,
    ownGoals: el.own_goals,
    goalsConceded: el.goals_conceded,
    influence: parseFloat(el.influence) || 0,
    creativity: parseFloat(el.creativity) || 0,
    threat: parseFloat(el.threat) || 0,
    ictIndex: parseFloat(el.ict_index) || 0,
    matchHistory,
    pastSeasons,
  };
});

