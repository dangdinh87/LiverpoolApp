import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import type { Fixture } from "@/lib/types/football";
import { getMatchResult } from "@/lib/types/football";
import { cn } from "@/lib/utils";

const RESULT_STYLES = {
  W: { dot: "bg-green-500", label: "W", text: "text-green-400" },
  D: { dot: "bg-yellow-500", label: "D", text: "text-yellow-400" },
  L: { dot: "bg-red-500", label: "L", text: "text-red-400" },
  NS: { dot: "bg-stadium-muted", label: "—", text: "text-stadium-muted" },
};

const COMPETITION_COLORS: Record<string, string> = {
  "Premier League": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "UEFA Champions League": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "FA Cup": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "EFL Cup": "bg-green-500/20 text-green-400 border-green-500/30",
};

interface MatchCardProps {
  fixture: Fixture;
}

export function MatchCard({ fixture }: MatchCardProps) {
  const { fixture: f, league, teams, goals } = fixture;
  const result = getMatchResult(fixture);
  const resultStyle = RESULT_STYLES[result];
  const isFinished = f.status.short === "FT";
  const isLive = ["1H", "2H", "HT", "ET"].includes(f.status.short);

  const date = new Date(f.date);
  const dateStr = date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const timeStr = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const competitionColor =
    COMPETITION_COLORS[league.name] ??
    "bg-white/10 text-white/60 border-white/20";

  return (
    <div
      className={cn(
        "relative bg-stadium-surface border border-stadium-border rounded-xl p-4 transition-all duration-200",
        isLive && "border-lfc-red/50 shadow-[0_0_15px_rgba(200,16,46,0.1)]"
      )}
    >
      {/* Top row: date + competition badge */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-stadium-muted text-xs font-inter">
          {dateStr}
          {!isFinished && ` · ${timeStr}`}
        </span>
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-lfc-red animate-pulse-red" />
              <span className="text-lfc-red text-xs font-barlow font-semibold uppercase tracking-wider">
                Live {f.status.elapsed}&apos;
              </span>
            </span>
          )}
          <Badge
            variant="outline"
            className={cn("text-xs font-barlow font-semibold", competitionColor)}
          >
            {league.name}
          </Badge>
        </div>
      </div>

      {/* Match row: home — score — away */}
      <div className="flex items-center gap-3">
        {/* Home team */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          <span
            className={cn(
              "font-inter font-semibold text-sm text-right truncate",
              teams.home.id === 40 ? "text-white" : "text-stadium-muted"
            )}
          >
            {teams.home.name}
          </span>
          <div className="relative w-8 h-8 flex-shrink-0">
            <Image
              src={teams.home.logo}
              alt={teams.home.name}
              fill
              sizes="32px"
              className="object-contain"
              loading="lazy"
            />
          </div>
        </div>

        {/* Score / VS */}
        <div className="flex items-center justify-center w-16 flex-shrink-0">
          {isFinished || isLive ? (
            <div className="text-center">
              <span className="font-bebas text-2xl text-white tracking-wider">
                {goals.home ?? 0} – {goals.away ?? 0}
              </span>
            </div>
          ) : (
            <span className="font-barlow text-stadium-muted text-sm font-semibold">
              VS
            </span>
          )}
        </div>

        {/* Away team */}
        <div className="flex items-center gap-2 flex-1">
          <div className="relative w-8 h-8 flex-shrink-0">
            <Image
              src={teams.away.logo}
              alt={teams.away.name}
              fill
              sizes="32px"
              className="object-contain"
              loading="lazy"
            />
          </div>
          <span
            className={cn(
              "font-inter font-semibold text-sm truncate",
              teams.away.id === 40 ? "text-white" : "text-stadium-muted"
            )}
          >
            {teams.away.name}
          </span>
        </div>

        {/* Result dot for finished matches */}
        {isFinished && (
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
              result === "W" && "bg-green-500/20",
              result === "D" && "bg-yellow-500/20",
              result === "L" && "bg-red-500/20"
            )}
          >
            <span className={cn("font-bebas text-lg", resultStyle.text)}>
              {resultStyle.label}
            </span>
          </div>
        )}
      </div>

      {/* Venue */}
      {f.venue.name && (
        <p className="text-stadium-muted text-xs font-inter mt-2">
          {f.venue.name}, {f.venue.city}
        </p>
      )}
    </div>
  );
}
