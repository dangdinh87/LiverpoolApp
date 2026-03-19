import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { Standing } from "@/lib/types/football";
import {
  OverviewCardHeader,
  OverviewDivider,
  OverviewFooterMetric,
} from "./overview-card-shared";

interface FormWidgetProps {
  standing: Standing | null;
}

const RESULT_CONFIG = {
  W: { color: "bg-green-500", label: "Win", text: "W" },
  D: { color: "bg-amber-500", label: "Draw", text: "D" },
  L: { color: "bg-red-500", label: "Loss", text: "L" },
} as const;

/** Compute current streaks from full form string (e.g. "WWDWWWLWWW") */
function computeStreaks(form: string) {
  const chars = form.split("").filter((c) => c === "W" || c === "D" || c === "L");
  if (chars.length === 0) return null;

  // Current win streak (from most recent)
  let winStreak = 0;
  for (let i = chars.length - 1; i >= 0; i--) {
    if (chars[i] === "W") winStreak++;
    else break;
  }

  // Current unbeaten streak (W or D from most recent)
  let unbeatenStreak = 0;
  for (let i = chars.length - 1; i >= 0; i--) {
    if (chars[i] !== "L") unbeatenStreak++;
    else break;
  }

  // Current scoring streak — can't determine from W/D/L only, skip
  // Clean sheet streak — can't determine from W/D/L only, skip

  return { winStreak, unbeatenStreak };
}

export function FormWidget({ standing }: FormWidgetProps) {
  const form = standing?.form?.split("") ?? [];
  const last5 = form.slice(-5);

  const wins = last5.filter((r) => r === "W").length;
  const draws = last5.filter((r) => r === "D").length;
  const losses = last5.filter((r) => r === "L").length;

  const streaks = standing?.form ? computeStreaks(standing.form) : null;

  const t = useTranslations("Common.labels");
  const bt = useTranslations("Bento");

  return (
    <div className="flex flex-col gap-3 p-4 h-full">
      <OverviewCardHeader
        title={bt("recentForm")}
        action={
          <span className="font-barlow text-[10px] text-stadium-muted/70 uppercase tracking-wider">
            {t("last5")}
          </span>
        }
      />

      {/* Form circles */}
      <div className="flex gap-2 justify-center flex-1 items-center min-h-0">
        {last5.map((result, i) => {
          const config = RESULT_CONFIG[result as keyof typeof RESULT_CONFIG];
          return (
            <div
              key={i}
              className={cn(
                "min-w-9 h-9 px-2.5 flex items-center justify-center font-bebas text-base text-white shadow-md border border-black/20",
                config?.color ?? "bg-stadium-border"
              )}
              title={config?.label}
            >
              {config?.text ?? result}
            </div>
          );
        })}
      </div>

      {/* Streak badges */}
      {streaks && (streaks.winStreak >= 3 || streaks.unbeatenStreak >= 5) && (
        <div className="flex gap-2 justify-center flex-wrap">
          {streaks.winStreak >= 3 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/15 border border-green-500/30 font-barlow text-[10px] font-bold text-green-400 uppercase tracking-wider">
              <span className="animate-pulse">🔥</span>
              {bt("winStreak", { count: streaks.winStreak })}
            </span>
          )}
          {streaks.unbeatenStreak >= 5 && streaks.unbeatenStreak !== streaks.winStreak && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-lfc-gold/10 border border-lfc-gold/30 font-barlow text-[10px] font-bold text-lfc-gold uppercase tracking-wider">
              {bt("unbeaten", { count: streaks.unbeatenStreak })}
            </span>
          )}
        </div>
      )}

      {/* W/D/L summary */}
      <OverviewDivider className="mt-auto" />
      <div className="grid grid-cols-3 gap-3 pt-3">
        <OverviewFooterMetric label="W" value={wins} valueClassName="text-green-400" />
        <OverviewFooterMetric label="D" value={draws} valueClassName="text-amber-400" />
        <OverviewFooterMetric label="L" value={losses} valueClassName="text-red-400" />
      </div>
    </div>
  );
}
