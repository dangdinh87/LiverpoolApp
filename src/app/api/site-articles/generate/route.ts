import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { revalidateLocalizedPath } from "@/i18n/revalidate";
import { hasAnyAiProvider } from "@/lib/ai/providers";
import { withCronAuth } from "@/lib/cron";
import { getFixtures } from "@/lib/football";
import { loadMatchReviewFacts } from "@/lib/site-articles/match-review-facts";
import { loadMatchPreviewFacts } from "@/lib/site-articles/match-preview-facts";
import { generateSiteArticle } from "@/lib/site-articles/generate-site-article";
import { hasArticleForFixture } from "@/lib/site-articles/db";
import { matchArticleSlug } from "@/lib/site-articles/slug";
import type { GenerationOutcome } from "@/lib/site-articles/generate-site-article";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

/** Only matches that finished recently are worth writing up. */
const REVIEW_WINDOW_MS = 4 * 24 * 60 * 60 * 1000;
/** Pre-match previews target fixtures kicking off within the next 48 hours. */
const PREVIEW_WINDOW_MS = 48 * 60 * 60 * 1000;
const FINISHED = new Set(["FT", "AET", "PEN"]);
const UPCOMING = new Set(["NS"]);

/** One run writes at most this many, so a backlog cannot exhaust the budget. */
const MAX_PER_RUN = 2;

/**
 * Write up match reports (finished within 4d) and pre-match previews (kick-off within 48h).
 *
 * Generation lives behind cron auth and never on a render path: it costs tens
 * of seconds and real tokens, and the digest's history shows what happens when
 * a page can trigger that itself.
 */
export const GET = withCronAuth(async (req) => {
  if (!hasAnyAiProvider()) {
    return NextResponse.json({ error: "AI provider not configured" }, { status: 503 });
  }

  const rawFixture = req.nextUrl.searchParams.get("fixture");
  let only: number | null = null;
  if (rawFixture !== null && rawFixture !== "") {
    const parsed = Number(rawFixture);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return NextResponse.json({ error: "Invalid fixture id" }, { status: 400 });
    }
    only = parsed;
  }

  const rawKind = req.nextUrl.searchParams.get("kind");
  if (rawKind !== null && rawKind !== "" && rawKind !== "review" && rawKind !== "preview") {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }
  const runReviews = !rawKind || rawKind === "review";
  const runPreviews = !rawKind || rawKind === "preview";

  try {
    const force = req.nextUrl.searchParams.get("force") === "1";
    const now = Date.now();

    const fixtures = await getFixtures();
    const reviewCandidates = runReviews
      ? fixtures
          .filter((f) => FINISHED.has(f.fixture.status.short))
          .filter((f) =>
            only ? f.fixture.id === only : now - new Date(f.fixture.date).getTime() <= REVIEW_WINDOW_MS,
          )
          .sort((a, b) => b.fixture.date.localeCompare(a.fixture.date))
      : [];

    const previewCandidates = runPreviews
      ? fixtures
          .filter((f) => UPCOMING.has(f.fixture.status.short))
          .filter((f) => {
            if (only) return f.fixture.id === only;
            const msUntilKickOff = new Date(f.fixture.date).getTime() - now;
            return msUntilKickOff >= 0 && msUntilKickOff <= PREVIEW_WINDOW_MS;
          })
          .sort((a, b) => a.fixture.date.localeCompare(b.fixture.date))
      : [];

    const results: Array<{ outcome: GenerationOutcome; fixtureId: number }> = [];

    for (const fixture of reviewCandidates) {
      if (results.length >= MAX_PER_RUN) break;

      const id = fixture.fixture.id;
      if (!force && (await hasArticleForFixture(id, "review"))) continue;

      const facts = await loadMatchReviewFacts(id);
      if (!facts) continue;

      // A match that produced goals but no goal detail is not writable: asked to
      // report a 1-0 with no scorer, the model invents one. The free data tier
      // omits scorers often enough that this has to be checked, not assumed.
      const scored = facts.home.score + facts.away.score;
      if (scored > 0 && facts.goals.length === 0) continue;
      // Nothing beyond the score is nothing worth publishing.
      if (facts.goals.length === 0 && !facts.stats) continue;

      const outcome = await generateSiteArticle({
        slug: matchArticleSlug("review", fixture),
        kind: "review",
        facts,
        fixtureId: id,
      });
      results.push({ outcome, fixtureId: id });
    }

    for (const fixture of previewCandidates) {
      if (results.length >= MAX_PER_RUN) break;

      const id = fixture.fixture.id;
      if (!force && (await hasArticleForFixture(id, "preview"))) continue;

      const facts = await loadMatchPreviewFacts(id);
      if (!facts) continue;
      if (facts.liverpoolForm.length === 0 && facts.headToHead.length === 0 && facts.table === null) continue;

      const outcome = await generateSiteArticle({
        slug: matchArticleSlug("preview", fixture),
        kind: "preview",
        facts,
        fixtureId: id,
      });
      results.push({ outcome, fixtureId: id });
    }

    const written = results.filter((r) => r.outcome.ok);
    if (written.length > 0) {
      revalidateTag("site-articles", "max");
      revalidateLocalizedPath("/analysis");
      revalidateLocalizedPath("/");
      for (const { outcome, fixtureId } of written) {
        revalidateLocalizedPath(`/analysis/${outcome.slug}`);
        revalidateLocalizedPath(`/fixtures/${fixtureId}`);
      }
    }

    return NextResponse.json(
      {
        ok: true,
        considered: reviewCandidates.length + previewCandidates.length,
        written: written.length,
        rejected: results.filter((r) => !r.outcome.ok).map((r) => r.outcome),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[site-articles/generate] Fatal:", err);
    return NextResponse.json(
      { ok: false, error: "Site article generation failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
});
