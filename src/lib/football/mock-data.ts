// Shared mock data constants used by MockProvider and as dev fallback.
// Extracted from the original api-football.ts monolith.

import type {
  Player,
  Fixture,
  Standing,
  TopScorer,
  FixtureEvent,
  FixtureLineup,
  FixtureTeamStats,
  Injury,
  TeamInfo,
  Coach,
} from "@/lib/types/football";

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

const mockStatDefaults = {
  substitutes: { in: 0, out: null, bench: null },
  duels: { total: null, won: null },
  fouls: { drawn: null, committed: null },
  penalty: { won: null, commited: null, scored: null, missed: null, saved: null },
} as const;

export const mockTopScorers: TopScorer[] = [
  { player: mockSquad[8], statistics: [{ team: { id: 40, name: "Liverpool", logo: "" }, league: { id: 39, name: "Premier League", season: 2024 }, games: { appearences: 27, lineups: 26, minutes: 2340, number: null, position: "Attacker", rating: "8.2", captain: false }, ...mockStatDefaults, goals: { total: 22, assists: 12, conceded: null, saves: null }, passes: { total: 890, key: 45, accuracy: "82" }, tackles: { total: 18, blocks: null, interceptions: 5 }, cards: { yellow: 1, yellowred: null, red: 0 }, shots: { total: 98, on: 54 }, dribbles: { attempts: 65, success: 42, past: null } }] },
  { player: mockSquad[9], statistics: [{ team: { id: 40, name: "Liverpool", logo: "" }, league: { id: 39, name: "Premier League", season: 2024 }, games: { appearences: 23, lineups: 20, minutes: 1780, number: null, position: "Attacker", rating: "7.6", captain: false }, ...mockStatDefaults, goals: { total: 12, assists: 4, conceded: null, saves: null }, passes: { total: 520, key: 18, accuracy: "74" }, tackles: { total: 25, blocks: null, interceptions: 3 }, cards: { yellow: 3, yellowred: null, red: 0 }, shots: { total: 62, on: 28 }, dribbles: { attempts: 42, success: 24, past: null } }] },
];

// ─── Mock Top Assists ─────────────────────────────────────────────────────────

export const mockTopAssists: TopScorer[] = [
  { player: mockSquad[8], statistics: [{ team: { id: 40, name: "Liverpool", logo: "" }, league: { id: 39, name: "Premier League", season: 2024 }, games: { appearences: 27, lineups: 26, minutes: 2340, number: null, position: "Attacker", rating: "8.2", captain: false }, ...mockStatDefaults, goals: { total: 22, assists: 12, conceded: null, saves: null }, passes: { total: 890, key: 45, accuracy: "82" }, tackles: { total: 18, blocks: null, interceptions: 5 }, cards: { yellow: 1, yellowred: null, red: 0 }, shots: { total: 98, on: 54 }, dribbles: { attempts: 65, success: 42, past: null } }] },
  { player: mockSquad[5], statistics: [{ team: { id: 40, name: "Liverpool", logo: "" }, league: { id: 39, name: "Premier League", season: 2024 }, games: { appearences: 27, lineups: 27, minutes: 2430, number: null, position: "Midfielder", rating: "8.0", captain: false }, ...mockStatDefaults, goals: { total: 8, assists: 10, conceded: null, saves: null }, passes: { total: 1120, key: 52, accuracy: "88" }, tackles: { total: 42, blocks: null, interceptions: 12 }, cards: { yellow: 2, yellowred: null, red: 0 }, shots: { total: 35, on: 18 }, dribbles: { attempts: 28, success: 20, past: null } }] },
  { player: mockSquad[10], statistics: [{ team: { id: 40, name: "Liverpool", logo: "" }, league: { id: 39, name: "Premier League", season: 2024 }, games: { appearences: 25, lineups: 22, minutes: 1980, number: null, position: "Attacker", rating: "7.8", captain: false }, ...mockStatDefaults, goals: { total: 9, assists: 8, conceded: null, saves: null }, passes: { total: 640, key: 30, accuracy: "79" }, tackles: { total: 22, blocks: null, interceptions: 4 }, cards: { yellow: 2, yellowred: null, red: 0 }, shots: { total: 55, on: 26 }, dribbles: { attempts: 52, success: 34, past: null } }] },
];

// ─── Mock Fixture Events ──────────────────────────────────────────────────────

export const mockEvents: FixtureEvent[] = [
  { time: { elapsed: 23, extra: null }, team: { id: 40, name: "Liverpool", logo: "https://media.api-sports.io/football/teams/40.png" }, player: { id: 306, name: "M. Salah" }, assist: { id: 2295, name: "T. Alexander-Arnold" }, type: "Goal", detail: "Normal Goal", comments: null },
  { time: { elapsed: 45, extra: 2 }, team: { id: 42, name: "Arsenal", logo: "https://media.api-sports.io/football/teams/42.png" }, player: { id: 1111, name: "B. Saka" }, assist: { id: null, name: null }, type: "Card", detail: "Yellow Card", comments: null },
  { time: { elapsed: 67, extra: null }, team: { id: 40, name: "Liverpool", logo: "https://media.api-sports.io/football/teams/40.png" }, player: { id: 1127, name: "D. Núñez" }, assist: { id: 306, name: "M. Salah" }, type: "Goal", detail: "Normal Goal", comments: null },
  { time: { elapsed: 72, extra: null }, team: { id: 40, name: "Liverpool", logo: "https://media.api-sports.io/football/teams/40.png" }, player: { id: 281, name: "C. Gakpo" }, assist: { id: null, name: "D. Núñez" }, type: "subst", detail: "Substitution 1", comments: null },
];

// ─── Mock Fixture Lineups ─────────────────────────────────────────────────────

export const mockLineups: FixtureLineup[] = [
  {
    team: { id: 40, name: "Liverpool", logo: "https://media.api-sports.io/football/teams/40.png", colors: null },
    formation: "4-3-3",
    startXI: [
      { player: { id: 874, name: "Alisson", number: 1, pos: "G", grid: "1:1" } },
      { player: { id: 2295, name: "T. Alexander-Arnold", number: 66, pos: "D", grid: "2:4" } },
      { player: { id: 148, name: "I. Konaté", number: 5, pos: "D", grid: "2:3" } },
      { player: { id: 521, name: "V. van Dijk", number: 4, pos: "D", grid: "2:2" } },
      { player: { id: 282, name: "A. Robertson", number: 26, pos: "D", grid: "2:1" } },
      { player: { id: 47377, name: "R. Gravenberch", number: 38, pos: "M", grid: "3:2" } },
      { player: { id: 47370, name: "A. Mac Allister", number: 10, pos: "M", grid: "3:3" } },
      { player: { id: 889, name: "D. Szoboszlai", number: 8, pos: "M", grid: "3:1" } },
      { player: { id: 306, name: "M. Salah", number: 11, pos: "F", grid: "4:3" } },
      { player: { id: 1127, name: "D. Núñez", number: 9, pos: "F", grid: "4:2" } },
      { player: { id: 48025, name: "L. Díaz", number: 7, pos: "F", grid: "4:1" } },
    ],
    substitutes: [
      { player: { id: 281, name: "C. Gakpo", number: 18, pos: "F", grid: null } },
    ],
    coach: { id: 19, name: "A. Slot", photo: "https://media.api-sports.io/football/coachs/19.png" },
  },
  {
    team: { id: 42, name: "Arsenal", logo: "https://media.api-sports.io/football/teams/42.png", colors: null },
    formation: "4-3-3",
    startXI: [
      { player: { id: 100, name: "D. Raya", number: 22, pos: "G", grid: "1:1" } },
      { player: { id: 101, name: "B. White", number: 4, pos: "D", grid: "2:4" } },
      { player: { id: 102, name: "W. Saliba", number: 2, pos: "D", grid: "2:3" } },
      { player: { id: 103, name: "G. Magalhães", number: 6, pos: "D", grid: "2:2" } },
      { player: { id: 104, name: "J. Timber", number: 12, pos: "D", grid: "2:1" } },
      { player: { id: 105, name: "T. Partey", number: 5, pos: "M", grid: "3:2" } },
      { player: { id: 106, name: "D. Rice", number: 41, pos: "M", grid: "3:1" } },
      { player: { id: 107, name: "M. Ødegaard", number: 8, pos: "M", grid: "3:3" } },
      { player: { id: 108, name: "B. Saka", number: 7, pos: "F", grid: "4:3" } },
      { player: { id: 109, name: "K. Havertz", number: 29, pos: "F", grid: "4:2" } },
      { player: { id: 110, name: "G. Martinelli", number: 11, pos: "F", grid: "4:1" } },
    ],
    substitutes: [],
    coach: { id: 20, name: "M. Arteta", photo: "" },
  },
];

// ─── Mock Fixture Statistics ──────────────────────────────────────────────────

export const mockFixtureStats: FixtureTeamStats[] = [
  {
    team: { id: 40, name: "Liverpool", logo: "https://media.api-sports.io/football/teams/40.png" },
    statistics: [
      { type: "Ball Possession", value: "58%" },
      { type: "Shots on Goal", value: 8 },
      { type: "Shots off Goal", value: 5 },
      { type: "Total Shots", value: 16 },
      { type: "Blocked Shots", value: 3 },
      { type: "Corner Kicks", value: 7 },
      { type: "Offsides", value: 2 },
      { type: "Fouls", value: 10 },
      { type: "Yellow Cards", value: 1 },
      { type: "Red Cards", value: 0 },
      { type: "Total passes", value: 542 },
      { type: "Passes accurate", value: 468 },
      { type: "Passes %", value: "86%" },
      { type: "expected_goals", value: "2.1" },
    ],
  },
  {
    team: { id: 42, name: "Arsenal", logo: "https://media.api-sports.io/football/teams/42.png" },
    statistics: [
      { type: "Ball Possession", value: "42%" },
      { type: "Shots on Goal", value: 3 },
      { type: "Shots off Goal", value: 4 },
      { type: "Total Shots", value: 10 },
      { type: "Blocked Shots", value: 3 },
      { type: "Corner Kicks", value: 4 },
      { type: "Offsides", value: 1 },
      { type: "Fouls", value: 14 },
      { type: "Yellow Cards", value: 3 },
      { type: "Red Cards", value: 0 },
      { type: "Total passes", value: 385 },
      { type: "Passes accurate", value: 310 },
      { type: "Passes %", value: "81%" },
      { type: "expected_goals", value: "0.8" },
    ],
  },
];

// ─── Mock Injuries ────────────────────────────────────────────────────────────

export const mockInjuries: Injury[] = [
  { player: { id: 282, name: "Andy Robertson", photo: "https://media.api-sports.io/football/players/282.png", type: "Missing Fixture", reason: "Knee Injury" }, team: { id: 40, name: "Liverpool", logo: "https://media.api-sports.io/football/teams/40.png" }, fixture: { id: 1001, date: "2025-03-05" }, league: { id: 39, name: "Premier League", season: 2024 } },
  { player: { id: 889, name: "Dominik Szoboszlai", photo: "https://media.api-sports.io/football/players/889.png", type: "Questionable", reason: "Hamstring" }, team: { id: 40, name: "Liverpool", logo: "https://media.api-sports.io/football/teams/40.png" }, fixture: { id: 1001, date: "2025-03-05" }, league: { id: 39, name: "Premier League", season: 2024 } },
];

// ─── Mock Team Info ───────────────────────────────────────────────────────────

export const mockTeamInfo: TeamInfo = {
  team: { id: 40, name: "Liverpool", code: "LIV", country: "England", founded: 1892, national: false, logo: "https://media.api-sports.io/football/teams/40.png" },
  venue: { id: 550, name: "Anfield", address: "Anfield Road", city: "Liverpool", capacity: 61276, surface: "grass", image: "https://media.api-sports.io/football/venues/550.png" },
};

// ─── Mock Coach ───────────────────────────────────────────────────────────────

export const mockCoach: Coach = {
  id: 19,
  name: "Arne Slot",
  firstname: "Arne",
  lastname: "Slot",
  age: 46,
  birth: { date: "1978-09-17", place: "Bergentheim", country: "Netherlands" },
  nationality: "Netherlands",
  height: null,
  weight: null,
  photo: "https://media.api-sports.io/football/coachs/19.png",
  team: { id: 40, name: "Liverpool", logo: "https://media.api-sports.io/football/teams/40.png" },
  career: [
    { team: { id: 40, name: "Liverpool", logo: "https://media.api-sports.io/football/teams/40.png" }, start: "2024-06-01", end: null },
    { team: { id: 197, name: "Feyenoord", logo: "https://media.api-sports.io/football/teams/197.png" }, start: "2021-06-01", end: "2024-05-31" },
    { team: { id: 198, name: "AZ Alkmaar", logo: "https://media.api-sports.io/football/teams/198.png" }, start: "2019-01-01", end: "2021-05-31" },
  ],
};
