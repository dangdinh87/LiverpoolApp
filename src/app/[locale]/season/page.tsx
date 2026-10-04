import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  getFixtures,
  getStandings,
  getUclStandings,
} from "@/lib/football";
import { FixtureTimeline } from "@/components/fixtures/fixture-timeline";
import { StandingsCompTabs } from "@/components/standings/standings-comp-tabs";
import { SeasonTabs } from "@/components/season/season-tabs";
import { makePageMeta } from "@/lib/seo";
import {
  formatSeasonLabel,
  getCurrentSeasonYear,
  getSelectableSeasons,
} from "@/lib/football/current-season";

// Season list and labels come from the shared date-derived helper, so a new
// campaign appears without editing this page.
const AVAILABLE_SEASONS = getSelectableSeasons();
const seasonLabel = formatSeasonLabel;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Season.metadata");
  const label = seasonLabel(getCurrentSeasonYear());
  const title = t("title", { season: label });
  const description = t("description", { season: label });
  return { title, description, ...makePageMeta(title, description, { path: "/season" }) };
}

export const revalidate = 1800; // 30 minutes

export default async function SeasonPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; season?: string }>;
}) {
  const { tab, season: seasonParam } = await searchParams;

  // Validate season param — fallback to current if invalid
  const currentYear = getCurrentSeasonYear();
  const selectedSeason = seasonParam
    ? AVAILABLE_SEASONS.includes(Number(seasonParam))
      ? Number(seasonParam)
      : currentYear
    : currentYear;

  // Only pass season to API if not the current season (avoids unnecessary param)
  const apiSeason = selectedSeason !== currentYear ? selectedSeason : undefined;

  // UCL standings only available for current season on FDO free tier
  const [fixtures, standings, uclStandings] = await Promise.all([
    getFixtures(apiSeason),
    getStandings(apiSeason),
    apiSeason ? ([] as Awaited<ReturnType<typeof getUclStandings>>) : getUclStandings(),
  ]);

  /* ── Tab panels ── */
  const fixturesPanel = <FixtureTimeline fixtures={fixtures} />;
  const standingsPanel = (
    <StandingsCompTabs
      plStandings={standings}
      uclStandings={uclStandings}
    />
  );
  return (
    <div className="min-h-screen pt-16">
      <SeasonTabs
        fixturesPanel={fixturesPanel}
        standingsPanel={standingsPanel}
        defaultTab={tab}
        matchCount={fixtures.length}
        teamCount={standings.length}
        seasons={AVAILABLE_SEASONS.map((y) => ({ value: y, label: seasonLabel(y) }))}
        currentSeason={selectedSeason}
        liveSeasonYear={currentYear}
      />
    </div>
  );
}
