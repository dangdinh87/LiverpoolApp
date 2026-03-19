// Head-to-head data — Liverpool vs opponent.
// Computes from available fixture data across seasons.

import "server-only";
import type { Fixture } from "@/lib/types/football";

const LFC_ID = 40;

export interface H2HRecord {
  liverpoolWins: number;
  draws: number;
  opponentWins: number;
  liverpoolGoals: number;
  opponentGoals: number;
  totalMatches: number;
  /** Avg goals per match (Liverpool) */
  avgGoalsPerMatch: number;
  /** Clean sheets for Liverpool */
  cleanSheets: number;
  /** Year range — e.g. "2024–2026" */
  fromYear: number;
  toYear: number;
  lastMeetings: {
    date: string;
    result: "W" | "D" | "L";
    score: string;
    homeTeam: string;
    awayTeam: string;
    competition: string;
  }[];
}

/**
 * Compute H2H record from available fixture data.
 * Works with multi-season data (caller fetches seasons in parallel).
 */
export function computeH2H(
  allFixtures: Fixture[],
  opponentId: number,
): H2HRecord | null {
  const FINISHED = new Set(["FT", "AET", "PEN"]);
  const meetings = allFixtures
    .filter((f) => {
      if (!FINISHED.has(f.fixture.status.short)) return false;
      const ids = [f.teams.home.id, f.teams.away.id];
      return ids.includes(LFC_ID) && ids.includes(opponentId);
    })
    .sort(
      (a, b) =>
        new Date(b.fixture.date).getTime() -
        new Date(a.fixture.date).getTime(),
    );

  if (meetings.length === 0) return null;

  let liverpoolWins = 0;
  let draws = 0;
  let opponentWins = 0;
  let liverpoolGoals = 0;
  let opponentGoals = 0;

  const lastMeetings: H2HRecord["lastMeetings"] = [];

  for (const m of meetings) {
    const isHome = m.teams.home.id === LFC_ID;
    const lfcG = isHome ? (m.goals.home ?? 0) : (m.goals.away ?? 0);
    const oppG = isHome ? (m.goals.away ?? 0) : (m.goals.home ?? 0);

    liverpoolGoals += lfcG;
    opponentGoals += oppG;

    let result: "W" | "D" | "L";
    if (lfcG > oppG) {
      liverpoolWins++;
      result = "W";
    } else if (lfcG < oppG) {
      opponentWins++;
      result = "L";
    } else {
      draws++;
      result = "D";
    }

    if (lastMeetings.length < 5) {
      lastMeetings.push({
        date: m.fixture.date,
        result,
        score: `${m.goals.home ?? 0}-${m.goals.away ?? 0}`,
        homeTeam: m.teams.home.name,
        awayTeam: m.teams.away.name,
        competition: m.league.name,
      });
    }
  }

  // Compute extra stats
  let cleanSheets = 0;
  for (const m of meetings) {
    const isHome = m.teams.home.id === LFC_ID;
    const oppG = isHome ? (m.goals.away ?? 0) : (m.goals.home ?? 0);
    if (oppG === 0) cleanSheets++;
  }

  const years = meetings.map((m) => new Date(m.fixture.date).getFullYear());
  const fromYear = Math.min(...years);
  const toYear = Math.max(...years);

  return {
    liverpoolWins,
    draws,
    opponentWins,
    liverpoolGoals,
    opponentGoals,
    totalMatches: meetings.length,
    avgGoalsPerMatch: meetings.length > 0 ? +(liverpoolGoals / meetings.length).toFixed(1) : 0,
    cleanSheets,
    fromYear,
    toYear,
    lastMeetings,
  };
}
