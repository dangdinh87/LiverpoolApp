import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { ArrowLeft, ListOrdered, BarChart3, Shirt, Swords } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  getFixtures,
  getFixtureById,
  getFixtureEvents,
  getFixtureLineups,
  getFixtureStatistics,
  getMatchDetail,
  computeH2H,
} from "@/lib/football";
import { getCurrentSeasonYear } from "@/lib/football/current-season";
import { H2HSection } from "@/components/fixtures/h2h-section";
import { roundLabel } from "@/components/fixtures/round-label";
import { displayTeamName } from "@/components/fixtures/team-name";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import {
  LFC_ID,
  LineupSection,
  StatsComparison,
  TimelineRow,
} from "@/components/fixtures/match-detail-parts";
import {
  MATCH_STAT_KEYS,
  MatchScoreHeader,
  matchesFixtureTeam,
  parsePositiveFixtureId,
} from "@/components/fixtures/match-score-header";
import { FormationPitch } from "@/components/fixtures/formation-pitch";
import { SpoilerRevealPanel } from "@/components/fixtures/spoiler-controls";
import { FanPrediction } from "@/components/fixtures/fan-prediction";
import { PlayerRatings } from "@/components/fixtures/player-ratings";
import { LiveDetailStats, LiveDetailTimeline } from "@/components/fixtures/live-match-detail";
import type { Fixture } from "@/lib/types/football";
import { getMatchResult } from "@/lib/types/football";
import { cn } from "@/lib/utils";
import { buildSportsEventJsonLd, getLocalizedUrl, makePageMeta } from "@/lib/seo";
import { buildLocalizedBreadcrumbJsonLd } from "@/lib/seo-breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { ArticleCard } from "@/components/site-articles/article-card";
import { getArticlesForFixture, pickSiteArticleContent } from "@/lib/site-articles/db";
import type { SiteArticleContent } from "@/lib/site-articles/types";
import { defaultTimeZoneForLocale, formatMatchDayMonth, formatMatchTime } from "@/lib/format-match-date";

export const revalidate = 1800; // 30 minutes (live scores poll via useLiveMatch)

const getCachedFixtureArticles = unstable_cache(
  async (fixtureId: number) => getArticlesForFixture(fixtureId),
  ["fixture-articles-v1"],
  { revalidate: 21600, tags: ["site-articles"] },
);

export async function generateStaticParams() {
  return [];
}

interface PageProps {
  params: Promise<{ id: string; locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id, locale } = await params;
  const fixtureId = parsePositiveFixtureId(id);
  const tMeta = await getTranslations({ locale, namespace: "Fixtures.metadata" });
  if (!fixtureId) return { title: tMeta("title"), robots: { index: false } };
  const match = await getFixtureById(fixtureId);
  if (!match) return { title: tMeta("title"), robots: { index: false } };
  const t = await getTranslations({ locale, namespace: "Fixtures.detail" });
  const tRound = await getTranslations({ locale, namespace: "Match.round" });
  const home = displayTeamName(match.teams.home.name);
  const away = displayTeamName(match.teams.away.name);
  const title = `${home} vs ${away}`;
  const round = roundLabel(tRound, match.league.round);
  const competition = [match.league.name, round].filter(Boolean).join(" · ");
  const date = new Date(match.fixture.date);
  const finished = ["FT", "AET", "PEN"].includes(match.fixture.status.short);
  const description = finished
    ? t("metaFinished", { home, away, homeGoals: match.goals.home ?? 0, awayGoals: match.goals.away ?? 0, competition })
    : t("metaUpcoming", {
        home,
        away,
        time: formatMatchTime(date, defaultTimeZoneForLocale(locale)),
        date: formatMatchDayMonth(date, locale === "vi" ? "vi" : "en", true, defaultTimeZoneForLocale(locale)),
        competition,
      });
  return {
    title,
    description,
    ...makePageMeta(title, description, { locale, path: `/fixtures/${id}` }),
  };
}

export default async function FixtureDetailPage({ params }: PageProps) {
  const { id, locale } = await params;
  setRequestLocale(locale);
  const fixtureId = parsePositiveFixtureId(id);
  if (!fixtureId) notFound();

  const [match, tDetail, tMatch, tCard, tRound] = await Promise.all([
    getFixtureById(fixtureId),
    getTranslations("Fixtures.detail"),
    getTranslations("Match"),
    getTranslations("Fixtures.detail.empty"),
    getTranslations("Match.round"),
  ]);
  if (!match) notFound();

  const loc = locale === "vi" ? "vi-VN" : "en-GB";
  const { fixture: f, league, teams, goals, score } = match;
  const result = getMatchResult(match);
  const isFinished = ["FT", "AET", "PEN"].includes(f.status.short);
  const isLive = ["1H", "2H", "HT", "ET", "P", "BT", "LIVE"].includes(f.status.short);

  const [events, lineups, providerStats, espnDetail, prevFixtures, seasonFixtures, fixtureArticlesRaw] = await Promise.all([
    isFinished ? getFixtureEvents(fixtureId, f.date) : Promise.resolve([]),
    getFixtureLineups(fixtureId, f.date),
    isFinished ? getFixtureStatistics(fixtureId) : Promise.resolve([]),
    isFinished ? getMatchDetail(f.date) : Promise.resolve(null),
    league.season > 0
      ? getFixtures(league.season - 1).catch(() => [] as Fixture[])
      : Promise.resolve([] as Fixture[]),
    league.season === getCurrentSeasonYear() ? getFixtures() : getFixtures(league.season),
    getCachedFixtureArticles(fixtureId).catch(() => []),
  ]);
  const fixtureArticles = fixtureArticlesRaw
    .map((row) => {
      const content = pickSiteArticleContent(row, locale);
      return content ? { row, content } : null;
    })
    .filter((item): item is { row: (typeof fixtureArticlesRaw)[number]; content: SiteArticleContent } => item !== null);

  const opponentId = teams.home.id === LFC_ID ? teams.away.id : teams.home.id;
  const opponentName = teams.home.id === LFC_ID ? teams.away.name : teams.home.name;
  const h2h = computeH2H([...seasonFixtures, ...prevFixtures], opponentId);

  const date = new Date(f.date);
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const isConfirmed = isFinished || isLive || date.getTime() - now <= 3_600_000;
  const uiLocale: "vi" | "en" = locale === "vi" ? "vi" : "en";

  const statLabels: Record<string, string> = {};
  for (const key of MATCH_STAT_KEYS) {
    try { statLabels[key] = tMatch(`statLabels.${key}`); } catch { statLabels[key] = key; }
  }

  const matchStats = espnDetail?.stats?.length ? espnDetail.stats : providerStats;
  const homeStats = matchStats.find((s) => matchesFixtureTeam(s.team, teams.home));
  const awayStats = matchStats.find((s) => matchesFixtureTeam(s.team, teams.away));

  const homeLineup =
    lineups.find((l) => l.team.id === teams.home.id) ??
    lineups.find((l) => matchesFixtureTeam(l.team, teams.home));
  const awayLineup =
    lineups.find((l) => l.team.id === teams.away.id) ??
    lineups.find((l) => matchesFixtureTeam(l.team, teams.away));

  const venue = espnDetail?.venue ?? ([f.venue.name, f.venue.city].filter(Boolean).join(", ") || null);
  const attendance = espnDetail?.attendance;
  const referee = espnDetail?.referee;

  const resolvedEvents = events.map((e) => {
    if (e.team.id === teams.home.id || e.team.id === teams.away.id) return e;
    const isHome = matchesFixtureTeam(e.team, teams.home);
    const isAway = !isHome && matchesFixtureTeam(e.team, teams.away);
    const resolvedId = isHome ? teams.home.id : isAway ? teams.away.id : e.team.id;
    return { ...e, team: { ...e.team, id: resolvedId } };
  });

  const goalEvents = resolvedEvents.filter((e) => e.type === "Goal");
  const homeGoals = goalEvents.filter((e) => e.team.id === teams.home.id);
  const awayGoals = goalEvents.filter((e) => e.team.id === teams.away.id);

  const hasEvents = resolvedEvents.length > 0;
  const hasLineups = !!(homeLineup || awayLineup);
  const lineupLabel = isConfirmed ? tDetail("lineupsConfirmed") : tDetail("lineupsPredicted");
  const homeIsLfc = teams.home.id === LFC_ID;
  const pens =
    f.status.short === "PEN" && score.penalty.home !== null && score.penalty.away !== null
      ? `${score.penalty.home}–${score.penalty.away}`
      : null;
  const resultWord = result === "W" ? tMatch("win") : result === "D" ? tMatch("draw") : tMatch("loss");
  const hasStarted = isFinished || isLive;
  const homeName = displayTeamName(teams.home.name);
  const awayName = displayTeamName(teams.away.name);
  const round = roundLabel(tRound, league.round);
  const sections = [
    ...(hasStarted
      ? [
          { id: "timeline", label: tMatch("tabs.timeline") },
          { id: "stats", label: tMatch("tabs.stats") },
        ]
      : []),
    { id: "lineups", label: tMatch("tabs.lineups") },
    { id: "h2h", label: tMatch("tabs.h2h") },
  ];
  const sectionClass = "mt-10 scroll-mt-[calc(var(--header-h)+3.5rem)]";

  return (
    <div className="min-h-screen pb-16 pt-[calc(var(--header-h)+1rem)] sm:pt-[calc(var(--header-h)+1.5rem)]">
      <JsonLd data={[
        await buildLocalizedBreadcrumbJsonLd(locale, [
          { nav: "fixtures", path: "/fixtures" },
          { name: `${teams.home.name} vs ${teams.away.name}`, path: `/fixtures/${id}` },
        ]),
        buildSportsEventJsonLd({
          name: `${teams.home.name} vs ${teams.away.name}`,
          url: getLocalizedUrl(`/fixtures/${id}`, locale),
          startDate: f.date,
          venue: espnDetail?.venue ?? f.venue?.name ?? (homeIsLfc ? "Anfield" : null),
          venueCity: f.venue?.city ?? (homeIsLfc ? "Liverpool" : null),
          homeTeam: teams.home.name,
          awayTeam: teams.away.name,
          competition: league.name,
          homeScore: goals?.home,
          awayScore: goals?.away,
          status: f.status.short,
        }),
      ]} />
      <div className="page-container">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/fixtures"
            className="group mb-4 inline-flex min-h-11 items-center gap-2 text-sm text-stadium-muted transition-colors hover:text-white"
          >
            <ArrowLeft size={16} aria-hidden className="transition-transform group-hover:-translate-x-1" />
            {tDetail("back")}
          </Link>

          <MatchScoreHeader
            match={match}
            uiLocale={uiLocale}
            round={round}
            result={result}
            resultWord={resultWord}
            isFinished={isFinished}
            isLive={isLive}
            homeLineup={homeLineup}
            awayLineup={awayLineup}
            homeGoals={homeGoals}
            awayGoals={awayGoals}
            venue={venue}
            attendance={attendance}
            referee={referee}
            halftimeLabel={tMatch("halftimeShort")}
            aetLabel={tMatch("aet")}
            penLabel={pens ? tMatch("penShort", { score: pens }) : null}
            attendanceLabel={attendance != null && attendance > 0 ? tDetail("attendance", { count: attendance.toLocaleString(loc) }) : null}
            refereeLabel={referee ? tDetail("referee", { name: referee }) : null}
          />

          {hasStarted && <SpoilerRevealPanel />}

          {isFinished ? (
            <div className="spoiler-hide">
              <FanPrediction fixture={match} />
              <PlayerRatings fixtureId={fixtureId} />
            </div>
          ) : (
            <FanPrediction fixture={match} />
          )}

          {sections.length > 2 && (
            <nav
              aria-label={tDetail("sectionsLabel")}
              className="sticky top-[var(--header-h)] z-30 -mx-4 mt-4 border-b border-[var(--line)] bg-stadium-bg/95 px-4 backdrop-blur md:hidden"
            >
              <div className="scroll-x flex">
                {sections.map((sec) => (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    className="inline-flex min-h-11 flex-1 items-center justify-center whitespace-nowrap px-3 font-barlow text-[15px] font-semibold uppercase tracking-[0.08em] text-stadium-muted transition-colors hover:text-white"
                  >
                    {sec.label}
                  </a>
                ))}
              </div>
            </nav>
          )}

          {!hasStarted && <p className="mt-6 text-sm text-stadium-muted">{tDetail("noData")}</p>}

          {hasStarted && (
            <section id="timeline" className={cn(sectionClass, "spoiler-hide")}>
              <SectionHeader title={tDetail("matchTimeline")} />
              {isLive ? (
                <LiveDetailTimeline initial={match} />
              ) : hasEvents ? (
                <ul className="surface px-4 sm:px-5">
                  {resolvedEvents.map((event, i) => (
                    <TimelineRow key={i} event={event} homeTeamId={teams.home.id} />
                  ))}
                </ul>
              ) : (
                <EmptyState
                  className="py-8 sm:py-10"
                  icon={<ListOrdered className="size-7" aria-hidden />}
                  title={tCard("events.title")}
                  description={tCard("events.description")}
                />
              )}
            </section>
          )}

          {hasStarted && (
            <section id="stats" className={cn(sectionClass, "spoiler-hide")}>
              <SectionHeader title={tDetail("statistics")} />
              {isLive ? (
                <LiveDetailStats initial={match} homeName={homeName} awayName={awayName} />
              ) : homeStats && awayStats ? (
                <div className="surface p-4 sm:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3 text-sm font-semibold text-white">
                    <span className="min-w-0 truncate">{homeName}</span>
                    <span className="min-w-0 truncate text-right">{awayName}</span>
                  </div>
                  <StatsComparison home={homeStats} away={awayStats} statLabels={statLabels} homeIsLfc={homeIsLfc} />
                </div>
              ) : (
                <EmptyState
                  className="py-8 sm:py-10"
                  icon={<BarChart3 className="size-7" aria-hidden />}
                  title={tCard("stats.title")}
                  description={tCard("stats.description")}
                />
              )}
            </section>
          )}

          <section id="lineups" className={sectionClass}>
            <SectionHeader title={tDetail("lineups")} />
            {hasLineups ? (
              <div className="space-y-4">
                {homeLineup && awayLineup && <FormationPitch homeLineup={homeLineup} awayLineup={awayLineup} />}
                <div className="surface p-4 sm:p-5">
                  <span className={cn(
                    "mb-4 inline-block border px-2 py-0.5 font-barlow text-xs font-semibold uppercase tracking-wider",
                    isConfirmed
                      ? "border-green-500/30 bg-green-500/10 text-green-400"
                      : "border-lfc-gold/30 bg-lfc-gold/10 text-lfc-gold",
                  )}>
                    {lineupLabel}
                  </span>
                  <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                    {homeLineup && <LineupSection lineup={homeLineup} subsLabel={tDetail("substitutes")} coachLabel={tDetail("coach")} />}
                    {awayLineup && <LineupSection lineup={awayLineup} subsLabel={tDetail("substitutes")} coachLabel={tDetail("coach")} />}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                className="py-8 sm:py-10"
                icon={<Shirt className="size-7" aria-hidden />}
                title={tCard("lineups.title")}
                description={tCard("lineups.description")}
              />
            )}
          </section>

          <section id="h2h" className={cn(sectionClass, hasStarted && "spoiler-hide")}>
            <SectionHeader title={tMatch("h2h.title")} />
            {h2h ? (
              <H2HSection h2h={h2h} opponentName={displayTeamName(opponentName)} />
            ) : (
              <EmptyState
                className="py-8 sm:py-10"
                icon={<Swords className="size-7" aria-hidden />}
                title={tCard("h2h.title")}
                description={tCard("h2h.description")}
              />
            )}
          </section>

          {fixtureArticles.length > 0 && (
            <section id="analysis" className={sectionClass}>
              <SectionHeader title={tDetail("matchAnalysis")} href="/analysis" />
              <ul className="grid gap-3 sm:grid-cols-2">
                {fixtureArticles.map(({ row, content }) => (
                  <li key={row.id}>
                    <ArticleCard
                      article={{
                        slug: row.slug,
                        kind: row.kind,
                        title: content.title,
                        excerpt: content.excerpt,
                        publishedAt: row.match_date ?? row.published_at,
                      }}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
