import "server-only";
import { unstable_cache } from "next/cache";

/**
 * Busted by the write actions in app/actions/predictions.ts. Without it a
 * reader saw their own prediction only after the cache window below, which
 * reads as the vote not having registered.
 */
export const FAN_PREDICTIONS_CACHE_TAG = "fan-predictions";
import { readGuestPredictionsForFixtures, type MergedPredictionRow } from "@/lib/fan-predictions/guest-store";
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

async function fetchPredictionRows(fixtureIds: number[]): Promise<MergedPredictionRow[]> {
  const db = getServiceClient();
  const [{ data, error }, guestRows] = await Promise.all([
    db
      .from("match_predictions")
      .select("user_id, fixture_id, home_goals, away_goals, author_name")
      .in("fixture_id", fixtureIds),
    readGuestPredictionsForFixtures(fixtureIds),
  ]);

  let primaryRows: MergedPredictionRow[] = [];
  if (error) {
    // Pre-migration 014 schema may not have `author_name`.
    const missingAuthorName =
      error.code === "42703" ||
      error.code === "PGRST204" ||
      (typeof error.message === "string" && error.message.includes("author_name"));
    if (!missingAuthorName) throw error;

    const fallback = await db
      .from("match_predictions")
      .select("user_id, fixture_id, home_goals, away_goals")
      .in("fixture_id", fixtureIds);
    if (fallback.error) throw fallback.error;
    primaryRows = (fallback.data ?? []).map((r) => ({
      ...r,
      author_name: null,
    }));
  } else {
    primaryRows = (data ?? []).map((r) => ({
      user_id: r.user_id,
      fixture_id: r.fixture_id,
      home_goals: r.home_goals,
      away_goals: r.away_goals,
      author_name: (r as { author_name?: string | null }).author_name ?? null,
    }));
  }

  // Merge by (user_id, fixture_id); primary match_predictions wins on collision.
  const merged = new Map<string, MergedPredictionRow>();
  for (const row of guestRows) {
    merged.set(`${row.user_id}:${row.fixture_id}`, row);
  }
  for (const row of primaryRows) {
    merged.set(`${row.user_id}:${row.fixture_id}`, row);
  }
  return [...merged.values()];
}

/**
 * This season's prediction table: points over finished matches, ties broken
 * by exact scores and then by fewer matches played. Cached for 1 hour; a
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

    const rows = await fetchPredictionRows([...results.keys()]);
    const db = getServiceClient();

    const totals = new Map<string, { points: number; exact: number; played: number }>();
    const authorNames = new Map<string, string>();
    for (const row of rows) {
      const result = results.get(row.fixture_id);
      if (!result) continue;
      const pts = predictionPoints({ home: row.home_goals, away: row.away_goals }, result);
      const t = totals.get(row.user_id) ?? { points: 0, exact: 0, played: 0 };
      t.points += pts;
      t.exact += pts === EXACT_POINTS ? 1 : 0;
      t.played += 1;
      totals.set(row.user_id, t);
      if (row.author_name?.trim()) {
        authorNames.set(row.user_id, row.author_name.trim());
      }
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

    // No email or full id on a public page: profile username, guest nickname, or "Fan XXXX".
    return top.map(([id, t], i) => ({
      rank: i + 1,
      name: names.get(id)?.trim() || authorNames.get(id) || `Fan ${id.slice(0, 4).toUpperCase()}`,
      ...t,
    }));
  },
  ["prediction-leaderboard-v1"],
  { revalidate: 3600, tags: [FAN_PREDICTIONS_CACHE_TAG] },
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
  // Matches the player page's 6h ISR window so it never clamps that page;
  // saving a rating busts the tag and the page anyway.
  { revalidate: 21600, tags: [FAN_PREDICTIONS_CACHE_TAG] },
);
