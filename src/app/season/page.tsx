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

export const dynamic = "force-dynamic";

export default async function SeasonPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; season?: string }>;
}) {
  const { tab, season: seasonParam } = await searchParams;

  // Validate season param — fallback to current if invalid
  const currentYear = getCurrentSeasonYear();
  const selectedSeason = seasonParam
    ? AVAILABLE_SEASONS.includes(Number(seasonParam) as typeof AVAILABLE_SEASONS[number])
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
