import { NextResponse } from "next/server";
import { withCronAuth } from "@/lib/cron";
import {
  MODEL_ID,
  getAiModelSlots,
  knownModels,
  slotInfo,
} from "@/lib/ai/ai-model-slots";
import { checkModel } from "@/lib/ai/check-model";
import { getModelChain, saveModelChain } from "@/lib/ai/model-settings";
import { getProviderStatus } from "@/lib/ai/providers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * GET /api/internal/ai-models
 *   Returns slot definitions, active model chains, provider availability, and known pricing.
 *
 * POST /api/internal/ai-models
 *   Body: `{ slot, models: string[], save?: boolean }`.
 *   Runs live capability checks using the worker's own credentials and optionally
 *   persists the validated chain to `ai_model_settings` when `save: true`.
 */
export const GET = withCronAuth(async () => {
  const slots = await Promise.all(
    getAiModelSlots().map(async (s) => ({
      ...s,
      active: await getModelChain(s.slot, s.defaults),
    })),
  );
  return NextResponse.json(
    {
      ok: true,
      slots,
      providers: getProviderStatus(),
      models: knownModels(),
    },
    { headers: NO_STORE },
  );
});

export const POST = withCronAuth(async (req) => {
  let body: { slot?: unknown; models?: unknown; save?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400, headers: NO_STORE },
    );
  }

  const info = typeof body.slot === "string" ? slotInfo(body.slot) : undefined;
  if (!info) {
    return NextResponse.json(
      { ok: false, error: "Unknown slot" },
      { status: 400, headers: NO_STORE },
    );
  }

  const rawModels = Array.isArray(body.models) ? body.models : [];
  const allStringsValid =
    rawModels.length > 0 &&
    rawModels.every(
      (m): m is string => typeof m === "string" && MODEL_ID.test(m.trim()),
    );
  const models = allStringsValid
    ? [...new Set(rawModels.map((m) => m.trim()))]
    : [];

  if (!allStringsValid || models.length < 1 || models.length > 5) {
    return NextResponse.json(
      { ok: false, error: "models must contain 1-5 valid model IDs" },
      { status: 400, headers: NO_STORE },
    );
  }

  const results = await Promise.all(
    models.map((m) => checkModel(m, info.checks)),
  );
  const allOk = results.every((r) => r.ok);

  if (body.save === true) {
    if (!allOk) {
      return NextResponse.json(
        { ok: false, saved: false, results },
        { status: 422, headers: NO_STORE },
      );
    }
    try {
      await saveModelChain(info.slot, models, "internal-api");
      return NextResponse.json(
        { ok: true, saved: true, results },
        { headers: NO_STORE },
      );
    } catch (err) {
      console.error("[internal/ai-models] Failed to save model chain:", err);
      return NextResponse.json(
        { ok: false, saved: false, error: "Failed to save model chain" },
        { status: 500, headers: NO_STORE },
      );
    }
  }

  return NextResponse.json(
    { ok: allOk, saved: false, results },
    { headers: NO_STORE },
  );
});
