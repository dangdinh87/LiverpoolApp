import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import type { H2HRecord } from "@/lib/football";

interface H2HSectionProps {
  h2h: H2HRecord;
  opponentName: string;
}

const RESULT_COLORS = {
  W: "bg-green-500 text-white",
  D: "bg-amber-500 text-white",
  L: "bg-red-500 text-white",
} as const;

export function H2HSection({ h2h, opponentName }: H2HSectionProps) {
  const t = useTranslations("Match.h2h");
  const locale = useLocale();
  const dateLoc = locale === "vi" ? "vi-VN" : "en-GB";
  const total = h2h.liverpoolWins + h2h.draws + h2h.opponentWins;
  const lfcPct = total > 0 ? (h2h.liverpoolWins / total) * 100 : 0;
  const drawPct = total > 0 ? (h2h.draws / total) * 100 : 0;
  const oppPct = total > 0 ? (h2h.opponentWins / total) * 100 : 0;
  const winRate = total > 0 ? Math.round((h2h.liverpoolWins / total) * 100) : 0;

  return (
    <div className="bg-stadium-surface border border-stadium-border overflow-hidden">
      {/* Header */}
      <div className="px-5 sm:px-6 py-4 border-b border-stadium-border/50">
        <h3 className="font-bebas text-2xl sm:text-3xl text-white tracking-wider">
          {t("title")}
        </h3>
        <div className="flex items-center gap-3 mt-1">
          <span className="font-barlow text-xs text-stadium-muted uppercase tracking-wider">
            {t("subtitle", { count: h2h.totalMatches })}
          </span>
          <span className="w-1 h-1 rounded-full bg-stadium-border" />
          <span className="font-inter text-[11px] text-stadium-muted/70">
            {h2h.fromYear === h2h.toYear
              ? h2h.fromYear.toString()
              : t("dataRange", { from: h2h.fromYear, to: h2h.toYear })}
          </span>
        </div>
      </div>

      <div className="px-5 sm:px-6 py-5 space-y-6">
        {/* W/D/L bar — bigger */}
        <div className="space-y-3">
          <div className="flex justify-between items-baseline">
            <span className="font-bebas text-lg sm:text-xl text-lfc-red tracking-wider">Liverpool</span>
            <span className="font-bebas text-lg sm:text-xl text-white/60 tracking-wider text-right">{opponentName}</span>
          </div>
          <div className="flex h-3 overflow-hidden gap-0.5 rounded-sm">
            <div className="bg-lfc-red transition-all duration-700" style={{ width: `${lfcPct}%` }} />
            {drawPct > 0 && (
              <div className="bg-stadium-muted/40 transition-all duration-700" style={{ width: `${drawPct}%` }} />
            )}
            <div className="bg-white/15 transition-all duration-700" style={{ width: `${oppPct}%` }} />
          </div>
          <div className="flex justify-between">
            <span className="font-bebas text-2xl sm:text-3xl text-lfc-red leading-none">{h2h.liverpoolWins}W</span>
            <span className="font-bebas text-2xl sm:text-3xl text-lfc-gold leading-none">{h2h.draws}D</span>
            <span className="font-bebas text-2xl sm:text-3xl text-white/50 leading-none">{h2h.opponentWins}L</span>
          </div>
        </div>

        {/* Stats grid — 4 cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <StatCard label={t("goalsFor")} value={h2h.liverpoolGoals} accent="text-lfc-red" />
          <StatCard label={t("goalsAgainst")} value={h2h.opponentGoals} accent="text-white/60" />
          <StatCard label={t("avgGoals")} value={h2h.avgGoalsPerMatch} accent="text-lfc-gold" />
          <StatCard label={t("winRate")} value={`${winRate}%`} accent={winRate >= 50 ? "text-green-400" : "text-amber-400"} />
        </div>

        {/* Clean sheets — inline highlight */}
        {h2h.cleanSheets > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20">
            <span className="font-bebas text-xl text-green-400 leading-none">{h2h.cleanSheets}</span>
            <span className="font-barlow text-xs text-green-400/80 uppercase tracking-wider">{t("cleanSheets")}</span>
          </div>
        )}

        {/* Last meetings */}
        {h2h.lastMeetings.length > 0 && (
          <div>
            <p className="font-barlow text-xs text-stadium-muted uppercase tracking-widest font-semibold mb-3">
              {t("lastMeetings")}
            </p>
            <div className="space-y-1">
              {h2h.lastMeetings.map((m, i) => {
                const date = new Date(m.date);
                const dateStr = date.toLocaleDateString(dateLoc, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 py-2.5 px-3 -mx-3 border-b border-stadium-border/15 last:border-0 hover:bg-stadium-surface2/30 transition-colors"
                  >
                    <span
                      className={cn(
                        "w-7 h-7 flex items-center justify-center font-bebas text-sm shrink-0 rounded-sm",
                        RESULT_COLORS[m.result],
                      )}
                    >
                      {m.result}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-inter text-sm text-white font-medium truncate">
                        {m.homeTeam} <span className="text-lfc-gold font-bebas text-base mx-1">{m.score}</span> {m.awayTeam}
                      </p>
                      <p className="font-inter text-[11px] text-stadium-muted mt-0.5">
                        {dateStr} · {m.competition}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className="bg-stadium-bg/50 border border-stadium-border/30 p-3 text-center">
      <p className="font-barlow text-[10px] text-stadium-muted uppercase tracking-wider mb-1.5">
        {label}
      </p>
      <p className={cn("font-bebas text-3xl leading-none", accent)}>{value}</p>
    </div>
  );
}
