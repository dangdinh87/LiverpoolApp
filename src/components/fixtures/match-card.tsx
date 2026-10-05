import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Fixture } from "@/lib/types/football";
import { getMatchResult } from "@/lib/types/football";
import { cn } from "@/lib/utils";
import { formatMatchDayMonth, formatMatchTime } from "@/lib/format-match-date";
import { MatchCountdown } from "./match-countdown";

export const LFC_TEAM_ID = 40;
const FINISHED = ["FT", "AET", "PEN"];
const LIVE = ["1H", "2H", "HT", "ET", "P", "LIVE"];

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
        {logo && <Image src={logo} alt="" fill sizes="48px" className="object-contain" />}
      </div>
      <span
        className={cn(
          "min-w-0 text-[13px] font-semibold leading-tight break-words line-clamp-2 sm:text-base",
          isLfc ? "text-white" : "text-white/80",
        )}
      >
        {team.name}
      </span>
    </div>
  );
}

interface MatchCardProps {
  fixture: Fixture;
  /** The next unplayed match: gets the countdown and a highlight. */
  isNext?: boolean;
}

export function MatchCard({ fixture, isNext = false }: MatchCardProps) {
  const t = useTranslations("Match");
  const { fixture: f, league, teams, goals, score } = fixture;
  const status = f.status.short;
  const isFinished = FINISHED.includes(status);
  const isLive = LIVE.includes(status);
  const isUpcoming = !isFinished && !isLive;
  const result = getMatchResult(fixture);
  const resultStyle = result === "NS" ? null : RESULT_STYLE[result];
  const comp = COMP_TAG[league.name];

  const date = new Date(f.date);
  const locale = t("locale_code") === "vi-VN" ? "vi" : "en";
  const dateStr = formatMatchDayMonth(date, locale);
  const timeStr = formatMatchTime(date);
  const extra = status === "AET" ? "AET" : status === "PEN" ? "PEN" : null;
  const pens =
    status === "PEN" && score.penalty.home !== null && score.penalty.away !== null
      ? `${score.penalty.home}–${score.penalty.away}`
      : null;
  const resultWord = result === "W" ? t("win") : result === "D" ? t("draw") : t("loss");

  const aria = isUpcoming
    ? `${teams.home.name} – ${teams.away.name}, ${dateStr} ${timeStr}`
    : `${teams.home.name} ${goals.home ?? 0} – ${goals.away ?? 0} ${teams.away.name}`;

  return (
    <Link
      href={`/fixtures/${f.id}`}
      aria-label={aria}
      className={cn(
        "surface-interactive group relative block overflow-hidden",
        isLive && "!border-lfc-red/60",
        isNext && "!border-lfc-gold/40",
      )}
    >
      {isFinished && resultStyle && <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", resultStyle.strip)} />}
      {isLive && <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-lfc-red" />}
      {isNext && <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-lfc-gold" />}

      <div className="px-4 py-3.5 sm:px-6 sm:py-4">
        {/* Meta row: competition · round on the left, state badge on the right */}
        <div className="mb-3 flex min-h-6 items-center justify-between gap-3">
          <p className="flex min-w-0 items-center gap-2 font-barlow text-xs font-semibold uppercase tracking-[0.1em] text-stadium-muted">
            {comp && <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", comp.dot)} />}
            <span className="truncate">
              <span className="text-white/90">{comp?.short ?? league.name}</span>
              {league.round && <span> · {league.round}</span>}
            </span>
          </p>

          <div className="flex shrink-0 items-center gap-2">
            {isLive && (
              <span className="inline-flex items-center gap-1.5 border border-lfc-red/50 bg-lfc-red/15 px-2 py-0.5 font-barlow text-xs font-bold uppercase tracking-wider text-white">
                <span aria-hidden className="size-1.5 rounded-full bg-lfc-red animate-pulse" />
                {t("live")}
                {f.status.elapsed ? ` ${f.status.elapsed}'` : ""}
              </span>
            )}
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
            {isNext && <MatchCountdown kickOff={f.date} />}
          </div>
        </div>

        {/* Teams + score/time: fixed centre column keeps both names readable at 390px */}
        <div className="grid grid-cols-[minmax(0,1fr)_5.25rem_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_8rem_minmax(0,1fr)] sm:gap-4">
          <TeamSide team={teams.home} align="home" />

          <div className="text-center">
            {isFinished || isLive ? (
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
                <p className="mt-1 font-barlow text-xs font-semibold uppercase tracking-wider text-stadium-muted">GMT+7</p>
              </>
            )}
          </div>

          <TeamSide team={teams.away} align="away" />
        </div>

        {/* Footer: date + venue */}
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--line)] pt-3 text-xs text-stadium-muted">
          <span className="shrink-0">{dateStr}</span>
          {f.venue.name && (
            <span className="flex min-w-0 items-center gap-1.5">
              <MapPin size={12} aria-hidden className="shrink-0" />
              <span className="truncate">{f.venue.name}</span>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
