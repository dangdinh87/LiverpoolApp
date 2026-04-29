// ESPN public API — match events + stats for Liverpool fixtures.
// Free, no API key needed. Provides goals, cards, subs with exact minute,
// plus venue, attendance, referee, and 28 per-team match statistics.

import "server-only";
import type { Fixture, FixtureEvent, FixtureLineup, FixtureTeamStats, FixtureStatItem } from "@/lib/types/football";

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const ESPN_LFC_ID = "364"; // Liverpool FC in ESPN
const FETCH_TIMEOUT_MS = 8_000;

// ESPN league slugs — all competitions Liverpool participates in
const LEAGUE_SLUGS = ["eng.1", "uefa.champions", "eng.fa", "eng.league_cup"] as const;

// ─── ESPN response shapes ───────────────────────────────────────────────────

interface EspnKeyEvent {
  type: { type: string; text: string };
  clock: { value: number; displayValue: string };
  period: { number: number };
  scoringPlay: boolean;
  team?: { id: string; displayName: string };
  participants?: { athlete: { id: string; displayName: string } }[];
  text?: string;
  shortText?: string;
}

interface EspnScheduleEvent {
  id: string;
  date: string; // ISO date
  season: { displayName: string };
  seasonType: { name: string };
  competitions: {
    venue?: { fullName?: string; address?: { city?: string } };
    status: { type: { detail: string; state: string; completed: boolean } };
    competitors: {
      id: string;
      homeAway: string;
      winner: boolean;
      score?: { value: number; displayValue: string };
      team: {
        id: string;
        displayName: string;
        shortDisplayName: string;
        logo?: string; // scoreboard format
        logos?: { href: string }[]; // team schedule format
      };
    }[];
  }[];
}

interface EspnBoxscoreTeam {
  team: { id: string; displayName: string };
  statistics: { name: string; displayValue: string }[];
}

interface EspnRosterEntry {
  starter: boolean;
  jersey: string;
  athlete: { id: string; displayName: string };
  position: { abbreviation: string; name?: string };
}

interface EspnRosterTeam {
  team: { id: string; displayName: string; logo?: string };
  formation?: string;
  coach?: { displayName: string }[];
  roster: EspnRosterEntry[];
}

interface EspnSummary {
  keyEvents?: EspnKeyEvent[];
  boxscore?: {
    teams?: EspnBoxscoreTeam[];
  };
  gameInfo?: {
    venue?: { fullName?: string; city?: string; capacity?: number };
    attendance?: number;
    officials?: { displayName?: string }[];
  };
  rosters?: EspnRosterTeam[];
}

// ─── Match detail type (venue, attendance, referee, stats) ──────────────────

export interface EspnMatchDetail {
  venue: string | null;
  attendance: number | null;
  referee: string | null;
  stats: FixtureTeamStats[];
}

// ─── Fetcher ────────────────────────────────────────────────────────────────

async function espnFetch<T>(url: string, revalidate: number): Promise<T> {
  const res = await fetch(url, {
    next: { revalidate },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`[espn] HTTP ${res.status} on ${url}`);
  return res.json();
}

// ─── Build date→espnId lookup from Liverpool schedule ───────────────────────

/** Map of "YYYY-MM-DD" → ESPN event ID for Liverpool matches. Cache 6h. */
async function buildDateToEspnId(): Promise<Map<string, string>> {
  const dateMap = new Map<string, string>();

  // Fetch PL + UCL schedules in parallel
  const schedules = await Promise.allSettled(
    LEAGUE_SLUGS.map((slug) =>
      espnFetch<{ events: EspnScheduleEvent[] }>(
        `${ESPN_BASE}/${slug}/teams/${ESPN_LFC_ID}/schedule`,
        21600, // 6h cache
      )
    )
  );

  for (const result of schedules) {
    if (result.status !== "fulfilled") continue;
    for (const ev of result.value.events) {
      const dateKey = ev.date.slice(0, 10); // "YYYY-MM-DD"
      dateMap.set(dateKey, ev.id);
    }
  }

  return dateMap;
}

// ─── Scoreboard fallback: find LFC match on a specific date ─────────────────

/** Check today's scoreboard for a Liverpool match (covers matches not yet in team schedule). */
async function findLfcOnScoreboard(dateKey: string): Promise<string | null> {
  const yyyymmdd = dateKey.replace(/-/g, "");
  for (const slug of LEAGUE_SLUGS) {
    try {
      const data = await espnFetch<{ events: EspnScheduleEvent[] }>(
        `${ESPN_BASE}/${slug}/scoreboard?dates=${yyyymmdd}`,
        300, // 5min cache — scoreboard updates frequently
      );
      for (const ev of data.events) {
        const comp = ev.competitions[0];
        const teamIds = comp?.competitors?.map((c) => c.team?.id) ?? [];
        if (teamIds.includes(ESPN_LFC_ID)) return ev.id;
      }
    } catch {
      continue;
    }
  }
  return null;
}

// ─── ESPN ID resolver (shared) ──────────────────────────────────────────────

const espnIdCache = new Map<string, string | null>();

async function resolveEspnId(fixtureDate: string): Promise<string | null> {
  const dateKey = fixtureDate.slice(0, 10);

  if (espnIdCache.has(dateKey)) {
    return espnIdCache.get(dateKey) ?? null;
  }

  // Try team schedule first (covers past + near-future matches)
  const dateMap = await buildDateToEspnId();
  const fromSchedule = dateMap.get(dateKey);
  if (fromSchedule) {
    espnIdCache.set(dateKey, fromSchedule);
    return fromSchedule;
  }

  // Fallback: check scoreboard (covers today's & upcoming matches not yet in schedule)
  const fromScoreboard = await findLfcOnScoreboard(dateKey);

  // Cache null only for past matches to avoid retrying missing IDs forever,
  // but allow future matches to be retried.
  const isFuture = new Date(fixtureDate) > new Date();
  if (fromScoreboard !== null || !isFuture) {
    espnIdCache.set(dateKey, fromScoreboard);
  }
  return fromScoreboard;
}

async function fetchSummary(espnId: string): Promise<EspnSummary | null> {
  for (const slug of LEAGUE_SLUGS) {
    try {
      const data = await espnFetch<EspnSummary>(
        `${ESPN_BASE}/${slug}/summary?event=${espnId}`,
        3600, // 1h cache
      );
      // Verify it has content (keyEvents or boxscore)
      if (data.keyEvents?.length || data.boxscore?.teams?.length || data.rosters?.length) {
        return data;
      }
    } catch {
      continue;
    }
  }
  return null;
}

// ─── Event type mapping ─────────────────────────────────────────────────────

function mapEventType(espnType: string): { type: FixtureEvent["type"]; detail: string } | null {
  if (espnType.startsWith("goal") || espnType === "penalty---scored") {
    const detail = espnType.includes("header") ? "Header"
      : espnType.includes("penalty") ? "Penalty"
      : espnType.includes("free-kick") ? "Free Kick"
      : espnType.includes("own-goal") ? "Own Goal"
      : "Normal Goal";
    return { type: "Goal", detail };
  }
  if (espnType === "yellow-card") return { type: "Card", detail: "Yellow Card" };
  if (espnType === "red-card" || espnType === "yellow-red-card") return { type: "Card", detail: "Red Card" };
  if (espnType === "substitution") return { type: "subst", detail: "Substitution" };
  return null;
}

// Parse "61'" or "90'+2'" into { elapsed, extra }
function parseMinute(display: string): { elapsed: number; extra: number | null } {
  const match = display.match(/^(\d+)'(?:\+(\d+)')?$/);
  if (!match) return { elapsed: 0, extra: null };
  return {
    elapsed: parseInt(match[1], 10),
    extra: match[2] ? parseInt(match[2], 10) : null,
  };
}

// Extract assist name from ESPN text description
function extractAssist(text: string | undefined): string | null {
  if (!text) return null;
  const match = text.match(/Assisted by ([^.]+?)(?:\s+with\s|\s*\.)/i);
  return match ? match[1].trim() : null;
}

// ─── Stat name → display label mapping ──────────────────────────────────────

const STAT_LABEL: Record<string, string> = {
  possessionPct: "Ball Possession",
  totalShots: "Total Shots",
  shotsOnTarget: "Shots on Target",
  saves: "Saves",
  wonCorners: "Corner Kicks",
  offsides: "Offsides",
  foulsCommitted: "Fouls",
  yellowCards: "Yellow Cards",
  redCards: "Red Cards",
  totalPasses: "Total Passes",
  accuratePasses: "Accurate Passes",
  passPct: "Pass Accuracy",
  totalCrosses: "Total Crosses",
  accurateCrosses: "Accurate Crosses",
  totalLongBalls: "Long Balls",
  accurateLongBalls: "Accurate Long Balls",
  blockedShots: "Blocked Shots",
  effectiveTackles: "Tackles Won",
  totalTackles: "Total Tackles",
  interceptions: "Interceptions",
  effectiveClearance: "Clearances",
};

// Stats we want to display (in display order)
const DISPLAY_STATS = [
  "possessionPct", "totalShots", "shotsOnTarget", "saves",
  "wonCorners", "offsides", "foulsCommitted", "yellowCards", "redCards",
  "totalPasses", "accuratePasses", "passPct",
  "blockedShots", "effectiveTackles", "interceptions", "effectiveClearance",
];

function mapEspnStats(espnTeam: EspnBoxscoreTeam): FixtureTeamStats {
  const statMap = new Map((espnTeam.statistics ?? []).map((s) => [s.name, s.displayValue]));

  const statistics: FixtureStatItem[] = [];
  for (const key of DISPLAY_STATS) {
    const raw = statMap.get(key);
    if (raw === undefined) continue;

    // Format percentage stats
    let value: string | number;
    if (key === "possessionPct") {
      value = `${raw}%`;
    } else if (key === "passPct") {
      value = `${Math.round(parseFloat(raw) * 100)}%`;
    } else {
      value = parseInt(raw, 10) || 0;
    }

    statistics.push({ type: STAT_LABEL[key] ?? key, value });
  }

  return {
    team: { id: 0, name: espnTeam.team.displayName, logo: "" },
    statistics,
  };
}

// ─── Public: Fetch match events by fixture date ─────────────────────────────

/**
 * Fetch detailed match events (goals, cards, subs) with accurate minutes
 * from ESPN for a Liverpool fixture. Matches by date since IDs differ across APIs.
 */
export async function getEspnMatchEvents(fixtureDate: string): Promise<FixtureEvent[]> {
  try {
    const espnId = await resolveEspnId(fixtureDate);
    if (!espnId) return [];

    const summary = await fetchSummary(espnId);
    if (!summary?.keyEvents?.length) return [];

    const events: FixtureEvent[] = [];

    for (const ke of summary.keyEvents) {
      const mapped = mapEventType(ke.type.type);
      if (!mapped) continue;

      const minute = parseMinute(ke.clock.displayValue);
      const playerName = ke.participants?.[0]?.athlete?.displayName ?? null;
      const teamName = ke.team?.displayName ?? "";
      const assistName = mapped.type === "Goal" ? extractAssist(ke.text) : null;

      events.push({
        time: { elapsed: minute.elapsed, extra: minute.extra },
        team: { id: 0, name: teamName, logo: "" },
        player: { id: null, name: playerName },
        assist: { id: null, name: assistName },
        type: mapped.type,
        detail: mapped.detail,
        comments: null,
      });
    }

    // Sort by minute
    events.sort((a, b) => (a.time.elapsed ?? 0) - (b.time.elapsed ?? 0));

    return events;
  } catch (err) {
    console.error("[espn] getEspnMatchEvents failed:", err);
    return [];
  }
}

// ─── Public: Fetch match detail (venue, attendance, referee, stats) ────────

/**
 * Fetch match detail from ESPN for a Liverpool fixture.
 * Returns venue, attendance, referee name, and per-team match statistics.
 */
// ─── ESPN slug → canonical competition name mapping ──────────────────────────

const SLUG_COMP_NAME: Record<string, string> = {
  "eng.1": "Premier League",
  "uefa.champions": "UEFA Champions League",
  "eng.fa": "FA Cup",
  "eng.league_cup": "Carabao Cup",
};

// Local competition logos (downloaded to /public/assets/lfc/)
const SLUG_COMP_LOGO: Record<string, string> = {
  "eng.1": "/assets/lfc/premier-league.svg",
  "uefa.champions": "/assets/lfc/champions-league.png",
  "eng.fa": "/assets/lfc/fa-cup.png",
  "eng.league_cup": "/assets/lfc/carabao-cup.png",
};

function espnTeamId(espnId: string): number {
  return espnId === ESPN_LFC_ID ? 40 : parseInt(espnId, 10);
}

// ─── Shared: map an ESPN schedule event to Fixture ─────────────────────────────

function mapEspnEventToFixture(ev: EspnScheduleEvent, compName: string, compLogo: string): Fixture | null {
  const comp = ev.competitions[0];
  if (!comp?.competitors?.length) return null;

  const home = comp.competitors.find((c) => c.homeAway === "home");
  const away = comp.competitors.find((c) => c.homeAway === "away");
  if (!home || !away) return null;

  const detail = comp.status.type.detail;
  const state = comp.status.type.state;
  const statusShort = detail === "FT" ? "FT"
    : detail === "AET" ? "AET"
    : detail.includes("Pens") ? "PEN"
    : state === "pre" ? "NS"
    : state === "in" ? "LIVE"
    : "FT";
  const statusLong = statusShort === "FT" ? "Match Finished"
    : statusShort === "AET" ? "After Extra Time"
    : statusShort === "PEN" ? "Penalties"
    : statusShort === "NS" ? "Not Started"
    : statusShort === "LIVE" ? "In Play"
    : detail;

  const hScore = home.score?.value ?? null;
  const aScore = away.score?.value ?? null;
  const isFinished = comp.status.type.completed;

  return {
    fixture: {
      id: parseInt(ev.id, 10) || Date.parse(ev.date),
      date: ev.date,
      venue: {
        id: null,
        name: comp.venue?.fullName ?? null,
        city: comp.venue?.address?.city ?? null,
      },
      status: { long: statusLong, short: statusShort, elapsed: isFinished ? 90 : null },
    },
    league: {
      id: 0,
      name: compName,
      country: "England",
      logo: compLogo,
      season: 2025,
      round: ev.seasonType?.name ?? "",
    },
    teams: {
      home: {
        id: espnTeamId(home.team.id),
        name: home.team.displayName,
        logo: home.team.logos?.[0]?.href ?? home.team.logo ?? "",
        winner: isFinished ? home.winner : null,
      },
      away: {
        id: espnTeamId(away.team.id),
        name: away.team.displayName,
        logo: away.team.logos?.[0]?.href ?? away.team.logo ?? "",
        winner: isFinished ? away.winner : null,
      },
    },
    goals: { home: hScore, away: aScore },
    score: {
      halftime: { home: null, away: null },
      fulltime: { home: hScore, away: aScore },
      extratime: { home: null, away: null },
      penalty: { home: null, away: null },
    },
  };
}

// ─── Scoreboard: fetch upcoming cup fixtures ESPN team schedule misses ────────

/** Build "YYYYMMDD-YYYYMMDD" date range from today to +90 days. */
function buildDateRange(): string {
  const now = new Date();
  const end = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
  return `${fmt(now)}-${fmt(end)}`;
}

interface EspnScoreboardResponse {
  events: EspnScheduleEvent[];
}

/** Fetch Liverpool cup fixtures from ESPN scoreboard (catches upcoming matches the team schedule misses). */
async function getEspnCupScoreboardFixtures(): Promise<Fixture[]> {
  const cupSlugs = ["eng.fa", "eng.league_cup"] as const;
  const dateRange = buildDateRange();
  const fixtures: Fixture[] = [];

  const results = await Promise.allSettled(
    cupSlugs.map((slug) =>
      espnFetch<EspnScoreboardResponse>(
        `${ESPN_BASE}/${slug}/scoreboard?dates=${dateRange}`,
        21600, // 6h
      )
    )
  );

  for (let i = 0; i < cupSlugs.length; i++) {
    const result = results[i];
    if (result.status !== "fulfilled") continue;
    const slug = cupSlugs[i];
    const compName = SLUG_COMP_NAME[slug] ?? slug;
    const compLogo = SLUG_COMP_LOGO[slug] ?? "";

    for (const ev of result.value.events) {
      // Only include events where Liverpool is a competitor
      const comp = ev.competitions[0];
      const teamIds = comp?.competitors?.map((c) => c.team?.id) ?? [];
      if (!teamIds.includes(ESPN_LFC_ID)) continue;

      const fixture = mapEspnEventToFixture(ev, compName, compLogo);
      if (fixture) fixtures.push(fixture);
    }
  }

  return fixtures;
}

// ─── Public: Fetch LFC cup fixtures from ESPN ────────────────────────────────

/** Fetch Liverpool fixtures for FA Cup & EFL Cup from ESPN. Free, no key. Cache 6h. */
export async function getEspnCupFixtures(): Promise<Fixture[]> {
  const cupSlugs = ["eng.fa", "eng.league_cup"] as const;
  const fixtures: Fixture[] = [];

  // Source 1: team schedule (reliable for past matches)
  const results = await Promise.allSettled(
    cupSlugs.map((slug) =>
      espnFetch<{ events: EspnScheduleEvent[] }>(
        `${ESPN_BASE}/${slug}/teams/${ESPN_LFC_ID}/schedule`,
        21600, // 6h
      )
    )
  );

  for (let i = 0; i < cupSlugs.length; i++) {
    const result = results[i];
    if (result.status !== "fulfilled") continue;
    const slug = cupSlugs[i];
    const compName = SLUG_COMP_NAME[slug] ?? slug;
    const compLogo = SLUG_COMP_LOGO[slug] ?? "";

    for (const ev of result.value.events) {
      const fixture = mapEspnEventToFixture(ev, compName, compLogo);
      if (fixture) fixtures.push(fixture);
    }
  }

  // Source 2: scoreboard (catches upcoming matches the team schedule misses)
  try {
    const scoreboardFixtures = await getEspnCupScoreboardFixtures();
    const existingIds = new Set(fixtures.map((f) => f.fixture.id));
    for (const sf of scoreboardFixtures) {
      if (!existingIds.has(sf.fixture.id)) {
        fixtures.push(sf);
      }
    }
  } catch (err) {
    console.error("[espn] scoreboard cup fixtures failed:", err);
  }

  return fixtures;
}

// ─── Position mapping: ESPN abbreviation → canonical pos ────────────────────

function mapEspnPosition(abbr: string | undefined): string {
  if (!abbr || abbr === "SUB") return "M"; // bench players have "SUB" — no specific position
  if (abbr === "G") return "G";
  if (abbr.includes("D") || abbr.includes("B")) return "D"; // D, CD, CB, LB, RB
  if (abbr.includes("M")) return "M"; // M, CM, CDM, CAM, LM, RM
  if (abbr.includes("F") || abbr.includes("W") || abbr === "ST") return "F"; // F, CF, FW, LW, RW, ST
  return "M"; // safe default
}

// ─── Public: Fetch match lineups from ESPN roster data ──────────────────────

/**
 * Fetch match lineups (formation, starting XI, bench, coach) from ESPN
 * for a Liverpool fixture. Uses the same summary endpoint already cached.
 */
export async function getEspnMatchLineups(fixtureDate: string): Promise<FixtureLineup[]> {
  try {
    const espnId = await resolveEspnId(fixtureDate);
    if (!espnId) return [];

    const summary = await fetchSummary(espnId);
    if (!summary?.rosters?.length) return [];

    return summary.rosters.filter((r) => r.roster?.length).map((r) => {
      const starters = r.roster.filter((p) => p.starter);
      const subs = r.roster.filter((p) => !p.starter);

      return {
        team: {
          id: espnTeamId(r.team.id),
          name: r.team.displayName,
          logo: r.team.logo ?? "",
          colors: null,
        },
        formation: r.formation ?? "",
        startXI: starters.map((p) => ({
          player: {
            id: parseInt(p.athlete.id, 10) || 0,
            name: p.athlete.displayName,
            number: parseInt(p.jersey, 10) || 0,
            pos: mapEspnPosition(p.position.abbreviation),
            grid: null,
          },
        })),
        substitutes: subs.map((p) => ({
          player: {
            id: parseInt(p.athlete.id, 10) || 0,
            name: p.athlete.displayName,
            number: parseInt(p.jersey, 10) || 0,
            pos: mapEspnPosition(p.position.abbreviation),
            grid: null,
          },
        })),
        coach: {
          id: 0,
          name: r.coach?.[0]?.displayName ?? "",
          photo: "",
        },
      };
    });
  } catch (err) {
    console.error("[espn] getEspnMatchLineups failed:", err);
    return [];
  }
}

// ─── Public: Fetch match detail (venue, attendance, referee, stats) ────────

export async function getEspnMatchDetail(fixtureDate: string): Promise<EspnMatchDetail | null> {
  try {
    const espnId = await resolveEspnId(fixtureDate);
    if (!espnId) return null;

    const summary = await fetchSummary(espnId);
    if (!summary) return null;

    const gi = summary.gameInfo;
    const venue = gi?.venue?.fullName ?? null;
    const attendance = gi?.attendance ?? null;
    const referee = gi?.officials?.[0]?.displayName ?? null;

    const stats: FixtureTeamStats[] = (summary.boxscore?.teams ?? []).map(mapEspnStats);

    return { venue, attendance, referee, stats };
  } catch (err) {
    console.error("[espn] getEspnMatchDetail failed:", err);
    return null;
  }
}
