import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getTopScorers, getTopAssists, getAllFplStats, getFixtures, getStandings, computeSeasonStats } from "@/lib/football";
import { getCachedFixtures } from "@/lib/football/cached-fixtures";
import type { FplPlayerStats } from "@/lib/football/fpl-stats";
import { getAllPlayers, type LfcPlayer } from "@/lib/squad-data";
import { SeasonOverview } from "@/components/stats/season-overview";
import { LazyGoalsByMonthChart, LazySeasonComparison } from "@/components/stats/lazy-charts";
import { FormTimeline } from "@/components/stats/form-timeline";
import { HomeAwayTable } from "@/components/stats/home-away-table";
import { buildLeaders, rankEntries, type LeaderEntry } from "@/components/stats/leaderboard";
import { CompetitionBreakdown } from "@/components/stats/competition-breakdown";
import { RecordsMilestones } from "@/components/stats/records-milestones";
import { ChipBar } from "@/components/fixtures/chip-bar";
import { MatchCentreNav } from "@/components/fixtures/match-centre-nav";
import { matchCentreHref } from "@/components/fixtures/match-centre-links";
import { PageHero } from "@/components/ui/page-hero";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { PresetConnectedGrid } from "@/components/ui/hub-links";
import { TeamCrest } from "@/components/ui/team-crest";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildLocalizedBreadcrumbJsonLd } from "@/lib/seo-breadcrumbs";
import { competitionName } from "@/lib/competition-labels";
import { JsonLd } from "@/components/seo/json-ld";
import {
  formatSeasonLabel,
  getCurrentSeasonYear,
  getSelectableSeasons,
} from "@/lib/football/current-season";

// ─── Squad slug lookup ───────────────────────────────────────────────────────

function normalizePlayerKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function buildSquadSlugMatcher(players: LfcPlayer[]) {
  const fullMap = new Map<string, string>();
  const surnameCounts = new Map<string, number>();
  const surnameMap = new Map<string, string>();

  for (const p of players) {
    fullMap.set(normalizePlayerKey(p.name), p.slug);
    if (p.shirtName) {
      const shirtKey = normalizePlayerKey(p.shirtName);
      surnameCounts.set(shirtKey, (surnameCounts.get(shirtKey) ?? 0) + 1);
      surnameMap.set(shirtKey, p.slug);
    }
    const parts = normalizePlayerKey(p.name).split(" ");
    const last = parts[parts.length - 1];
    if (last && last.length >= 3) {
      surnameCounts.set(last, (surnameCounts.get(last) ?? 0) + 1);
      surnameMap.set(last, p.slug);
    }
  }

  return (candidates: (string | null | undefined)[]): string | null => {
    for (const raw of candidates) {
      if (!raw) continue;
      const key = normalizePlayerKey(raw);
      const exact = fullMap.get(key);
      if (exact) return exact;
    }
    for (const raw of candidates) {
      if (!raw) continue;
      const key = normalizePlayerKey(raw);
      if (surnameCounts.get(key) === 1) {
        return surnameMap.get(key) ?? null;
      }
      const parts = key.split(" ");
      const last = parts[parts.length - 1];
      if (last && surnameCounts.get(last) === 1) {
        return surnameMap.get(last) ?? null;
      }
    }
    return null;
  };
}

export async function StatsSeasonView({
  locale,
  selectedSeason,
}: {
  locale: string;
  selectedSeason: number;
}) {
  setRequestLocale(locale);
  const currentSeason = getCurrentSeasonYear();
  const [t, tMatch, tHub] = await Promise.all([
    getTranslations("Stats"),
    getTranslations("Match"),
    getTranslations("Hub"),
  ]);
  const letters = { W: tMatch("resultShort.W"), D: tMatch("resultShort.D"), L: tMatch("resultShort.L") };
  const isCurrentSeason = selectedSeason === currentSeason;
  const seasonLabel = formatSeasonLabel(selectedSeason);
  const comparisonSeasons = [selectedSeason - 1, selectedSeason - 2];

  // Parallelize current season + comparison archive seasons + breadcrumb JSON-LD
  // in a single Promise.all to eliminate sequential cold-render waterfalls.
  const [scorers, assists, squad, fixtures, standings, compSeasonData, breadcrumbJsonLd] = await Promise.all([
    isCurrentSeason ? getTopScorers() : Promise.resolve([]),
    isCurrentSeason ? getTopAssists() : Promise.resolve([]),
    isCurrentSeason ? getAllFplStats() : Promise.resolve([]),
    isCurrentSeason ? getCachedFixtures() : getFixtures(selectedSeason),
    isCurrentSeason ? getStandings() : getStandings(selectedSeason).catch(() => []),
    Promise.all(
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
      }),
    ),
    buildLocalizedBreadcrumbJsonLd(locale, [
      { nav: "stats", path: isCurrentSeason ? "/stats" : `/stats/${selectedSeason}` },
    ]),
  ]);

  const seasonStats = computeSeasonStats(fixtures, standings);
  const seasonComparisonList = [
    { label: `${selectedSeason}/${(selectedSeason + 1).toString().slice(-2)}`, overview: seasonStats.overview },
    ...compSeasonData
      .filter((d): d is NonNullable<typeof d> => d !== null && d.stats.overview.played > 0)
      .map((d) => ({
        label: formatSeasonLabel(d.season),
        overview: d.stats.overview,
      })),
  ];

  const matchSquadSlug = buildSquadSlugMatcher(getAllPlayers());
  const scorerSlugById = new Map<number, string>();
  for (const s of [...scorers, ...assists]) {
    if (s.statistics[0]?.team?.id !== 40) continue;
    const slug = matchSquadSlug([
      s.player.name,
      `${s.player.firstname} ${s.player.lastname}`.trim(),
      s.player.lastname,
    ]);
    if (slug) scorerSlugById.set(s.player.id, slug);
  }

  const goalLeaders = buildLeaders(scorers, "goals");
  const assistLeaders = buildLeaders(assists, "assists");
  // The overview's strip: the last five results in all competitions, oldest first.
  const recentForm = seasonStats.formTimeline.slice(-5).map((e) => e.result);

  const seasonItems = getSelectableSeasons().map((y) => ({
    key: String(y),
    label: formatSeasonLabel(y),
    href: matchCentreHref("stats", y === currentSeason ? undefined : y),
  }));
  const hasData = seasonStats.overview.played > 0;
  const chartSubtitle = t("charts.legend", { season: seasonLabel });
  const seasonOverviewHref = `/season?season=${selectedSeason}`;

  return (
    <div className="min-h-screen">
      <JsonLd data={breadcrumbJsonLd} />
      <PageHero
        clubCrest
        eyebrow={`${t("hero.seasonLabel")} ${seasonLabel}`}
        title={t("hero.title")}
        description={t("hero.description")}
        image="/assets/lfc/fans/fans-anfield.webp"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ChipBar items={seasonItems} active={String(selectedSeason)} ariaLabel={t("seasonPicker")} />
            <Link
              href={seasonOverviewHref}
              className="inline-flex min-h-9 items-center gap-1.5 border border-stadium-border bg-stadium-surface/90 px-3 font-barlow text-xs font-semibold uppercase tracking-[0.1em] text-lfc-gold transition-colors hover:border-lfc-gold/50 hover:text-white"
            >
              {tHub("nav.season")} · {seasonLabel}
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        }
      />

      <MatchCentreNav active="stats" season={isCurrentSeason ? undefined : selectedSeason} />

      <div className="page-container pb-20 pt-8 sm:pt-10">
        <div className="mb-6 flex flex-wrap items-center gap-2 lg:hidden">
          <ChipBar items={seasonItems} active={String(selectedSeason)} ariaLabel={t("seasonPicker")} />
          <Link
            href={seasonOverviewHref}
            className="inline-flex min-h-9 items-center gap-1.5 border border-stadium-border bg-stadium-surface/90 px-3 font-barlow text-xs font-semibold uppercase tracking-[0.1em] text-lfc-gold transition-colors hover:border-lfc-gold/50 hover:text-white"
          >
            {tHub("nav.season")} · {seasonLabel}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
        <div className="space-y-10 sm:space-y-14">
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
              <SectionHeader
                title={t("overview.title")}
                eyebrow={seasonLabel}
                href={seasonOverviewHref}
                linkLabel={`${tHub("nav.season")} · ${seasonLabel}`}
              />
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
                  <LinkedLeaderboard
                    entries={goalLeaders}
                    unit={t("leaderboard.goals")}
                    label={t("charts.scorers")}
                    slugById={scorerSlugById}
                    tLeaderboard={t}
                  />
                </ChartCard>
                {assistLeaders.length > 0 && (
                  <ChartCard title={t("charts.assists")} subtitle={chartSubtitle} flush>
                    <LinkedLeaderboard
                      entries={assistLeaders}
                      unit={t("leaderboard.assists")}
                      label={t("charts.assists")}
                      slugById={scorerSlugById}
                      tLeaderboard={t}
                    />
                  </ChartCard>
                )}
              </div>

              <LinkedSquadScorersTable
                players={squad}
                matchSquadSlug={matchSquadSlug}
                tStats={t}
              />
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
              <SectionHeader
                title={t("records.title")}
                eyebrow={isCurrentSeason ? t("records.subtitle") : seasonLabel}
              />
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

          <PresetConnectedGrid
            preset="fromStats"
            metaOverrides={{
              season: seasonLabel,
              standings: seasonStats.overview.rank > 0 ? `#${seasonStats.overview.rank}` : undefined,
              fixtures: hasData ? `${seasonStats.overview.played} ${tHub("metrics.played")}` : undefined,
            }}
            className="pt-2"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Layout helpers ──────────────────────────────────────────────────────────

const TOP_LEADERS = 5;

function LinkedLeaderboard({
  entries,
  unit,
  label,
  slugById,
  tLeaderboard,
}: {
  entries: LeaderEntry[];
  unit: string;
  label: string;
  slugById: Map<number, string>;
  tLeaderboard: Awaited<ReturnType<typeof getTranslations<"Stats">>>;
}) {
  const ranked = rankEntries(entries);
  const top = ranked.slice(0, TOP_LEADERS);
  const rest = ranked.slice(TOP_LEADERS).filter((e) => e.isLiverpool);
  const max = Math.max(1, ...ranked.map((e) => e.value));

  const row = (e: (typeof ranked)[number]) => {
    const slug = e.isLiverpool ? slugById.get(e.id) : undefined;
    const nameEl = slug ? (
      <Link
        href={`/player/${slug}`}
        className="font-semibold text-white underline-offset-4 decoration-lfc-red/70 hover:text-lfc-gold hover:underline"
      >
        {e.surname}
      </Link>
    ) : (
      <span className={cn("font-semibold", e.isLiverpool ? "text-white" : "text-white/90")}>
        {e.surname}
      </span>
    );

    return (
      <li
        key={e.id}
        className={cn(
          "relative grid grid-cols-[2rem_1.25rem_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1.5 px-3 py-2.5 sm:px-4",
          e.isLiverpool && "bg-lfc-red/10",
        )}
      >
        {e.isLiverpool && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-lfc-red" />}
        <span className="font-bebas text-xl leading-none tabular-nums text-stadium-muted">
          <span aria-hidden>{e.tied ? `=${e.rank}` : e.rank}</span>
          <span className="sr-only">{tLeaderboard(e.tied ? "leaderboard.tiedRank" : "leaderboard.rank", { rank: e.rank })}</span>
        </span>
        <span className="relative size-5">
          <TeamCrest src={e.crest} name={e.club} sizes="20px" />
        </span>
        <span className="min-w-0 truncate text-sm">
          {nameEl}
          {e.club && <span className="text-stadium-muted"> · {e.club}</span>}
        </span>
        <span className={cn("font-bebas text-2xl leading-none tabular-nums", e.isLiverpool ? "text-brand" : "text-white")}>
          {e.value}
          <span className="sr-only"> {unit}</span>
        </span>
        <span aria-hidden className="col-span-2 col-start-3 h-1.5 bg-white/10">
          <span
            className={cn("block h-full", e.isLiverpool ? "bg-lfc-red" : "bg-white/40")}
            style={{ width: `${(e.value / max) * 100}%` }}
          />
        </span>
      </li>
    );
  };

  return (
    <ol aria-label={label} className="divide-y divide-[var(--line)]">
      {top.map(row)}
      {rest.length > 0 && (
        <li aria-hidden className="border-t border-dashed border-white/20 px-4 py-1 text-center text-xs leading-none text-stadium-muted">
          ···
        </li>
      )}
      {rest.map(row)}
    </ol>
  );
}

function LinkedSquadScorersTable({
  players,
  matchSquadSlug,
  tStats,
}: {
  players: FplPlayerStats[];
  matchSquadSlug: (candidates: (string | null | undefined)[]) => string | null;
  tStats: Awaited<ReturnType<typeof getTranslations<"Stats">>>;
}) {
  const scorers = players
    .filter((p) => p.goalsScored > 0)
    .sort((a, b) => b.goalsScored - a.goalsScored || b.assists - a.assists || a.minutes - b.minutes);
  if (scorers.length === 0) return null;

  const head = "h-9 px-3 text-right font-barlow text-xs font-semibold uppercase tracking-wider text-stadium-muted sm:px-4";
  const num = "px-3 text-right font-bebas text-xl leading-none tabular-nums sm:px-4";

  return (
    <div className="surface mt-4 overflow-hidden sm:mt-6">
      <h2 className="border-b border-[var(--line)] px-4 py-3 font-bebas text-2xl text-white sm:px-6">{tStats("table.title")}</h2>
      <Table>
        <TableHeader>
          <TableRow className="border-[var(--line)] hover:bg-transparent">
            <TableHead className={`${head} text-left`}>{tStats("table.player")}</TableHead>
            <TableHead className={head}>{tStats("table.goalsShort")}</TableHead>
            <TableHead className={head}>{tStats("table.assistsShort")}</TableHead>
            <TableHead className={head}>{tStats("table.minutesShort")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {scorers.map((p) => {
            const slug = matchSquadSlug([`${p.firstName} ${p.secondName}`.trim(), p.webName, p.secondName]);
            return (
              <TableRow key={p.fplId} className="h-12 border-[var(--line)] hover:bg-white/[0.03]">
                <TableCell className="max-w-0 truncate px-3 text-sm font-medium text-white sm:px-4">
                  {slug ? (
                    <Link
                      href={`/player/${slug}`}
                      className="inline-flex items-center gap-1.5 text-white underline-offset-4 decoration-lfc-red/70 hover:text-lfc-gold hover:underline"
                    >
                      {p.webName}
                    </Link>
                  ) : (
                    p.webName
                  )}
                </TableCell>
                <TableCell className={`${num} text-brand`}>{p.goalsScored}</TableCell>
                <TableCell className={`${num} text-white`}>{p.assists}</TableCell>
                <TableCell className={`${num} text-stadium-muted`}>{p.minutes}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function ChartCard({ title, subtitle, flush, children }: { title?: string; subtitle?: string; flush?: boolean; children: React.ReactNode }) {
  return (
    <div className="surface overflow-hidden">
      {title && (
        <div className="px-4 pt-4 sm:px-6 sm:pt-5">
          <h2 className="font-bebas text-2xl text-white">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-stadium-muted">{subtitle}</p>}
        </div>
      )}
      <div className={flush ? "pb-1 pt-2" : "px-2 pb-4 pt-3 sm:px-6 sm:pb-5"}>{children}</div>
    </div>
  );
}

