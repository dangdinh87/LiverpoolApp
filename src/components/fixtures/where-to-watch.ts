/**
 * FPT Play shows the Premier League in Vietnam; no other competition on the
 * schedule is covered, so the "where to watch" line is shown for PL games only.
 *
 * It is also Vietnam-only: the line is hidden for every other locale until a
 * per-country broadcaster table exists, so a viewer in Jakarta or Lagos is not
 * told to watch on a service that is not available to them.
 */
export function airsOnFptPlay(leagueName: string | null | undefined, locale: string): boolean {
  return locale === "vi" && leagueName === "Premier League";
}
