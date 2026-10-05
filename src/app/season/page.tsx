import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  getFixtures,
  getStandings,
  getUclStandings,
} from "@/lib/football";
import { FixtureTimeline } from "@/components/fixtures/fixture-timeline";
import { StandingsCompTabs } from "@/components/standings/standings-comp-tabs";
import { CloudOff } from "lucide-react";
import { SeasonTabs } from "@/components/season/season-tabs";
import { ChipBar } from "@/components/fixtures/chip-bar";
import { PageHero } from "@/components/ui/page-hero";
import { EmptyState } from "@/components/ui/empty-state";
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
  const t = await getTranslations("Season");

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

  const seasonItems = AVAILABLE_SEASONS.map((y) => {
    const qs = new URLSearchParams();
    if (y !== currentYear) qs.set("season", String(y));
    if (tab === "standings") qs.set("tab", "standings");
    const query = qs.toString();
    return { key: String(y), label: seasonLabel(y), href: query ? `/season?${query}` : "/season" };
  });

  return (
    <div className="min-h-screen">
      <PageHero
        eyebrow={t("hero.eyebrow", { season: seasonLabel(selectedSeason) })}
        title={t("title")}
        description={t("hero.description")}
        image="/assets/lfc/stadium/anfield-main-stand.jpg"
        actions={<ChipBar items={seasonItems} active={String(selectedSeason)} ariaLabel={t("seasonSelect")} />}
      />
      <div className="page-container pb-16">
        {fixtures.length === 0 && standings.length === 0 ? (
          <EmptyState
            className="mt-6"
            tone="error"
            icon={<CloudOff className="size-9" aria-hidden />}
            title={t("outage.title")}
            description={t("outage.description")}
            actionHref="/news"
            actionLabel={t("outage.action")}
          />
        ) : (
          <SeasonTabs
            fixturesPanel={<FixtureTimeline fixtures={fixtures} sticky={false} />}
            standingsPanel={<StandingsCompTabs plStandings={standings} uclStandings={uclStandings} />}
            defaultTab={tab}
            matchCount={fixtures.length}
            teamCount={standings.length}
          />
        )}
      </div>
    </div>
  );
}
