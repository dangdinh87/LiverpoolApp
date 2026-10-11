"use client";

import { TeamCrest } from "@/components/ui/team-crest";
import { Link } from "@/i18n/navigation";
import { MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Fixture } from "@/lib/types/football";
import { getMatchResult } from "@/lib/types/football";
import { cn } from "@/lib/utils";
import { defaultTimeZoneForLocale, formatMatchDayMonth, formatMatchTime, formatZoneOffset } from "@/lib/format-match-date";
import { useViewerTimeZone } from "@/hooks/use-viewer-time-zone";
import { MatchCountdown } from "./match-countdown";
import { useLiveMatch } from "./use-live-match";
import { LiveClock, LiveEdgeTrack, LiveEventColumns, LiveScore, LiveStats, LiveStatusBadge, LiveTicker } from "./live-match-panel";
import { roundLabel } from "./round-label";
import { displayTeamName } from "./team-name";

export const LFC_TEAM_ID = 40;
const FINISHED = ["FT", "AET", "PEN"];
const LIVE = ["1H", "2H", "HT", "ET", "P", "BT", "LIVE"];

/** Short competition tag + accent (dot colour only; text stays AA-contrast). */
const COMP_TAG: Record<string, { short: string; dot: string }> = {
  "Premier League": { short: "PL", dot: "bg-purple-400" },
  "UEFA Champions League": { short: "UCL", dot: "bg-sky-400" },
  "Champions League": { short: "UCL", dot: "bg-sky-400" },
  "FA Cup": { short: "FA Cup", dot: "bg-amber-400" },
  "EFL Cup": { short: "EFL Cup", dot: "bg-emerald-400" },
  "Carabao Cup": { short: "EFL Cup", dot: "bg-emerald-400" },
  "League Cup": { short: "EFL Cup", dot: "bg-emerald-400" },
  "Community Shield": { short: "Shield", dot: "bg-rose-400" },
  "FA Community Shield": { short: "Shield", dot: "bg-rose-400" },
};

const RESULT_STYLE = {
  W: { strip: "bg-green-500", badge: "border-green-500/40 bg-green-500/10 text-green-400" },
  D: { strip: "bg-amber-400", badge: "border-amber-400/40 bg-amber-400/10 text-amber-300" },
  L: { strip: "bg-red-500", badge: "border-red-500/40 bg-red-500/10 text-red-400" },
} as const;

function TeamSide({
  team,
  align,
}: {
  team: Fixture["teams"]["home"];
  align: "home" | "away";
}) {
  const isLfc = team.id === LFC_TEAM_ID;
  const logo = isLfc ? "/assets/lfc/crest.webp" : team.logo;
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col items-center gap-1.5 text-center sm:gap-3",
        align === "home" ? "sm:flex-row-reverse sm:text-right" : "sm:flex-row sm:text-left",
      )}
    >
      <div className="relative size-10 shrink-0 sm:size-12">
        <TeamCrest src={logo} name={team.name} sizes="48px" />
      </div>
      <span
        className={cn(
          "min-w-0 text-[13px] font-semibold leading-tight break-words line-clamp-2 sm:text-base",
          isLfc ? "text-white" : "text-white/80",
        )}
      >
        {displayTeamName(team.name)}
      </span>
    </div>
  );
}

interface MatchCardProps {
  fixture: Fixture;
  /** The next unplayed match: gets the countdown and a highlight. */
  isNext?: boolean;
}

export function MatchCard({ fixture: initial, isNext = false }: MatchCardProps) {
  const t = useTranslations("Match");
  const tRound = useTranslations("Match.round");
  // The next match also listens around kick-off, in case this cached page still says "not started".
  const { fixture, live, ended, updatedAt, ref } = useLiveMatch(initial, isNext);

  const { fixture: f, league, teams, goals, score } = fixture;
  const status = f.status.short;
  // A match that ended while the page was open stays in the live layout with a "Full time" label.
  const isLive = LIVE.includes(status) || ended;
  const isFinished = !isLive && FINISHED.includes(status);
  const isUpcoming = !isFinished && !isLive;
  const showNext = isNext && isUpcoming;
  const lfcSide = teams.home.id === LFC_TEAM_ID ? "home" : teams.away.id === LFC_TEAM_ID ? "away" : null;
  const result = getMatchResult(fixture);
  const resultStyle = result === "NS" ? null : RESULT_STYLE[result];
  const comp = COMP_TAG[league.name];

  const date = new Date(f.date);
  const locale = t("locale_code") === "vi-VN" ? "vi" : "en";
  const zone = useViewerTimeZone(defaultTimeZoneForLocale(locale));
  const dateStr = formatMatchDayMonth(date, locale, false, zone);
  const timeStr = formatMatchTime(date, zone);
  const zoneLabel = formatZoneOffset(date, zone);
  const extra = status === "AET" ? "AET" : status === "PEN" ? "PEN" : null;
  const pens =
    status === "PEN" && score.penalty.home !== null && score.penalty.away !== null
      ? `${score.penalty.home}–${score.penalty.away}`
      : null;
  const resultWord = result === "W" ? t("win") : result === "D" ? t("draw") : t("loss");

  const round = roundLabel(tRound, league.round);
  const homeName = displayTeamName(teams.home.name);
  const awayName = displayTeamName(teams.away.name);
  const aria = isUpcoming
    ? `${homeName} – ${awayName}, ${dateStr} ${timeStr} ${zoneLabel}`
    : `${homeName} ${goals.home ?? 0} – ${goals.away ?? 0} ${awayName}`;

  return (
    <Link
      href={`/fixtures/${f.id}`}
      aria-label={aria}
      className={cn(
        "surface-interactive group relative block overflow-hidden",
        isLive && !ended && "!border-lfc-red/50",
        showNext && "!border-lfc-gold/40",
      )}
    >
      {isFinished && resultStyle && <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", resultStyle.strip)} />}
      {isLive && <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", ended ? "bg-white/30" : "bg-lfc-red")} />}
      {showNext && <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-lfc-gold" />}

      <div ref={ref} className="px-4 py-3.5 sm:px-6 sm:py-4 lg:grid lg:grid-cols-[12rem_minmax(0,1fr)_13rem] lg:grid-rows-2 lg:items-center lg:gap-x-8 lg:gap-y-0.5">
        {/* Meta row: competition · round on the left, state badge on the right */}
        <div className="mb-3 flex min-h-6 items-center justify-between gap-3 lg:contents">
          <p className="flex min-w-0 items-center gap-2 font-barlow text-xs font-semibold uppercase tracking-[0.1em] text-stadium-muted lg:col-start-1 lg:row-start-1 lg:self-end">
            {comp && <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", comp.dot)} />}
            <span className="truncate">
              <span className="text-white/90">{comp?.short ?? league.name}</span>
              {round && <span> · {round}</span>}
            </span>
          </p>

          <div
            className={cn(
              "flex shrink-0 items-center gap-2",
              isLive
                ? "lg:col-start-1 lg:row-start-2 lg:self-start"
                : "lg:col-start-3 lg:row-start-1 lg:self-end lg:justify-self-end",
            )}
          >
            {isLive && <LiveStatusBadge status={status} ended={ended} />}
            {isFinished && resultStyle && (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 border px-2 py-0.5 font-barlow text-xs font-bold uppercase tracking-wider",
                  resultStyle.badge,
                )}
              >
                {resultWord}
                {extra && <span className="text-white/70">· {extra}</span>}
              </span>
            )}
            {showNext && <MatchCountdown kickOff={f.date} />}
          </div>
        </div>

        {/* Teams + score/time: fixed centre column keeps both names readable at 390px */}
        <div className="grid grid-cols-[minmax(0,1fr)_5.25rem_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_8rem_minmax(0,1fr)] sm:gap-4 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <TeamSide team={teams.home} align="home" />

          <div className="text-center">
            {isLive ? (
              <>
                <LiveScore home={goals.home ?? 0} away={goals.away ?? 0} className="text-4xl text-white sm:text-5xl" />
                <LiveClock
                  live={live}
                  updatedAt={updatedAt}
                  fallback={f.status.elapsed ? `${f.status.elapsed}'` : null}
                  status={status}
                  ended={ended}
                />
              </>
            ) : isFinished ? (
              <>
                <p className="font-bebas text-4xl leading-none tracking-wide text-white tabular-nums sm:text-5xl">
                  {goals.home ?? 0}
                  <span className="px-1 text-stadium-muted">-</span>
                  {goals.away ?? 0}
                </p>
                {pens && (
                  <p className="mt-1 font-barlow text-xs font-semibold uppercase tracking-wider text-stadium-muted">
                    {t("penShort", { score: pens })}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="font-bebas text-3xl leading-none tracking-wide text-white tabular-nums sm:text-4xl">{timeStr}</p>
                <p className="mt-1 font-barlow text-xs font-semibold uppercase tracking-wider text-stadium-muted">{zoneLabel}</p>
              </>
            )}
          </div>

          <TeamSide team={teams.away} align="away" />
        </div>

        {/* Live: goals/cards under the teams, stats in the side column, newest commentary across the foot */}
        {isLive && live && (
          <>
            <LiveEventColumns events={live.events} className="mt-3 lg:col-start-2 lg:row-start-3 lg:mt-2" />
            {live.stats && (
              <div className="mt-4 lg:col-start-3 lg:row-span-3 lg:row-start-1 lg:mt-0 lg:self-center">
                <LiveStats stats={live.stats} lfcSide={lfcSide} />
              </div>
            )}
            <LiveTicker
              live={live}
              updatedAt={updatedAt}
              ended={ended}
              className="mt-4 border-t border-[var(--line)] pt-3 lg:col-span-3 lg:row-start-4"
            />
          </>
        )}

        {/* Footer: date + venue (dropped while live: it is today's match) */}
        {!isLive && (
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--line)] pt-3 text-xs text-stadium-muted lg:contents">
            <span className="shrink-0 lg:col-start-1 lg:row-start-2 lg:self-start">{dateStr}</span>
            {f.venue.name && (
              <span className="flex min-w-0 items-center gap-1.5 text-xs text-stadium-muted lg:col-start-3 lg:row-start-2 lg:self-start lg:justify-self-end">
                <MapPin size={12} aria-hidden className="shrink-0" />
                <span className="truncate">{f.venue.name}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {isLive && live && <LiveEdgeTrack live={live} ended={ended} />}
    </Link>
  );
}
