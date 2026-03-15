// Football data barrel — uses Football-Data.org as primary provider.
// Import "server-only" to prevent any client component from importing this module.

import "server-only";
import { cache } from "react";
import type { Standing } from "@/lib/types/football";
import { FdoProvider } from "./fdo-provider";
import { getFdoStandings, getFdoUclStandings } from "./fdo-standings";
import { getFdoLfcFixtures, getFdoCoach } from "./fdo-matches";
import { getEspnMatchEvents, getEspnMatchDetail, getEspnMatchLineups, getEspnCupFixtures } from "./espn-events";
export type { EspnMatchDetail } from "./espn-events";
export { computeSeasonStats } from "./season-stats";
export { getFplPlayerStats, getAllFplStats } from "./fpl-stats";
export type { FplPlayerStats } from "./fpl-stats";
export type { SeasonStats, SeasonOverview, MonthlyGoals, CompetitionStats, SeasonRecords, FormEntry, RecordDisplay, WDLRecord } from "./season-stats";

const provider = new FdoProvider();

const hasFdoKey = !!process.env.FOOTBALL_DATA_ORG_KEY;

if (process.env.NODE_ENV === "development") {
  console.info(`[football] Provider: ${provider.name}, FDO key: ${hasFdoKey ? "yes" : "no"}`);
}

// Re-export all functions wrapped in React.cache() for per-request deduplication.
export const getSquad = cache(() => provider.getSquad());

// Fixtures: FDO (all comps) + ESPN (FA Cup, EFL Cup supplement)
export const getFixtures = cache(async (season?: number) => {
  if (!hasFdoKey) {
    console.warn("[football] FOOTBALL_DATA_ORG_KEY not set — no fixtures");
    return [];
  }

  try {
    const allFixtures = await getFdoLfcFixtures(season);
    const coveredComps = new Set(allFixtures.map((f) => f.league.name));

    // ESPN: FA Cup, EFL Cup (free, no key needed) — only for current season
    if (!season) {
      try {
        const espnCups = await getEspnCupFixtures();
        const newCups = espnCups.filter((f) => !coveredComps.has(f.league.name));
        allFixtures.push(...newCups);
      } catch (err) {
        console.error("[football] ESPN cup fixtures failed:", err);
      }
    }

    return allFixtures;
  } catch (err) {
    console.error("[football] FDO fixtures failed:", err);
    return [];
  }
});

// Standings: Football-Data.org (real W/D/L/GF/GA/form)
export const getStandings = cache(async (season?: number) => {
  if (!hasFdoKey) {
    console.warn("[football] FOOTBALL_DATA_ORG_KEY not set — no standings");
    return [];
  }

  try {
    return await getFdoStandings(season);
  } catch (err) {
    console.error("[football] FDO standings failed:", err);
    return [];
  }
});

// UCL standings
export const getUclStandings = cache(async (season?: number) => {
  if (!hasFdoKey) return [] as Standing[];
  try {
    return await getFdoUclStandings(season);
  } catch (err) {
    console.error("[football] FDO UCL standings failed:", err);
    return [] as Standing[];
  }
});

export const getTopScorers = cache(() => provider.getTopScorers());
export const getTopAssists = cache(() => provider.getTopAssists());
export const getPlayerStats = cache((id: number) => provider.getPlayerStats(id));

// Fixture events: ESPN (has minutes) → provider fallback
export const getFixtureEvents = cache(async (id: number, fixtureDate?: string) => {
  if (fixtureDate) {
    try {
      const espnEvents = await getEspnMatchEvents(fixtureDate);
      if (espnEvents.length > 0) return espnEvents;
    } catch (err) {
      console.error("[football] ESPN events failed:", err);
    }
  }
  return provider.getFixtureEvents(id);
});

// Fixture lineups: ESPN (has roster data) → provider fallback
export const getFixtureLineups = cache(async (id: number, fixtureDate?: string) => {
  if (fixtureDate) {
    try {
      const espnLineups = await getEspnMatchLineups(fixtureDate);
      if (espnLineups.length > 0) return espnLineups;
    } catch (err) {
      console.error("[football] ESPN lineups failed:", err);
    }
  }
  return provider.getFixtureLineups(id);
});
export const getFixtureStatistics = cache((id: number) => provider.getFixtureStatistics(id));

// Match detail: ESPN (venue, attendance, referee, stats)
export const getMatchDetail = cache(async (fixtureDate: string) => {
  try {
    return await getEspnMatchDetail(fixtureDate);
  } catch (err) {
    console.error("[football] ESPN match detail failed:", err);
    return null;
  }
});

export const getInjuries = cache(() => provider.getInjuries());
export const getTeamInfo = cache(() => provider.getTeamInfo());

// Coach: FDO team endpoint
export const getCoach = cache(async () => {
  if (!hasFdoKey) return null;
  try {
    return await getFdoCoach();
  } catch (err) {
    console.error("[football] FDO coach failed:", err);
    return null;
  }
});

// Gameweek: derive from already-fetched fixtures (no extra API call)
export const getGameweekInfo = cache(async () => {
  try {
    const fixtures = await getFixtures();
    const plFixtures = fixtures.filter((f) => f.league.name === "Premier League");
    if (plFixtures.length === 0) return null;

    const finished = plFixtures
      .filter((f) => f.fixture.status.short === "FT")
      .sort((a, b) => b.fixture.date.localeCompare(a.fixture.date));
    const upcoming = plFixtures
      .filter((f) => f.fixture.status.short === "NS")
      .sort((a, b) => a.fixture.date.localeCompare(b.fixture.date));

    // Extract matchday number from round string "Matchday 29" → 29
    const extractMatchday = (round: string) => {
      const m = round.match(/(\d+)/);
      return m ? Number(m[1]) : null;
    };

    const currentMatchday = extractMatchday(finished[0]?.league.round ?? "") ?? 1;
    const nextMatchday = extractMatchday(upcoming[0]?.league.round ?? "") ?? (currentMatchday + 1);

    return {
      current: currentMatchday,
      currentName: `Gameweek ${currentMatchday}`,
      isFinished: true, // derived from finished matches
      nextDeadline: upcoming[0]?.fixture.date ?? null,
      nextGw: nextMatchday,
    };
  } catch {
    return null;
  }
});
