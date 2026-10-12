import { getSiteArticleBySlug } from "@/lib/site-articles/db";
import { BRAND } from "@/lib/brand";
import { OG_CONTENT_TYPE, OG_SIZE, renderStoryCard } from "@/lib/og/story-card";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = `${BRAND.name} — match report`;

/**
 * Share card for one of the site's own match reports.
 *
 * These pages had no `og:image` of their own at all: a share fell back to the
 * generic brand card, and Discover asks for an image that is not a logo. They
 * are the only original long-form writing here, so they are the ones worth
 * making look like stories when someone passes the link on.
 */
export default async function AnalysisOgImage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  const row = await getSiteArticleBySlug(slug);
  const content = (locale === "vi" ? row?.content_vi : row?.content_en) ?? row?.content_en ?? row?.content_vi;

  // The day the match was played, not the day the text was written — the same
  // date the article itself prints. The wordmark is already at the top, so
  // repeating the brand down here would waste the line.
  const matchDate = row?.match_date ?? row?.published_at;

  return renderStoryCard({
    kicker: "Match report",
    // A missing row still has to produce a card: the route is reachable before
    // the article exists, and a broken image is worse than a plain one.
    headline: content?.title ?? "Liverpool match report",
    footer: matchDate
      ? new Date(matchDate).toLocaleDateString("en-GB", {
          day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
        })
      : BRAND.name,
  });
}
