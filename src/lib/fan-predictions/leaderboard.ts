import "server-only";
import { unstable_cache } from "next/cache";
import { getFixtures } from "@/lib/football";
import { getServiceClient } from "@/lib/news/supabase-service";
import { EXACT_POINTS, predictionPoints } from "./scoring";

export interface LeaderboardRow {
  rank: number;
  name: string;
  points: number;
  exact: number;
  played: number;
}

const FINISHED = new Set(["FT", "AET", "PEN"]);

/**
 * This season's prediction table: points over finished matches, ties broken
 * by exact scores and then by fewer matches played. Cached for 10 minutes; a
 * database error throws (and so is not cached) for the page to report.
 */
export const getPredictionLeaderboard = unstable_cache(
  async (limit: number = 20): Promise<LeaderboardRow[]> => {
    const results = new Map<number, { home: number; away: number }>();
    for (const f of await getFixtures()) {
      if (FINISHED.has(f.fixture.status.short) && f.goals.home !== null && f.goals.away !== null) {
        results.set(f.fixture.id, { home: f.goals.home, away: f.goals.away });
      }
    }
    if (results.size === 0) return [];

    const db = getServiceClient();
    const { data, error } = await db
      .from("match_predictions")
      .select("user_id, fixture_id, home_goals, away_goals")
      .in("fixture_id", [...results.keys()]);
    if (error) throw error;

    const totals = new Map<string, { points: number; exact: number; played: number }>();
    for (const row of data ?? []) {
      const result = results.get(row.fixture_id);
      if (!result) continue;
      const pts = predictionPoints({ home: row.home_goals, away: row.away_goals }, result);
      const t = totals.get(row.user_id) ?? { points: 0, exact: 0, played: 0 };
      t.points += pts;
      t.exact += pts === EXACT_POINTS ? 1 : 0;
      t.played += 1;
      totals.set(row.user_id, t);
    }

    const top = [...totals.entries()]
      .sort(([, a], [, b]) => b.points - a.points || b.exact - a.exact || a.played - b.played)
      .slice(0, limit);
    if (top.length === 0) return [];

    const { data: profiles } = await db
      .from("user_profiles")
      .select("user_id, username")
      .in("user_id", top.map(([id]) => id));
    const names = new Map((profiles ?? []).map((p) => [p.user_id, p.username as string | null]));

    // No email or full id on a public page: a username, or "Fan" plus four characters of the id.
    return top.map(([id, t], i) => ({ rank: i + 1, name: names.get(id)?.trim() || `Fan ${id.slice(0, 4).toUpperCase()}`, ...t }));
  },
  ["prediction-leaderboard-v1"],
  { revalidate: 600 },
);

export interface PlayerFanRating {
  /** Mean of the per-match fan averages, one decimal. */
  average: number;
  matches: number;
  votes: number;
}

/** A player's fan rating this season: averaged per match, then across matches. Null when nobody has rated them. */
export const getPlayerFanRating = unstable_cache(
  async (playerName: string): Promise<PlayerFanRating | null> => {
    const { data, error } = await getServiceClient()
      .from("player_ratings")
      .select("fixture_id, rating")
      .eq("player_name", playerName);
    if (error) throw error;
    if (!data?.length) return null;
    const perMatch = new Map<number, { total: number; n: number }>();
    for (const r of data) {
      const m = perMatch.get(r.fixture_id) ?? { total: 0, n: 0 };
      m.total += r.rating;
      m.n += 1;
      perMatch.set(r.fixture_id, m);
    }
    const means = [...perMatch.values()].map((m) => m.total / m.n);
    const average = Math.round((means.reduce((a, b) => a + b, 0) / means.length) * 10) / 10;
    return { average, matches: means.length, votes: data.length };
  },
  ["player-fan-rating-v1"],
  { revalidate: 600 },
);
