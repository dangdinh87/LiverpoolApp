import Image from "next/image";
import type { Standing } from "@/lib/types/football";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const RESULT_DOT_COLORS = {
  W: "bg-green-500",
  D: "bg-yellow-500",
  L: "bg-red-500",
};

// Zone indicators by competition
function getZone(rank: number, competition: "pl" | "ucl"): { color: string } | null {
  if (competition === "ucl") {
    if (rank <= 8) return { color: "bg-green-500" };   // Auto R16
    if (rank <= 24) return { color: "bg-sky-500" };     // Playoffs
    if (rank >= 25) return { color: "bg-red-600" };     // Eliminated
    return null;
  }
  // PL zones
  if (rank <= 4) return { color: "bg-blue-500" };
  if (rank === 5) return { color: "bg-orange-500" };
  if (rank === 6) return { color: "bg-green-600" };
  if (rank >= 18) return { color: "bg-red-600" };
  return null;
}

interface StandingsTableProps {
  standings: Standing[];
  competition?: "pl" | "ucl";
}

export function StandingsTable({ standings, competition = "pl" }: StandingsTableProps) {
  const t = useTranslations("Standings");
  const maxPoints = standings[0]?.points ?? 1;

  const HEADERS = [
    { key: "played", label: t("played") },
    { key: "win", label: t("win") },
    { key: "draw", label: t("draw") },
    { key: "lose", label: t("lose") },
    { key: "gf", label: t("gf") },
    { key: "ga", label: t("ga") },
    { key: "gd", label: t("gd") },
    { key: "pts", label: t("pts") },
  ];

  return (
    <div className="bg-stadium-surface border border-stadium-border overflow-hidden">
      <ScrollArea className="w-full">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="bg-stadium-bg/60 border-b border-stadium-border">
              <th className="w-10 px-2 py-3 text-center font-barlow font-semibold text-[10px] uppercase tracking-wider text-stadium-muted">
                {t("rank")}
              </th>
              <th className="text-left pl-3 pr-2 py-3 font-barlow font-semibold text-[10px] uppercase tracking-wider text-stadium-muted">
                {t("club")}
              </th>
              {HEADERS.map((h) => (
                <th
                  key={h.key}
                  className={cn(
                    "w-12 px-1 py-3 text-center font-barlow font-semibold text-[10px] uppercase tracking-wider",
                    h.key === "pts" ? "text-white" : "text-stadium-muted",
                  )}
                >
                  {h.label}
                </th>
              ))}
              <th className="w-28 px-2 py-3 text-center font-barlow font-semibold text-[10px] uppercase tracking-wider text-stadium-muted">
                {t("form")}
              </th>
            </tr>
          </thead>
          <tbody>
            {standings.map((standing, idx) => {
              const isLiverpool = standing.team.id === 40;
              const form = standing.form?.split("") ?? [];
              const zone = getZone(standing.rank, competition);
              // Zone dividers
              const showZoneDivider =
                competition === "ucl"
                  ? standing.rank === 8 || standing.rank === 24
                  : standing.rank === 4 ||
                  standing.rank === 5 ||
                  standing.rank === 6 ||
                  standing.rank === 17;

              return (
                <tr
                  key={standing.team.id}
                  className={cn(
                    "transition-colors group",
                    isLiverpool
                      ? "bg-lfc-red/[0.08]"
                      : idx % 2 === 0
                        ? "bg-stadium-surface"
                        : "bg-stadium-bg/20",
                    !isLiverpool && "hover:bg-stadium-surface2",
                    showZoneDivider && "border-b-2 border-b-stadium-border",
                  )}
                >
                  {/* Rank + zone indicator */}
                  <td className="w-10 px-2 py-3 text-center relative">
                    {zone && (
                      <span
                        className={cn(
                          "absolute left-0 top-1 bottom-1 w-[3px]",
                          zone.color,
                        )}
                      />
                    )}
                    <span
                      className={cn(
                        "font-bebas text-lg",
                        isLiverpool ? "text-lfc-red" : "text-stadium-muted",
                      )}
                    >
                      {standing.rank}
                    </span>
                  </td>

                  {/* Club */}
                  <td className="pl-3 pr-2 py-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative w-6 h-6 flex-shrink-0">
                        <Image
                          src={standing.team.logo}
                          alt={standing.team.name}
                          fill
                          sizes="24px"
                          className="object-contain"
                          loading="lazy"
                        />
                      </div>
                      <span
                        className={cn(
                          "font-inter text-sm truncate",
                          isLiverpool
                            ? "text-white font-bold"
                            : "text-white/80 group-hover:text-white",
                        )}
                      >
                        {standing.team.name}
                      </span>
                    </div>
                  </td>

                  {/* P */}
                  <td className="w-12 px-1 py-3 text-center font-inter text-sm text-stadium-muted">
                    {standing.all.played}
                  </td>
                  {/* W */}
                  <td
                    className={cn(
                      "w-12 px-1 py-3 text-center font-inter text-sm",
                      isLiverpool
                        ? "text-white font-medium"
                        : "text-stadium-muted",
                    )}
                  >
                    {standing.all.win}
                  </td>
                  {/* D */}
                  <td className="w-12 px-1 py-3 text-center font-inter text-sm text-stadium-muted">
                    {standing.all.draw}
                  </td>
                  {/* L */}
                  <td className="w-12 px-1 py-3 text-center font-inter text-sm text-stadium-muted">
                    {standing.all.lose}
                  </td>
                  {/* GF */}
                  <td className="w-12 px-1 py-3 text-center font-inter text-sm text-stadium-muted">
                    {standing.all.goals.for}
                  </td>
                  {/* GA */}
                  <td className="w-12 px-1 py-3 text-center font-inter text-sm text-stadium-muted">
                    {standing.all.goals.against}
                  </td>
                  {/* GD */}
                  <td
                    className={cn(
                      "w-12 px-1 py-3 text-center font-inter text-sm font-semibold",
                      standing.goalsDiff > 0
                        ? "text-green-400"
                        : standing.goalsDiff < 0
                          ? "text-red-400"
                          : "text-stadium-muted",
                    )}
                  >
                    {standing.goalsDiff > 0
                      ? `+${standing.goalsDiff}`
                      : standing.goalsDiff}
                  </td>
                  {/* Pts */}
                  <td className="w-12 px-1 py-3 text-center">
                    <span
                      className={cn(
                        "font-bebas text-xl",
                        isLiverpool ? "text-lfc-red" : "text-white",
                      )}
                    >
                      {standing.points}
                    </span>
                  </td>
                  {/* Form */}
                  <td className="w-28 px-2 py-3">
                    <div className="flex gap-1 items-center justify-center">
                      {form.slice(-5).map((r, i) => (
                        <span
                          key={i}
                          className={cn(
                            "w-2.5 h-2.5 rounded-full",
                            RESULT_DOT_COLORS[
                            r as keyof typeof RESULT_DOT_COLORS
                            ] ?? "bg-stadium-muted",
                          )}
                          title={
                            r === "W"
                              ? t("zones.win")
                              : r === "D"
                                ? t("zones.draw")
                                : t("zones.loss")
                          }
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Liverpool progress bar */}
      {(() => {
        const lfc = standings.find((s) => s.team.id === 40);
        if (!lfc) return null;
        return (
          <div className="px-4 py-3 bg-lfc-red/[0.06] border-t border-stadium-border">
            <div className="flex items-center gap-3">
              <span className="text-stadium-muted text-xs font-barlow font-semibold uppercase tracking-wider shrink-0">
                {t("progressBar.label")}
              </span>
              <div className="flex-1 h-1.5 bg-stadium-border/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-lfc-red to-lfc-red/60 rounded-full transition-all duration-700"
                  style={{
                    width: `${(lfc.points / maxPoints) * 100}%`,
                  }}
                />
              </div>
              <span className="text-lfc-red text-xs font-bebas tracking-wider shrink-0">
                {lfc.points} / {maxPoints} {t("pts").toLowerCase()}
              </span>
            </div>
          </div>
        );
      })()}

      {/* Zone legend */}
      <div className="px-4 py-3 border-t border-stadium-border flex gap-5 flex-wrap">
        {(competition === "ucl"
          ? [
            { color: "bg-green-500", label: t("zones.r16") },
            { color: "bg-sky-500", label: t("zones.playoff") },
            { color: "bg-red-600", label: t("zones.elim") },
          ]
          : [
            { color: "bg-blue-500", label: t("zones.cl") },
            { color: "bg-orange-500", label: t("zones.el") },
            { color: "bg-green-600", label: t("zones.ecl") },
            { color: "bg-red-600", label: t("zones.rel") },
          ]
        ).map(({ color, label }) => (
          <span
            key={label}
            className="flex items-center gap-1.5 text-[11px] text-stadium-muted font-inter"
          >
            <span className={cn("w-3 h-1.5 rounded-sm", color)} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
