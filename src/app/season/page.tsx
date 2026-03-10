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

/** Derive season label from current date. Aug-Dec → YYYY/(YY+1), Jan-Jul → (YYYY-1)/YY */
function getCurrentSeason(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 8) return `${year}/${(year + 1).toString().slice(-2)}`;
  return `${year - 1}/${year.toString().slice(-2)}`;
}

const SEASON_LABEL = getCurrentSeason();

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Season.metadata");
  const title = t("title", { season: SEASON_LABEL });
  const description = t("description", { season: SEASON_LABEL });
  return { title, description, ...makePageMeta(title, description) };
}

export const dynamic = "force-dynamic";

export default async function SeasonPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;

  const [fixtures, standings, uclStandings] = await Promise.all([
    getFixtures(),
    getStandings(),
    getUclStandings(),
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
      />
    </div>
  );
}
