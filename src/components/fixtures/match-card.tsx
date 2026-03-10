import Image from "next/image";
import Link from "next/link";
import type { Fixture } from "@/lib/types/football";
import { getMatchResult } from "@/lib/types/football";
import { cn } from "@/lib/utils";
import { MapPin, Calendar, Clock } from "lucide-react";
import { useTranslations } from "next-intl";

// ─── Competition config: colors, icons, short labels ────────────────────────

const UCL_STYLE = { accent: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/20", glow: "shadow-[0_0_20px_rgba(56,189,248,0.08)]", short: "UCL" };
const EFL_STYLE = { accent: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", glow: "shadow-[0_0_20px_rgba(52,211,153,0.08)]", short: "EFL" };
const FA_STYLE = { accent: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", glow: "shadow-[0_0_20px_rgba(245,158,11,0.08)]", short: "FA" };

const COMP_CONFIG: Record<string, { accent: string; bg: string; border: string; glow: string; short: string }> = {
  "Premier League": { accent: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20", glow: "shadow-[0_0_20px_rgba(168,85,247,0.08)]", short: "PL" },
  "UEFA Champions League": UCL_STYLE,
  "Champions League": UCL_STYLE,
  "FA Cup": FA_STYLE,
  "EFL Cup": EFL_STYLE,
  "Carabao Cup": EFL_STYLE,
  "League Cup": EFL_STYLE,
  "Community Shield": { accent: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", glow: "shadow-[0_0_20px_rgba(244,63,94,0.08)]", short: "CS" },
  "FA Community Shield": { accent: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", glow: "shadow-[0_0_20px_rgba(244,63,94,0.08)]", short: "CS" },
};

const DEFAULT_COMP = {
  accent: "text-white/50",
  bg: "bg-white/5",
  border: "border-white/10",
  glow: "",
  short: "",
};

// ─── Countdown helper ───────────────────────────────────────────────────────

// Removed global getCountdown function

// ─── Component ──────────────────────────────────────────────────────────────

interface MatchCardProps {
  fixture: Fixture;
}

export function MatchCard({ fixture }: MatchCardProps) {
  const t = useTranslations("Match");
  const { fixture: f, league, teams, goals, score } = fixture;
  const result = getMatchResult(fixture);

  const RESULT_CONFIG = {
    W: { dot: "bg-green-500", text: "text-green-400", label: t("win"), bg: "bg-green-500" },
    D: { dot: "bg-yellow-500", text: "text-yellow-400", label: t("draw"), bg: "bg-yellow-500" },
    L: { dot: "bg-red-500", text: "text-red-400", label: t("loss"), bg: "bg-red-500" },
    NS: { dot: "bg-stadium-border", text: "text-stadium-muted", label: "", bg: "bg-stadium-border" },
  };

  const resultCfg = RESULT_CONFIG[result as keyof typeof RESULT_CONFIG] ?? RESULT_CONFIG.NS;
  const compCfg = COMP_CONFIG[league.name] ?? DEFAULT_COMP;
  const isFinished = f.status.short === "FT" || f.status.short === "AET" || f.status.short === "PEN";
  const isLive = ["1H", "2H", "HT", "ET", "P", "LIVE"].includes(f.status.short);
  const isUpcoming = !isFinished && !isLive;
  const isLfc = (id: number) => id === 40;
  const teamLogo = (id: number, logo: string) => isLfc(id) ? "/assets/lfc/crest.webp" : logo;

  const date = new Date(f.date);
  const locale = t("locale_code") || "en-GB";
  const dateStr = date.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
  const timeStr = date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  const htHome = score.halftime.home;
  const htAway = score.halftime.away;
  const hasHt = htHome !== null && htAway !== null;

  function getCountdownText(): string | null {
    const now = new Date();
    const target = new Date(f.date);
    const diff = target.getTime() - now.getTime();
    if (diff <= 0) return null;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 30) {
      const months = Math.floor(days / 30);
      return t("countdown.inMonths", { n: months, s: months > 1 ? "s" : "" });
    }
    if (days > 0) return t("countdown.inDays", { n: days, h: hours });
    if (hours > 0) return t("countdown.inHours", { n: hours, m: mins });
    return t("countdown.inMins", { n: mins });
  }

  const countdown = isUpcoming ? getCountdownText() : null;

  return (
    <Link
      href={`/fixtures/${f.id}`}
      className={cn(
        "group relative block overflow-hidden transition-all duration-300",
        "bg-stadium-surface border border-stadium-border rounded-none",
        "hover:border-white/25 hover:bg-stadium-surface2",
        isLive && "border-lfc-red/40 shadow-[0_0_30px_rgba(200,16,46,0.12)]",
        isFinished && compCfg.glow,
      )}
    >
      {/* Watermark competition logo — large, tilted, faded background */}
      {league.logo && (
        <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-52 h-52 opacity-[0.18] rotate-[-12deg] pointer-events-none select-none">
          <Image src={league.logo} alt="" fill sizes="208px" className="object-contain brightness-200" loading="lazy" />
        </div>
      )}

      {/* Result accent strip */}
      {isFinished && <div className={cn("absolute left-0 top-0 bottom-0 w-1", resultCfg.bg)} />}
      {isLive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-lfc-red animate-pulse" />}

      <div className="relative px-5 py-4">
        {/* Top bar: competition name + round + badges */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={cn("font-bebas text-base uppercase tracking-wider", compCfg.accent)}>
              {league.name}
            </span>
            {league.round && (
              <>
                <span className="text-stadium-border">·</span>
                <span className="text-stadium-muted font-barlow text-sm">{league.round}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isLive && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-lfc-red/15 border border-lfc-red/30">
                <span className="w-1.5 h-1.5 rounded-full bg-lfc-red animate-pulse" />
                <span className="text-lfc-red text-[11px] font-bebas tracking-wider leading-none">{t("live")} {f.status.elapsed}&apos;</span>
              </span>
            )}

            {/* Result badge — dot + letter */}
            {isFinished && result !== "NS" && (
              <span className="inline-flex items-center gap-1.5">
                <span className={cn("w-2 h-2 rounded-full", resultCfg.dot)} />
                <span className={cn("text-xs font-bebas tracking-widest leading-none", resultCfg.text)}>
                  {resultCfg.label}
                </span>
              </span>
            )}

            {isUpcoming && countdown && (
              <span className="text-[11px] font-bebas tracking-widest leading-none text-stadium-muted">
                {countdown.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Main match display */}
        <div className="flex items-center py-1">
          {/* Home team */}
          <div className="flex-1 flex items-center gap-3 justify-end">
            <div className="text-right min-w-0">
              <span className={cn(
                "font-inter font-bold text-lg leading-tight block truncate",
                isLfc(teams.home.id) ? "text-white" : "text-white/70",
              )}>
                {teams.home.name}
              </span>
              {isLfc(teams.home.id) && (
                <span className="text-lfc-red text-[10px] font-barlow font-semibold uppercase tracking-widest">{t("home")}</span>
              )}
            </div>
            <div className="relative w-14 h-14 shrink-0 transition-transform group-hover:scale-110">
              <Image src={teamLogo(teams.home.id, teams.home.logo)} alt={teams.home.name} fill sizes="56px" className="object-contain" loading="lazy" />
            </div>
          </div>

          {/* Score / Time block — consistent width for both states */}
          <div className="w-32 flex-shrink-0 mx-4">
            {isFinished || isLive ? (
              <div className="text-center">
                <div className="flex items-center justify-center gap-3">
                  <span className={cn(
                    "font-bebas text-5xl leading-none tracking-wider",
                    isLfc(teams.home.id) && teams.home.winner ? "text-white" : "text-white/60",
                  )}>
                    {goals.home ?? 0}
                  </span>
                  <span className="text-stadium-muted font-bebas text-3xl leading-none">:</span>
                  <span className={cn(
                    "font-bebas text-5xl leading-none tracking-wider",
                    isLfc(teams.away.id) && teams.away.winner ? "text-white" : "text-white/60",
                  )}>
                    {goals.away ?? 0}
                  </span>
                </div>
                {isFinished && hasHt && (
                  <p className="text-stadium-muted text-xs font-inter mt-1">{t("halftimeShort") || "HT"} {htHome} – {htAway}</p>
                )}
                {(f.status.short === "AET" || f.status.short === "PEN") && (
                  <p className="text-stadium-muted text-xs font-barlow font-semibold uppercase tracking-wider mt-0.5">
                    {f.status.short === "AET" ? t("aet") : t("pen")}
                  </p>
                )}
              </div>
            ) : (
              /* Upcoming: show kickoff time only, date moves to bottom bar */
              <div className="text-center">
                <span className="font-bebas text-4xl text-white tracking-wider leading-none block">{timeStr}</span>
              </div>
            )}
          </div>

          {/* Away team */}
          <div className="flex-1 flex items-center gap-3">
            <div className="relative w-14 h-14 shrink-0 transition-transform group-hover:scale-110">
              <Image src={teamLogo(teams.away.id, teams.away.logo)} alt={teams.away.name} fill sizes="56px" className="object-contain" loading="lazy" />
            </div>
            <div className="min-w-0">
              <span className={cn(
                "font-inter font-bold text-lg leading-tight block truncate",
                isLfc(teams.away.id) ? "text-white" : "text-white/70",
              )}>
                {teams.away.name}
              </span>
              {isLfc(teams.away.id) && (
                <span className="text-lfc-red text-[10px] font-barlow font-semibold uppercase tracking-widest">{t("away")}</span>
              )}
            </div>
          </div>
        </div>

        {/* Bottom info bar — always shown for consistent layout */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-stadium-border/50">
          <span className="text-stadium-muted text-[11px] font-inter flex items-center gap-1.5">
            <Calendar size={11} className="opacity-60" />
            {dateStr}
          </span>

          {f.venue.name ? (
            <span className="text-stadium-muted text-[11px] font-inter flex items-center gap-1.5">
              <MapPin size={11} className="opacity-60" />
              {f.venue.name}
            </span>
          ) : isUpcoming ? (
            <span className="text-stadium-muted text-[11px] font-inter flex items-center gap-1.5">
              <Clock size={11} className="opacity-60" />
              {t("kickoff", { time: timeStr })}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
