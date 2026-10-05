import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Users, CircleDot, ListOrdered, BarChart3, Shirt, Swords } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
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
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import {
  LFC_ID,
  LineupSection,
  ScorerList,
  StatsComparison,
  TimelineRow,
  teamLogo,
} from "@/components/fixtures/match-detail-parts";
import { FormationPitch } from "@/components/fixtures/formation-pitch";
import type { Fixture } from "@/lib/types/football";
import { getMatchResult } from "@/lib/types/football";
import { cn } from "@/lib/utils";
import { buildBreadcrumbJsonLd, buildSportsEventJsonLd, getCanonical, makePageMeta } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import { formatMatchDayMonth, formatMatchTime } from "@/lib/format-match-date";

export const revalidate = 300; // 5 minutes

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const match = await getFixtureById(Number(id));
  if (!match) return { title: "Match", robots: { index: false } };
  const title = `${match.teams.home.name} vs ${match.teams.away.name}`;
  const description = `${match.league.name} — ${match.league.round}`;
  return {
    title,
    description,
    ...makePageMeta(title, description, { path: `/fixtures/${id}` }),
  };
}

export default async function FixtureDetailPage({ params }: PageProps) {
  const { id } = await params;
  const fixtureId = Number(id);

  const [match, tDetail, tMatch, tCard] = await Promise.all([
    getFixtureById(fixtureId),
    getTranslations("Fixtures.detail"),
    getTranslations("Match"),
    getTranslations("Fixtures.detail.empty"),
  ]);
  if (!match) notFound();

  const locale = await getLocale();
  const loc = locale === "vi" ? "vi-VN" : "en-GB";
  const { fixture: f, league, teams, goals, score } = match;
  const result = getMatchResult(match);
  const isFinished = ["FT", "AET", "PEN"].includes(f.status.short);
  const isLive = ["1H", "2H", "HT", "ET", "P", "LIVE"].includes(f.status.short);

  const [events, lineups, providerStats, espnDetail, prevFixtures, seasonFixtures] = await Promise.all([
    isFinished ? getFixtureEvents(fixtureId, f.date) : Promise.resolve([]),
    getFixtureLineups(fixtureId, f.date),
    isFinished ? getFixtureStatistics(fixtureId) : Promise.resolve([]),
    isFinished ? getMatchDetail(f.date) : Promise.resolve(null),
    // Fetch the season before this fixture's for richer H2H data. Derived from
    // the fixture rather than pinned to a year, which went stale every August.
    league.season > 0
      ? getFixtures(league.season - 1).catch(() => [] as Fixture[])
      : Promise.resolve([] as Fixture[]),
    // The fixture's own season (the current one is the no-argument call, which
    // getFixtureById already made, so React.cache dedupes it).
    league.season === getCurrentSeasonYear() ? getFixtures() : getFixtures(league.season),
  ]);

  // H2H: compute from this season's + the previous season's fixtures
  const opponentId = teams.home.id === LFC_ID ? teams.away.id : teams.home.id;
  const opponentName = teams.home.id === LFC_ID ? teams.away.name : teams.home.name;
  const allFixturesForH2H = [...seasonFixtures, ...prevFixtures];
  const h2h = computeH2H(allFixturesForH2H, opponentId);

  const date = new Date(f.date);
  // Match confirmation depends on current server time.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const msToKickoff = date.getTime() - now;
  const isConfirmed = isFinished || isLive || msToKickoff <= 3_600_000;
  const dateStr = formatMatchDayMonth(date, locale === "vi" ? "vi" : "en", true);
  const timeStr = formatMatchTime(date);

  // Build stat label translation map
  const STAT_KEYS = [
    "Ball Possession", "Total Shots", "Shots on Target", "Shots off Target",
    "Blocked Shots", "Saves", "Corner Kicks", "Offsides", "Fouls",
    "Yellow Cards", "Red Cards", "Total Passes", "Accurate Passes",
    "Pass Accuracy", "Tackles Won", "Interceptions", "Clearances", "Expected Goals",
  ];
  const statLabels: Record<string, string> = {};
  for (const key of STAT_KEYS) {
    try { statLabels[key] = tMatch(`statLabels.${key}`); } catch { statLabels[key] = key; }
  }

  const matchStats = espnDetail?.stats?.length ? espnDetail.stats : providerStats;
  const homeStats = matchStats.find((s) =>
    s.team.id === teams.home.id || s.team.name.toLowerCase().includes(teams.home.name.toLowerCase().split(" ")[0].toLowerCase())
  );
  const awayStats = matchStats.find((s) =>
    s.team.id === teams.away.id || s.team.name.toLowerCase().includes(teams.away.name.toLowerCase().split(" ")[0].toLowerCase())
  );

  // Match lineups by team ID first, then by name (IDs differ across FDO/ESPN providers)
  const homeLineup = lineups.find((l) => l.team.id === teams.home.id)
    ?? lineups.find((l) => l.team.name.toLowerCase().includes(teams.home.name.toLowerCase().split(" ")[0].toLowerCase()));
  const awayLineup = lineups.find((l) => l.team.id === teams.away.id)
    ?? lineups.find((l) => l.team.name.toLowerCase().includes(teams.away.name.toLowerCase().split(" ")[0].toLowerCase()));

  const htHome = score.halftime.home;
  const htAway = score.halftime.away;
  const hasHt = htHome !== null && htAway !== null;

  const venue = espnDetail?.venue ?? ([f.venue.name, f.venue.city].filter(Boolean).join(", ") || null);
  const attendance = espnDetail?.attendance;
  const referee = espnDetail?.referee;

  // Goal scorers for header display
  const goalEvents = events.filter((e) => e.type === "Goal");
  const resolvedGoals = goalEvents.map((e) => {
    if (e.team.id !== 0) return e;
    const name = e.team.name.toLowerCase();
    const homeName = teams.home.name.toLowerCase();
    const awayName = teams.away.name.toLowerCase();
    const homeMatch = homeName.includes(name) || name.includes(homeName.split(" ")[0]);
    const awayMatch = awayName.includes(name) || name.includes(awayName.split(" ")[0]);
    const resolvedId = homeMatch ? teams.home.id : awayMatch ? teams.away.id : 0;
    return { ...e, team: { ...e.team, id: resolvedId } };
  });
  const homeGoals = resolvedGoals.filter((e) => e.team.id === teams.home.id);
  const awayGoals = resolvedGoals.filter((e) => e.team.id === teams.away.id);

  const resolvedEvents = events.map((e) => {
    if (e.team.id !== 0) return e;
    const name = e.team.name.toLowerCase();
    const homeName = teams.home.name.toLowerCase();
    const awayName = teams.away.name.toLowerCase();
    const homeMatch = homeName.includes(name) || name.includes(homeName.split(" ")[0]);
    const awayMatch = awayName.includes(name) || name.includes(awayName.split(" ")[0]);
    const resolvedId = homeMatch ? teams.home.id : awayMatch ? teams.away.id : 0;
    return { ...e, team: { ...e.team, id: resolvedId } };
  });

  const hasEvents = resolvedEvents.length > 0;
  const hasLineups = !!(homeLineup || awayLineup);
  const lineupLabel = isConfirmed ? tDetail("lineupsConfirmed") : tDetail("lineupsPredicted");
  const homeIsLfc = teams.home.id === LFC_ID;
  const pens =
    f.status.short === "PEN" && score.penalty.home !== null && score.penalty.away !== null
      ? `${score.penalty.home}–${score.penalty.away}`
      : null;
  const resultWord = result === "W" ? tMatch("win") : result === "D" ? tMatch("draw") : tMatch("loss");
  const resultTone =
    result === "W" ? "border-green-500/40 bg-green-500/10 text-green-400"
    : result === "D" ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
    : "border-red-500/40 bg-red-500/10 text-red-400";
  const pendingNote = isFinished || isLive ? null : tCard("afterKickoff");

  return (
    <div className="min-h-screen pb-16 pt-[calc(var(--header-h)+1rem)] sm:pt-[calc(var(--header-h)+1.5rem)]">
      <JsonLd data={[
        buildBreadcrumbJsonLd([
          { name: "Home", url: getCanonical("/") },
          { name: "Fixtures", url: getCanonical("/fixtures") },
          { name: `${teams.home.name} vs ${teams.away.name}`, url: getCanonical(`/fixtures/${id}`) },
        ]),
        buildSportsEventJsonLd({
          name: `${teams.home.name} vs ${teams.away.name}`,
          startDate: f.date,
          venue: f.venue?.name,
          venueCity: f.venue?.city,
          homeTeam: teams.home.name,
          awayTeam: teams.away.name,
          competition: league.name,
          homeScore: goals?.home,
          awayScore: goals?.away,
          status: f.status.short,
        }),
      ]} />
      <div className="page-container max-w-3xl">
        <Link
          href="/season"
          className="group mb-4 inline-flex min-h-10 items-center gap-2 text-sm text-stadium-muted transition-colors hover:text-white"
        >
          <ArrowLeft size={16} aria-hidden className="transition-transform group-hover:-translate-x-1" />
          {tDetail("back")}
        </Link>

        {/* ─── Score header ─── */}
        <section className="surface reveal relative overflow-hidden p-4 sm:p-6">
          {isFinished && result !== "NS" && (
            <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", result === "W" ? "bg-green-500" : result === "D" ? "bg-amber-400" : "bg-red-500")} />
          )}
          {isLive && <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-lfc-red" />}

          <div className="mb-4 flex min-h-6 items-center justify-between gap-3">
            <p className="min-w-0 truncate font-barlow text-xs font-semibold uppercase tracking-[0.1em] text-stadium-muted">
              <span className="text-white/90">{league.name}</span>
              {league.round && <span> · {league.round}</span>}
            </p>
            {isFinished && result !== "NS" && (
              <span className={cn("inline-flex shrink-0 items-center gap-1.5 border px-2 py-0.5 font-barlow text-xs font-bold uppercase tracking-wider", resultTone)}>
                {resultWord}
                {(f.status.short === "AET" || f.status.short === "PEN") && (
                  <span className="text-white/70">· {f.status.short}</span>
                )}
              </span>
            )}
            {isLive && (
              <span className="inline-flex shrink-0 items-center gap-1.5 border border-lfc-red/50 bg-lfc-red/15 px-2 py-0.5 font-barlow text-xs font-bold uppercase tracking-wider text-white">
                <span aria-hidden className="size-1.5 rounded-full bg-lfc-red animate-pulse" />
                {tMatch("live")}{f.status.elapsed ? ` ${f.status.elapsed}'` : ""}
              </span>
            )}
          </div>

          <h1 className="sr-only">{teams.home.name} vs {teams.away.name}</h1>
          <div className="grid grid-cols-[minmax(0,1fr)_5.5rem_minmax(0,1fr)] items-start gap-2 sm:grid-cols-[minmax(0,1fr)_9rem_minmax(0,1fr)] sm:gap-4">
            {/* Home */}
            <div className="flex min-w-0 flex-col items-center text-center sm:items-end sm:text-right">
              <div className="relative size-12 sm:size-16">
                <Image src={teamLogo(teams.home.id, teams.home.logo)} alt="" fill sizes="64px" className="object-contain" priority />
              </div>
              <p className={cn("mt-2 break-words text-sm font-semibold leading-tight sm:text-base", homeIsLfc ? "text-white" : "text-white/80")}>
                {teams.home.name}
              </p>
              {homeLineup && <p className="font-barlow text-xs text-stadium-muted">{homeLineup.formation}</p>}
              {isFinished && <ScorerList goals={homeGoals} align="home" />}
            </div>

            {/* Score / time */}
            <div className="pt-1 text-center sm:pt-3">
              {isFinished || isLive ? (
                <>
                  <p className="font-bebas text-5xl leading-none tracking-wide text-white tabular-nums sm:text-6xl">
                    {goals.home}<span className="px-1 text-stadium-muted">-</span>{goals.away}
                  </p>
                  {isFinished && hasHt && (
                    <p className="mt-1.5 text-xs text-stadium-muted">{tMatch("halftimeShort")} {htHome} – {htAway}</p>
                  )}
                  {f.status.short === "AET" && <p className="mt-0.5 text-xs font-semibold text-stadium-muted">{tMatch("aet")}</p>}
                  {pens && <p className="mt-0.5 text-xs font-semibold text-stadium-muted">{tMatch("penShort", { score: pens })}</p>}
                </>
              ) : (
                <>
                  <p className="font-bebas text-4xl leading-none tracking-wide text-white tabular-nums sm:text-5xl">{timeStr}</p>
                  <p className="mt-1 font-barlow text-xs font-semibold uppercase tracking-wider text-stadium-muted">GMT+7</p>
                </>
              )}
            </div>

            {/* Away */}
            <div className="flex min-w-0 flex-col items-center text-center sm:items-start sm:text-left">
              <div className="relative size-12 sm:size-16">
                <Image src={teamLogo(teams.away.id, teams.away.logo)} alt="" fill sizes="64px" className="object-contain" priority />
              </div>
              <p className={cn("mt-2 break-words text-sm font-semibold leading-tight sm:text-base", teams.away.id === LFC_ID ? "text-white" : "text-white/80")}>
                {teams.away.name}
              </p>
              {awayLineup && <p className="font-barlow text-xs text-stadium-muted">{awayLineup.formation}</p>}
              {isFinished && <ScorerList goals={awayGoals} align="away" />}
            </div>
          </div>

          <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 border-t border-[var(--line)] pt-3 text-xs text-stadium-muted">
            <li>{dateStr}{!isFinished && !isLive ? ` · ${timeStr} GMT+7` : ""}</li>
            {venue && (
              <li className="flex items-center gap-1.5"><MapPin size={12} aria-hidden />{venue}</li>
            )}
            {attendance && attendance > 0 && (
              <li className="flex items-center gap-1.5"><Users size={12} aria-hidden />{attendance.toLocaleString(loc)}</li>
            )}
            {referee && (
              <li className="flex items-center gap-1.5 text-white/80"><CircleDot size={12} aria-hidden className="text-lfc-gold" />{referee}</li>
            )}
          </ul>
        </section>

        {/* ─── Events ─── */}
        <section className="mt-10">
          <SectionHeader title={tDetail("matchTimeline")} />
          {hasEvents ? (
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
              description={pendingNote ?? tCard("events.description")}
            />
          )}
        </section>

        {/* ─── Statistics ─── */}
        <section className="mt-10">
          <SectionHeader title={tDetail("statistics")} />
          {homeStats && awayStats ? (
            <div className="surface p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3 text-sm font-semibold text-white">
                <span className="min-w-0 truncate">{teams.home.name}</span>
                <span className="min-w-0 truncate text-right">{teams.away.name}</span>
              </div>
              <StatsComparison home={homeStats} away={awayStats} statLabels={statLabels} homeIsLfc={homeIsLfc} />
            </div>
          ) : (
            <EmptyState
              className="py-8 sm:py-10"
              icon={<BarChart3 className="size-7" aria-hidden />}
              title={tCard("stats.title")}
              description={pendingNote ?? tCard("stats.description")}
            />
          )}
        </section>

        {/* ─── Lineups ─── */}
        <section className="mt-10">
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

        {/* ─── Head to head ─── */}
        <section className="mt-10">
          <SectionHeader title={tMatch("h2h.title")} />
          {h2h ? (
            <H2HSection h2h={h2h} opponentName={opponentName} />
          ) : (
            <EmptyState
              className="py-8 sm:py-10"
              icon={<Swords className="size-7" aria-hidden />}
              title={tCard("h2h.title")}
              description={tCard("h2h.description")}
            />
          )}
        </section>
      </div>
    </div>
  );
}
