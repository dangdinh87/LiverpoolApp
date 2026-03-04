import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  getFixtures,
  getFixtureEvents,
  getFixtureLineups,
  getFixtureStatistics,
} from "@/lib/football";
import type { FixtureEvent, FixtureLineup, FixtureTeamStats } from "@/lib/types/football";
import { getMatchResult } from "@/lib/types/football";
import { cn } from "@/lib/utils";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
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
  const { id } = await params;
  const fixtureId = Number(id);

  // Fetch fixture from the season list
  const fixtures = await getFixtures();
  const match = fixtures.find((f) => f.fixture.id === fixtureId);
  if (!match) notFound();

  const { fixture: f, league, teams, goals } = match;
  const result = getMatchResult(match);
  const isFinished = f.status.short === "FT" || f.status.short === "AET" || f.status.short === "PEN";

  // Fetch detailed data only for finished/live matches
  const [events, lineups, stats] = isFinished
    ? await Promise.all([
        getFixtureEvents(fixtureId),
        getFixtureLineups(fixtureId),
        getFixtureStatistics(fixtureId),
      ])
    : [[], [], []];

  // For upcoming matches, still try to get lineups (available ~1h before kickoff)
  const lineupData = lineups.length > 0 ? lineups : !isFinished ? await getFixtureLineups(fixtureId) : [];

  const date = new Date(f.date);
  const dateStr = date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const timeStr = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const homeTeam = stats.find((s) => s.team.id === teams.home.id);
  const awayTeam = stats.find((s) => s.team.id === teams.away.id);
  const homeLineup = lineupData.find((l) => l.team.id === teams.home.id);
  const awayLineup = lineupData.find((l) => l.team.id === teams.away.id);

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back nav */}
        <Link
          href="/fixtures"
          className="inline-flex items-center gap-2 text-stadium-muted hover:text-white font-inter text-sm transition-colors group mb-8"
        >
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          Back to Fixtures
        </Link>

        {/* ─── Match Header ─── */}
        <div className="bg-stadium-surface border border-stadium-border rounded-none p-6 mb-6">
          {/* League + round */}
          <div className="flex items-center justify-center gap-2 mb-4">
            {league.logo && <Image src={league.logo} alt="" width={20} height={20} />}
            <span className="font-barlow text-stadium-muted text-xs uppercase tracking-wider">
              {league.name} · {league.round}
            </span>
          </div>

          {/* Teams + score */}
          <div className="flex items-center justify-center gap-6 mb-4">
            {/* Home */}
            <div className="flex flex-col items-center gap-2 flex-1">
              <div className="relative w-16 h-16">
                <Image src={teams.home.logo} alt={teams.home.name} fill sizes="64px" className="object-contain" />
              </div>
              <span className={cn("font-inter font-semibold text-sm text-center", teams.home.id === 40 ? "text-white" : "text-stadium-muted")}>
                {teams.home.name}
              </span>
              {homeLineup && (
                <span className="font-barlow text-stadium-muted text-xs">{homeLineup.formation}</span>
              )}
            </div>

            {/* Score */}
            <div className="text-center">
              {isFinished ? (
                <>
                  <div className="font-bebas text-6xl text-white tracking-wider leading-none">
                    {goals.home} – {goals.away}
                  </div>
                  <Badge
                    className={cn(
                      "mt-2 font-barlow text-xs",
                      result === "W" && "bg-green-500/20 text-green-400 border-green-500/30",
                      result === "D" && "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
                      result === "L" && "bg-red-500/20 text-red-400 border-red-500/30",
                    )}
                  >
                    {f.status.long}
                  </Badge>
                </>
              ) : (
                <>
                  <div className="font-bebas text-4xl text-stadium-muted tracking-wider">VS</div>
                  <p className="font-inter text-white text-sm mt-1">{timeStr}</p>
                </>
              )}
            </div>

            {/* Away */}
            <div className="flex flex-col items-center gap-2 flex-1">
              <div className="relative w-16 h-16">
                <Image src={teams.away.logo} alt={teams.away.name} fill sizes="64px" className="object-contain" />
              </div>
              <span className={cn("font-inter font-semibold text-sm text-center", teams.away.id === 40 ? "text-white" : "text-stadium-muted")}>
                {teams.away.name}
              </span>
              {awayLineup && (
                <span className="font-barlow text-stadium-muted text-xs">{awayLineup.formation}</span>
              )}
            </div>
          </div>

          {/* Date + venue */}
          <p className="text-center text-stadium-muted text-xs font-inter">
            {dateStr} · {f.venue.name}, {f.venue.city}
          </p>
        </div>

        {/* ─── Match Events Timeline ─── */}
        {events.length > 0 && (
          <section className="bg-stadium-surface border border-stadium-border rounded-none p-6 mb-6">
            <h2 className="font-bebas text-2xl text-white tracking-wider mb-4">Match Events</h2>
            <div className="space-y-3">
              {events.map((event, i) => (
                <EventRow key={i} event={event} homeTeamId={teams.home.id} />
              ))}
            </div>
          </section>
        )}

        {/* ─── Lineups ─── */}
        {(homeLineup || awayLineup) && (
          <section className="bg-stadium-surface border border-stadium-border rounded-none p-6 mb-6">
            <h2 className="font-bebas text-2xl text-white tracking-wider mb-4">Lineups</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {homeLineup && <LineupSection lineup={homeLineup} />}
              {awayLineup && <LineupSection lineup={awayLineup} />}
            </div>
          </section>
        )}

        {/* ─── Match Statistics ─── */}
        {homeTeam && awayTeam && (
          <section className="bg-stadium-surface border border-stadium-border rounded-none p-6">
            <h2 className="font-bebas text-2xl text-white tracking-wider mb-4">Match Statistics</h2>
            <StatsComparison home={homeTeam} away={awayTeam} />
          </section>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EventRow({ event, homeTeamId }: { event: FixtureEvent; homeTeamId: number }) {
  const isHome = event.team.id === homeTeamId;
  const icon = getEventIcon(event.type, event.detail);
  const minute = event.time.extra
    ? `${event.time.elapsed}+${event.time.extra}'`
    : `${event.time.elapsed}'`;

  return (
    <div className={cn("flex items-center gap-3", isHome ? "flex-row" : "flex-row-reverse")}>
      <div className={cn("flex items-center gap-2 flex-1", isHome ? "justify-start" : "justify-end")}>
        <span className="text-white font-inter text-sm font-medium">
          {event.player.name}
        </span>
        {event.assist.name && event.type === "Goal" && (
          <span className="text-stadium-muted text-xs font-inter">
            ({event.assist.name})
          </span>
        )}
        {event.type === "subst" && event.assist.name && (
          <span className="text-stadium-muted text-xs font-inter">
            for {event.assist.name}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0 w-20 justify-center">
        <span className="text-lg">{icon}</span>
        <span className="font-barlow text-stadium-muted text-xs font-semibold">{minute}</span>
      </div>
      <div className="flex-1" />
    </div>
  );
}

function getEventIcon(type: string, detail: string): string {
  if (type === "Goal") {
    if (detail.includes("Own")) return "\u26BD\u274C"; // own goal
    if (detail.includes("Penalty")) return "\u26BD\uD83C\uDFAF"; // penalty goal — ⚽🎯
    return "\u26BD"; // ⚽
  }
  if (type === "Card") {
    if (detail.includes("Red")) return "\uD83D\uDFE5"; // 🟥
    return "\uD83D\uDFE8"; // 🟨
  }
  if (type === "subst") return "\uD83D\uDD04"; // 🔄
  if (type === "Var") return "\uD83D\uDCFA"; // 📺
  return "\u2022"; // •
}

function LineupSection({ lineup }: { lineup: FixtureLineup }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Image src={lineup.team.logo} alt="" width={20} height={20} />
        <span className="font-inter font-semibold text-white text-sm">{lineup.team.name}</span>
        <span className="font-barlow text-lfc-gold text-xs ml-auto">{lineup.formation}</span>
      </div>

      {/* Starting XI */}
      <div className="space-y-1 mb-3">
        {lineup.startXI.map(({ player: p }) => (
          <div key={p.id} className="flex items-center gap-2 text-sm font-inter">
            <span className="w-5 text-center font-barlow text-stadium-muted text-xs">{p.number}</span>
            <span className="text-white">{p.name}</span>
            <span className="text-stadium-muted text-xs ml-auto">{posLabel(p.pos)}</span>
          </div>
        ))}
      </div>

      {/* Substitutes */}
      {lineup.substitutes.length > 0 && (
        <>
          <p className="font-barlow text-stadium-muted text-[10px] uppercase tracking-wider mb-1">Substitutes</p>
          <div className="space-y-1">
            {lineup.substitutes.map(({ player: p }) => (
              <div key={p.id} className="flex items-center gap-2 text-sm font-inter">
                <span className="w-5 text-center font-barlow text-stadium-muted text-xs">{p.number}</span>
                <span className="text-stadium-muted">{p.name}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Coach */}
      <p className="mt-3 text-xs font-inter text-stadium-muted">
        Coach: <span className="text-white">{lineup.coach.name}</span>
      </p>
    </div>
  );
}

function posLabel(pos: string): string {
  const map: Record<string, string> = { G: "GK", D: "DEF", M: "MID", F: "FWD" };
  return map[pos] ?? pos;
}

function StatsComparison({ home, away }: { home: FixtureTeamStats; away: FixtureTeamStats }) {
  // Pair up stats by type
  const statTypes = home.statistics.map((s) => s.type);

  // Display-friendly label mapping
  const labelMap: Record<string, string> = {
    "Ball Possession": "Possession",
    "Shots on Goal": "Shots on Target",
    "Shots off Goal": "Shots off Target",
    "Total Shots": "Total Shots",
    "Blocked Shots": "Blocked Shots",
    "Corner Kicks": "Corners",
    "Offsides": "Offsides",
    "Fouls": "Fouls",
    "Yellow Cards": "Yellow Cards",
    "Red Cards": "Red Cards",
    "Total passes": "Total Passes",
    "Passes accurate": "Accurate Passes",
    "Passes %": "Pass Accuracy",
    "expected_goals": "Expected Goals (xG)",
  };

  return (
    <div className="space-y-3">
      {statTypes.map((type) => {
        const homeVal = home.statistics.find((s) => s.type === type)?.value;
        const awayVal = away.statistics.find((s) => s.type === type)?.value;
        if (homeVal == null && awayVal == null) return null;

        const label = labelMap[type] ?? type;
        const hNum = parseFloat(String(homeVal ?? 0));
        const aNum = parseFloat(String(awayVal ?? 0));
        const total = hNum + aNum || 1;
        const hPct = (hNum / total) * 100;

        return (
          <div key={type}>
            <div className="flex justify-between text-sm font-inter mb-1">
              <span className="text-white font-medium">{String(homeVal ?? 0)}</span>
              <span className="text-stadium-muted text-xs">{label}</span>
              <span className="text-white font-medium">{String(awayVal ?? 0)}</span>
            </div>
            <div className="flex h-1.5 rounded-full overflow-hidden bg-stadium-surface2">
              <div
                className="bg-lfc-red rounded-l-full transition-all"
                style={{ width: `${hPct}%` }}
              />
              <div
                className="bg-stadium-muted/50 rounded-r-full transition-all"
                style={{ width: `${100 - hPct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
