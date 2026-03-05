// Football data barrel — selects provider via env var, wraps all exports in React.cache().
// Import "server-only" to prevent any client component from importing this module.

import "server-only";
import { cache } from "react";
import type { FootballDataProvider } from "./provider";
import { MockProvider } from "./mock-provider";
import { FplProvider } from "./fpl-provider";
import { getFdoStandings } from "./fdo-standings";
import { getFdoLfcFixtures, getFdoCoach } from "./fdo-matches";

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

const hasFdoKey = !!process.env.FOOTBALL_DATA_ORG_KEY;

if (process.env.NODE_ENV === "development") {
  console.info(`[football] Provider: ${provider.name}, FDO standings: ${hasFdoKey ? "yes" : "no"}`);
}

// Re-export all functions wrapped in React.cache() for per-request deduplication.
// Pages import these directly — they never touch the provider class.
export const getSquad = cache(() => provider.getSquad());

// Fixtures: merge FPL (PL matches with detail) + FDO non-PL matches (UCL, FA Cup, etc.)
export const getFixtures = cache(async () => {
  const fplFixtures = await provider.getFixtures();
  if (hasFdoKey) {
    try {
      const fdoFixtures = await getFdoLfcFixtures();
      const nonPl = fdoFixtures.filter((f) => f.league.name !== "Premier League");
      return [...fplFixtures, ...nonPl];
    } catch (err) {
      console.error("[football] FDO fixtures failed, using FPL only:", err);
    }
  }
  return fplFixtures;
});

// Standings: use Football-Data.org when key is set (real W/D/L/GF/GA/form),
// fall back to provider (FPL returns [], mock returns mock data).
export const getStandings = cache(async () => {
  if (hasFdoKey) {
    try {
      return await getFdoStandings();
    } catch (err) {
      console.error("[football] FDO standings failed, falling back to provider:", err);
    }
  }
  return provider.getStandings();
});

export const getTopScorers = cache(() => provider.getTopScorers());
export const getTopAssists = cache(() => provider.getTopAssists());
export const getPlayerStats = cache((id: number) => provider.getPlayerStats(id));
export const getFixtureEvents = cache((id: number) => provider.getFixtureEvents(id));
export const getFixtureLineups = cache((id: number) => provider.getFixtureLineups(id));
export const getFixtureStatistics = cache((id: number) => provider.getFixtureStatistics(id));
export const getInjuries = cache(() => provider.getInjuries());
export const getTeamInfo = cache(() => provider.getTeamInfo());
// Coach: use FDO team endpoint (FPL has no coach data)
export const getCoach = cache(async () => {
  if (hasFdoKey) {
    try {
      return await getFdoCoach();
    } catch (err) {
      console.error("[football] FDO coach failed, falling back to provider:", err);
    }
  }
  return provider.getCoach();
});
export const getGameweekInfo = cache(() => provider.getGameweekInfo());
