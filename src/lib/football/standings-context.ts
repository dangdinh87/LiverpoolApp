import type { Standing } from "@/lib/types/football";

/** Premier League places: top four into the Champions League, bottom three relegated. */
export const UCL_PLACES = 4;
export const RELEGATION_PLACES = 3;

export interface StandingsContext {
  rank: number;
  points: number;
  /** Points behind the leader (0 when top). */
  behindLeader: number;
  /** Inside the top four: points clear of fifth. Outside: points behind fourth. */
  topFour: { inside: boolean; gap: number };
  /** Points clear of the relegation zone. */
  aboveDrop: number;
  opponent: { name: string; rank: number; points: number } | null;
}

/**
 * Liverpool's place in the table in the terms fans talk about: how far off the
 * top, the top four and the drop, and where the next opponent sits. Null when
 * the table has no Liverpool row (off-season, provider down).
 */
export function standingsContext(table: Standing[], teamId: number, opponentId?: number): StandingsContext | null {
  const sorted = [...table].sort((a, b) => a.rank - b.rank);
  const row = sorted.find((s) => s.team.id === teamId);
  if (!row || sorted.length === 0) return null;
  const pointsAt = (rank: number) => sorted.find((s) => s.rank === rank)?.points ?? 0;
  const firstDrop = sorted.length - RELEGATION_PLACES + 1;
  const opp = opponentId ? sorted.find((s) => s.team.id === opponentId) : undefined;
  return {
    rank: row.rank,
    points: row.points,
    behindLeader: sorted[0].points - row.points,
    topFour:
      row.rank <= UCL_PLACES
        ? { inside: true, gap: row.points - pointsAt(UCL_PLACES + 1) }
        : { inside: false, gap: pointsAt(UCL_PLACES) - row.points },
    aboveDrop: row.points - pointsAt(firstDrop),
    opponent: opp ? { name: opp.team.name, rank: opp.rank, points: opp.points } : null,
  };
}
