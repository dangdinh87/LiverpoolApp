// API-Football provider — uses https://v3.football.api-sports.io
// Free plan: 100 req/day, seasons 2022-2024 only.

import type { FootballDataProvider } from "./provider";
import type {
  Player, PlayerStats, Fixture, Standing, TopScorer,
  FixtureEvent, FixtureLineup, FixtureTeamStats,
  Injury, TeamInfo, Coach,
} from "@/lib/types/football";
import { mockSquad, mockStandings } from "./mock-data";

const BASE_URL = "https://v3.football.api-sports.io";
const TEAM_ID = 40;   // Liverpool FC
const LEAGUE_ID = 39; // Premier League
const SEASON = 2024;  // Free plan: only seasons 2022–2024 accessible

// ISR revalidation time per endpoint type
function getRevalidateTime(endpoint: string): number {
  if (endpoint.includes("/players/squads")) return 86400;          // 24h
  if (endpoint.includes("/fixtures/lineups")) return 3600;         // 1h
  if (endpoint.includes("/fixtures/events")) return 3600;          // 1h
  if (endpoint.includes("/fixtures/statistics")) return 3600;      // 1h
  if (endpoint.includes("/fixtures")) return 3600;                 // 1h
  if (endpoint.includes("/standings")) return 21600;               // 6h
  if (endpoint.includes("/players/topscorers")) return 21600;      // 6h
  if (endpoint.includes("/players/topassists")) return 21600;      // 6h
  if (endpoint.includes("/players")) return 86400;                 // 24h
  if (endpoint.includes("/injuries")) return 21600;                // 6h
  if (endpoint.includes("/teams")) return 86400;                   // 24h
  if (endpoint.includes("/coachs")) return 86400;                  // 24h
  return 3600;
}

export class ApiFootballProvider implements FootballDataProvider {
  readonly name = "api-football";

  private async apiFetch<T>(
    endpoint: string,
    params: Record<string, string | number> = {},
  ): Promise<T[]> {
    const apiKey = process.env.API_FOOTBALL_KEY;
    if (!apiKey) {
      console.warn("[api-football] API_FOOTBALL_KEY not set — returning empty");
      return [] as T[];
    }

    const url = new URL(`${BASE_URL}${endpoint}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

    try {
      const res = await fetch(url.toString(), {
        headers: {
          "x-apisports-key": apiKey,
          "x-rapidapi-host": "v3.football.api-sports.io",
        },
        next: { revalidate: getRevalidateTime(endpoint) },
      });

      if (!res.ok) {
        console.error(`[api-football] ${res.status} ${endpoint}`);
        return [] as T[];
      }

      const json = await res.json();

      // API errors (rate limit, plan restriction, etc.)
      if (json.errors && Object.keys(json.errors).length > 0) {
        console.error("[api-football] API error:", json.errors);
        return [] as T[];
      }

      return (json.response ?? []) as T[];
    } catch (err) {
      console.error(`[api-football] Fetch failed for ${endpoint}:`, err);
      return [] as T[];
    }
  }

  async getSquad(): Promise<Player[]> {
    const data = await this.apiFetch<{ team: unknown; players: Player[] }>(
      "/players/squads",
      { team: TEAM_ID },
    );
    return data[0]?.players ?? mockSquad;
  }

  async getFixtures(): Promise<Fixture[]> {
    return this.apiFetch<Fixture>("/fixtures", {
      team: TEAM_ID,
      season: SEASON,
    });
  }

  async getStandings(): Promise<Standing[]> {
    const data = await this.apiFetch<{ league: { standings: Standing[][] } }>(
      "/standings",
      { league: LEAGUE_ID, season: SEASON },
    );
    return data[0]?.league?.standings?.[0] ?? mockStandings;
  }

  async getTopScorers(): Promise<TopScorer[]> {
    return this.apiFetch<TopScorer>("/players/topscorers", {
      league: LEAGUE_ID,
      season: SEASON,
    });
  }

  async getTopAssists(): Promise<TopScorer[]> {
    return this.apiFetch<TopScorer>("/players/topassists", {
      league: LEAGUE_ID,
      season: SEASON,
    });
  }

  async getPlayerStats(playerId: number): Promise<PlayerStats | null> {
    const data = await this.apiFetch<PlayerStats>("/players", {
      id: playerId,
      league: LEAGUE_ID,
      season: SEASON,
    });
    return data[0] ?? null;
  }

  async getFixtureEvents(fixtureId: number): Promise<FixtureEvent[]> {
    return this.apiFetch<FixtureEvent>("/fixtures/events", { fixture: fixtureId });
  }

  async getFixtureLineups(fixtureId: number): Promise<FixtureLineup[]> {
    return this.apiFetch<FixtureLineup>("/fixtures/lineups", { fixture: fixtureId });
  }

  async getFixtureStatistics(fixtureId: number): Promise<FixtureTeamStats[]> {
    return this.apiFetch<FixtureTeamStats>("/fixtures/statistics", { fixture: fixtureId });
  }

  async getInjuries(): Promise<Injury[]> {
    return this.apiFetch<Injury>("/injuries", {
      team: TEAM_ID,
      season: SEASON,
    });
  }

  async getTeamInfo(): Promise<TeamInfo | null> {
    const data = await this.apiFetch<TeamInfo>("/teams", { id: TEAM_ID });
    return data[0] ?? null;
  }

  async getCoach(): Promise<Coach | null> {
    const data = await this.apiFetch<Coach>("/coachs", { team: TEAM_ID });
    return data[0] ?? null;
  }
}
