import { getTranslations, setRequestLocale } from "next-intl/server";
import { getTopScorers, getTopAssists, getAllFplStats, getFixtures, getStandings, computeSeasonStats } from "@/lib/football";
import { SeasonOverview } from "@/components/stats/season-overview";
import { LazyGoalsByMonthChart, LazySeasonComparison } from "@/components/stats/lazy-charts";
import { FormTimeline } from "@/components/stats/form-timeline";
import { HomeAwayTable } from "@/components/stats/home-away-table";
import { Leaderboard, buildLeaders } from "@/components/stats/leaderboard";
import { SquadScorersTable } from "@/components/stats/squad-scorers-table";
import { CompetitionBreakdown } from "@/components/stats/competition-breakdown";
import { RecordsMilestones } from "@/components/stats/records-milestones";
import { ChipBar } from "@/components/fixtures/chip-bar";
import { MatchCentreNav } from "@/components/fixtures/match-centre-nav";
import { matchCentreHref } from "@/components/fixtures/match-centre-links";
import { PageHero } from "@/components/ui/page-hero";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { BarChart3 } from "lucide-react";
import { buildBreadcrumbJsonLd, getCanonical } from "@/lib/seo";
import { competitionName } from "@/lib/competition-labels";
import { JsonLd } from "@/components/seo/json-ld";
import {
  formatSeasonLabel,
  getCurrentSeasonLabel,
  getCurrentSeasonYear,
  getSelectableSeasons,
} from "@/lib/football/current-season";

// Derived from the date; see src/lib/football/current-season.ts.
const CURRENT_SEASON = getCurrentSeasonYear();

/**
 * The stats page for one season, shared by /stats and /stats/[season].
 *
 * It used to be the /stats page itself, reading the season from `?season=`.
 * Awaiting searchParams opts a route out of prerendering, so every visit to
 * /stats — nearly all of them for the current season, with no parameter at all
 * — was rendered on demand in one region. The season is a path segment now and
 * this holds the markup both routes render.
 */
export async function StatsSeasonView({
  locale,
  selectedSeason,
}: {
  locale: string;
  selectedSeason: number;
}) {
  setRequestLocale(locale);
  const t = await getTranslations("Stats");
  const tMatch = await getTranslations("Match");
  const letters = { W: tMatch("resultShort.W"), D: tMatch("resultShort.D"), L: tMatch("resultShort.L") };
  const isCurrentSeason = selectedSeason === CURRENT_SEASON;
  const seasonLabel = formatSeasonLabel(selectedSeason);

  // Fetch data — scorers only available for current season (FDO limitation)
  const [scorers, assists, squad, fixtures, standings] = await Promise.all([
    isCurrentSeason ? getTopScorers() : Promise.resolve([]),
    isCurrentSeason ? getTopAssists() : Promise.resolve([]),
    // The squad's own numbers (FPL, cached 6h): the league lists above stop at their top fifty.
    isCurrentSeason ? getAllFplStats() : Promise.resolve([]),
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

  const goalLeaders = buildLeaders(scorers, "goals");
  const assistLeaders = buildLeaders(assists, "assists");
  // The overview's strip: the last five results in all competitions, oldest first.
  const recentForm = seasonStats.formTimeline.slice(-5).map((e) => e.result);

  const seasonItems = getSelectableSeasons().map((y) => ({
    key: String(y),
    label: formatSeasonLabel(y),
    href: matchCentreHref("stats", y === CURRENT_SEASON ? undefined : y),
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

      <div className="page-container pb-16">
        <MatchCentreNav active="stats" season={isCurrentSeason ? undefined : selectedSeason} />
        <div className="space-y-10 pt-6 sm:space-y-14 sm:pt-10">
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
              <SectionHeader title={t("overview.title")} eyebrow={seasonLabel} />
              <SeasonOverview
                stats={seasonStats.overview}
                streak={seasonStats.records.currentStreak}
                form={recentForm}
                labels={{
                  groupAll: t("overview.groupAll"),
                  groupLeague: competitionName("pl", locale),
                  recentForm: t("overview.recentForm", { count: recentForm.length }),
                  played: t("overview.played"),
                  wins: t("overview.wins"),
                  draws: t("overview.draws"),
                  losses: t("overview.losses"),
                  goalsFor: t("overview.goalsFor"),
                  goalsAgainst: t("overview.goalsAgainst"),
                  goalDiff: t("overview.goalDiff"),
                  cleanSheets: t("overview.cleanSheets"),
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
                <ChartCard title={t("charts.scorers")} subtitle={chartSubtitle} flush>
                  <Leaderboard entries={goalLeaders} unit={t("leaderboard.goals")} label={t("charts.scorers")} />
                </ChartCard>
                {assistLeaders.length > 0 && (
                  <ChartCard title={t("charts.assists")} subtitle={chartSubtitle} flush>
                    <Leaderboard entries={assistLeaders} unit={t("leaderboard.assists")} label={t("charts.assists")} />
                  </ChartCard>
                )}
              </div>

              <SquadScorersTable players={squad} />
            </section>
          )}

          {seasonStats.monthly.length > 0 && (
            <section className="defer-render">
              <SectionHeader title={t("charts.goalsByMonth")} eyebrow={t("charts.goalsByMonthSub")} />
              <ChartCard>
                <LazyGoalsByMonthChart
                  data={seasonStats.monthly}
                  labels={{
                    scored: t("charts.scored"),
                    conceded: t("charts.conceded"),
                    partial: t("charts.partialMonth"),
                    matches: t("charts.matchesShort"),
                  }}
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
                  <HomeAwayTable
                    home={seasonStats.overview.homeRecord}
                    away={seasonStats.overview.awayRecord}
                    labels={{
                      home: t("charts.home"),
                      away: t("charts.away"),
                      played: t("overview.played"),
                      wins: t("overview.wins"),
                      draws: t("overview.draws"),
                      losses: t("overview.losses"),
                      gf: t("competitions.gfLong"),
                      ga: t("competitions.gaLong"),
                      short: {
                        played: t("overview.playedShort"),
                        w: letters.W,
                        d: letters.D,
                        l: letters.L,
                        gf: t("competitions.gf"),
                        ga: t("competitions.ga"),
                      },
                    }}
                  />
                </ChartCard>
                <ChartCard title={t("charts.formTimeline")} subtitle={t("charts.formTimelineSub", { count: seasonStats.formTimeline.length })}>
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
              letters={letters}
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
                  home: tMatch("home"),
                  away: tMatch("away"),
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
                letters={letters}
              />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Layout helper ───────────────────────────────────────────────────────────

function ChartCard({ title, subtitle, flush, children }: { title?: string; subtitle?: string; flush?: boolean; children: React.ReactNode }) {
  return (
    <div className="surface overflow-hidden">
      {title && (
        <div className="px-4 pt-4 sm:px-6 sm:pt-5">
          <h3 className="font-bebas text-2xl text-white">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-stadium-muted">{subtitle}</p>}
        </div>
      )}
      <div className={flush ? "pb-1 pt-2" : "px-2 pb-4 pt-3 sm:px-6 sm:pb-5"}>{children}</div>
    </div>
  );
}

