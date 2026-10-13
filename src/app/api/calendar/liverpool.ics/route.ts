import { getTranslations } from "next-intl/server";
import { getCachedFixtures } from "@/lib/football/cached-fixtures";
import { buildFixturesIcs } from "@/lib/calendar/fixtures-ics";
import { routing, withLocalePrefix } from "@/i18n/routing";

/**
 * Subscribable calendar of Liverpool's fixtures: /api/calendar/liverpool.ics
 * (?lang=vi for Vietnamese text). Calendar apps poll it every few hours, so a
 * moved kick-off reaches every subscriber without them doing anything.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const lang = searchParams.get("lang");
  const locale = lang && (routing.locales as readonly string[]).includes(lang) ? lang : routing.defaultLocale;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? origin;

  const [fixtures, t] = await Promise.all([getCachedFixtures(), getTranslations({ locale, namespace: "Calendar" })]);
  const body = buildFixturesIcs(fixtures, {
    siteUrl,
    matchPath: (id) => withLocalePrefix(`/fixtures/${id}`, locale),
    text: {
      calendarName: t("name"),
      calendarDescription: t("description"),
      matchPage: t("matchPage"),
      reminder: t("reminder"),
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="liverpool.ics"',
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
