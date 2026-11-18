import { getTranslations } from "next-intl/server";
import { getEnv } from "@/lib/env";
import { getCachedFixtures } from "@/lib/football/cached-fixtures";
import { buildFixturesIcs } from "@/lib/calendar/fixtures-ics";
import { routing, withLocalePrefix } from "@/i18n/routing";

function resolveSiteUrl(fallbackOrigin: string): string {
  const configured = getEnv("NEXT_PUBLIC_SITE_URL");
  if (configured) {
    try {
      const u = new URL(configured);
      if (u.protocol === "http:" || u.protocol === "https:") {
        return configured.replace(/\/+$/, "");
      }
    } catch {
      // Fall back to request origin when env URL is malformed.
    }
  }
  return fallbackOrigin.replace(/\/+$/, "");
}

/**
 * Subscribable calendar of Liverpool's fixtures: /api/calendar/liverpool.ics
 * (?lang=vi for Vietnamese text). Calendar apps poll it every few hours, so a
 * moved kick-off reaches every subscriber without them doing anything.
 */
export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url);
    const lang = searchParams.get("lang");
    const locale = lang && (routing.locales as readonly string[]).includes(lang) ? lang : routing.defaultLocale;
    const siteUrl = resolveSiteUrl(origin);

    const [fixtures, t] = await Promise.all([
      getCachedFixtures(),
      getTranslations({ locale, namespace: "Calendar" }),
    ]);
    const body = buildFixturesIcs(fixtures, {
      siteUrl,
      locale,
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
        "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    console.error("[calendar] Failed to build ICS feed:", err);
    return new Response("Calendar temporarily unavailable", {
      status: 500,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
}
