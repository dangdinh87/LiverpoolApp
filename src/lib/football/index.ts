// Football data barrel — selects provider via env var, wraps all exports in React.cache().
// Import "server-only" to prevent any client component from importing this module.

import "server-only";
import { cache } from "react";
import type { FootballDataProvider } from "./provider";
import { MockProvider } from "./mock-provider";
import { FplProvider } from "./fpl-provider";

function createProvider(): FootballDataProvider {
  const providerName = process.env.FOOTBALL_DATA_PROVIDER ?? "fpl";

  switch (providerName) {
    case "mock":
      return new MockProvider();
    case "fpl":
    default:
      return new FplProvider();
  }
}

const provider = createProvider();

if (process.env.NODE_ENV === "development") {
  console.info(`[football] Provider: ${provider.name}`);
}

// Re-export all functions wrapped in React.cache() for per-request deduplication.
// Pages import these directly — they never touch the provider class.
export const getSquad = cache(() => provider.getSquad());
export const getFixtures = cache(() => provider.getFixtures());
export const getStandings = cache(() => provider.getStandings());
export const getTopScorers = cache(() => provider.getTopScorers());
export const getTopAssists = cache(() => provider.getTopAssists());
export const getPlayerStats = cache((id: number) => provider.getPlayerStats(id));
export const getFixtureEvents = cache((id: number) => provider.getFixtureEvents(id));
export const getFixtureLineups = cache((id: number) => provider.getFixtureLineups(id));
export const getFixtureStatistics = cache((id: number) => provider.getFixtureStatistics(id));
export const getInjuries = cache(() => provider.getInjuries());
export const getTeamInfo = cache(() => provider.getTeamInfo());
export const getCoach = cache(() => provider.getCoach());
