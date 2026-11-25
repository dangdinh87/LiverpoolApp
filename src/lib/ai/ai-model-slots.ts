import { getEnv } from "@/lib/env";
import type { AiModelSlot } from "./model-settings";
import { PRICE_CR_PER_1M } from "./vietapi-pricing";

export type AiModelCheck = "vietnamese" | "english" | "json" | "tools";

export interface AiModelSlotInfo {
  slot: AiModelSlot;
  feature: string;
  checks: AiModelCheck[];
  defaults: string[];
  note: string;
}

const SLOT_ENV_KEYS: Record<AiModelSlot, string> = {
  digest: "AI_MODEL_DIGEST",
  translate: "AI_MODEL_TRANSLATE",
  site_articles: "AI_MODEL_SITE_ARTICLES",
  assistant: "AI_MODEL_ASSISTANT",
};

const BUILTIN_DEFAULTS: Record<AiModelSlot, readonly string[]> = {
  digest: ["deepseek-v4-flash", "deepseek-v4-pro", "claude-sonnet-5"],
  translate: ["deepseek-v4-flash", "deepseek-v4-pro", "claude-sonnet-5"],
  site_articles: ["deepseek-v4-pro", "deepseek-v4-flash", "claude-sonnet-5"],
  assistant: ["deepseek-v4-flash", "deepseek-v4-pro", "qwen-3.8-max"],
};

/**
 * Default model chain for a slot, prepending any optional env override
 * (`AI_MODEL_DIGEST`, `AI_MODEL_TRANSLATE`, `AI_MODEL_SITE_ARTICLES`) read lazily.
 */
export function getDefaultSlotModels(slot: AiModelSlot): string[] {
  const rawOverride = getEnv(SLOT_ENV_KEYS[slot]);
  const envModels = rawOverride
    ? rawOverride
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
    : [];
  return [...new Set([...envModels, ...BUILTIN_DEFAULTS[slot]])];
}

/** Metadata and capability checks required for every AI feature slot. */
export function getAiModelSlots(): AiModelSlotInfo[] {
  return [
    {
      slot: "digest",
      feature: "Daily Briefing & SEO Article",
      checks: ["english", "json"],
      defaults: getDefaultSlotModels("digest"),
      note: "Runs two parallel JSON generations (briefing + SEO piece) within a 55s cron budget.",
    },
    {
      slot: "translate",
      feature: "On-Demand EN→VI Article Translation",
      checks: ["vietnamese"],
      defaults: getDefaultSlotModels("translate"),
      note: "Translates English football journalism into natural Vietnamese with diacritics and zero foreign script.",
    },
    {
      slot: "site_articles",
      feature: "Fact-Validated Match Previews & Reviews",
      checks: ["english", "vietnamese", "json"],
      defaults: getDefaultSlotModels("site_articles"),
      note: "Generates bilingual EN + VI structured JSON drafts from verified match facts before validation.",
    },
    {
      slot: "assistant",
      feature: "Site-Wide Matchday Assistant",
      checks: ["vietnamese", "english", "tools"],
      defaults: getDefaultSlotModels("assistant"),
      note: "Powers the floating site assistant with live Liverpool data lookup tools and route navigation cards.",
    },
  ];
}

export function slotInfo(slot: string): AiModelSlotInfo | undefined {
  return getAiModelSlots().find((s) => s.slot === slot);
}

/** Valid model ID pattern (VietAPI/Google `deepseek-v4-pro` or Workers AI `@cf/.../...`). */
export const MODEL_ID =
  /^(?:@cf\/[a-z0-9][a-z0-9._-]*(?:\/[a-z0-9][a-z0-9._-]*)+|[a-z0-9][a-z0-9._-]{0,63})$/i;

/** Known VietAPI models with unit pricing, sorted cheapest-first. */
export function knownModels(): { id: string; priceCrPer1M: number }[] {
  return Object.entries(PRICE_CR_PER_1M)
    .map(([id, priceCrPer1M]) => ({ id, priceCrPer1M }))
    .sort(
      (a, b) => a.priceCrPer1M - b.priceCrPer1M || a.id.localeCompare(b.id),
    );
}
