import Image from "next/image";
import { CalendarDays, CircleDot, MapPin, Users } from "lucide-react";
import { MatchCountdown } from "@/components/fixtures/match-countdown";
import { displayTeamName } from "@/components/fixtures/team-name";
import { WhereToWatch } from "@/components/fixtures/where-to-watch";
import { LFC_ID, ScorerList, teamLogo } from "@/components/fixtures/match-detail-parts";
import { LiveDetailBadge, LiveDetailScore } from "@/components/fixtures/live-match-detail";
import { LocalMatchDay, LocalMatchTime, LocalZoneOffset } from "@/components/ui/local-time";
import type { Fixture, FixtureEvent, FixtureLineup, MatchResult } from "@/lib/types/football";
import { cn } from "@/lib/utils";

export const MATCH_STAT_KEYS = [
  "Ball Possession",
  "Total Shots",
  "Shots on Target",
  "Shots off Target",
  "Blocked Shots",
  "Saves",
  "Corner Kicks",
  "Offsides",
  "Fouls",
  "Yellow Cards",
  "Red Cards",
  "Total Passes",
  "Accurate Passes",
  "Pass Accuracy",
  "Tackles Won",
  "Interceptions",
  "Clearances",
  "Expected Goals",
] as const;

export function parsePositiveFixtureId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Match a provider team (`stats`, `lineups`, `events`) against a fixture side
 * without colliding on shared prefixes like `"FC"` (`"FC Barcelona"` vs `"Liverpool FC"`)
 * or `"Manchester"` (`"Manchester City"` vs `"Manchester United"`).
 */
export function matchesFixtureTeam(
  candidate: { id: number; name: string },
  side: { id: number; name: string },
): boolean {
  if (candidate.id > 0 && candidate.id === side.id) return true;
  if (side.id === LFC_ID && /\bliverpool\b/i.test(candidate.name)) return true;
  if (side.id !== LFC_ID && /\bliverpool\b/i.test(candidate.name)) return false;

  const normCandidate = displayTeamName(candidate.name).toLowerCase().trim();
  const normSide = displayTeamName(side.name).toLowerCase().trim();
  if (!normCandidate || !normSide) return false;
  return (
    normCandidate === normSide ||
    normCandidate.includes(normSide) ||
    normSide.includes(normCandidate)
  );
}

interface MatchScoreHeaderProps {
  match: Fixture;
  uiLocale: "vi" | "en";
  round: string;
  result: MatchResult;
  resultWord: string;
  isFinished: boolean;
  isLive: boolean;
  homeLineup?: FixtureLineup;
  awayLineup?: FixtureLineup;
  homeGoals: FixtureEvent[];
  awayGoals: FixtureEvent[];
  venue: string | null;
  attendance?: number | null;
  referee?: string | null;
  halftimeLabel: string;
  aetLabel: string;
  penLabel: string | null;
  attendanceLabel: string | null;
  refereeLabel: string | null;
}

export function MatchScoreHeader({
  match,
  uiLocale,
  round,
  result,
  resultWord,
  isFinished,
  isLive,
  homeLineup,
  awayLineup,
  homeGoals,
  awayGoals,
  venue,
  attendance,
  referee,
  halftimeLabel,
  aetLabel,
  penLabel,
  attendanceLabel,
  refereeLabel,
}: MatchScoreHeaderProps) {
  const { fixture: f, league, teams, goals, score } = match;
  const hasStarted = isFinished || isLive;
  const homeIsLfc = teams.home.id === LFC_ID;
  const homeName = displayTeamName(teams.home.name);
  const awayName = displayTeamName(teams.away.name);
  const htHome = score.halftime.home;
  const htAway = score.halftime.away;
  const hasHt = htHome !== null && htAway !== null;
  const showWatch = !isFinished;
  const infoIcon = "mt-0.5 size-4 shrink-0 text-stadium-muted";
  const resultTone =
    result === "W"
      ? "border-green-500/40 bg-green-500/10 text-green-400"
      : result === "D"
        ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
        : "border-red-500/40 bg-red-500/10 text-red-400";

  return (
    <section className="surface reveal relative overflow-hidden p-4 sm:p-6">
      {isFinished && result !== "NS" && (
        <span
          aria-hidden
          className={cn(
            "spoiler-hide absolute inset-y-0 left-0 w-1",
            result === "W" ? "bg-green-500" : result === "D" ? "bg-amber-400" : "bg-red-500",
          )}
        />
      )}
      {isLive && <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-lfc-red" />}

      <div className="mb-4 flex min-h-6 items-center justify-between gap-3">
        <p className="min-w-0 truncate font-barlow text-xs font-semibold uppercase tracking-[0.1em] text-stadium-muted">
          <span className="text-white/90">{league.name}</span>
          {round && <span> · {round}</span>}
        </p>
        {isFinished && result !== "NS" && (
          <span
            className={cn(
              "spoiler-hide inline-flex shrink-0 items-center gap-1.5 border px-2 py-0.5 font-barlow text-xs font-bold uppercase tracking-wider",
              resultTone,
            )}
          >
            {resultWord}
            {(f.status.short === "AET" || f.status.short === "PEN") && (
              <span className="text-white/70">· {f.status.short}</span>
            )}
          </span>
        )}
        {isLive && <LiveDetailBadge initial={match} />}
        {!hasStarted && <MatchCountdown kickOff={f.date} showLabel={false} />}
      </div>

      <h1 className="sr-only">
        {homeName} vs {awayName}
      </h1>
      <div className="grid grid-cols-[minmax(0,1fr)_5.5rem_minmax(0,1fr)] items-start gap-2 sm:grid-cols-[minmax(0,1fr)_9rem_minmax(0,1fr)] sm:gap-4">
        {/* Home */}
        <div className="flex min-w-0 flex-col items-center text-center sm:items-end sm:text-right">
          <div className="relative size-12 sm:size-16">
            <Image
              src={teamLogo(teams.home.id, teams.home.logo)}
              alt=""
              fill
              sizes="64px"
              className="object-contain"
              priority
            />
          </div>
          <p
            className={cn(
              "mt-2 break-words text-sm font-semibold leading-tight sm:text-base",
              homeIsLfc ? "text-white" : "text-white/80",
            )}
          >
            {homeName}
          </p>
          {homeLineup && <p className="font-barlow text-xs text-stadium-muted">{homeLineup.formation}</p>}
          {isFinished && (
            <div className="spoiler-hide">
              <ScorerList goals={homeGoals} align="home" />
            </div>
          )}
        </div>

        {/* Score / time */}
        <div className="pt-1 text-center sm:pt-3">
          {isLive ? (
            <LiveDetailScore initial={match} />
          ) : hasStarted ? (
            <>
              <div className="spoiler-hide">
                <p className="font-bebas text-5xl leading-none tracking-wide text-white tabular-nums sm:text-6xl">
                  {goals.home}
                  <span className="px-1 text-stadium-muted">-</span>
                  {goals.away}
                </p>
                {isFinished && hasHt && (
                  <p className="mt-1.5 text-xs text-stadium-muted tabular-nums">
                    {halftimeLabel} {htHome} – {htAway}
                  </p>
                )}
                {f.status.short === "AET" && (
                  <p className="mt-0.5 text-xs font-semibold text-stadium-muted">{aetLabel}</p>
                )}
                {penLabel && (
                  <p className="mt-0.5 text-xs font-semibold text-stadium-muted tabular-nums">{penLabel}</p>
                )}
              </div>
              <p
                aria-hidden
                className="spoiler-show font-bebas text-5xl leading-none tracking-wide text-white/40 sm:text-6xl"
              >
                ? - ?
              </p>
            </>
          ) : (
            <>
              <p className="font-bebas text-5xl leading-none tracking-wide text-white tabular-nums sm:text-6xl">
                <LocalMatchTime iso={f.date} locale={uiLocale} />
              </p>
              <p className="mt-1.5 font-barlow text-sm font-semibold uppercase tracking-wider text-stadium-muted">
                <LocalZoneOffset iso={f.date} locale={uiLocale} />
              </p>
            </>
          )}
        </div>

        {/* Away */}
        <div className="flex min-w-0 flex-col items-center text-center sm:items-start sm:text-left">
          <div className="relative size-12 sm:size-16">
            <Image
              src={teamLogo(teams.away.id, teams.away.logo)}
              alt=""
              fill
              sizes="64px"
              className="object-contain"
              priority
            />
          </div>
          <p
            className={cn(
              "mt-2 break-words text-sm font-semibold leading-tight sm:text-base",
              teams.away.id === LFC_ID ? "text-white" : "text-white/80",
            )}
          >
            {awayName}
          </p>
          {awayLineup && <p className="font-barlow text-xs text-stadium-muted">{awayLineup.formation}</p>}
          {isFinished && (
            <div className="spoiler-hide">
              <ScorerList goals={awayGoals} align="away" />
            </div>
          )}
        </div>
      </div>

      {/* When, where, where to watch */}
      <ul className="mt-5 space-y-2.5 border-t border-[var(--line)] pt-4 text-sm leading-snug text-white/90">
        <li className="flex items-start gap-2.5">
          <CalendarDays aria-hidden className={infoIcon} />
          <span>
            <LocalMatchDay iso={f.date} locale={uiLocale} withYear />
            {!hasStarted && (
              <>
                {" "}
                · <LocalMatchTime iso={f.date} locale={uiLocale} /> (
                <LocalZoneOffset iso={f.date} locale={uiLocale} />)
              </>
            )}
          </span>
        </li>
        {venue && (
          <li className="flex items-start gap-2.5">
            <MapPin aria-hidden className={infoIcon} />
            {venue}
          </li>
        )}
        {showWatch && (
          <li className="font-semibold text-white">
            <WhereToWatch competition={league.name} className="items-start gap-2.5" />
          </li>
        )}
        {attendance != null && attendance > 0 && attendanceLabel && (
          <li className="flex items-start gap-2.5">
            <Users aria-hidden className={infoIcon} />
            {attendanceLabel}
          </li>
        )}
        {referee && refereeLabel && (
          <li className="flex items-start gap-2.5">
            <CircleDot aria-hidden className={cn(infoIcon, "text-lfc-gold")} />
            {refereeLabel}
          </li>
        )}
      </ul>
    </section>
  );
}
