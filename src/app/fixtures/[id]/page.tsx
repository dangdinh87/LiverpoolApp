import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, MapPin, Calendar, Users,
  CircleDot, ArrowUpFromLine, ArrowDownToLine,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  getFixtures,
  getFixtureEvents,
  getFixtureLineups,
  getFixtureStatistics,
  getMatchDetail,
  computeH2H,
} from "@/lib/football";
import { H2HSection } from "@/components/fixtures/h2h-section";
import { MatchDetailTabs } from "@/components/fixtures/match-detail-tabs";
import { FormationPitch } from "@/components/fixtures/formation-pitch";
import type { Fixture, FixtureEvent, FixtureLineup, FixtureTeamStats } from "@/lib/types/football";
import { getMatchResult } from "@/lib/types/football";
import { cn } from "@/lib/utils";
import { buildBreadcrumbJsonLd, buildSportsEventJsonLd, getCanonical } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";

export const revalidate = 300; // 5 minutes

const LFC_ID = 40;

function teamLogo(id: number, apiLogo: string): string {
  return id === LFC_ID ? "/assets/lfc/crest.webp" : apiLogo;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  setRequestLocale('vi');
  const { id } = await params;
  const fixtures = await getFixtures();
  const match = fixtures.find((f) => f.fixture.id === Number(id));
  if (!match) return { title: "Match" };
  return {
    title: `${match.teams.home.name} vs ${match.teams.away.name}`,
    description: `${match.league.name} — ${match.league.round}`,
  };
}

export default async function FixtureDetailPage({ params }: PageProps) {
  setRequestLocale('vi');
  const { id } = await params;
  const fixtureId = Number(id);

  const [fixtures, tDetail, tMatch] = await Promise.all([
    getFixtures(),
    getTranslations("Fixtures.detail"),
    getTranslations("Match"),
  ]);
  const match = fixtures.find((f) => f.fixture.id === fixtureId);
  if (!match) notFound();

  const loc = "vi-VN";
  const { fixture: f, league, teams, goals, score } = match;
  const result = getMatchResult(match);
  const isFinished = ["FT", "AET", "PEN"].includes(f.status.short);
  const isLive = ["1H", "2H", "HT", "ET", "P", "LIVE"].includes(f.status.short);

  const [events, lineups, providerStats, espnDetail, prevFixtures] = await Promise.all([
    isFinished ? getFixtureEvents(fixtureId, f.date) : Promise.resolve([]),
    getFixtureLineups(fixtureId, f.date),
    isFinished ? getFixtureStatistics(fixtureId) : Promise.resolve([]),
    isFinished ? getMatchDetail(f.date) : Promise.resolve(null),
    // Fetch previous season for richer H2H data (skip if current IS 2024)
    league.season !== 2024
      ? getFixtures(2024).catch(() => [] as Fixture[])
      : Promise.resolve([] as Fixture[]),
  ]);

  // H2H: compute from current + previous season fixtures
  const opponentId = teams.home.id === LFC_ID ? teams.away.id : teams.home.id;
  const opponentName = teams.home.id === LFC_ID ? teams.away.name : teams.home.name;
  const allFixturesForH2H = [...fixtures, ...prevFixtures];
  const h2h = computeH2H(allFixturesForH2H, opponentId);

  const date = new Date(f.date);
  const now = Date.now();
  const msToKickoff = date.getTime() - now;
  const isConfirmed = isFinished || isLive || msToKickoff <= 3_600_000;
  const dateStr = date.toLocaleDateString(loc, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const timeStr = date.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" });

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

  return (
    <div className="min-h-screen pt-24 pb-16">
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
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <Link
          href="/season"
          className="inline-flex items-center gap-2 text-stadium-muted hover:text-white font-inter text-sm transition-colors group mb-6"
        >
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          {tDetail("back")}
        </Link>

        {/* ─── Match Header ─── */}
        <div className="bg-stadium-surface border border-stadium-border p-5 sm:p-6 mb-4 relative overflow-hidden">
          {/* Watermark competition logo */}
          {league.logo && (() => {
            const isDarkLogo = league.name.includes("Premier") || league.name.includes("Champions");
            return (
              <div className="absolute -right-6 top-1/2 -translate-y-1/2 w-64 h-64 opacity-[0.10] -rotate-12 pointer-events-none select-none">
                <Image src={league.logo} alt="" fill sizes="256px" className={`object-contain ${isDarkLogo ? "brightness-0 invert" : ""}`} loading="lazy" />
              </div>
            );
          })()}

          {/* Result accent strip */}
          {isFinished && result !== "NS" && (
            <div className={cn(
              "absolute left-0 top-0 bottom-0 w-1",
              result === "W" && "bg-green-500",
              result === "D" && "bg-yellow-500",
              result === "L" && "bg-red-500",
            )} />
          )}
          {isLive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-lfc-red animate-pulse" />}

          {/* Top bar: comp name + result badge */}
          <div className="relative flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="font-bebas text-base uppercase tracking-wider text-white/60">
                {league.name}
              </span>
              {league.round && (
                <>
                  <span className="text-stadium-border">·</span>
                  <span className="text-stadium-muted font-barlow text-sm">{league.round}</span>
                </>
              )}
            </div>
            {isFinished && result !== "NS" && (
              <span className="inline-flex items-center gap-1.5">
                <span className={cn("w-2 h-2 rounded-full", result === "W" && "bg-green-500", result === "D" && "bg-yellow-500", result === "L" && "bg-red-500")} />
                <span className={cn("text-xs font-bebas tracking-widest leading-none", result === "W" && "text-green-400", result === "D" && "text-yellow-400", result === "L" && "text-red-400")}>
                  {result === "W" ? tMatch("win") : result === "D" ? tMatch("draw") : tMatch("loss")}
                </span>
              </span>
            )}
            {isLive && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-lfc-red/15 border border-lfc-red/30">
                <span className="w-1.5 h-1.5 rounded-full bg-lfc-red animate-pulse" />
                <span className="text-lfc-red text-[11px] font-bebas tracking-wider leading-none">{tMatch("live")} {f.status.elapsed}&apos;</span>
              </span>
            )}
          </div>

          <div className="relative flex items-center justify-center gap-3 sm:gap-6">
            {/* Home team + scorers */}
            <div className="flex items-center gap-2.5 flex-1 justify-end">
              <div className={cn("text-right", teams.home.id === LFC_ID ? "text-white" : "text-white/70")}>
                <span className="font-inter font-semibold text-sm sm:text-base block">{teams.home.name}</span>
                {homeLineup && <span className="font-barlow text-stadium-muted text-[10px]">{homeLineup.formation}</span>}
                {isFinished && homeGoals.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {homeGoals.map((g, i) => (
                      <p key={i} className="text-[11px] font-inter text-stadium-muted">
                        <span className="text-white/80">{g.player.name}</span>
                        {g.time.elapsed ? <span className="text-lfc-gold ml-1">{g.time.extra ? `${g.time.elapsed}+${g.time.extra}'` : `${g.time.elapsed}'`}</span> : null}
                        {g.detail.includes("Penalty") && <span className="text-stadium-muted ml-0.5">(P)</span>}
                        {g.detail.includes("Own") && <span className="text-red-400 ml-0.5">(OG)</span>}
                      </p>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative w-10 h-10 sm:w-12 sm:h-12 shrink-0">
                <Image src={teamLogo(teams.home.id, teams.home.logo)} alt={teams.home.name} fill sizes="48px" className="object-contain" />
              </div>
            </div>

            {/* Score / Time block */}
            <div className="text-center shrink-0 min-w-[80px]">
              {isFinished || isLive ? (
                <>
                  <div className="flex items-center justify-center gap-2">
                    <span className={cn("font-bebas text-4xl sm:text-5xl tracking-wider leading-none", teams.home.winner ? "text-white" : "text-white/50")}>{goals.home}</span>
                    <span className="text-stadium-muted font-bebas text-3xl leading-none">:</span>
                    <span className={cn("font-bebas text-4xl sm:text-5xl tracking-wider leading-none", teams.away.winner ? "text-white" : "text-white/50")}>{goals.away}</span>
                  </div>
                  {isFinished && hasHt && <p className="text-stadium-muted text-[10px] font-inter mt-1">{tMatch("halftimeShort")} {htHome} – {htAway}</p>}
                  {(f.status.short === "AET" || f.status.short === "PEN") && (
                    <p className="text-stadium-muted text-[9px] font-barlow font-semibold uppercase tracking-wider">
                      {f.status.short === "AET" ? tMatch("aet") : tMatch("pen")}
                    </p>
                  )}
                </>
              ) : (
                <span className="font-bebas text-4xl text-white tracking-wider leading-none block">{timeStr}</span>
              )}
            </div>

            {/* Away team + scorers */}
            <div className="flex items-center gap-2.5 flex-1">
              <div className="relative w-10 h-10 sm:w-12 sm:h-12 shrink-0">
                <Image src={teamLogo(teams.away.id, teams.away.logo)} alt={teams.away.name} fill sizes="48px" className="object-contain" />
              </div>
              <div className={cn(teams.away.id === LFC_ID ? "text-white" : "text-white/70")}>
                <span className="font-inter font-semibold text-sm sm:text-base block">{teams.away.name}</span>
                {awayLineup && <span className="font-barlow text-stadium-muted text-[10px]">{awayLineup.formation}</span>}
                {isFinished && awayGoals.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {awayGoals.map((g, i) => (
                      <p key={i} className="text-[11px] font-inter text-stadium-muted">
                        <span className="text-white/80">{g.player.name}</span>
                        {g.time.elapsed ? <span className="text-lfc-gold ml-1">{g.time.extra ? `${g.time.elapsed}+${g.time.extra}'` : `${g.time.elapsed}'`}</span> : null}
                        {g.detail.includes("Penalty") && <span className="text-stadium-muted ml-0.5">(P)</span>}
                        {g.detail.includes("Own") && <span className="text-red-400 ml-0.5">(OG)</span>}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom info bar */}
          <div className="relative border-t border-stadium-border/50 pt-3 mt-4">
            <div className="flex items-center justify-center gap-4 flex-wrap text-[11px] font-inter">
              <span className="flex items-center gap-1.5 text-stadium-muted">
                <Calendar size={11} className="opacity-60" />{dateStr}
              </span>
              {venue && (
                <span className="flex items-center gap-1.5 text-stadium-muted">
                  <MapPin size={11} className="opacity-60" />{venue}
                </span>
              )}
              {attendance && attendance > 0 && (
                <span className="flex items-center gap-1.5 text-stadium-muted">
                  <Users size={11} className="opacity-60" />{attendance.toLocaleString(loc)}
                </span>
              )}
              {referee && (
                <span className="flex items-center gap-1.5 text-white/80">
                  <CircleDot size={11} className="text-lfc-gold" />
                  <span className="font-medium">{referee}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ─── Tabbed Content ─── */}
        {(() => {
          const hasLineups = !!(homeLineup || awayLineup);
          const hasEvents = resolvedEvents.length > 0;
          const hasStatistics = !!(homeStats && awayStats);
          const lineupLabel = isConfirmed ? tDetail("lineupsConfirmed") : tDetail("lineupsPredicted");

          // If no tabs at all (upcoming match, no data), show placeholder
          if (!hasEvents && !hasStatistics && !hasLineups && !h2h) {
            return (
              <p className="text-center text-stadium-muted font-inter text-sm py-8">
                {tDetail("noData")}
              </p>
            );
          }

          return (
            <MatchDetailTabs
              hasTimeline={hasEvents}
              hasStats={hasStatistics}
              hasLineups={hasLineups}
              hasH2H={!!h2h}
              timelinePanel={
                <div className="bg-stadium-surface border border-stadium-border p-4 sm:p-5">
                  {resolvedEvents.map((event, i) => (
                    <TimelineRow key={i} event={event} homeTeamId={teams.home.id} />
                  ))}
                </div>
              }
              statsPanel={
                homeStats && awayStats ? (
                  <div className="bg-stadium-surface border border-stadium-border p-4 sm:p-5">
                    <StatsComparison home={homeStats} away={awayStats} statLabels={statLabels} />
                  </div>
                ) : null
              }
              lineupsPanel={
                hasLineups ? (
                  <div className="space-y-4">
                    {/* Formation pitch view */}
                    {homeLineup && awayLineup && (
                      <FormationPitch homeLineup={homeLineup} awayLineup={awayLineup} />
                    )}

                    {/* Detailed lineup lists */}
                    <div className="bg-stadium-surface border border-stadium-border p-4 sm:p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <span className={cn(
                          "px-2 py-0.5 text-[10px] font-barlow font-semibold uppercase tracking-wider border",
                          isConfirmed
                            ? "text-green-400 border-green-500/30 bg-green-500/10"
                            : "text-lfc-gold border-lfc-gold/30 bg-lfc-gold/10",
                        )}>
                          {lineupLabel}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {homeLineup && <LineupSection lineup={homeLineup} subsLabel={tDetail("substitutes")} coachLabel={tDetail("coach")} />}
                        {awayLineup && <LineupSection lineup={awayLineup} subsLabel={tDetail("substitutes")} coachLabel={tDetail("coach")} />}
                      </div>
                    </div>
                  </div>
                ) : null
              }
              h2hPanel={
                h2h ? <H2HSection h2h={h2h} opponentName={opponentName} /> : null
              }
            />
          );
        })()}
      </div>
    </div>
  );
}


// ─── Timeline ───────────────────────────────────────────────────────────────

function TimelineRow({ event, homeTeamId }: { event: FixtureEvent; homeTeamId: number }) {
  const isHome = event.team.id === homeTeamId;
  const hasMinute = event.time.elapsed !== null && event.time.elapsed > 0;
  const minute = hasMinute
    ? event.time.extra ? `${event.time.elapsed}+${event.time.extra}'` : `${event.time.elapsed}'`
    : null;

  return (
    <div className={cn(
      "flex items-center gap-2 py-2 border-b border-stadium-border/20 last:border-0",
      isHome ? "flex-row" : "flex-row-reverse",
    )}>
      <div className={cn("flex items-center gap-1.5 flex-1 flex-wrap", isHome ? "justify-start" : "justify-end")}>
        <span className="text-white font-inter text-sm font-medium">
          {event.player.name}
        </span>
        {event.assist.name && event.type === "Goal" && (
          <span className="text-stadium-muted text-xs font-inter">({event.assist.name})</span>
        )}
        {event.type === "subst" && event.assist.name && (
          <span className="text-stadium-muted text-xs font-inter">← {event.assist.name}</span>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0 w-[60px] justify-center">
        <EventIcon type={event.type} detail={event.detail} />
        {minute && <span className="font-barlow text-stadium-muted text-[11px] font-semibold">{minute}</span>}
      </div>

      <div className="flex-1" />
    </div>
  );
}

function EventIcon({ type, detail }: { type: string; detail: string }) {
  if (type === "Goal") {
    const isOwn = detail.includes("Own");
    const isPen = detail.includes("Penalty");
    return <span className={cn("text-sm", isOwn ? "text-red-400" : "text-white")}>{isPen ? "⚽P" : isOwn ? "⚽OG" : "⚽"}</span>;
  }
  if (type === "Card") {
    return <span className={cn("inline-block w-3 h-4 rounded-[1px]", detail.includes("Red") ? "bg-red-500" : "bg-yellow-400")} />;
  }
  if (type === "subst") {
    return (
      <span className="flex items-center -space-x-0.5">
        <ArrowUpFromLine size={12} className="text-green-400" />
        <ArrowDownToLine size={12} className="text-red-400" />
      </span>
    );
  }
  return <span className="text-stadium-muted text-xs">•</span>;
}

// ─── Stats (center-outward bars) ────────────────────────────────────────────

function StatsComparison({ home, away, statLabels }: { home: FixtureTeamStats; away: FixtureTeamStats; statLabels: Record<string, string> }) {
  const statTypes = home.statistics.map((s) => s.type);

  return (
    <div className="space-y-3">
      {statTypes.map((type) => {
        const homeVal = home.statistics.find((s) => s.type === type)?.value;
        const awayVal = away.statistics.find((s) => s.type === type)?.value;
        if (homeVal == null && awayVal == null) return null;

        const hStr = String(homeVal ?? 0);
        const aStr = String(awayVal ?? 0);
        const hNum = parseFloat(hStr.replace("%", "")) || 0;
        const aNum = parseFloat(aStr.replace("%", "")) || 0;
        const total = hNum + aNum || 1;
        const hPct = Math.round((hNum / total) * 100);
        const aPct = 100 - hPct;
        const hWins = hNum > aNum;
        const aWins = aNum > hNum;

        return (
          <div key={type}>
            <p className="text-stadium-muted text-[11px] font-inter text-center mb-1">{statLabels[type] ?? type}</p>
            <div className="flex items-center gap-2">
              <span className={cn("font-inter text-sm font-semibold w-14 text-right", hWins ? "text-white" : "text-stadium-muted")}>{hStr}</span>
              <div className="flex-1 flex h-2 gap-0.5">
                <div className="flex-1 flex justify-end bg-stadium-surface2 rounded-l-sm overflow-hidden">
                  <div
                    className={cn("h-full rounded-l-sm transition-all", hWins ? "bg-lfc-red" : "bg-stadium-muted/50")}
                    style={{ width: `${hPct}%` }}
                  />
                </div>
                <div className="flex-1 bg-stadium-surface2 rounded-r-sm overflow-hidden">
                  <div
                    className={cn("h-full rounded-r-sm transition-all", aWins ? "bg-sky-500" : "bg-stadium-muted/50")}
                    style={{ width: `${aPct}%` }}
                  />
                </div>
              </div>
              <span className={cn("font-inter text-sm font-semibold w-14 text-left", aWins ? "text-white" : "text-stadium-muted")}>{aStr}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Lineups ────────────────────────────────────────────────────────────────

function LineupSection({ lineup, subsLabel, coachLabel }: { lineup: FixtureLineup; subsLabel: string; coachLabel: string }) {
  return (
    <div>
      {/* Team header */}
      <div className="flex items-center gap-2.5 mb-3 pb-2 border-b border-stadium-border/50">
        {(lineup.team.id === LFC_ID || lineup.team.logo) && (
          <div className="relative w-5 h-5 shrink-0">
            <Image
              src={lineup.team.id === LFC_ID ? "/assets/lfc/crest.webp" : lineup.team.logo}
              alt="" fill sizes="20px" className="object-contain"
            />
          </div>
        )}
        <span className="font-inter font-bold text-white text-sm">{lineup.team.name}</span>
        <span className="font-bebas text-lfc-gold text-base tracking-wider ml-auto">{lineup.formation}</span>
      </div>

      {/* Starting XI */}
      <div className="space-y-0.5 mb-4">
        {lineup.startXI.map(({ player: p }) => (
          <div key={p.id} className="flex items-center gap-3 py-1.5 hover:bg-stadium-surface2/50 px-1 -mx-1 transition-colors">
            <span className="w-7 h-7 flex items-center justify-center font-bebas text-base text-white/90 bg-stadium-surface2 border border-stadium-border/50 shrink-0">
              {p.number}
            </span>
            <span className="text-white font-inter text-sm font-medium">{p.name}</span>
            <span className={cn(
              "text-[10px] font-barlow font-semibold uppercase tracking-wider ml-auto px-1.5 py-0.5",
              p.pos === "G" && "text-yellow-400 bg-yellow-400/10",
              p.pos === "D" && "text-blue-400 bg-blue-400/10",
              p.pos === "M" && "text-green-400 bg-green-400/10",
              p.pos === "F" && "text-lfc-red bg-lfc-red/10",
            )}>
              {posLabel(p.pos)}
            </span>
          </div>
        ))}
      </div>

      {/* Substitutes */}
      {lineup.substitutes.length > 0 && (
        <div className="border-t border-stadium-border/50 pt-3">
          <p className="font-barlow text-stadium-muted text-xs uppercase tracking-wider mb-2 font-semibold">{subsLabel}</p>
          <div className="space-y-0.5">
            {lineup.substitutes.map(({ player: p }) => (
              <div key={p.id} className="flex items-center gap-3 py-1 px-1 -mx-1">
                <span className="w-6 h-6 flex items-center justify-center font-bebas text-sm text-stadium-muted bg-stadium-surface2/50 border border-stadium-border/30 shrink-0">
                  {p.number}
                </span>
                <span className="text-stadium-muted font-inter text-sm">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coach */}
      {lineup.coach.name && (
        <div className="border-t border-stadium-border/50 pt-3 mt-3 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-stadium-surface2 flex items-center justify-center shrink-0 border border-stadium-border/50">
            <span className="font-bebas text-sm text-stadium-muted">{lineup.coach.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</span>
          </div>
          <div>
            <p className="text-[10px] font-barlow text-stadium-muted uppercase tracking-wider">{coachLabel}</p>
            <p className="text-sm font-inter text-white font-medium">{lineup.coach.name}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function posLabel(pos: string): string {
  const map: Record<string, string> = { G: "GK", D: "DEF", M: "MID", F: "FWD" };
  return map[pos] ?? pos;
}
