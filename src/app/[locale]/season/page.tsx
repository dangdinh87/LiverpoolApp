import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { LocaleParams } from "@/i18n/routing";
import {
  computeSeasonStats,
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
import { DataPulseStrip, PresetConnectedGrid } from "@/components/ui/hub-links";
import { makePageMeta } from "@/lib/seo";
import { buildLocalizedBreadcrumbJsonLd } from "@/lib/seo-breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
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
  const label = seasonLabel(selected);
  const title = isCurrent ? t("title") : `${t("title")} (${label})`;
  const description = t("description", { season: label });
  // The current season is the same content as /fixtures; only past seasons are this page's own.
  return {
    title,
    description,
    ...makePageMeta(title, description, { locale, path: isCurrent ? "/fixtures" : `/season?season=${selected}` }),
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

  const currentYear = getCurrentSeasonYear();
  const selectedSeason = resolveSeason(seasonParam);
  const archiveSeason = selectedSeason !== currentYear ? selectedSeason : undefined;

  // UCL standings only available for current season on FDO free tier
  const [t, tHub, fixtures, standings, uclStandings] = await Promise.all([
    getTranslations("Season"),
    getTranslations("Hub"),
    getFixtures(archiveSeason),
    getStandings(archiveSeason),
    archiveSeason ? ([] as Awaited<ReturnType<typeof getUclStandings>>) : getUclStandings(),
  ]);

  const seasonStats = computeSeasonStats(fixtures, standings);
  const ov = seasonStats.overview;
  const statsHref = archiveSeason ? `/stats/${archiveSeason}` : "/stats";
  const standingsHref = archiveSeason ? `/season?tab=standings&season=${archiveSeason}` : "/standings";
  const hasSummary = ov.played > 0 || ov.rank > 0;

  const active: MatchCentreTab = tab === "standings" ? "standings" : view === "results" ? "results" : "fixtures";
  const seasonItems = AVAILABLE_SEASONS.map((y) => ({
    key: String(y),
    label: seasonLabel(y),
    href: y === currentYear ? matchCentreHref(active) : matchCentreHref(active, y),
  }));

  const pulseStrip = hasSummary && (
    <DataPulseStrip
      eyebrow={`${tHub("seasonPulse")} · ${seasonLabel(selectedSeason)}`}
      className="mb-6"
      items={[
        {
          label: tHub("metrics.record"),
          value: `${ov.wins}-${ov.draws}-${ov.losses}`,
          sublabel: `${ov.played} ${tHub("metrics.played")}`,
          href: statsHref,
          accent: "red",
        },
        {
          label: tHub("metrics.goalsForAgainst"),
          value: `${ov.goalsFor} : ${ov.goalsAgainst}`,
          sublabel: `${ov.goalDiff >= 0 ? "+" : ""}${ov.goalDiff}`,
          href: statsHref,
          accent: "emerald",
        },
        {
          label: tHub("metrics.winRate"),
          value: `${ov.winRate}%`,
          sublabel: tHub("metrics.viewSeasonStats"),
          href: statsHref,
          accent: "gold",
        },
        {
          label: tHub("metrics.plRank"),
          value: ov.rank > 0 ? `#${ov.rank}` : "—",
          sublabel: ov.points > 0 ? `${ov.points} · ${tHub("nav.standings")}` : tHub("nav.standings"),
          href: standingsHref,
          accent: "gold",
        },
      ]}
    />
  );

  const connectedGrid = (
    <PresetConnectedGrid
      preset="fromSeason"
      metaOverrides={{
        stats: hasSummary ? `${ov.winRate}% ${tHub("metrics.winRate")}` : undefined,
        fixtures: hasSummary ? `${ov.played} ${tHub("metrics.played")}` : undefined,
        standings: ov.rank > 0 ? `#${ov.rank}` : undefined,
      }}
      className="mt-12"
    />
  );

  const mobileSeasonPicker = (
    <div className="mb-6 lg:hidden">
      <ChipBar items={seasonItems} active={String(selectedSeason)} ariaLabel={t("seasonSelect")} />
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* The one page in the sitemap that carried no structured data. */}
      <JsonLd data={await buildLocalizedBreadcrumbJsonLd(locale, [
        // The page's own canonical: the current season is /fixtures, see generateMetadata.
        { name: t("title"), path: selectedSeason === currentYear ? "/fixtures" : `/season?season=${selectedSeason}` },
      ])} />
      <PageHero
        clubCrest
        eyebrow={t("hero.eyebrow", { season: seasonLabel(selectedSeason) })}
        title={t("title")}
        description={t("hero.description")}
        image="/assets/lfc/stadium/anfield-champions-league.webp"
        actions={<ChipBar items={seasonItems} active={String(selectedSeason)} ariaLabel={t("seasonSelect")} />}
      />

      {fixtures.length === 0 && standings.length === 0 ? (
        <>
          <MatchCentreNav active={active} season={archiveSeason} />
          <div className="page-container pb-20 pt-8 sm:pt-10">
            {mobileSeasonPicker}
            {pulseStrip}
            <EmptyState
              className="mt-6"
              tone="error"
              icon={<CloudOff className="size-9" aria-hidden />}
              title={t("outage.title")}
              description={t("outage.description")}
              actionHref="/news"
              actionLabel={t("outage.action")}
            />
            {connectedGrid}
          </div>
        </>
      ) : active === "standings" ? (
        <>
          <MatchCentreNav active="standings" season={archiveSeason} />
          <div className="page-container pb-20 pt-8 sm:pt-10">
            {mobileSeasonPicker}
            {pulseStrip}
            <StandingsCompTabs plStandings={standings} uclStandings={uclStandings} />
            {connectedGrid}
          </div>
        </>
      ) : (
        <FixtureTimeline
          fixtures={fixtures}
          season={archiveSeason}
          initialView={active === "results" ? "results" : undefined}
          belowNav={
            <>
              {mobileSeasonPicker}
              {pulseStrip}
            </>
          }
          footer={connectedGrid}
        />
      )}
    </div>
  );
}
