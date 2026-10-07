/**
 * FPT Play shows the Premier League in Vietnam; no other competition on the
 * schedule is covered, so the "where to watch" line is shown for PL games only.
 */
export function airsOnFptPlay(leagueName: string | null | undefined): boolean {
  return leagueName === "Premier League";
}
