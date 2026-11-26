import "server-only";

import { getServiceClient } from "@/lib/news/supabase-service";

/**
 * Fallback persistence in `site_settings` (`guest_predictions:<fixtureId>`)
 * when migration 014 has not yet dropped `match_predictions_user_id_fkey`.
 * Never stores raw cookie tokens, emails, or IP addresses — only the hashed
 * public actor UUID, optional display nickname, and scoreline.
 */
export const GUEST_PREDICTION_KEY_PREFIX = "guest_predictions:";

export interface GuestPredictionEntry {
  home: number;
  away: number;
  authorName: string | null;
  updatedAt: string;
}

export type GuestPredictionMap = Record<string, GuestPredictionEntry>;

export interface MergedPredictionRow {
  user_id: string;
  fixture_id: number;
  home_goals: number;
  away_goals: number;
  author_name: string | null;
}

function keyFor(fixtureId: number): string {
  return `${GUEST_PREDICTION_KEY_PREFIX}${fixtureId}`;
}

function isValidEntry(v: unknown): v is GuestPredictionEntry {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.home === "number" &&
    Number.isInteger(o.home) &&
    o.home >= 0 &&
    o.home <= 20 &&
    typeof o.away === "number" &&
    Number.isInteger(o.away) &&
    o.away >= 0 &&
    o.away <= 20
  );
}

function normalizeMap(raw: unknown): GuestPredictionMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: GuestPredictionMap = {};
  for (const [actorId, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!actorId || !isValidEntry(val)) continue;
    out[actorId] = {
      home: val.home,
      away: val.away,
      authorName: typeof val.authorName === "string" ? val.authorName : null,
      updatedAt: typeof val.updatedAt === "string" ? val.updatedAt : "",
    };
  }
  return out;
}

export async function readGuestFixturePredictions(
  fixtureId: number,
  options?: { bypassBreaker?: boolean },
): Promise<GuestPredictionMap> {
  try {
    const { data, error } = await getServiceClient(
      options?.bypassBreaker ? { timeoutMs: 8_000, bypassBreaker: true } : undefined,
    )
      .from("site_settings")
      .select("value")
      .eq("key", keyFor(fixtureId))
      .maybeSingle();
    if (error || !data) return {};
    return normalizeMap(data.value);
  } catch {
    return {};
  }
}

export async function readGuestPredictionsForFixtures(
  fixtureIds: number[],
): Promise<MergedPredictionRow[]> {
  if (fixtureIds.length === 0) return [];
  try {
    const keys = fixtureIds.map(keyFor);
    const { data, error } = await getServiceClient()
      .from("site_settings")
      .select("key, value")
      .in("key", keys);
    if (error || !data) return [];

    const rows: MergedPredictionRow[] = [];
    for (const item of data) {
      if (typeof item.key !== "string" || !item.key.startsWith(GUEST_PREDICTION_KEY_PREFIX)) {
        continue;
      }
      const fixtureId = Number(item.key.slice(GUEST_PREDICTION_KEY_PREFIX.length));
      if (!Number.isInteger(fixtureId) || fixtureId <= 0) continue;
      const map = normalizeMap(item.value);
      for (const [actorId, entry] of Object.entries(map)) {
        rows.push({
          user_id: actorId,
          fixture_id: fixtureId,
          home_goals: entry.home,
          away_goals: entry.away,
          author_name: entry.authorName,
        });
      }
    }
    return rows;
  } catch {
    return [];
  }
}

export async function saveGuestFixturePrediction(
  fixtureId: number,
  actorId: string,
  home: number,
  away: number,
  authorName: string | null,
): Promise<{ ok: boolean }> {
  try {
    const db = getServiceClient({ timeoutMs: 8_000, bypassBreaker: true });
    const existing = await readGuestFixturePredictions(fixtureId, { bypassBreaker: true });
    const next: GuestPredictionMap = {
      ...existing,
      [actorId]: {
        home,
        away,
        authorName,
        updatedAt: new Date().toISOString(),
      },
    };
    const { error } = await db.from("site_settings").upsert(
      {
        key: keyFor(fixtureId),
        value: next,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
    if (error) {
      console.error("[predictions] guest fallback save failed:", error.message);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error("[predictions] guest fallback save threw:", err);
    return { ok: false };
  }
}
