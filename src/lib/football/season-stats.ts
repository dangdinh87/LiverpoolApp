// Season stats computation — pure functions deriving stats from fixtures + standings.
// Zero API calls. All data comes from getFixtures() + getStandings() already cached.

import "server-only";
import type { Fixture, Standing } from "@/lib/types/football";

const LFC_ID = 40;

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface SeasonStats {
  overview: SeasonOverview;
  monthly: MonthlyGoals[];
  competitions: CompetitionStats[];
  records: SeasonRecords;
  formTimeline: FormEntry[];
}

export interface SeasonOverview {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  cleanSheets: number;
  winRate: number; // percentage 0-100
  points: number; // from PL standings
  rank: number; // from PL standings
  form: string | null; // from PL standings, e.g. "WDWLW"
  homeRecord: WDLRecord;
  awayRecord: WDLRecord;
}

export interface WDLRecord {
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
}

export interface MonthlyGoals {
  month: string; // "2025-08"
  monthIndex: number; // 0-11 (Jan=0, Dec=11) — consumer provides localized label
  scored: number;
  conceded: number;
  matches: number;
}

export interface CompetitionStats {
  name: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
}

// Serialized record display — lightweight, no raw Fixture passed to client
export interface RecordDisplay {
  score: string; // "5 — 0"
  opponent: string; // "vs Southampton"
  venue: string; // "H" or "A"
  competition: string; // "Premier League"
}

export interface SeasonRecords {
  biggestWin: { display: RecordDisplay; diff: number } | null;
  biggestLoss: { display: RecordDisplay; diff: number } | null;
  highestScoring: { display: RecordDisplay; total: number } | null;
  currentStreak: { type: "W" | "unbeaten"; count: number };
  longestWinStreak: number;
  longestUnbeatenStreak: number;
  comebackWins: number;
  scoringFirst: { wins: number; total: number };
}

export interface FormEntry {
  date: string;
  opponent: string;
  result: "W" | "D" | "L";
  score: string; // "3-1"
  competition: string;
  venue: "H" | "A";
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

/** Extract LFC goals scored/conceded from a fixture */
function getLfcGoals(f: Fixture): { scored: number; conceded: number; isHome: boolean } {
  const isHome = f.teams.home.id === LFC_ID;
  return {
    scored: (isHome ? f.goals.home : f.goals.away) ?? 0,
    conceded: (isHome ? f.goals.away : f.goals.home) ?? 0,
    isHome,
  };
}

/** Get match result from LFC perspective — handles FT, AET, PEN statuses */
function getResult(f: Fixture): "W" | "D" | "L" | "NS" {
  const validStatuses = new Set(["FT", "AET", "PEN"]);
  if (!validStatuses.has(f.fixture.status.short)) return "NS";
  if (f.goals.home === null || f.goals.away === null) return "NS";
  const isHome = f.teams.home.id === LFC_ID;
  const lfc = isHome ? f.goals.home : f.goals.away;
  const opp = isHome ? f.goals.away : f.goals.home;
  return lfc > opp ? "W" : lfc < opp ? "L" : "D";
}

/** Serialize a fixture into a lightweight RecordDisplay */
function fixtureToDisplay(f: Fixture): RecordDisplay {
  const { scored, conceded, isHome } = getLfcGoals(f);
  const oppName = isHome ? f.teams.away.name : f.teams.home.name;
  return {
    score: `${scored} — ${conceded}`,
    opponent: `vs ${oppName}`,
    venue: isHome ? "H" : "A",
    competition: normalizeCompName(f.league.name),
  };
}

/** Normalize competition names (e.g., "EFL Cup" → "Carabao Cup") */
function normalizeCompName(name: string): string {
  if (name === "EFL Cup") return "Carabao Cup";
  return name;
}

// ─── Core computation ───────────────────────────────────────────────────────────

/** Compute all derived season stats from fixtures and standings. Pure function, no API calls. */
export function computeSeasonStats(fixtures: Fixture[], standings: Standing[]): SeasonStats {
  // Only count finished matches (FT, AET, PEN)
  const finishedStatuses = new Set(["FT", "AET", "PEN"]);
  const finished = fixtures
    .filter((f) => finishedStatuses.has(f.fixture.status.short))
    .sort((a, b) => a.fixture.date.localeCompare(b.fixture.date));

  const lfcStanding = standings.find((s) => s.team.id === LFC_ID);

  const overview = computeOverview(finished, lfcStanding);
  const monthly = computeMonthlyGoals(finished);
  const competitions = computeCompetitionStats(finished);
  const records = computeRecords(finished);
  const formTimeline = computeFormTimeline(finished);

  return { overview, monthly, competitions, records, formTimeline };
}

// ─── Overview ───────────────────────────────────────────────────────────────────

function computeOverview(finished: Fixture[], standing: Standing | undefined): SeasonOverview {
  let wins = 0, draws = 0, losses = 0, gf = 0, ga = 0, cleanSheets = 0;
  const home: WDLRecord = { w: 0, d: 0, l: 0, gf: 0, ga: 0 };
  const away: WDLRecord = { w: 0, d: 0, l: 0, gf: 0, ga: 0 };

  for (const f of finished) {
    const result = getResult(f);
    const { scored, conceded, isHome } = getLfcGoals(f);
    const rec = isHome ? home : away;

    gf += scored;
    ga += conceded;
    if (conceded === 0) cleanSheets++;

    if (result === "W") { wins++; rec.w++; }
    else if (result === "D") { draws++; rec.d++; }
    else if (result === "L") { losses++; rec.l++; }

    rec.gf += scored;
    rec.ga += conceded;
  }

  const played = finished.length;

  return {
    played,
    wins,
    draws,
    losses,
    goalsFor: gf,
    goalsAgainst: ga,
    goalDiff: gf - ga,
    cleanSheets,
    winRate: played > 0 ? Math.round((wins / played) * 100) : 0,
    points: standing?.points ?? 0,
    rank: standing?.rank ?? 0,
    form: standing?.form ?? null,
    homeRecord: home,
    awayRecord: away,
  };
}

// ─── Monthly goals ──────────────────────────────────────────────────────────────

function computeMonthlyGoals(finished: Fixture[]): MonthlyGoals[] {
  const monthMap = new Map<string, MonthlyGoals>();

  for (const f of finished) {
    const monthKey = f.fixture.date.slice(0, 7); // "2025-08"
    const monthIdx = parseInt(monthKey.slice(5, 7), 10) - 1;
    const { scored, conceded } = getLfcGoals(f);

    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, {
        month: monthKey,
        monthIndex: monthIdx,
        scored: 0,
        conceded: 0,
        matches: 0,
      });
    }

    const entry = monthMap.get(monthKey)!;
    entry.scored += scored;
    entry.conceded += conceded;
    entry.matches++;
  }

  // Sort chronologically
  return Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month));
}

// ─── Competition breakdown ──────────────────────────────────────────────────────

function computeCompetitionStats(finished: Fixture[]): CompetitionStats[] {
  const compMap = new Map<string, CompetitionStats>();

  for (const f of finished) {
    const name = normalizeCompName(f.league.name);
    const result = getResult(f);
    const { scored, conceded } = getLfcGoals(f);

    if (!compMap.has(name)) {
      compMap.set(name, { name, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 });
    }

    const entry = compMap.get(name)!;
    entry.played++;
    entry.goalsFor += scored;
    entry.goalsAgainst += conceded;

    if (result === "W") entry.wins++;
    else if (result === "D") entry.draws++;
    else if (result === "L") entry.losses++;
  }

  // Sort by matches played (descending)
  return Array.from(compMap.values()).sort((a, b) => b.played - a.played);
}

// ─── Records & streaks ──────────────────────────────────────────────────────────

function computeRecords(finished: Fixture[]): SeasonRecords {
  let biggestWin: { fixture: Fixture; diff: number } | null = null;
  let biggestLoss: { fixture: Fixture; diff: number } | null = null;
  let highestScoring: { fixture: Fixture; total: number } | null = null;

  let currentWinStreak = 0;
  let currentUnbeatenStreak = 0;
  let longestWinStreak = 0;
  let longestUnbeatenStreak = 0;
  let comebackWins = 0;
  let scoringFirstWins = 0;
  let scoringFirstTotal = 0;

  for (const f of finished) {
    const result = getResult(f);
    const { scored, conceded, isHome } = getLfcGoals(f);
    const diff = scored - conceded;
    const total = scored + conceded;

    // Biggest win/loss
    if (result === "W" && (biggestWin === null || diff > biggestWin.diff)) {
      biggestWin = { fixture: f, diff };
    }
    if (result === "L" && (biggestLoss === null || diff < (biggestLoss.diff))) {
      biggestLoss = { fixture: f, diff };
    }

    // Highest scoring match
    if (highestScoring === null || total > highestScoring.total) {
      highestScoring = { fixture: f, total };
    }

    // Streaks
    if (result === "W") {
      currentWinStreak++;
      currentUnbeatenStreak++;
    } else if (result === "D") {
      currentWinStreak = 0;
      currentUnbeatenStreak++;
    } else {
      currentWinStreak = 0;
      currentUnbeatenStreak = 0;
    }
    longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
    longestUnbeatenStreak = Math.max(longestUnbeatenStreak, currentUnbeatenStreak);

    // Comeback wins: losing at HT, winning at FT
    const htHome = f.score.halftime.home;
    const htAway = f.score.halftime.away;
    if (htHome !== null && htAway !== null && result === "W") {
      const htLfcGoals = isHome ? htHome : htAway;
      const htOppGoals = isHome ? htAway : htHome;
      if (htLfcGoals < htOppGoals) comebackWins++;
    }

    // Scoring first: LFC leading at HT
    if (htHome !== null && htAway !== null) {
      const htLfcGoals = isHome ? htHome : htAway;
      const htOppGoals = isHome ? htAway : htHome;
      if (htLfcGoals > htOppGoals) {
        scoringFirstTotal++;
        if (result === "W") scoringFirstWins++;
      }
    }
  }

  // Determine current streak type
  let currentStreakType: "W" | "D" | "unbeaten" = "unbeaten";
  if (currentWinStreak > 0 && currentWinStreak === currentUnbeatenStreak) {
    currentStreakType = "W";
  } else if (currentUnbeatenStreak > 0) {
    currentStreakType = "unbeaten";
  }

  return {
    biggestWin: biggestWin ? { display: fixtureToDisplay(biggestWin.fixture), diff: biggestWin.diff } : null,
    biggestLoss: biggestLoss ? { display: fixtureToDisplay(biggestLoss.fixture), diff: Math.abs(biggestLoss.diff) } : null,
    highestScoring: highestScoring && highestScoring.total > 0 ? { display: fixtureToDisplay(highestScoring.fixture), total: highestScoring.total } : null,
    currentStreak: { type: currentStreakType, count: currentStreakType === "W" ? currentWinStreak : currentUnbeatenStreak },
    longestWinStreak,
    longestUnbeatenStreak,
    comebackWins,
    scoringFirst: { wins: scoringFirstWins, total: scoringFirstTotal },
  };
}

// ─── Form timeline ──────────────────────────────────────────────────────────────

function computeFormTimeline(finished: Fixture[]): FormEntry[] {
  // Last 20 matches, most recent last
  const recent = finished.slice(-20);

  return recent.map((f) => {
    const result = getResult(f);
    const { scored, conceded, isHome } = getLfcGoals(f);
    const opponent = isHome ? f.teams.away.name : f.teams.home.name;

    return {
      date: f.fixture.date,
      opponent,
      result: result === "NS" ? "D" : result, // fallback — shouldn't happen since filtered
      score: `${scored}-${conceded}`,
      competition: normalizeCompName(f.league.name),
      venue: isHome ? "H" as const : "A" as const,
    };
  });
}
