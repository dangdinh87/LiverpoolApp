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

// Available seasons on FDO free tier (start year → display label)
const AVAILABLE_SEASONS = [2025, 2024, 2023] as const;

/** Convert start year (2025) → display label (2025/26) */
function seasonLabel(startYear: number): string {
  return `${startYear}/${(startYear + 1).toString().slice(-2)}`;
}

/** Derive current season start year from date. Aug-Dec → YYYY, Jan-Jul → YYYY-1 */
function getCurrentSeasonYear(): number {
  const now = new Date();
  const month = now.getMonth() + 1;
  return month >= 8 ? now.getFullYear() : now.getFullYear() - 1;
}

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
  const currentYear = getCurrentSeasonYear();

  const dataPromise = searchParams.then((params) => {
    const seasonParam = params.season;
    const selectedSeason = seasonParam
      ? AVAILABLE_SEASONS.includes(Number(seasonParam) as typeof AVAILABLE_SEASONS[number])
        ? Number(seasonParam)
        : currentYear
      : currentYear;

    const apiSeason = selectedSeason !== currentYear ? selectedSeason : undefined;

    return Promise.all([
      params.tab,
      selectedSeason,
      getFixtures(apiSeason),
      getStandings(apiSeason),
      apiSeason ? ([] as Awaited<ReturnType<typeof getUclStandings>>) : getUclStandings(),
    ] as const);
  });

  const [tab, selectedSeason, fixtures, standings, uclStandings] = await dataPromise;

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
