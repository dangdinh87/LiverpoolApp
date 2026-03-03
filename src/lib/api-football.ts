// Server-only: never import this in client components
import "server-only";
import { cache } from "react";

import type {
  Player,
  PlayerStats,
  Fixture,
  Standing,
  TopScorer,
} from "@/lib/types/football";

// ─── Caching Strategy ─────────────────────────────────────────────────────────
//
// TWO layers of caching in play:
//
// 1. Next.js Data Cache (server-side, across requests):
//    - `fetch` with `next: { revalidate: N }` stores response in Next.js Data Cache
//    - Same URL is served from cache until TTL expires (ISR)
//    - squad=24h, fixtures=1h, standings/stats=6h, news=30min
//
// 2. React `cache()` (per-request deduplication):
//    - Wrapping API functions with React.cache() deduplicates calls WITHIN one
//      server render (e.g. generateMetadata + page both call getPlayerStats)
//    - Cache scope: single request lifetime only, discarded after render
//
// Client-side: Next.js Router Cache stores pre-fetched Server Component
// payloads on the client. Navigation between /squad and /player/[id] reuses
// the already-rendered HTML without a new network request for ~30s (static).
// No SWR/React-Query needed since data is rendered server-side.

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL = "https://v3.football.api-sports.io";
const TEAM_ID = 40;   // Liverpool FC
const LEAGUE_ID = 39; // Premier League
const SEASON = 2024;

// ─── Core fetcher ────────────────────────────────────────────────────────────

async function apiFetch<T>(
  endpoint: string,
  params: Record<string, string | number> = {}
): Promise<T[]> {
  const apiKey = process.env.API_FOOTBALL_KEY;

  // Dev fallback: return mock data if API key not configured
  if (!apiKey) {
    console.warn(`[api-football] API_FOOTBALL_KEY not set — using mock data for ${endpoint}`);
    return getMockData<T>(endpoint);
  }

  const url = new URL(`${BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  const res = await fetch(url.toString(), {
    headers: {
      "x-apisports-key": apiKey,
      "x-rapidapi-host": "v3.football.api-sports.io",
    },
    next: { revalidate: getRevalidateTime(endpoint) },
  });

  if (!res.ok) {
    console.error(`[api-football] ${res.status} ${endpoint}`);
    return getMockData<T>(endpoint);
  }

  const json = await res.json();

  // API rate limit hit (errors array in response)
  if (json.errors?.requests) {
    console.error("[api-football] Rate limit reached:", json.errors.requests);
    return getMockData<T>(endpoint);
  }

  return (json.response ?? []) as T[];
}

// ISR revalidation time per endpoint type
function getRevalidateTime(endpoint: string): number {
  if (endpoint.includes("/players/squads")) return 86400;    // 24h
  if (endpoint.includes("/fixtures")) return 3600;          // 1h
  if (endpoint.includes("/standings")) return 21600;        // 6h
  if (endpoint.includes("/players/topscorers")) return 21600; // 6h
  if (endpoint.includes("/players")) return 86400;          // 24h
  return 3600;
}

// ─── Public API functions ─────────────────────────────────────────────────────

/** Get Liverpool FC squad for current season */
export const getSquad = cache(async (): Promise<Player[]> => {
  const data = await apiFetch<{ team: unknown; players: Player[] }>(
    "/players/squads",
    { team: TEAM_ID }
  );
  return data[0]?.players ?? mockSquad;
});

/** Get Liverpool fixtures + results for current season */
export const getFixtures = cache(async (): Promise<Fixture[]> => {
  return apiFetch<Fixture>("/fixtures", {
    team: TEAM_ID,
    season: SEASON,
  });
});

/** Get Premier League standings */
export const getStandings = cache(async (): Promise<Standing[]> => {
  const data = await apiFetch<{ league: { standings: Standing[][] } }>(
    "/standings",
    { league: LEAGUE_ID, season: SEASON }
  );
  // API returns standings wrapped in league object
  return data[0]?.league?.standings?.[0] ?? mockStandings;
});

/** Get top scorers for Liverpool in Premier League */
export const getTopScorers = cache(async (): Promise<TopScorer[]> => {
  return apiFetch<TopScorer>("/players/topscorers", {
    league: LEAGUE_ID,
    season: SEASON,
  });
});

/** Get individual player stats — React.cache() deduplicates calls within one render */
export const getPlayerStats = cache(async (playerId: number): Promise<PlayerStats | null> => {
  const data = await apiFetch<PlayerStats>("/players", {
    id: playerId,
    season: SEASON,
    league: LEAGUE_ID,
  });
  return data[0] ?? null;
});

// ─── Mock Data (used when API key is not set) ─────────────────────────────────

function getMockData<T>(endpoint: string): T[] {
  if (endpoint.includes("/players/squads")) return [{ players: mockSquad }] as T[];
  if (endpoint.includes("/fixtures")) return mockFixtures as T[];
  if (endpoint.includes("/standings")) return [{ league: { standings: [mockStandings] } }] as T[];
  if (endpoint.includes("/players/topscorers")) return mockTopScorers as T[];
  return [] as T[];
}

// ─── Mock Squad ───────────────────────────────────────────────────────────────

export const mockSquad: Player[] = [
  { id: 874, name: "Alisson", firstname: "Alisson", lastname: "Becker", age: 32, number: 1, position: "Goalkeeper", photo: "https://media.api-sports.io/football/players/874.png", nationality: "Brazil", height: "193 cm", weight: "91 kg", injured: false },
  { id: 2295, name: "Trent Alexander-Arnold", firstname: "Trent", lastname: "Alexander-Arnold", age: 26, number: 66, position: "Defender", photo: "https://media.api-sports.io/football/players/2295.png", nationality: "England", height: "175 cm", weight: "69 kg", injured: false },
  { id: 521, name: "Virgil van Dijk", firstname: "Virgil", lastname: "van Dijk", age: 33, number: 4, position: "Defender", photo: "https://media.api-sports.io/football/players/521.png", nationality: "Netherlands", height: "193 cm", weight: "92 kg", injured: false },
  { id: 282, name: "Andy Robertson", firstname: "Andrew", lastname: "Robertson", age: 30, number: 26, position: "Defender", photo: "https://media.api-sports.io/football/players/282.png", nationality: "Scotland", height: "178 cm", weight: "64 kg", injured: false },
  { id: 148, name: "Ibrahima Konaté", firstname: "Ibrahima", lastname: "Konaté", age: 25, number: 5, position: "Defender", photo: "https://media.api-sports.io/football/players/148.png", nationality: "France", height: "194 cm", weight: "95 kg", injured: false },
  { id: 47370, name: "Alexis Mac Allister", firstname: "Alexis", lastname: "Mac Allister", age: 26, number: 10, position: "Midfielder", photo: "https://media.api-sports.io/football/players/47370.png", nationality: "Argentina", height: "177 cm", weight: "75 kg", injured: false },
  { id: 889, name: "Dominik Szoboszlai", firstname: "Dominik", lastname: "Szoboszlai", age: 23, number: 8, position: "Midfielder", photo: "https://media.api-sports.io/football/players/889.png", nationality: "Hungary", height: "186 cm", weight: "76 kg", injured: false },
  { id: 47377, name: "Ryan Gravenberch", firstname: "Ryan", lastname: "Gravenberch", age: 22, number: 38, position: "Midfielder", photo: "https://media.api-sports.io/football/players/47377.png", nationality: "Netherlands", height: "190 cm", weight: "80 kg", injured: false },
  { id: 306, name: "Mohamed Salah", firstname: "Mohamed", lastname: "Salah", age: 32, number: 11, position: "Attacker", photo: "https://media.api-sports.io/football/players/306.png", nationality: "Egypt", height: "175 cm", weight: "71 kg", injured: false },
  { id: 1127, name: "Darwin Núñez", firstname: "Darwin", lastname: "Núñez", age: 25, number: 9, position: "Attacker", photo: "https://media.api-sports.io/football/players/1127.png", nationality: "Uruguay", height: "187 cm", weight: "81 kg", injured: false },
  { id: 48025, name: "Luis Díaz", firstname: "Luis", lastname: "Díaz", age: 27, number: 7, position: "Attacker", photo: "https://media.api-sports.io/football/players/48025.png", nationality: "Colombia", height: "178 cm", weight: "71 kg", injured: false },
  { id: 281, name: "Cody Gakpo", firstname: "Cody", lastname: "Gakpo", age: 25, number: 18, position: "Attacker", photo: "https://media.api-sports.io/football/players/281.png", nationality: "Netherlands", height: "189 cm", weight: "77 kg", injured: false },
];

// ─── Mock Fixtures ────────────────────────────────────────────────────────────

export const mockFixtures: Fixture[] = [
  {
    fixture: { id: 1001, date: "2025-03-05T20:00:00+00:00", venue: { id: 1, name: "Anfield", city: "Liverpool" }, status: { long: "Not Started", short: "NS", elapsed: null } },
    league: { id: 39, name: "Premier League", country: "England", logo: "https://media.api-sports.io/football/leagues/39.png", season: 2024, round: "Regular Season - 28" },
    teams: { home: { id: 40, name: "Liverpool", logo: "https://media.api-sports.io/football/teams/40.png", winner: null }, away: { id: 50, name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png", winner: null } },
    goals: { home: null, away: null },
    score: { halftime: { home: null, away: null }, fulltime: { home: null, away: null }, extratime: { home: null, away: null }, penalty: { home: null, away: null } },
  },
  {
    fixture: { id: 1002, date: "2025-03-01T15:00:00+00:00", venue: { id: 2, name: "Anfield", city: "Liverpool" }, status: { long: "Match Finished", short: "FT", elapsed: 90 } },
    league: { id: 39, name: "Premier League", country: "England", logo: "https://media.api-sports.io/football/leagues/39.png", season: 2024, round: "Regular Season - 27" },
    teams: { home: { id: 40, name: "Liverpool", logo: "https://media.api-sports.io/football/teams/40.png", winner: true }, away: { id: 42, name: "Arsenal", logo: "https://media.api-sports.io/football/teams/42.png", winner: false } },
    goals: { home: 2, away: 0 },
    score: { halftime: { home: 1, away: 0 }, fulltime: { home: 2, away: 0 }, extratime: { home: null, away: null }, penalty: { home: null, away: null } },
  },
  {
    fixture: { id: 1003, date: "2025-02-22T17:30:00+00:00", venue: { id: 3, name: "Goodison Park", city: "Liverpool" }, status: { long: "Match Finished", short: "FT", elapsed: 90 } },
    league: { id: 39, name: "Premier League", country: "England", logo: "https://media.api-sports.io/football/leagues/39.png", season: 2024, round: "Regular Season - 26" },
    teams: { home: { id: 45, name: "Everton", logo: "https://media.api-sports.io/football/teams/45.png", winner: false }, away: { id: 40, name: "Liverpool", logo: "https://media.api-sports.io/football/teams/40.png", winner: true } },
    goals: { home: 0, away: 2 },
    score: { halftime: { home: 0, away: 1 }, fulltime: { home: 0, away: 2 }, extratime: { home: null, away: null }, penalty: { home: null, away: null } },
  },
];

// ─── Mock Standings ───────────────────────────────────────────────────────────

export const mockStandings: Standing[] = [
  { rank: 1, team: { id: 40, name: "Liverpool", logo: "https://media.api-sports.io/football/teams/40.png" }, points: 64, goalsDiff: 45, group: null, form: "WWWDW", status: null, description: "Promotion - Champions League (Group Stage: )", all: { played: 27, win: 20, draw: 4, lose: 3, goals: { for: 65, against: 20 } }, home: { played: 14, win: 11, draw: 2, lose: 1, goals: { for: 35, against: 10 } }, away: { played: 13, win: 9, draw: 2, lose: 2, goals: { for: 30, against: 10 } } },
  { rank: 2, team: { id: 42, name: "Arsenal", logo: "https://media.api-sports.io/football/teams/42.png" }, points: 54, goalsDiff: 28, group: null, form: "WDWWL", status: null, description: "Promotion - Champions League (Group Stage: )", all: { played: 27, win: 16, draw: 6, lose: 5, goals: { for: 52, against: 24 } }, home: { played: 14, win: 9, draw: 3, lose: 2, goals: { for: 28, against: 12 } }, away: { played: 13, win: 7, draw: 3, lose: 3, goals: { for: 24, against: 12 } } },
  { rank: 3, team: { id: 50, name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png" }, points: 48, goalsDiff: 18, group: null, form: "WDWLL", status: null, description: null, all: { played: 27, win: 14, draw: 6, lose: 7, goals: { for: 48, against: 30 } }, home: { played: 14, win: 8, draw: 3, lose: 3, goals: { for: 26, against: 15 } }, away: { played: 13, win: 6, draw: 3, lose: 4, goals: { for: 22, against: 15 } } },
  { rank: 4, team: { id: 33, name: "Manchester United", logo: "https://media.api-sports.io/football/teams/33.png" }, points: 40, goalsDiff: 2, group: null, form: "LWLWW", status: null, description: null, all: { played: 27, win: 11, draw: 7, lose: 9, goals: { for: 30, against: 28 } }, home: { played: 14, win: 6, draw: 4, lose: 4, goals: { for: 16, against: 14 } }, away: { played: 13, win: 5, draw: 3, lose: 5, goals: { for: 14, against: 14 } } },
];

// ─── Mock Top Scorers ─────────────────────────────────────────────────────────

export const mockTopScorers: TopScorer[] = [
  { player: mockSquad[8], statistics: [{ team: { id: 40, name: "Liverpool", logo: "" }, league: { id: 39, name: "Premier League", season: 2024 }, games: { appearences: 27, lineups: 26, minutes: 2340, rating: "8.2" }, goals: { total: 22, assists: 12, conceded: null, saves: null }, passes: { total: 890, accuracy: "82" }, tackles: { total: 18 }, cards: { yellow: 1, red: 0 }, shots: { total: 98, on: 54 }, dribbles: { attempts: 65, success: 42 } }] },
  { player: mockSquad[9], statistics: [{ team: { id: 40, name: "Liverpool", logo: "" }, league: { id: 39, name: "Premier League", season: 2024 }, games: { appearences: 23, lineups: 20, minutes: 1780, rating: "7.6" }, goals: { total: 12, assists: 4, conceded: null, saves: null }, passes: { total: 520, accuracy: "74" }, tackles: { total: 25 }, cards: { yellow: 3, red: 0 }, shots: { total: 62, on: 28 }, dribbles: { attempts: 42, success: 24 } }] },
];
