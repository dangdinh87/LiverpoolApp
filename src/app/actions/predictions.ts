"use server";

/**
 * Fan predictions (score, before kick-off) and player ratings (1-10, after full
 * time). Every write is checked here — signed in, kick-off not yet passed, the
 * player really played — and then made with the service role; the tables have
 * no write policies of their own (supabase/migrations/012).
 *
 * When the tables are missing or the database is down, reads report
 * `available: false` and the cards hide themselves rather than error.
 */

import { getFixtureById, getFixtureEvents, getFixtureLineups } from "@/lib/football";
import { getServiceClient } from "@/lib/news/supabase-service";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { summarisePredictions, type CommunityPrediction, type Score } from "@/lib/fan-predictions/scoring";
import type { Fixture } from "@/lib/types/football";

const LFC_ID = 40;
const FINISHED = new Set(["FT", "AET", "PEN"]);
/** Ratings stay open for a week after the match. */
const RATING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_GOALS = 20;

export type PredictionWriteError = "signIn" | "closed" | "invalid" | "unavailable";

async function currentUserId(): Promise<string | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

/** Open until kick-off, and never for a match that is postponed or already under way. */
function predictionsOpen(f: Fixture, now: number): boolean {
  return f.fixture.status.short === "NS" && new Date(f.fixture.date).getTime() > now;
}

// ─── Predictions ────────────────────────────────────────────────────────────

export interface PredictionState {
  available: boolean;
  signedIn: boolean;
  open: boolean;
  mine: Score | null;
  community: CommunityPrediction;
}

const EMPTY_COMMUNITY: CommunityPrediction = { count: 0, split: { home: 0, draw: 0, away: 0 }, topScores: [] };

export async function getPredictionState(fixtureId: number): Promise<PredictionState> {
  const [fixture, userId] = await Promise.all([getFixtureById(fixtureId), currentUserId()]);
  const base = { available: false, signedIn: !!userId, open: false, mine: null, community: EMPTY_COMMUNITY };
  if (!fixture) return base;
  try {
    const { data, error } = await getServiceClient()
      .from("match_predictions")
      .select("user_id, home_goals, away_goals")
      .eq("fixture_id", fixtureId);
    if (error) throw error;
    const rows = data ?? [];
    const own = userId ? rows.find((r) => r.user_id === userId) : undefined;
    return {
      available: true,
      signedIn: !!userId,
      open: predictionsOpen(fixture, Date.now()),
      mine: own ? { home: own.home_goals, away: own.away_goals } : null,
      community: summarisePredictions(rows.map((r) => ({ home: r.home_goals, away: r.away_goals }))),
    };
  } catch (err) {
    console.error("[predictions] read failed:", err);
    return base;
  }
}

export async function savePrediction(
  fixtureId: number,
  home: number,
  away: number,
): Promise<{ ok: true } | { ok: false; error: PredictionWriteError }> {
  const valid = (n: number) => Number.isInteger(n) && n >= 0 && n <= MAX_GOALS;
  if (!valid(home) || !valid(away)) return { ok: false, error: "invalid" };

  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "signIn" };

  const fixture = await getFixtureById(fixtureId);
  if (!fixture || !predictionsOpen(fixture, Date.now())) return { ok: false, error: "closed" };

  const { error } = await getServiceClient()
    .from("match_predictions")
    .upsert(
      { user_id: userId, fixture_id: fixtureId, home_goals: home, away_goals: away, updated_at: new Date().toISOString() },
      { onConflict: "user_id,fixture_id" },
    );
  if (error) {
    console.error("[predictions] save failed:", error);
    return { ok: false, error: "unavailable" };
  }
  return { ok: true };
}

// ─── Player ratings ─────────────────────────────────────────────────────────

export interface RatedPlayer {
  name: string;
  number: number;
  pos: string;
  /** Fans' average so far (one decimal) and how many rated. */
  average: number | null;
  votes: number;
}

export interface RatingsState {
  available: boolean;
  signedIn: boolean;
  open: boolean;
  players: RatedPlayer[];
  mine: Record<string, number>;
}

/** Liverpool's starters plus the substitutes who came on. */
async function liverpoolPlayers(f: Fixture): Promise<{ name: string; number: number; pos: string }[]> {
  const [lineups, events] = await Promise.all([
    getFixtureLineups(f.fixture.id, f.fixture.date),
    getFixtureEvents(f.fixture.id, f.fixture.date),
  ]);
  const lfc = lineups.find((l) => l.team.id === LFC_ID);
  if (!lfc) return [];
  const starters = lfc.startXI.map(({ player }) => player);
  const starterNames = new Set(starters.map((p) => p.name));
  const subNames = new Set(events.filter((e) => e.type === "subst").map((e) => e.player.name));
  const cameOn = lfc.substitutes.map(({ player }) => player).filter((p) => subNames.has(p.name) && !starterNames.has(p.name));
  return [...starters, ...cameOn].map((p) => ({ name: p.name, number: p.number, pos: p.pos }));
}

function ratingsOpen(f: Fixture, now: number): boolean {
  return FINISHED.has(f.fixture.status.short) && now - new Date(f.fixture.date).getTime() < RATING_WINDOW_MS;
}

export async function getRatingsState(fixtureId: number): Promise<RatingsState> {
  const [fixture, userId] = await Promise.all([getFixtureById(fixtureId), currentUserId()]);
  const base = { available: false, signedIn: !!userId, open: false, players: [], mine: {} };
  if (!fixture || !FINISHED.has(fixture.fixture.status.short)) return base;
  try {
    const [players, { data, error }] = await Promise.all([
      liverpoolPlayers(fixture),
      getServiceClient().from("player_ratings").select("user_id, player_name, rating").eq("fixture_id", fixtureId),
    ]);
    if (error) throw error;
    if (players.length === 0) return base;
    const rows = data ?? [];
    const sums = new Map<string, { total: number; n: number }>();
    const mine: Record<string, number> = {};
    for (const r of rows) {
      const s = sums.get(r.player_name) ?? { total: 0, n: 0 };
      s.total += r.rating;
      s.n += 1;
      sums.set(r.player_name, s);
      if (r.user_id === userId) mine[r.player_name] = r.rating;
    }
    return {
      available: true,
      signedIn: !!userId,
      open: ratingsOpen(fixture, Date.now()),
      mine,
      players: players.map((p) => {
        const s = sums.get(p.name);
        return { ...p, average: s ? Math.round((s.total / s.n) * 10) / 10 : null, votes: s?.n ?? 0 };
      }),
    };
  } catch (err) {
    console.error("[ratings] read failed:", err);
    return base;
  }
}

export async function saveRatings(
  fixtureId: number,
  ratings: Record<string, number>,
): Promise<{ ok: true } | { ok: false; error: PredictionWriteError }> {
  const entries = Object.entries(ratings);
  if (entries.length === 0 || entries.some(([, r]) => !Number.isInteger(r) || r < 1 || r > 10)) {
    return { ok: false, error: "invalid" };
  }

  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "signIn" };

  const fixture = await getFixtureById(fixtureId);
  if (!fixture || !ratingsOpen(fixture, Date.now())) return { ok: false, error: "closed" };

  const allowed = new Set((await liverpoolPlayers(fixture)).map((p) => p.name));
  if (entries.some(([name]) => !allowed.has(name))) return { ok: false, error: "invalid" };

  const now = new Date().toISOString();
  const { error } = await getServiceClient()
    .from("player_ratings")
    .upsert(
      entries.map(([player_name, rating]) => ({ user_id: userId, fixture_id: fixtureId, player_name, rating, updated_at: now })),
      { onConflict: "user_id,fixture_id,player_name" },
    );
  if (error) {
    console.error("[ratings] save failed:", error);
    return { ok: false, error: "unavailable" };
  }
  return { ok: true };
}
