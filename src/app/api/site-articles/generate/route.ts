import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getEnv } from "@/lib/env";
import { withCronAuth } from "@/lib/cron";
import { getFixtures } from "@/lib/football";
import { loadMatchReviewFacts } from "@/lib/site-articles/match-review-facts";
import { generateSiteArticle } from "@/lib/site-articles/generate-site-article";
import { hasArticleForFixture } from "@/lib/site-articles/db";
import { matchArticleSlug } from "@/lib/site-articles/slug";
import type { GenerationOutcome } from "@/lib/site-articles/generate-site-article";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

/** Only matches that finished recently are worth writing up. */
const REVIEW_WINDOW_MS = 4 * 24 * 60 * 60 * 1000;
const FINISHED = new Set(["FT", "AET", "PEN"]);

/** One run writes at most this many, so a backlog cannot exhaust the budget. */
const MAX_PER_RUN = 2;

/**
 * Write up matches that have finished and have no report yet.
 *
 * Generation lives behind cron auth and never on a render path: it costs tens
 * of seconds and real tokens, and the digest's history shows what happens when
 * a page can trigger that itself.
 */
export const GET = withCronAuth(async (req) => {
  if (!getEnv("VIETAPI_KEY")) {
    return NextResponse.json({ error: "VIETAPI_KEY not configured" }, { status: 503 });
  }

  const force = req.nextUrl.searchParams.get("force") === "1";
  // One named fixture, for backfilling a match the window has moved past.
  const only = Number(req.nextUrl.searchParams.get("fixture")) || null;
  const now = Date.now();

  const fixtures = await getFixtures();
  const candidates = fixtures
    .filter((f) => FINISHED.has(f.fixture.status.short))
    .filter((f) => (only ? f.fixture.id === only : now - new Date(f.fixture.date).getTime() <= REVIEW_WINDOW_MS))
    .sort((a, b) => b.fixture.date.localeCompare(a.fixture.date));

  const results: GenerationOutcome[] = [];
  for (const fixture of candidates) {
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

    results.push(
      await generateSiteArticle({
        slug: matchArticleSlug("review", fixture),
        kind: "review",
        facts,
        fixtureId: id,
      }),
    );
  }

  if (results.some((r) => r.ok)) {
    revalidatePath("/analysis");
    revalidatePath("/");
  }

  return NextResponse.json({
    ok: true,
    considered: candidates.length,
    written: results.filter((r) => r.ok).length,
    rejected: results.filter((r) => !r.ok),
  });
});
