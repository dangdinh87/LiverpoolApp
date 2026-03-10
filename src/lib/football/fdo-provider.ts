// Football-Data.org provider — replaces FPL for all EPL data.
// Uses FDO v4 API for fixtures, scorers + local squad.json for squad data.
// Free tier: 10 req/min, PL + CL included. Requires FOOTBALL_DATA_ORG_KEY.

import "server-only";
import type { FootballDataProvider } from "./provider";
import type {
  Player, PlayerStats, Fixture, Standing, TopScorer,
  FixtureEvent, FixtureLineup, FixtureTeamStats,
  Injury, TeamInfo, Coach, GameweekInfo,
} from "@/lib/types/football";
import {
  getSquadPlayers, calculateAge,
  type LfcPlayer, type PlayerPosition,
} from "@/lib/squad-data";

// ─── Configuration ─────────────────────────────────────────────────────────────

const FDO_BASE = "https://api.football-data.org/v4";
const FDO_LFC_ID = 64;
const CANONICAL_LFC_ID = 40;
const FETCH_TIMEOUT_MS = 12_000;

// ─── Core fetcher ──────────────────────────────────────────────────────────────

async function fdoFetch<T>(path: string, revalidate: number): Promise<T> {
  const key = process.env.FOOTBALL_DATA_ORG_KEY;
  if (!key) throw new Error("[fdo-provider] FOOTBALL_DATA_ORG_KEY not set");

  const res = await fetch(`${FDO_BASE}${path}`, {
    headers: { "X-Auth-Token": key },
    next: { revalidate },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) throw new Error(`[fdo-provider] HTTP ${res.status} on ${path}`);
  return res.json();
}

// ─── FDO response shapes ───────────────────────────────────────────────────────

interface FdoScorer {
  player: {
    id: number;
    name: string;
    firstName: string | null;
    lastName: string | null;
    dateOfBirth: string | null;
    nationality: string;
    section: string | null; // "OFFENCE", "MIDFIELD", "DEFENCE", "GOALKEEPER"
  };
  team: { id: number; name: string; shortName: string; crest: string };
  playedMatches: number;
  goals: number | null;
  assists: number | null;
  penalties: number | null;
}

interface FdoScorersResponse {
  competition: { id: number; name: string };
  season: { id: number; startDate: string };
  scorers: FdoScorer[];
}

interface FdoSquadMember {
  id: number;
  name: string;
  position: string | null; // "Goalkeeper", "Defence", "Midfield", "Offence"
  dateOfBirth: string | null;
  nationality: string;
}

interface FdoTeamResponse {
  id: number;
  name: string;
  shortName: string;
  crest: string;
  squad: FdoSquadMember[];
  coach: {
    id: number;
    firstName: string | null;
    lastName: string;
    name: string;
    dateOfBirth: string | null;
    nationality: string;
  };
}

interface FdoMatch {
  id: number;
  utcDate: string;
  status: string;
  matchday: number | null;
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
}

interface FdoMatchesResponse {
  matches: FdoMatch[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const POSITION_MAP: Record<string, Player["position"]> = {
  "Goalkeeper": "Goalkeeper",
  "Defence": "Defender",
  "Midfield": "Midfielder",
  "Offence": "Attacker",
  // FDO scorer section field
  "GOALKEEPER": "Goalkeeper",
  "DEFENCE": "Defender",
  "MIDFIELD": "Midfielder",
  "OFFENCE": "Attacker",
};

const LOCAL_POSITION_MAP: Record<PlayerPosition, Player["position"]> = {
  goalkeeper: "Goalkeeper",
  defender: "Defender",
  midfielder: "Midfielder",
  forward: "Attacker",
};

function mapTeamId(fdoId: number): number {
  return fdoId === FDO_LFC_ID ? CANONICAL_LFC_ID : fdoId;
}

function ageFromBirthDate(dateStr: string | null): number {
  if (!dateStr) return 0;
  return calculateAge(dateStr);
}

// Map local LfcPlayer → canonical Player
function mapLocalPlayer(p: LfcPlayer): Player {
  return {
    id: p.id,
    name: p.name,
    firstname: p.name.split(" ")[0],
    lastname: p.name.split(" ").slice(1).join(" ") || p.name,
    age: calculateAge(p.dateOfBirth),
    number: p.shirtNumber,
    position: LOCAL_POSITION_MAP[p.position],
    photo: p.localPhoto || p.photo,
    nationality: p.nationality,
    height: null,
    weight: null,
    injured: false,
  };
}

// Map FDO scorer → canonical TopScorer
function mapScorerToTopScorer(s: FdoScorer): TopScorer {
  const position = POSITION_MAP[s.player.section ?? ""] ?? "Attacker";
  return {
    player: {
      id: s.player.id,
      name: s.player.name,
      firstname: s.player.firstName ?? "",
      lastname: s.player.lastName ?? s.player.name,
      age: ageFromBirthDate(s.player.dateOfBirth),
      number: null,
      position,
      photo: s.team.crest, // FDO doesn't have player photos; pages overlay local photos
      nationality: s.player.nationality,
      height: null,
      weight: null,
      injured: false,
    },
    statistics: [{
      team: { id: mapTeamId(s.team.id), name: s.team.name, logo: s.team.crest },
      league: { id: 39, name: "Premier League", season: 2025 },
      games: {
        appearences: s.playedMatches,
        lineups: null,
        minutes: null,
        number: null,
        position,
        rating: null,
        captain: false,
      },
      substitutes: { in: null, out: null, bench: null },
      goals: {
        total: s.goals,
        assists: s.assists,
        conceded: null,
        saves: null,
      },
      passes: { total: null, key: null, accuracy: null },
      tackles: { total: null, blocks: null, interceptions: null },
      duels: { total: null, won: null },
      dribbles: { attempts: null, success: null, past: null },
      fouls: { drawn: null, committed: null },
      cards: { yellow: 0, yellowred: null, red: 0 },
      shots: { total: null, on: null },
      penalty: { won: null, commited: null, scored: s.penalties, missed: null, saved: null },
    }],
  };
}

// ─── Provider ──────────────────────────────────────────────────────────────────

export class FdoProvider implements FootballDataProvider {
  readonly name = "fdo";

  // Shared scorers cache — single FDO call for both top scorers and assists
  private scorersCache: FdoScorersResponse | null = null;

  private async getScorersData(): Promise<FdoScorersResponse> {
    if (this.scorersCache) return this.scorersCache;
    this.scorersCache = await fdoFetch<FdoScorersResponse>(
      "/competitions/PL/scorers?limit=50",
      3600, // 1h
    );
    return this.scorersCache;
  }

  // Squad: use local squad.json (rich data with photos, bios)
  async getSquad(): Promise<Player[]> {
    const players = getSquadPlayers();
    return players.map(mapLocalPlayer);
  }

  // Fixtures: delegated to barrel (fdo-matches.ts + ESPN)
  async getFixtures(): Promise<Fixture[]> {
    return [];
  }

  // Standings: delegated to barrel (fdo-standings.ts)
  async getStandings(): Promise<Standing[]> {
    return [];
  }

  // Top Scorers from FDO /competitions/PL/scorers
  async getTopScorers(): Promise<TopScorer[]> {
    try {
      const data = await this.getScorersData();
      return data.scorers
        .filter((s) => (s.goals ?? 0) > 0)
        .slice(0, 20)
        .map(mapScorerToTopScorer);
    } catch (err) {
      console.error("[fdo-provider] getTopScorers failed:", err);
      return [];
    }
  }

  // Top Assists: same cached data, sorted by assists
  async getTopAssists(): Promise<TopScorer[]> {
    try {
      const data = await this.getScorersData();
      return data.scorers
        .filter((s) => (s.assists ?? 0) > 0)
        .sort((a, b) => (b.assists ?? 0) - (a.assists ?? 0))
        .slice(0, 20)
        .map(mapScorerToTopScorer);
    } catch (err) {
      console.error("[fdo-provider] getTopAssists failed:", err);
      return [];
    }
  }

  // Player Stats: match local squad player with FDO scorers data
  async getPlayerStats(playerId: number): Promise<PlayerStats | null> {
    try {
      // Try local squad first for basic player info
      const localPlayers = getSquadPlayers({ includeLoans: true });
      const local = localPlayers.find((p) => p.id === playerId);
      if (!local) return null;

      const player = mapLocalPlayer(local);
      // Return basic stats (FDO doesn't have per-player detailed stats on free tier)
      return {
        player,
        statistics: [{
          team: { id: CANONICAL_LFC_ID, name: "Liverpool FC", logo: "/assets/lfc/crest.png" },
          league: { id: 39, name: "Premier League", season: 2025 },
          games: { appearences: null, lineups: null, minutes: null, number: local.shirtNumber, position: LOCAL_POSITION_MAP[local.position], rating: null, captain: false },
          substitutes: { in: null, out: null, bench: null },
          goals: { total: null, assists: null, conceded: null, saves: null },
          passes: { total: null, key: null, accuracy: null },
          tackles: { total: null, blocks: null, interceptions: null },
          duels: { total: null, won: null },
          dribbles: { attempts: null, success: null, past: null },
          fouls: { drawn: null, committed: null },
          cards: { yellow: 0, yellowred: null, red: 0 },
          shots: { total: null, on: null },
          penalty: { won: null, commited: null, scored: null, missed: null, saved: null },
        }],
      };
    } catch (err) {
      console.error("[fdo-provider] getPlayerStats failed:", err);
      return null;
    }
  }

  // Fixture events: delegated to ESPN in barrel
  async getFixtureEvents(_fixtureId: number): Promise<FixtureEvent[]> {
    return [];
  }

  async getFixtureLineups(_fixtureId: number): Promise<FixtureLineup[]> {
    return [];
  }

  async getFixtureStatistics(_fixtureId: number): Promise<FixtureTeamStats[]> {
    return [];
  }

  // Injuries: FDO free tier doesn't have injury data
  async getInjuries(): Promise<Injury[]> {
    return [];
  }

  // Team Info from FDO /teams/64
  async getTeamInfo(): Promise<TeamInfo | null> {
    try {
      const data = await fdoFetch<FdoTeamResponse>(`/teams/${FDO_LFC_ID}`, 86400);
      return {
        team: {
          id: CANONICAL_LFC_ID,
          name: data.name,
          code: data.shortName,
          country: "England",
          founded: 1892,
          national: false,
          logo: data.crest,
        },
        venue: {
          id: 0,
          name: "Anfield",
          address: "Anfield Road",
          city: "Liverpool",
          capacity: 61000,
          surface: "grass",
          image: data.crest,
        },
      };
    } catch (err) {
      console.error("[fdo-provider] getTeamInfo failed:", err);
      return null;
    }
  }

  // Coach: delegated to barrel (fdo-matches.ts)
  async getCoach(): Promise<Coach | null> {
    return null;
  }

  // Gameweek: derive from FDO PL matches
  async getGameweekInfo(): Promise<GameweekInfo | null> {
    try {
      const data = await fdoFetch<FdoMatchesResponse>(
        `/teams/${FDO_LFC_ID}/matches?competitions=PL&status=SCHEDULED,TIMED,IN_PLAY,FINISHED`,
        3600,
      );

      const now = new Date();
      const finished = data.matches
        .filter((m) => m.status === "FINISHED")
        .sort((a, b) => b.utcDate.localeCompare(a.utcDate));
      const upcoming = data.matches
        .filter((m) => m.status === "SCHEDULED" || m.status === "TIMED")
        .sort((a, b) => a.utcDate.localeCompare(b.utcDate));

      const currentMatchday = finished[0]?.matchday ?? 1;
      const nextMatchday = upcoming[0]?.matchday ?? (currentMatchday + 1);
      const isFinished = !data.matches.some((m) => m.matchday === currentMatchday && m.status !== "FINISHED");

      return {
        current: currentMatchday,
        currentName: `Gameweek ${currentMatchday}`,
        isFinished,
        nextDeadline: upcoming[0]?.utcDate ?? null,
        nextGw: nextMatchday,
      };
    } catch (err) {
      console.error("[fdo-provider] getGameweekInfo failed:", err);
      return null;
    }
  }
}
