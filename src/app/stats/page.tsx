import { getTranslations } from "next-intl/server";
import { getTopScorers, getTopAssists, getFixtures, getStandings, computeSeasonStats } from "@/lib/football";
import { StatChart } from "@/components/stats/stat-chart";
import { SeasonOverview } from "@/components/stats/season-overview";
import { GoalsByMonthChart } from "@/components/stats/goals-by-month-chart";
import { HomeAwayChart } from "@/components/stats/home-away-chart";
import { FormTimeline } from "@/components/stats/form-timeline";
import { CompetitionBreakdown } from "@/components/stats/competition-breakdown";
import { RecordsMilestones } from "@/components/stats/records-milestones";
import { SeasonSelector } from "@/components/stats/season-selector";
import { SeasonComparison } from "@/components/stats/season-comparison";
import { makePageMeta, buildBreadcrumbJsonLd, getCanonical } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";

export async function generateMetadata() {
  const t = await getTranslations("Stats.metadata");
  const title = t("title");
  const description = t("description");
  return { title, description, ...makePageMeta(title, description, { path: "/stats" }) };
}

export const revalidate = 3600; // 1 hour

const CURRENT_SEASON = 2025;

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  const t = await getTranslations("Stats");
  const params = await searchParams;
  const selectedSeason = params.season ? parseInt(params.season, 10) : CURRENT_SEASON;
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

  // Fetch comparison seasons for season comparison chart (FDO free tier: 2022-2025)
  const comparisonSeasons = [2024, 2023, 2022].filter((s) => s !== selectedSeason);
  const compSeasonData = await Promise.all(
    comparisonSeasons.slice(0, 2).map(async (s) => {
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
        label: `${d.season}/${(d.season + 1).toString().slice(-2)}`,
        overview: d.stats.overview,
      })),
  ];

  // Liverpool-only scorers for the table
  const lfcScorers = scorers.filter((s) => s.statistics[0]?.team?.id === 40);

  return (
    <div className="min-h-screen">
      <JsonLd data={buildBreadcrumbJsonLd([
        { name: "Home", url: getCanonical("/") },
        { name: "Stats", url: getCanonical("/stats") },
      ])} />
      {/* ─── Hero ─── */}
      <div className="relative h-[40vh] min-h-[320px] flex items-end">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/assets/lfc/fans/fans-anfield.webp')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stadium-bg via-stadium-bg/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-stadium-bg/80 to-transparent" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 w-full flex items-end justify-between gap-4">
          <div>
            <p className="font-barlow text-lfc-red uppercase tracking-widest text-sm font-semibold mb-2">
              {`${t("hero.seasonLabel")} ${seasonLabel}`}
            </p>
            <h1 className="font-bebas text-7xl md:text-8xl text-white tracking-wider leading-none">
              {t("hero.title")}
            </h1>
          </div>
          <SeasonSelector />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16">

        {/* ─── Empty state for seasons with no data ─── */}
        {seasonStats.overview.played === 0 && fixtures.length === 0 && (
          <div className="bg-stadium-surface border border-stadium-border p-8 text-center mb-12">
            <p className="font-bebas text-2xl text-stadium-muted tracking-wider mb-2">{t("noData.title")}</p>
            <p className="font-inter text-sm text-stadium-muted">{t("noData.description")}</p>
          </div>
        )}

        {/* ─── Section 1: Season Overview ─── */}
        {seasonStats.overview.played > 0 && (
          <section className="mb-12">
            <SectionHeader title={t("overview.title")} subtitle={`${t("overview.allCompsLabel")} · ${seasonLabel}`} />
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

        {/* ─── Section 2: Top Scorers & Assists ─── */}
        {scorers.length > 0 && (
          <section className="mb-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title={t("charts.scorers")} subtitle={t("charts.legend")}>
                <StatChart scorers={scorers} type="goals" limit={10} />
              </ChartCard>
              {assists.length > 0 && (
                <ChartCard title={t("charts.assists")} subtitle={t("charts.legend")}>
                  <StatChart scorers={assists} type="assists" limit={10} />
                </ChartCard>
              )}
            </div>

            {/* LFC Scorers Table */}
            {lfcScorers.length > 0 && (
              <div className="mt-6 bg-stadium-surface border border-stadium-border overflow-hidden">
                <div className="px-6 py-4 border-b border-stadium-border">
                  <h2 className="font-bebas text-2xl text-white tracking-wider">{t("table.title")}</h2>
                </div>
                <div className="divide-y divide-stadium-border/50">
                  {lfcScorers.map((s, i) => {
                    const stat = s.statistics[0];
                    return (
                      <div key={s.player.id} className="flex items-center gap-4 px-6 py-3">
                        <span className="font-bebas text-xl text-stadium-muted w-6">{i + 1}</span>
                        <span className="font-inter text-sm text-white font-medium flex-1">{s.player.name}</span>
                        <div className="flex gap-6 text-center">
                          <div>
                            <p className="font-bebas text-xl text-lfc-red">{stat?.goals?.total ?? 0}</p>
                            <p className="font-barlow text-xs text-stadium-muted uppercase">{t("table.goalsShort")}</p>
                          </div>
                          <div>
                            <p className="font-bebas text-xl text-white">{stat?.goals?.assists ?? 0}</p>
                            <p className="font-barlow text-xs text-stadium-muted uppercase">{t("table.assistsShort")}</p>
                          </div>
                          <div>
                            <p className="font-bebas text-xl text-white">{stat?.games?.appearences ?? 0}</p>
                            <p className="font-barlow text-xs text-stadium-muted uppercase">{t("table.appsShort")}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ─── Section 3: Performance Charts ─── */}
        {seasonStats.monthly.length > 0 && (
          <section className="mb-12">
            <SectionHeader title={t("charts.goalsByMonth")} subtitle={t("charts.goalsByMonthSub")} />
            <ChartCard title={t("charts.goalsByMonth")} subtitle={t("charts.goalsByMonthSub")} hideHeader>
              <GoalsByMonthChart
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <ChartCard title={t("charts.homeAway")} subtitle={t("charts.homeAwaySub")}>
                <HomeAwayChart
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
                  legendLabels={{
                    win: t("charts.win"),
                    draw: t("charts.draw"),
                    loss: t("charts.loss"),
                  }}
                />
              </ChartCard>
            </div>
          </section>
        )}

        {/* ─── Section 4: Competition Breakdown ─── */}
        {seasonStats.competitions.length > 0 && (
          <section className="mb-12">
            <SectionHeader title={t("competitions.title")} subtitle={`${t("overview.allCompsLabel")} · ${seasonLabel}`} />
            <CompetitionBreakdown
              competitions={seasonStats.competitions}
              labels={{
                winRate: t("competitions.winRate"),
                gf: t("competitions.gf"),
                ga: t("competitions.ga"),
              }}
            />
          </section>
        )}

        {/* ─── Section 5: Records & Milestones ─── */}
        {seasonStats.overview.played > 0 && (
        <section className="mb-12">
          <SectionHeader title={t("records.title")} subtitle={t("records.subtitle")} />
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

        {/* ─── Section 6: Season Comparison ─── */}
        {seasonComparisonList.length >= 2 && (
          <section className="mb-12">
            <SectionHeader title={t("comparison.title")} subtitle={t("comparison.subtitle")} />
            <SeasonComparison
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

// ─── Shared UI helpers (inline, YAGNI) ──────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="w-1 h-8 bg-lfc-red rounded-full" />
      <div>
        <h2 className="font-bebas text-2xl sm:text-3xl text-white tracking-wider leading-none">{title}</h2>
        <p className="font-barlow text-[10px] sm:text-xs text-stadium-muted uppercase tracking-[0.15em] mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
  hideHeader,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  hideHeader?: boolean;
}) {
  return (
    <div className="bg-stadium-surface border border-stadium-border overflow-hidden">
      {!hideHeader && (
        <div className="px-6 pt-5 pb-0">
          <h3 className="font-bebas text-xl sm:text-2xl text-white tracking-wider mb-0.5">{title}</h3>
          <p className="font-inter text-[11px] text-stadium-muted mb-4">{subtitle}</p>
        </div>
      )}
      <div className="px-4 sm:px-6 pb-5 pt-2">
        {children}
      </div>
    </div>
  );
}
