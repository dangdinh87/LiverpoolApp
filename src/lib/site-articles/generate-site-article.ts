import "server-only";
import { generateText } from "ai";
import { getDefaultSlotModels } from "@/lib/ai/ai-model-slots";
import { getModelChain } from "@/lib/ai/model-settings";
import { parseModelJson } from "@/lib/ai/parse-model-json";
import { resolveModelAttempts } from "@/lib/ai/providers";
import { hasForeignScript } from "@/lib/ai/strip-foreign-script";
import type { ChatModel } from "@/lib/ai/vietapi";
import { SITE_ARTICLE_VOICE, SITE_ARTICLE_VOICE_VI } from "@/lib/prompts/site-article-voice";
import { validateDraft } from "./validate-draft";
import { tooSimilar } from "./similarity";
import { recentBodies, saveSiteArticle } from "./db";
import type { ArticleFacts, SiteArticleContent, SiteArticleKind } from "./types";

/**
 * Turn a fact set into a published article, or into a recorded rejection.
 *
 * The order matters and is the whole safety argument: the model sees only
 * `facts`, its reply is checked back against those same facts, and a draft that
 * fails is stored rather than published. Nothing here trusts the model's
 * output, because there is no editor downstream who would catch it.
 */

/** One generation must not outlive the cron route's budget. */
const ATTEMPT_TIMEOUT_MS = 55_000;

export interface GenerationOutcome {
  ok: boolean;
  slug: string;
  reason?: string;
  model?: string;
  /** Whether a Vietnamese version passed its own check. */
  vi?: boolean;
}

const SHAPE = `Reply with JSON only, in this exact shape:
{
  "title": "compelling headline, under 70 characters",
  "excerpt": "crisp two-sentence editorial summary, 160 to 240 characters",
  "metaTitle": "under 60 characters",
  "metaDescription": "under 155 characters",
  "sections": [{ "heading": "short natural heading", "body": "three to five engaging sentences" }]
}
Write four or five well-developed sections (roughly 450 to 650 words total across the article). Weave the supplied numbers, form runs, injuries, key players, and head-to-head context into fluent analysis rather than repeating raw labels.`;

function buildPrompt(facts: ArticleFacts, locale: "en" | "vi"): string {
  const voice = locale === "vi" ? `${SITE_ARTICLE_VOICE}\n\n${SITE_ARTICLE_VOICE_VI}` : SITE_ARTICLE_VOICE;
  return [
    voice,
    "",
    "THE DATA. This is everything you know. Do not add to it.",
    JSON.stringify(facts, null, 2),
    "",
    SHAPE,
  ].join("\n");
}

/** Ask one model for a draft, bounded in time. */
async function draftFrom(
  model: ChatModel,
  facts: ArticleFacts,
  locale: "en" | "vi",
): Promise<SiteArticleContent> {
  const result = await generateText({
    model,
    maxRetries: 0,
    prompt: buildPrompt(facts, locale),
    abortSignal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
  });
  const draft = parseModelJson<Partial<SiteArticleContent>>(result.text);
  if (
    typeof draft.title !== "string" ||
    typeof draft.excerpt !== "string" ||
    !Array.isArray(draft.sections)
  ) {
    throw new Error("model reply was JSON but not an article");
  }
  const normalized: SiteArticleContent = {
    title: draft.title,
    excerpt: draft.excerpt,
    metaTitle: draft.metaTitle ?? draft.title,
    metaDescription: draft.metaDescription ?? draft.excerpt,
    sections: draft.sections.filter((s) => s && typeof s.heading === "string" && typeof s.body === "string"),
  };
  const allProse = [
    normalized.title,
    normalized.excerpt,
    normalized.metaTitle,
    normalized.metaDescription,
    ...normalized.sections.flatMap((s) => [s.heading, s.body]),
  ].join("\n");
  if (hasForeignScript(allProse)) {
    throw new Error("model output contained unexpected foreign script");
  }
  return normalized;
}

/** The prose of a draft, for the repetition check. */
function bodyText(draft: SiteArticleContent): string {
  return draft.sections.map((s) => s.body).join("\n");
}

/**
 * Generate, check and store one article.
 *
 * Returns what happened rather than throwing: a cron job that generates four
 * articles should not lose the other three because one model reply was wrong.
 */
export async function generateSiteArticle(args: {
  slug: string;
  kind: SiteArticleKind;
  facts: ArticleFacts;
  fixtureId?: number | null;
}): Promise<GenerationOutcome> {
  const { slug, kind, facts, fixtureId = null } = args;
  const previous = await recentBodies(kind);
  const problems: string[] = [];

  const chain = await getModelChain("site_articles", getDefaultSlotModels("site_articles"));
  const attempts = resolveModelAttempts(chain, { feature: "site_articles" });

  for (const attempt of attempts) {
    const label = `${attempt.modelId}${attempt.viaGateway ? " (gw)" : ""}`;
    let draft: SiteArticleContent;
    try {
      draft = await draftFrom(attempt.model, facts, "en");
    } catch (err) {
      problems.push(`${label}: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }

    const report = validateDraft(draft, facts);
    if (!report.ok) {
      problems.push(`${label}: ${report.problems.join("; ")}`);
      continue;
    }

    const repeat = tooSimilar(bodyText(draft), previous);
    if (repeat) {
      problems.push(`${label}: repeats a recent ${kind} (${repeat.score.toFixed(2)} overlap)`);
      continue;
    }

    // Vietnamese is a second generation from the same facts, not a translation
    // of the English: a translated draft would inherit anything the English one
    // got wrong, and it is checked on its own terms either way.
    //
    // An English-only article is worth publishing and a wrong Vietnamese one is
    // not, so a failure here does not stop the piece — but it is recorded. A
    // silent catch here hid the fact that no Vietnamese version was ever
    // produced, for every article, until someone looked in the database.
    let contentVi: SiteArticleContent | null = null;
    try {
      const vi = await draftFrom(attempt.model, facts, "vi");
      const viReport = validateDraft(vi, facts);
      if (viReport.ok) contentVi = vi;
      else problems.push(`${label} (vi): ${viReport.problems.join("; ")}`);
    } catch (err) {
      problems.push(`${label} (vi): ${err instanceof Error ? err.message : String(err)}`);
    }

    const saved = await saveSiteArticle({
      slug, kind, fixtureId,
      contentEn: draft, contentVi, facts,
      status: "published", model: attempt.modelId,
      // Kept on a published row too: this is where a missing Vietnamese
      // version explains itself.
      rejectReason: contentVi ? null : problems.join(" | ") || null,
    });
    if (!saved) {
      return { ok: false, slug, reason: "failed to save published article" };
    }
    return { ok: true, slug, model: attempt.modelId, vi: contentVi !== null };
  }

  const reason = problems.join(" | ") || (attempts.length === 0 ? "no configured AI provider for site_articles" : "no model produced a draft");
  await saveSiteArticle({
    slug, kind, fixtureId,
    contentEn: null, contentVi: null, facts,
    status: "rejected", rejectReason: reason,
  });
  return { ok: false, slug, reason };
}
