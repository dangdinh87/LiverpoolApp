import { getServiceClient } from "@/lib/news/supabase-service";

/**
 * Runtime-configurable AI model chains per feature slot (`ai_model_settings`).
 *
 * Defaults live in code (`ai-model-slots.ts`) and are used whenever no row
 * exists, the table is not yet migrated, or Supabase is unreachable. Reading
 * settings must NEVER break an AI call.
 */

export type AiModelSlot = "digest" | "translate" | "site_articles" | "assistant";

const CACHE_TTL_MS = 60_000;

let cache: { at: number; rows: Map<string, string[]> } | null = null;
let inflight: Promise<Map<string, string[]>> | null = null;

async function loadAll(): Promise<Map<string, string[]>> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.rows;
  inflight ??= (async () => {
    try {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from("ai_model_settings")
        .select("slot, models");
      if (error) throw error;

      const map = new Map<string, string[]>();
      for (const row of (data ?? []) as Array<{
        slot: string;
        models: string[];
      }>) {
        if (typeof row.slot === "string" && Array.isArray(row.models)) {
          map.set(row.slot, row.models);
        }
      }
      cache = { at: Date.now(), rows: map };
      return map;
    } catch (err) {
      console.warn(
        "[model-settings] failed to load overrides, using code defaults:",
        err,
      );
      return cache?.rows ?? new Map();
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Deduplicated model chain for `slot`; falls back to `defaults` if empty/unset. */
export async function getModelChain(
  slot: AiModelSlot,
  defaults: readonly string[],
): Promise<string[]> {
  const configured = (await loadAll()).get(slot);
  const chain = (configured ?? []).map((id) => id.trim()).filter(Boolean);
  const resolved = chain.length > 0 ? chain : defaults;
  return [...new Set(resolved.map((id) => id.trim()).filter(Boolean))];
}

/** Persist an ordered model chain (1–5 IDs) for `slot` and bust module cache. */
export async function saveModelChain(
  slot: AiModelSlot,
  models: readonly string[],
  updatedBy?: string,
): Promise<void> {
  const clean = [...new Set(models.map((m) => m.trim()).filter(Boolean))];
  if (clean.length < 1 || clean.length > 5) {
    throw new Error("models must contain between 1 and 5 valid model IDs");
  }

  const supabase = getServiceClient();
  const { error } = await supabase.from("ai_model_settings").upsert(
    {
      slot,
      models: clean,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy ?? null,
    },
    { onConflict: "slot" },
  );
  if (error) throw error;
  cache = null;
}

/** Reset the in-memory settings cache (for unit tests). */
export function resetModelSettingsCache(): void {
  cache = null;
  inflight = null;
}
