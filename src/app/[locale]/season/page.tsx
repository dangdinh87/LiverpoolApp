import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { LocaleParams } from "@/i18n/routing";
import {
  getFixtures,
  getStandings,
  getUclStandings,
} from "@/lib/football";
import { FixtureTimeline } from "@/components/fixtures/fixture-timeline";
import { StandingsCompTabs } from "@/components/standings/standings-comp-tabs";
import { CloudOff } from "lucide-react";
import { ChipBar } from "@/components/fixtures/chip-bar";
import { MatchCentreNav } from "@/components/fixtures/match-centre-nav";
import { matchCentreHref, type MatchCentreTab } from "@/components/fixtures/match-centre-links";
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

type SeasonSearchParams = { tab?: string; season?: string; view?: string };

/** The requested season if the archive offers it, else the current one. */
function resolveSeason(seasonParam: string | undefined): number {
  const current = getCurrentSeasonYear();
  const n = Number(seasonParam);
  return seasonParam && AVAILABLE_SEASONS.includes(n) ? n : current;
}

export async function generateMetadata({
  params,
  searchParams,
}: LocaleParams & { searchParams: Promise<SeasonSearchParams> }): Promise<Metadata> {
  const { locale } = await params;
  const { season: seasonParam } = await searchParams;
  const t = await getTranslations({ locale, namespace: "Season.metadata" });
  const selected = resolveSeason(seasonParam);
  const isCurrent = selected === getCurrentSeasonYear();
  const title = t("title");
  const description = t("description", { season: seasonLabel(getCurrentSeasonYear()) });
  // The current season is the same content as /fixtures; only past seasons are this page's own.
  return {
    title,
    description,
    ...makePageMeta(title, description, { path: isCurrent ? "/fixtures" : `/season?season=${selected}` }),
  };
}

export const revalidate = 1800; // 30 minutes

/**
 * Season archive. Same four-tab "Trận đấu" hub as /fixtures, /standings and
 * /stats, for any season the picker offers. The current season's tabs link to
 * the canonical routes; a past season keeps its own state in the URL.
 */
export default async function SeasonPage({
  params,
  searchParams,
}: LocaleParams & { searchParams: Promise<SeasonSearchParams> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { tab, season: seasonParam, view } = await searchParams;
  const t = await getTranslations("Season");

  const currentYear = getCurrentSeasonYear();
  const selectedSeason = resolveSeason(seasonParam);
  const archiveSeason = selectedSeason !== currentYear ? selectedSeason : undefined;

  // UCL standings only available for current season on FDO free tier
  const [fixtures, standings, uclStandings] = await Promise.all([
    getFixtures(archiveSeason),
    getStandings(archiveSeason),
    archiveSeason ? ([] as Awaited<ReturnType<typeof getUclStandings>>) : getUclStandings(),
  ]);

  const active: MatchCentreTab = tab === "standings" ? "standings" : view === "results" ? "results" : "fixtures";
  const seasonItems = AVAILABLE_SEASONS.map((y) => ({
    key: String(y),
    label: seasonLabel(y),
    href: y === currentYear ? matchCentreHref(active) : matchCentreHref(active, y),
  }));

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
          <>
            <MatchCentreNav active={active} season={archiveSeason} />
            <EmptyState
              className="mt-6"
              tone="error"
              icon={<CloudOff className="size-9" aria-hidden />}
              title={t("outage.title")}
              description={t("outage.description")}
              actionHref="/news"
              actionLabel={t("outage.action")}
            />
          </>
        ) : active === "standings" ? (
          <>
            <MatchCentreNav active="standings" season={archiveSeason} />
            <div className="pt-4">
              <StandingsCompTabs plStandings={standings} uclStandings={uclStandings} />
            </div>
          </>
        ) : (
          <FixtureTimeline
            fixtures={fixtures}
            season={archiveSeason}
            initialView={active === "results" ? "results" : undefined}
          />
        )}
      </div>
    </div>
  );
}
