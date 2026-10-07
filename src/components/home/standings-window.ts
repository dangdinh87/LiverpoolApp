import type { Standing } from "@/lib/types/football";

const LFC_TEAM_ID = 40;

/** Rows kept above and below Liverpool so the position always has context. */
const NEIGHBOURS = 2;

/** Liverpool's row ±2 neighbours, clamped to the table; top 5 when Liverpool is absent. */
export function pickStandingsWindow(standings: Standing[]): Standing[] {
  const total = NEIGHBOURS * 2 + 1;
  const idx = standings.findIndex((s) => s.team.id === LFC_TEAM_ID);
  if (idx === -1) return standings.slice(0, total);
  const start = Math.max(0, Math.min(idx - NEIGHBOURS, standings.length - total));
  return standings.slice(start, start + total);
}
