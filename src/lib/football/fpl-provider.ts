// FPL provider — uses Fantasy Premier League public API for 2025-26 season data.
// No API key needed. All data from /bootstrap-static/ (cached 30min) + /fixtures/ + /element-summary/.
// Liverpool FPL team_id=12, remapped to canonical 40 for page compatibility.

import "server-only";
import type { FootballDataProvider } from "./provider";
import type {
  Player, PlayerStats, Fixture, Standing, TopScorer,
  FixtureEvent, FixtureLineup, FixtureTeamStats,
  Injury, TeamInfo, Coach, GameweekInfo,
} from "@/lib/types/football";

// ─── Configuration ─────────────────────────────────────────────────────────────

const FPL_BASE = "https://fantasy.premierleague.com/api";
const FPL_LFC_TEAM_ID = 12;         // Liverpool in FPL
const LFC_CANONICAL_ID = 40;         // Canonical ID used by page components
const PL_LOGO = "/assets/lfc/premier-league.svg";
const FETCH_TIMEOUT_MS = 10_000;

// ─── Core fetcher ──────────────────────────────────────────────────────────────

async function fplFetch<T>(path: string, revalidate: number): Promise<T> {
  const url = `${FPL_BASE}${path}`;
  const res = await fetch(url, {
    next: { revalidate },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`[fpl] HTTP ${res.status} on ${path}`);
  }

  return res.json();
}

// ─── FPL response shapes (internal) ────────────────────────────────────────────

interface FplTeam {
  id: number;
  name: string;
  short_name: string;
  code: number;
  position: number;
  played: number;
  win: number;
  draw: number;
  loss: number;
  points: number;
  form: string | null;
  strength: number;
  pulse_id: number;
}

interface FplElement {
  id: number;
  first_name: string;
  second_name: string;
  web_name: string;
  team: number;           // FPL team id (1-20)
  team_code: number;
  element_type: number;   // 1=GK, 2=DEF, 3=MID, 4=FWD
  status: string;         // a=available, i=injured, s=suspended, u=unavailable, d=doubtful, n=not in squad
  news: string;
  news_added: string | null;
  chance_of_playing_next_round: number | null;
  squad_number: number | null;
  photo: string;
  code: number;           // For PL photo URL: p{code}.png
  now_cost: number;       // Price × 10
  form: string;
  total_points: number;
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
  tackles: number;
  recoveries: number;
  clearances_blocks_interceptions: number;
  birth_date: string | null;
  selected_by_percent: string;
}

interface FplEvent {
  id: number;
  name: string;
  deadline_time: string;
  finished: boolean;
  is_current: boolean;
  is_next: boolean;
}

interface FplFixture {
  id: number;
  code: number;
  event: number | null;  // gameweek
  team_h: number;
  team_a: number;
  team_h_score: number | null;
  team_a_score: number | null;
  kickoff_time: string | null;
  finished: boolean;
  finished_provisional: boolean;
  started: boolean;
  minutes: number;
  stats: FplFixtureStat[];
  pulse_id: number;
}

interface FplFixtureStat {
  identifier: string;  // "goals_scored", "assists", "yellow_cards", "red_cards", "own_goals", "saves", etc.
  h: { value: number; element: number }[];
  a: { value: number; element: number }[];
}

interface FplBootstrap {
  teams: FplTeam[];
  elements: FplElement[];
  events: FplEvent[];
  element_types: { id: number; singular_name: string; plural_name: string }[];
}

interface FplElementSummary {
  history: FplPlayerHistory[];
  history_past: FplPlayerHistoryPast[];
  fixtures: unknown[];
}

interface FplPlayerHistory {
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

interface FplPlayerHistoryPast {
  season_name: string;
  total_points: number;
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  yellow_cards: number;
  red_cards: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const POSITION_MAP: Record<number, Player["position"]> = {
  1: "Goalkeeper",
  2: "Defender",
  3: "Midfielder",
  4: "Attacker",
};

function playerPhotoUrl(code: number): string {
  return `https://resources.premierleague.com/premierleague/photos/players/250x250/p${code}.png`;
}

function teamBadgeUrl(code: number): string {
  return `https://resources.premierleague.com/premierleague/badges/t${code}.png`;
}

function ageFromBirthDate(dateStr: string | null): number {
  if (!dateStr) return 0;
  const birth = new Date(dateStr);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// ─── Provider ──────────────────────────────────────────────────────────────────

export class FplProvider implements FootballDataProvider {
  readonly name = "fpl";

  // Cache bootstrap in memory for the provider instance lifetime (per cold start)
  private bootstrapCache: FplBootstrap | null = null;
  private fixturesCache: FplFixture[] | null = null;

  // Team lookup: FPL team id → FplTeam
  private teamMap: Map<number, FplTeam> = new Map();
  // Element lookup: FPL element id → FplElement
  private elementMap: Map<number, FplElement> = new Map();

  /** Fetch + cache /bootstrap-static/ (30min ISR) */
  private async getBootstrap(): Promise<FplBootstrap> {
    if (this.bootstrapCache) return this.bootstrapCache;

    const data = await fplFetch<FplBootstrap>("/bootstrap-static/", 1800);
    this.bootstrapCache = data;

    // Build lookup maps
    this.teamMap.clear();
    for (const t of data.teams) this.teamMap.set(t.id, t);
    this.elementMap.clear();
    for (const e of data.elements) this.elementMap.set(e.id, e);

    return data;
  }

  /** Fetch + cache /fixtures/ (30min ISR) */
  private async getFixturesData(): Promise<FplFixture[]> {
    if (this.fixturesCache) return this.fixturesCache;
    this.fixturesCache = await fplFetch<FplFixture[]>("/fixtures/", 1800);
    return this.fixturesCache;
  }

  /** Map FPL team id to canonical id (Liverpool 12 → 40) */
  private mapTeamId(fplTeamId: number): number {
    return fplTeamId === FPL_LFC_TEAM_ID ? LFC_CANONICAL_ID : fplTeamId;
  }

  /** Get team badge URL from FPL team id */
  private getTeamBadge(fplTeamId: number): string {
    const team = this.teamMap.get(fplTeamId);
    return team ? teamBadgeUrl(team.code) : PL_LOGO;
  }

  /** Get team name from FPL team id */
  private getTeamName(fplTeamId: number): string {
    return this.teamMap.get(fplTeamId)?.name ?? "Unknown";
  }

  /** Map FplElement → canonical Player */
  private mapPlayer(el: FplElement): Player {
    return {
      id: el.id,
      name: el.web_name,
      firstname: el.first_name,
      lastname: el.second_name,
      age: ageFromBirthDate(el.birth_date),
      number: el.squad_number,
      position: POSITION_MAP[el.element_type] ?? "Midfielder",
      photo: playerPhotoUrl(el.code),
      nationality: "", // FPL doesn't provide nationality
      height: null,
      weight: null,
      injured: el.status === "i" || el.status === "s" || el.status === "u",
    };
  }

  /** Build canonical PlayerStatistic from FplElement */
  private mapPlayerStatistic(el: FplElement): import("@/lib/types/football").PlayerStatistic {
    const team = this.teamMap.get(el.team);
    return {
      team: { id: this.mapTeamId(el.team), name: team?.name ?? "Unknown", logo: this.getTeamBadge(el.team) },
      league: { id: 39, name: "Premier League", season: 2025 },
      games: {
        appearences: el.starts > 0 ? el.starts : (el.minutes > 0 ? 1 : 0),
        lineups: el.starts,
        minutes: el.minutes,
        number: el.squad_number,
        position: POSITION_MAP[el.element_type] ?? null,
        rating: null,
        captain: false,
      },
      substitutes: { in: null, out: null, bench: null },
      goals: {
        total: el.goals_scored,
        assists: el.assists,
        conceded: el.goals_conceded,
        saves: el.saves,
      },
      passes: { total: null, key: null, accuracy: null },
      tackles: { total: el.tackles, blocks: el.clearances_blocks_interceptions, interceptions: null },
      duels: { total: null, won: null },
      dribbles: { attempts: null, success: null, past: null },
      fouls: { drawn: null, committed: null },
      cards: { yellow: el.yellow_cards, yellowred: null, red: el.red_cards },
      shots: { total: null, on: null },
      penalty: { won: null, commited: null, scored: null, missed: el.penalties_missed, saved: el.penalties_saved },
    };
  }

  // ─── Squad ─────────────────────────────────────────────────────────────────

  async getSquad(): Promise<Player[]> {
    try {
      const { elements } = await this.getBootstrap();
      return elements
        .filter((el) => el.team === FPL_LFC_TEAM_ID)
        .map((el) => this.mapPlayer(el));
    } catch (err) {
      console.error("[fpl] getSquad failed:", err);
      return [];
    }
  }

  // ─── Fixtures ──────────────────────────────────────────────────────────────

  async getFixtures(): Promise<Fixture[]> {
    try {
      await this.getBootstrap(); // ensure team map is populated
      const fixtures = await this.getFixturesData();

      // Filter Liverpool matches only
      const lfcFixtures = fixtures.filter(
        (f) => f.team_h === FPL_LFC_TEAM_ID || f.team_a === FPL_LFC_TEAM_ID,
      );

      return lfcFixtures.map((f) => this.mapFixture(f));
    } catch (err) {
      console.error("[fpl] getFixtures failed:", err);
      return [];
    }
  }

  private mapFixture(f: FplFixture): Fixture {
    const finished = f.finished;
    const started = f.started;
    let statusShort: string;
    let statusLong: string;

    if (finished) {
      statusShort = "FT";
      statusLong = "Match Finished";
    } else if (started) {
      statusShort = "LIVE";
      statusLong = "In Progress";
    } else {
      statusShort = "NS";
      statusLong = "Not Started";
    }

    const homeWin = f.team_h_score !== null && f.team_a_score !== null
      ? f.team_h_score > f.team_a_score ? true : f.team_h_score < f.team_a_score ? false : null
      : null;

    return {
      fixture: {
        id: f.id,
        date: f.kickoff_time ?? "",
        venue: { id: null, name: null, city: null },
        status: { long: statusLong, short: statusShort, elapsed: started && !finished ? f.minutes : null },
      },
      league: {
        id: 39,
        name: "Premier League",
        country: "England",
        logo: PL_LOGO,
        season: 2025,
        round: f.event ? `Regular Season - ${f.event}` : "Regular Season",
      },
      teams: {
        home: {
          id: this.mapTeamId(f.team_h),
          name: this.getTeamName(f.team_h),
          logo: this.getTeamBadge(f.team_h),
          winner: homeWin,
        },
        away: {
          id: this.mapTeamId(f.team_a),
          name: this.getTeamName(f.team_a),
          logo: this.getTeamBadge(f.team_a),
          winner: homeWin === null ? null : !homeWin,
        },
      },
      goals: { home: f.team_h_score, away: f.team_a_score },
      score: {
        halftime: { home: null, away: null },
        fulltime: { home: f.team_h_score, away: f.team_a_score },
        extratime: { home: null, away: null },
        penalty: { home: null, away: null },
      },
    };
  }

  // ─── Standings (placeholder — real standings from Football-Data.org) ─────

  async getStandings(): Promise<Standing[]> {
    // FPL teams have W/D/L/points = 0 (FPL-internal, not real).
    // This method returns empty — standings come from fdo-standings.ts via barrel.
    return [];
  }

  // ─── Top Scorers / Assists ─────────────────────────────────────────────────

  async getTopScorers(): Promise<TopScorer[]> {
    try {
      const { elements } = await this.getBootstrap();
      return elements
        .filter((el) => el.goals_scored > 0)
        .sort((a, b) => b.goals_scored - a.goals_scored)
        .slice(0, 20)
        .map((el) => ({ player: this.mapPlayer(el), statistics: [this.mapPlayerStatistic(el)] }));
    } catch (err) {
      console.error("[fpl] getTopScorers failed:", err);
      return [];
    }
  }

  async getTopAssists(): Promise<TopScorer[]> {
    try {
      const { elements } = await this.getBootstrap();
      return elements
        .filter((el) => el.assists > 0)
        .sort((a, b) => b.assists - a.assists)
        .slice(0, 20)
        .map((el) => ({ player: this.mapPlayer(el), statistics: [this.mapPlayerStatistic(el)] }));
    } catch (err) {
      console.error("[fpl] getTopAssists failed:", err);
      return [];
    }
  }

  // ─── Player Stats ──────────────────────────────────────────────────────────

  async getPlayerStats(playerId: number): Promise<PlayerStats | null> {
    try {
      await this.getBootstrap();
      const el = this.elementMap.get(playerId);
      if (!el) return null;

      return {
        player: this.mapPlayer(el),
        statistics: [this.mapPlayerStatistic(el)],
      };
    } catch (err) {
      console.error("[fpl] getPlayerStats failed:", err);
      return null;
    }
  }

  // ─── Fixture Events (goals, cards from fixture stats) ──────────────────────

  async getFixtureEvents(fixtureId: number): Promise<FixtureEvent[]> {
    try {
      await this.getBootstrap();
      const fixtures = await this.getFixturesData();
      const fixture = fixtures.find((f) => f.id === fixtureId);
      if (!fixture || !fixture.stats) return [];

      const events: FixtureEvent[] = [];

      for (const stat of fixture.stats) {
        let type: FixtureEvent["type"];
        let detail: string;

        if (stat.identifier === "goals_scored") {
          type = "Goal";
          detail = "Normal Goal";
        } else if (stat.identifier === "own_goals") {
          type = "Goal";
          detail = "Own Goal";
        } else if (stat.identifier === "yellow_cards") {
          type = "Card";
          detail = "Yellow Card";
        } else if (stat.identifier === "red_cards") {
          type = "Card";
          detail = "Red Card";
        } else {
          continue; // skip assists, saves, bonus, etc.
        }

        // Home events
        for (const entry of stat.h) {
          const player = this.elementMap.get(entry.element);
          events.push({
            time: { elapsed: null, extra: null }, // FPL doesn't provide minute
            team: { id: this.mapTeamId(fixture.team_h), name: this.getTeamName(fixture.team_h), logo: this.getTeamBadge(fixture.team_h) },
            player: { id: entry.element, name: player?.web_name ?? null },
            assist: { id: null, name: null },
            type,
            detail,
            comments: null,
          });
        }

        // Away events
        for (const entry of stat.a) {
          const player = this.elementMap.get(entry.element);
          events.push({
            time: { elapsed: 0, extra: null },
            team: { id: this.mapTeamId(fixture.team_a), name: this.getTeamName(fixture.team_a), logo: this.getTeamBadge(fixture.team_a) },
            player: { id: entry.element, name: player?.web_name ?? null },
            assist: { id: null, name: null },
            type,
            detail,
            comments: null,
          });
        }
      }

      // Attach assist info — match within same team (home assists → home goals only)
      const assistStat = fixture.stats.find((s) => s.identifier === "assists");
      if (assistStat) {
        const homeTeamId = this.mapTeamId(fixture.team_h);
        const awayTeamId = this.mapTeamId(fixture.team_a);

        for (const a of assistStat.h) {
          const assistPlayer = this.elementMap.get(a.element);
          const goalEvent = events.find(
            (e) => e.type === "Goal" && e.detail === "Normal Goal" && e.assist.id === null && e.team.id === homeTeamId,
          );
          if (goalEvent && assistPlayer) {
            goalEvent.assist = { id: a.element, name: assistPlayer.web_name };
          }
        }
        for (const a of assistStat.a) {
          const assistPlayer = this.elementMap.get(a.element);
          const goalEvent = events.find(
            (e) => e.type === "Goal" && e.detail === "Normal Goal" && e.assist.id === null && e.team.id === awayTeamId,
          );
          if (goalEvent && assistPlayer) {
            goalEvent.assist = { id: a.element, name: assistPlayer.web_name };
          }
        }
      }

      return events;
    } catch (err) {
      console.error("[fpl] getFixtureEvents failed:", err);
      return [];
    }
  }

  // ─── Fixture Lineups (not available in FPL) ────────────────────────────────

  async getFixtureLineups(_fixtureId: number): Promise<FixtureLineup[]> {
    return [];
  }

  // ─── Fixture Statistics (not available in FPL) ─────────────────────────────

  async getFixtureStatistics(_fixtureId: number): Promise<FixtureTeamStats[]> {
    return [];
  }

  // ─── Injuries ──────────────────────────────────────────────────────────────

  async getInjuries(): Promise<Injury[]> {
    try {
      const { elements } = await this.getBootstrap();

      return elements
        .filter((el) => el.team === FPL_LFC_TEAM_ID && el.status !== "a" && el.news)
        .map((el): Injury => ({
          player: {
            id: el.id,
            name: `${el.first_name} ${el.second_name}`,
            photo: playerPhotoUrl(el.code),
            type: el.status === "d" ? "Doubtful" : "Missing Fixture",
            reason: el.news || "Unknown",
          },
          team: { id: LFC_CANONICAL_ID, name: "Liverpool", logo: teamBadgeUrl(14) },
          fixture: { id: 0, date: el.news_added ?? "" },
          league: { id: 39, name: "Premier League", season: 2025 },
        }));
    } catch (err) {
      console.error("[fpl] getInjuries failed:", err);
      return [];
    }
  }

  // ─── Team Info ─────────────────────────────────────────────────────────────

  async getTeamInfo(): Promise<TeamInfo | null> {
    try {
      await this.getBootstrap();
      const team = this.teamMap.get(FPL_LFC_TEAM_ID);
      if (!team) return null;

      return {
        team: {
          id: LFC_CANONICAL_ID,
          name: team.name,
          code: team.short_name,
          country: "England",
          founded: 1892,
          national: false,
          logo: teamBadgeUrl(team.code),
        },
        venue: {
          id: 0,
          name: "Anfield",
          address: "Anfield Road",
          city: "Liverpool",
          capacity: 61000,
          surface: "grass",
          image: teamBadgeUrl(team.code),
        },
      };
    } catch (err) {
      console.error("[fpl] getTeamInfo failed:", err);
      return null;
    }
  }

  // ─── Coach (not in FPL data) ───────────────────────────────────────────────

  async getCoach(): Promise<Coach | null> {
    return null;
  }

  // ─── Gameweek Info ────────────────────────────────────────────────────────

  async getGameweekInfo(): Promise<GameweekInfo | null> {
    try {
      const { events } = await this.getBootstrap();
      const current = events.find((e) => e.is_current);
      const next = events.find((e) => e.is_next);
      if (!current) return null;

      return {
        current: current.id,
        currentName: current.name,
        isFinished: current.finished,
        nextDeadline: next?.deadline_time ?? null,
        nextGw: next?.id ?? null,
      };
    } catch (err) {
      console.error("[fpl] getGameweekInfo failed:", err);
      return null;
    }
  }
}
