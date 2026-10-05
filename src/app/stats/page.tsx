import { getTranslations } from "next-intl/server";
import { getTopScorers, getTopAssists, getFixtures, getStandings, computeSeasonStats } from "@/lib/football";
import { SeasonOverview } from "@/components/stats/season-overview";
import {
  LazyGoalsByMonthChart,
  LazyHomeAwayChart,
  LazySeasonComparison,
  LazyStatChart,
} from "@/components/stats/lazy-charts";
import { FormTimeline } from "@/components/stats/form-timeline";
import { CompetitionBreakdown } from "@/components/stats/competition-breakdown";
import { RecordsMilestones } from "@/components/stats/records-milestones";
import { ChipBar } from "@/components/fixtures/chip-bar";
import { PageHero } from "@/components/ui/page-hero";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { BarChart3 } from "lucide-react";
import { makePageMeta, buildBreadcrumbJsonLd, getCanonical } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import {
  formatSeasonLabel,
  getCurrentSeasonLabel,
  getCurrentSeasonYear,
  getSelectableSeasons,
  isSelectableSeason,
} from "@/lib/football/current-season";

export async function generateMetadata() {
  const t = await getTranslations("Stats.metadata");
  const title = t("title");
  const description = t("description", { season: getCurrentSeasonLabel() });
  return { title, description, ...makePageMeta(title, description, { path: "/stats" }) };
}

export const revalidate = 3600; // 1 hour

// Derived from the date; see src/lib/football/current-season.ts.
const CURRENT_SEASON = getCurrentSeasonYear();

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  const t = await getTranslations("Stats");
  const params = await searchParams;
  // Only seasons the picker offers: an arbitrary ?season= would spend the
  // 10 req/min Football-Data.org quota on data nobody can navigate to.
  const requestedSeason = params.season ? parseInt(params.season, 10) : CURRENT_SEASON;
  const selectedSeason = isSelectableSeason(requestedSeason) ? requestedSeason : CURRENT_SEASON;
  const isCurrentSeason = selectedSeason === CURRENT_SEASON;
  const seasonLabel = `${selectedSeason}/${(selectedSeason + 1).toString().slice(-2)}`;

  // Fetch data — scorers only available for current season (FDO limitation)
  const [scorers, assists, fixtures, standings] = await Promise.all([
    isCurrentSeason ? getTopScorers() : Promise.resolve([]),
    isCurrentSeason ? getTopAssists() : Promise.resolve([]),
    getFixtures(selectedSeason),
    isCurrentSeason ? getStandings() : getStandings(selectedSeason).catch(() => []),
  ]);

  // Compute all derived stats — pure function, zero API calls
  const seasonStats = computeSeasonStats(fixtures, standings);

  // Comparison chart: the seasons before the selected one (finished seasons are
  // cached for 30 days, so this costs no API quota after the first render).
  const comparisonSeasons = [selectedSeason - 1, selectedSeason - 2];
  const compSeasonData = await Promise.all(
    comparisonSeasons.map(async (s) => {
      try {
        const [fx, st] = await Promise.all([
          getFixtures(s),
          getStandings(s).catch(() => []),
        ]);
        return { season: s, stats: computeSeasonStats(fx, st) };
      } catch {
        return null;
      }
    })
  );
  const seasonComparisonList = [
    { label: `${selectedSeason}/${(selectedSeason + 1).toString().slice(-2)}`, overview: seasonStats.overview },
    ...compSeasonData
      .filter((d): d is NonNullable<typeof d> => d !== null && d.stats.overview.played > 0)
      .map((d) => ({
        label: formatSeasonLabel(d.season),
        overview: d.stats.overview,
      })),
  ];

  // Liverpool-only scorers for the table
  const lfcScorers = scorers.filter((s) => s.statistics[0]?.team?.id === 40);

  const seasonItems = getSelectableSeasons().map((y) => ({
    key: String(y),
    label: formatSeasonLabel(y),
    href: y === CURRENT_SEASON ? "/stats" : `/stats?season=${y}`,
  }));
  const hasData = seasonStats.overview.played > 0;
  const chartSubtitle = t("charts.legend", { season: getCurrentSeasonLabel() });

  return (
    <div className="min-h-screen">
      <JsonLd data={buildBreadcrumbJsonLd([
        { name: "Home", url: getCanonical("/") },
        { name: "Stats", url: getCanonical("/stats") },
      ])} />
      <PageHero
        eyebrow={`${t("hero.seasonLabel")} ${seasonLabel}`}
        title={t("hero.title")}
        description={t("hero.description")}
        image="/assets/lfc/fans/fans-anfield.webp"
        actions={<ChipBar items={seasonItems} active={String(selectedSeason)} ariaLabel={t("seasonPicker")} />}
      />

      <div className="page-container space-y-10 pb-16 pt-6 sm:space-y-14 sm:pt-10">
        {!hasData && fixtures.length === 0 && (
          <EmptyState
            icon={<BarChart3 className="size-9" aria-hidden />}
            title={t("noData.title")}
            description={t("noData.description")}
            actionHref="/fixtures"
            actionLabel={t("noData.action")}
          />
        )}

        {hasData && (
          <section>
            <SectionHeader title={t("overview.title")} eyebrow={`${t("overview.allCompsLabel")} · ${seasonLabel}`} />
            <SeasonOverview
              stats={seasonStats.overview}
              streak={seasonStats.records.currentStreak}
              labels={{
                played: t("overview.played"),
                wins: t("overview.wins"),
                draws: t("overview.draws"),
                losses: t("overview.losses"),
                goalsFor: t("overview.goalsFor"),
                goalsAgainst: t("overview.goalsAgainst"),
                goalDiff: t("overview.goalDiff"),
                cleanSheets: t("overview.cleanSheets"),
                winRate: t("overview.winRate"),
                points: t("overview.points"),
                rank: t("overview.rank"),
                winStreak: t("overview.winStreak", { count: seasonStats.records.currentStreak.count }),
                unbeaten: t("overview.unbeaten", { count: seasonStats.records.currentStreak.count }),
              }}
            />
          </section>
        )}

        {scorers.length > 0 && (
          <section className="defer-render">
            <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
              <ChartCard title={t("charts.scorers")} subtitle={chartSubtitle}>
                <LazyStatChart scorers={scorers} type="goals" limit={10} />
              </ChartCard>
              {assists.length > 0 && (
                <ChartCard title={t("charts.assists")} subtitle={chartSubtitle}>
                  <LazyStatChart scorers={assists} type="assists" limit={10} />
                </ChartCard>
              )}
            </div>

            {lfcScorers.length > 0 && (
              <div className="surface mt-4 overflow-hidden sm:mt-6">
                <h2 className="border-b border-[var(--line)] px-4 py-3 font-bebas text-2xl text-white sm:px-6">{t("table.title")}</h2>
                <ul className="divide-y divide-[var(--line)]">
                  {lfcScorers.map((s, i) => {
                    const stat = s.statistics[0];
                    return (
                      <li key={s.player.id} className="flex min-h-14 items-center gap-3 px-4 py-2 sm:gap-4 sm:px-6">
                        <span className="w-5 font-bebas text-xl text-stadium-muted">{i + 1}</span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">{s.player.name}</span>
                        <dl className="flex gap-5 text-center sm:gap-8">
                          {[
                            { v: stat?.goals?.total ?? 0, l: t("table.goalsShort"), hl: true },
                            { v: stat?.goals?.assists ?? 0, l: t("table.assistsShort") },
                            { v: stat?.games?.appearences ?? 0, l: t("table.appsShort") },
                          ].map(({ v, l, hl }) => (
                            <div key={l}>
                              <dd className={`font-bebas text-xl leading-none tabular-nums ${hl ? "text-brand" : "text-white"}`}>{v}</dd>
                              <dt className="mt-0.5 font-barlow text-xs uppercase text-stadium-muted">{l}</dt>
                            </div>
                          ))}
                        </dl>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>
        )}

        {seasonStats.monthly.length > 0 && (
          <section className="defer-render">
            <SectionHeader title={t("charts.goalsByMonth")} eyebrow={t("charts.goalsByMonthSub")} />
            <ChartCard>
              <LazyGoalsByMonthChart
                data={seasonStats.monthly}
                labels={{ scored: t("charts.scored"), conceded: t("charts.conceded") }}
                monthLabels={[
                  t("charts.months.jan"), t("charts.months.feb"), t("charts.months.mar"),
                  t("charts.months.apr"), t("charts.months.may"), t("charts.months.jun"),
                  t("charts.months.jul"), t("charts.months.aug"), t("charts.months.sep"),
                  t("charts.months.oct"), t("charts.months.nov"), t("charts.months.dec"),
                ]}
              />
            </ChartCard>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-2">
              <ChartCard title={t("charts.homeAway")} subtitle={t("charts.homeAwaySub")}>
                <LazyHomeAwayChart
                  home={seasonStats.overview.homeRecord}
                  away={seasonStats.overview.awayRecord}
                  labels={{
                    home: t("charts.home"),
                    away: t("charts.away"),
                    wins: t("overview.wins"),
                    draws: t("overview.draws"),
                    losses: t("overview.losses"),
                    gf: t("competitions.gf"),
                    ga: t("competitions.ga"),
                  }}
                />
              </ChartCard>
              <ChartCard title={t("charts.formTimeline")} subtitle={t("charts.formTimelineSub")}>
                <FormTimeline
                  entries={seasonStats.formTimeline}
                  legendLabels={{ win: t("charts.win"), draw: t("charts.draw"), loss: t("charts.loss") }}
                />
              </ChartCard>
            </div>
          </section>
        )}

        {seasonStats.competitions.length > 0 && (
          <section className="defer-render">
            <SectionHeader title={t("competitions.title")} eyebrow={`${t("overview.allCompsLabel")} · ${seasonLabel}`} />
            <CompetitionBreakdown
              competitions={seasonStats.competitions}
              labels={{ winRate: t("competitions.winRate"), gf: t("competitions.gf"), ga: t("competitions.ga") }}
            />
          </section>
        )}

        {hasData && (
          <section className="defer-render">
            <SectionHeader title={t("records.title")} eyebrow={t("records.subtitle")} />
            <RecordsMilestones
              records={seasonStats.records}
              labels={{
                biggestWin: t("records.biggestWin"),
                biggestLoss: t("records.biggestLoss"),
                highestScoring: t("records.highestScoring"),
                winStreak: t("records.winStreak"),
                unbeatenStreak: t("records.unbeatenStreak"),
                comebacks: t("records.comebacks"),
                scoringFirst: t("records.scoringFirst"),
                matches: t("records.matches"),
                times: t("records.times"),
              }}
            />
          </section>
        )}

        {seasonComparisonList.length >= 2 && (
          <section className="defer-render">
            <SectionHeader title={t("comparison.title")} eyebrow={t("comparison.subtitle")} />
            <LazySeasonComparison
              seasons={seasonComparisonList}
              labels={{
                wins: t("overview.wins"),
                draws: t("overview.draws"),
                losses: t("overview.losses"),
                goalsFor: t("overview.goalsFor"),
                goalsAgainst: t("overview.goalsAgainst"),
                played: t("overview.played"),
                winRate: t("overview.winRate"),
              }}
            />
          </section>
        )}
      </div>
    </div>
  );
}

// ─── Layout helper ───────────────────────────────────────────────────────────

function ChartCard({ title, subtitle, children }: { title?: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="surface overflow-hidden">
      {title && (
        <div className="px-4 pt-4 sm:px-6 sm:pt-5">
          <h3 className="font-bebas text-2xl text-white">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-stadium-muted">{subtitle}</p>}
        </div>
      )}
      <div className="px-2 pb-4 pt-3 sm:px-6 sm:pb-5">{children}</div>
    </div>
  );
}
