import { getDigestByDate, getSeoArticleFromDigest } from "@/lib/news/digest";
import { BRAND } from "@/lib/brand";
import { OG_CONTENT_TYPE, OG_SIZE, renderStoryCard } from "@/lib/og/story-card";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = `${BRAND.name} — daily briefing`;

/**
 * Share card for a day's briefing.
 *
 * Ninety of these exist, one per day, and every one shared the same generic
 * brand card — so ninety different briefings looked identical in a link
 * preview and in Discover, which asks for something other than a logo.
 */
export default async function DigestOgImage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const digest = /^\d{4}-\d{2}-\d{2}$/.test(date) ? await getDigestByDate(date) : null;
  const headline =
    digest?.seo_title || (digest ? getSeoArticleFromDigest(digest)?.title : null) || digest?.title;

  return renderStoryCard({
    kicker: "Today's briefing",
    headline: headline ?? "Liverpool news, gathered daily",
    // The date the briefing covers, in a form that reads the same everywhere.
    footer: /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
          day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
        })
      : BRAND.name,
  });
}
