"use server";

/**
 * Fan predictions (score before kick-off — open to everyone, guest or signed-in)
 * and player ratings (1-10 after full time — signed-in members). Every write is
 * checked server-side and made with the service role; match_predictions and
 * player_ratings have no client write policies (supabase/migrations/012 & 014).
 *
 * When migration 014 has not yet dropped `match_predictions_user_id_fkey`, guest
 * predictions fall back transparently to `site_settings` (`guest_predictions:*`)
 * keyed by the caller's SHA-256 cookie actor UUID.
 */

import { updateTag } from "next/cache";
import { headers } from "next/headers";
import { revalidateLocalizedPath } from "@/i18n/revalidate";
import { ensureWritableActor, readCurrentActor } from "@/lib/community/guest-identity";
import { moderateDisplayName } from "@/lib/community/moderation";
import {
  readGuestFixturePredictions,
  saveGuestFixturePrediction,
} from "@/lib/fan-predictions/guest-store";
import { FAN_PREDICTIONS_CACHE_TAG } from "@/lib/fan-predictions/leaderboard";
import { summarisePredictions, type CommunityPrediction, type Score } from "@/lib/fan-predictions/scoring";
import { getFixtureById, getFixtureEvents, getFixtureLineups } from "@/lib/football";
import { getServiceClient } from "@/lib/news/supabase-service";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { getPlayerSlugByName } from "@/lib/squad-data";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { Fixture } from "@/lib/types/football";

const LFC_ID = 40;
const FINISHED = new Set(["FT", "AET", "PEN"]);
/** Ratings stay open for a week after the match. */
const RATING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_GOALS = 20;

export type PredictionWriteError = "signIn" | "closed" | "invalid" | "profanity" | "rateLimited" | "unavailable";

async function currentAuth(): Promise<{ ok: true; userId: string | null } | { ok: false }> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.getUser();
    if (error && (error.status === undefined || error.status === 0 || error.status >= 500)) {
      return { ok: false };
    }
    return { ok: true, userId: data.user?.id ?? null };
  } catch {
    return { ok: false };
  }
}

async function currentUserId(): Promise<string | null> {
  const auth = await currentAuth();
  return auth.ok ? auth.userId : null;
}

async function requestIp(): Promise<string> {
  try {
    const hdrs = await headers();
    return getClientIP({ headers: hdrs });
  } catch {
    return "unknown";
  }
}

function isMissingColumnError(err: { code?: string; message?: string } | null | undefined, col: string): boolean {
  if (!err) return false;
  return (
    err.code === "42703" ||
    err.code === "PGRST204" ||
    (typeof err.message === "string" && err.message.includes(col))
  );
}

function isForeignKeyError(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  return (
    err.code === "23503" ||
    (typeof err.message === "string" && err.message.toLowerCase().includes("foreign key"))
  );
}

/** Open until kick-off, and never for a match that is postponed or already under way. */
function predictionsOpen(f: Fixture, now: number): boolean {
  return f.fixture.status.short === "NS" && new Date(f.fixture.date).getTime() > now;
}

// ─── Predictions ────────────────────────────────────────────────────────────

export interface PredictionState {
  available: boolean;
  signedIn: boolean;
  displayName: string | null;
  open: boolean;
  mine: Score | null;
  community: CommunityPrediction;
}

const EMPTY_COMMUNITY: CommunityPrediction = { count: 0, split: { home: 0, draw: 0, away: 0 }, topScores: [] };

function isValidFixtureId(id: unknown): id is number {
  return typeof id === "number" && Number.isInteger(id) && id > 0;
}

export async function getPredictionState(fixtureId: number): Promise<PredictionState> {
  const empty: PredictionState = {
    available: false,
    signedIn: false,
    displayName: null,
    open: false,
    mine: null,
    community: EMPTY_COMMUNITY,
  };
  if (!isValidFixtureId(fixtureId)) return empty;

  const [fixture, actor] = await Promise.all([getFixtureById(fixtureId), readCurrentActor()]);
  const base: PredictionState = {
    ...empty,
    signedIn: Boolean(actor?.isMember),
    displayName: actor?.username ?? null,
  };
  if (!fixture) return base;

  try {
    const db = getServiceClient();
    const [{ data, error }, guestMap] = await Promise.all([
      db
        .from("match_predictions")
        .select("user_id, home_goals, away_goals")
        .eq("fixture_id", fixtureId),
      readGuestFixturePredictions(fixtureId),
    ]);
    if (error) throw error;

    const byActor = new Map<string, Score>();
    for (const [guestId, entry] of Object.entries(guestMap)) {
      byActor.set(guestId, { home: entry.home, away: entry.away });
    }
    for (const row of data ?? []) {
      byActor.set(row.user_id, { home: row.home_goals, away: row.away_goals });
    }

    const mine = actor ? (byActor.get(actor.actorId) ?? null) : null;
    return {
      available: true,
      signedIn: Boolean(actor?.isMember),
      displayName: actor?.username ?? null,
      open: predictionsOpen(fixture, Date.now()),
      mine,
      community: summarisePredictions([...byActor.values()]),
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
  guestName?: string,
): Promise<{ ok: true } | { ok: false; error: PredictionWriteError }> {
  const valid = (n: number) => typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= MAX_GOALS;
  if (!isValidFixtureId(fixtureId) || !valid(home) || !valid(away)) {
    return { ok: false, error: "invalid" };
  }

  const nameCheck = moderateDisplayName(guestName);
  if (!nameCheck.ok) {
    return { ok: false, error: "profanity" };
  }

  const ip = await requestIp();
  if (!checkRateLimit(`predict:${ip}`, 20, 600_000).allowed) {
    return { ok: false, error: "rateLimited" };
  }

  const fixture = await getFixtureById(fixtureId);
  if (!fixture || !predictionsOpen(fixture, Date.now())) {
    return { ok: false, error: "closed" };
  }

  let actor;
  try {
    actor = await ensureWritableActor(nameCheck.name ?? undefined);
  } catch (err) {
    console.error("[predictions] actor init failed:", err);
    return { ok: false, error: "unavailable" };
  }

  const nowIso = new Date().toISOString();

  try {
    const db = getServiceClient();
    const baseRow = {
      user_id: actor.actorId,
      fixture_id: fixtureId,
      home_goals: home,
      away_goals: away,
      updated_at: nowIso,
    };

    let { error } = await db
      .from("match_predictions")
      .upsert(
        { ...baseRow, author_name: actor.username },
        { onConflict: "user_id,fixture_id" },
      );

    // Pre-migration 014 compatibility: table might lack `author_name` or keep auth.users FK.
    if (error && isMissingColumnError(error, "author_name")) {
      const retry = await db
        .from("match_predictions")
        .upsert(baseRow, { onConflict: "user_id,fixture_id" });
      error = retry.error;
    }

    if (error && isForeignKeyError(error)) {
      const fallback = await saveGuestFixturePrediction(
        fixtureId,
        actor.actorId,
        home,
        away,
        actor.username,
      );
      if (!fallback.ok) {
        return { ok: false, error: "unavailable" };
      }
      error = null;
    }

    if (error) {
      console.error("[predictions] save failed:", error);
      return { ok: false, error: "unavailable" };
    }
  } catch (err) {
    console.error("[predictions] save threw:", err);
    return { ok: false, error: "unavailable" };
  }

  // Bust both the leaderboard cache and localized /predictions & fixture pages.
  updateTag(FAN_PREDICTIONS_CACHE_TAG);
  revalidateLocalizedPath("/predictions");
  revalidateLocalizedPath(`/fixtures/${fixtureId}`);
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
  if (!isValidFixtureId(fixtureId)) {
    return { available: false, signedIn: false, open: false, players: [], mine: {} };
  }
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
  if (!isValidFixtureId(fixtureId) || !ratings || typeof ratings !== "object" || Array.isArray(ratings)) {
    return { ok: false, error: "invalid" };
  }
  const entries = Object.entries(ratings);
  if (
    entries.length === 0 ||
    entries.length > 30 ||
    entries.some(([name, r]) => !name || typeof r !== "number" || !Number.isInteger(r) || r < 1 || r > 10)
  ) {
    return { ok: false, error: "invalid" };
  }

  const auth = await currentAuth();
  if (!auth.ok) return { ok: false, error: "unavailable" };
  const userId = auth.userId;
  if (!userId) return { ok: false, error: "signIn" };

  const fixture = await getFixtureById(fixtureId);
  if (!fixture || !ratingsOpen(fixture, Date.now())) return { ok: false, error: "closed" };

  const allowed = new Set((await liverpoolPlayers(fixture)).map((p) => p.name));
  if (entries.some(([name]) => !allowed.has(name))) return { ok: false, error: "invalid" };

  try {
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
  } catch (err) {
    console.error("[ratings] save threw:", err);
    return { ok: false, error: "unavailable" };
  }
  updateTag(FAN_PREDICTIONS_CACHE_TAG);
  for (const name of Object.keys(ratings)) {
    const slug = getPlayerSlugByName(name);
    if (slug) revalidateLocalizedPath(`/player/${slug}`);
  }
  return { ok: true };
}
