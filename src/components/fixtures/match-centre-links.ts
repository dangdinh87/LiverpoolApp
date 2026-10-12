export type MatchCentreTab = "fixtures" | "results" | "standings" | "stats";

/**
 * One "Trận đấu" hub, four tabs. The current season lives on the canonical
 * routes; an archive season keeps /season (fixtures, results, table) and
 * /stats/<year> so the picker never drops the chosen year.
 *
 * Archive stats moved from `/stats?season=` to a path segment: a page that
 * reads searchParams cannot be prerendered, so the query form forced every
 * visit to /stats — parameter or not — to render on demand in one region.
 *
 * `season` is the archive year, or undefined for the current season.
 */
export function matchCentreHref(tab: MatchCentreTab, season?: number): string {
  if (season === undefined) {
    return { fixtures: "/fixtures", results: "/fixtures?view=results", standings: "/standings", stats: "/stats" }[tab];
  }
  return {
    fixtures: `/season?season=${season}`,
    results: `/season?season=${season}&view=results`,
    standings: `/season?season=${season}&tab=standings`,
    stats: `/stats/${season}`,
  }[tab];
}
