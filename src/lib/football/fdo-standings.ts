// Football-Data.org v4 — standings only.
// Free tier: 10 req/min, PL included. Requires API key via FOOTBALL_DATA_ORG_KEY env var.
// Returns real W/D/L/GF/GA/form data (FPL teams have zeros for these fields).

import "server-only";
import type { Standing, StandingRecord } from "@/lib/types/football";
import { derivePLFormMap } from "./fdo-matches";

const FDO_BASE = "https://api.football-data.org/v4";
const FETCH_TIMEOUT_MS = 10_000;

// ─── Football-Data.org response shapes ──────────────────────────────────────

interface FdoTeam {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
}

interface FdoTableEntry {
  position: number;
  team: FdoTeam;
  playedGames: number;
  form: string | null; // "W,D,W,L,W"
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

interface FdoStandingsGroup {
  stage: string;
  type: "TOTAL" | "HOME" | "AWAY";
  table: FdoTableEntry[];
}

interface FdoStandingsResponse {
  competition: { id: number; name: string };
  season: { id: number; startDate: string; endDate: string };
  standings: FdoStandingsGroup[];
}

// ─── Team ID mapping (FDO → canonical) ──────────────────────────────────────

// Football-Data.org uses different team IDs. Map Liverpool specifically.
const FDO_LFC_ID = 64;
const CANONICAL_LFC_ID = 40;

// ─── Fetcher ────────────────────────────────────────────────────────────────

async function fdoFetch<T>(path: string, revalidate: number): Promise<T> {
  const key = process.env.FOOTBALL_DATA_ORG_KEY;
  if (!key) throw new Error("[fdo] FOOTBALL_DATA_ORG_KEY not set");

  const res = await fetch(`${FDO_BASE}${path}`, {
    headers: { "X-Auth-Token": key },
    next: { revalidate },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`[fdo] HTTP ${res.status} on ${path}`);
  }

  return res.json();
}

// ─── Mappers ────────────────────────────────────────────────────────────────

function mapRecord(e: FdoTableEntry): StandingRecord {
  return {
    played: e.playedGames,
    win: e.won,
    draw: e.draw,
    lose: e.lost,
    goals: { for: e.goalsFor, against: e.goalsAgainst },
  };
}

function mapTeamId(fdoId: number): number {
  return fdoId === FDO_LFC_ID ? CANONICAL_LFC_ID : fdoId;
}

// Normalize form "W,D,W,L,W" → "WDWLW"
function normalizeForm(form: string | null): string | null {
  if (!form) return null;
  return form.replace(/,/g, "");
}

function mapEntry(
  total: FdoTableEntry,
  homeMap: Map<number, FdoTableEntry>,
  awayMap: Map<number, FdoTableEntry>,
  formMap: Map<number, string>,
): Standing {
  const home = homeMap.get(total.team.id);
  const away = awayMap.get(total.team.id);
  const canonicalId = mapTeamId(total.team.id);

  return {
    rank: total.position,
    team: {
      id: canonicalId,
      name: total.team.name,
      logo: total.team.crest,
    },
    points: total.points,
    goalsDiff: total.goalDifference,
    group: null,
    form: normalizeForm(total.form) ?? formMap.get(canonicalId) ?? null,
    status: null,
    description: null,
    all: mapRecord(total),
    home: home ? mapRecord(home) : mapRecord(total),
    away: away ? mapRecord(away) : mapRecord(total),
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** Fetch PL standings from Football-Data.org. Cache 6h (standings don't change often). */
export async function getFdoStandings(): Promise<Standing[]> {
  const [data, formMap] = await Promise.all([
    fdoFetch<FdoStandingsResponse>("/competitions/PL/standings", 21600),
    derivePLFormMap().catch(() => new Map<number, string>()),
  ]);

  const totalGroup = data.standings.find((s) => s.type === "TOTAL");
  const homeGroup = data.standings.find((s) => s.type === "HOME");
  const awayGroup = data.standings.find((s) => s.type === "AWAY");

  if (!totalGroup) return [];

  const homeMap = new Map<number, FdoTableEntry>();
  const awayMap = new Map<number, FdoTableEntry>();

  for (const e of homeGroup?.table ?? []) homeMap.set(e.team.id, e);
  for (const e of awayGroup?.table ?? []) awayMap.set(e.team.id, e);

  return totalGroup.table.map((e) => mapEntry(e, homeMap, awayMap, formMap));
}

/** Fetch UCL league-phase standings from Football-Data.org. Cache 6h. */
export async function getFdoUclStandings(): Promise<Standing[]> {
  const data = await fdoFetch<FdoStandingsResponse>(
    "/competitions/CL/standings",
    21600
  );

  const totalGroup = data.standings.find((s) => s.type === "TOTAL");
  const homeGroup = data.standings.find((s) => s.type === "HOME");
  const awayGroup = data.standings.find((s) => s.type === "AWAY");

  if (!totalGroup) return [];

  const homeMap = new Map<number, FdoTableEntry>();
  const awayMap = new Map<number, FdoTableEntry>();
  const emptyFormMap = new Map<number, string>();

  for (const e of homeGroup?.table ?? []) homeMap.set(e.team.id, e);
  for (const e of awayGroup?.table ?? []) awayMap.set(e.team.id, e);

  return totalGroup.table.map((e) =>
    mapEntry(e, homeMap, awayMap, emptyFormMap)
  );
}
