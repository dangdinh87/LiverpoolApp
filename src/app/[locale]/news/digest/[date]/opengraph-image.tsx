import { getTranslations } from "next-intl/server";
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
  params: Promise<{ date: string; locale: string }>;
}) {
  const { date, locale } = await params;
  const [digest, tDigest, tNewsDigest] = await Promise.all([
    /^\d{4}-\d{2}-\d{2}$/.test(date) ? getDigestByDate(date).catch(() => null) : Promise.resolve(null),
    getTranslations({ locale, namespace: "Home.digest" }),
    getTranslations({ locale, namespace: "News.digest" }),
  ]);
  const headline =
    digest?.seo_title || (digest ? getSeoArticleFromDigest(digest)?.title : null) || digest?.title;
  const dateLocale = locale === "vi" ? "vi-VN" : "en-GB";

  return renderStoryCard({
    kicker: tDigest("kicker"),
    headline: headline ?? tNewsDigest("dailyLabel"),
    // The date the briefing covers, localized to the route's language.
    footer: /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? new Date(`${date}T00:00:00Z`).toLocaleDateString(dateLocale, {
          day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
        })
      : BRAND.name,
  });
}
