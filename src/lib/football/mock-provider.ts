// Mock provider — returns static data for dev/testing with zero API calls.
// Used when FOOTBALL_DATA_PROVIDER=mock or no API keys are configured.

import type { FootballDataProvider } from "./provider";
import type { Player, PlayerStats, Fixture, Standing, TopScorer, FixtureEvent, FixtureLineup, FixtureTeamStats, Injury, TeamInfo, Coach } from "@/lib/types/football";
import {
  mockSquad, mockFixtures, mockStandings, mockTopScorers, mockTopAssists,
  mockEvents, mockLineups, mockFixtureStats, mockInjuries, mockTeamInfo, mockCoach,
} from "./mock-data";

export class MockProvider implements FootballDataProvider {
  readonly name = "mock";

  async getSquad(): Promise<Player[]> {
    return mockSquad;
  }

  async getFixtures(): Promise<Fixture[]> {
    return mockFixtures;
  }

  async getStandings(): Promise<Standing[]> {
    return mockStandings;
  }

  async getTopScorers(): Promise<TopScorer[]> {
    return mockTopScorers;
  }

  async getTopAssists(): Promise<TopScorer[]> {
    return mockTopAssists;
  }

  async getPlayerStats(_playerId: number): Promise<PlayerStats | null> {
    return null;
  }

  async getFixtureEvents(_fixtureId: number): Promise<FixtureEvent[]> {
    return mockEvents;
  }

  async getFixtureLineups(_fixtureId: number): Promise<FixtureLineup[]> {
    return mockLineups;
  }

  async getFixtureStatistics(_fixtureId: number): Promise<FixtureTeamStats[]> {
    return mockFixtureStats;
  }

  async getInjuries(): Promise<Injury[]> {
    return mockInjuries;
  }

  async getTeamInfo(): Promise<TeamInfo | null> {
    return mockTeamInfo;
  }

  async getCoach(): Promise<Coach | null> {
    return mockCoach;
  }
}
