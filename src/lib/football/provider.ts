// Football data provider interface — all providers must conform to this contract.
// Types are canonical (from @/lib/types/football); providers map external API shapes to these.

import type {
  Player,
  PlayerStats,
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

/** Abstract contract for football data providers (API-Football, SofaScore, mock, etc.) */
export interface FootballDataProvider {
  readonly name: string;

  getSquad(): Promise<Player[]>;
  getFixtures(): Promise<Fixture[]>;
  getStandings(): Promise<Standing[]>;
  getTopScorers(): Promise<TopScorer[]>;
  getTopAssists(): Promise<TopScorer[]>;
  getPlayerStats(playerId: number): Promise<PlayerStats | null>;
  getFixtureEvents(fixtureId: number): Promise<FixtureEvent[]>;
  getFixtureLineups(fixtureId: number): Promise<FixtureLineup[]>;
  getFixtureStatistics(fixtureId: number): Promise<FixtureTeamStats[]>;
  getInjuries(): Promise<Injury[]>;
  getTeamInfo(): Promise<TeamInfo | null>;
  getCoach(): Promise<Coach | null>;
}
