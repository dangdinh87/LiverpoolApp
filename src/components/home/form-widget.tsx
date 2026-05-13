import { useTranslations } from "next-intl";
import Link from "next/link";
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
  let winStreak = 0;
  let unbeatenStreak = 0;
  let winStreakActive = true;
  let hasValidChars = false;

  for (let i = form.length - 1; i >= 0; i--) {
    const c = form[i];
    if (c === "W" || c === "D" || c === "L") {
      hasValidChars = true;
      if (c === "L") {
        break;
      }
      if (c === "W") {
        if (winStreakActive) winStreak++;
        unbeatenStreak++;
      } else if (c === "D") {
        winStreakActive = false;
        unbeatenStreak++;
      }
    }
  }

  if (!hasValidChars) return null;
  return { winStreak, unbeatenStreak };
}

export function FormWidget({ standing }: FormWidgetProps) {
  const form = standing?.form?.split("") ?? [];
  const last5 = form.slice(-5);

  let wins = 0;
  let draws = 0;
  let losses = 0;
  for (let i = 0; i < last5.length; i++) {
    const r = last5[i];
    if (r === "W") wins++;
    else if (r === "D") draws++;
    else if (r === "L") losses++;
  }

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
      <div className="mt-3 flex items-center gap-2">
        <Link
          href="/season?tab=fixtures"
          className="inline-flex items-center justify-center border border-lfc-red/40 bg-lfc-red/10 px-2.5 py-1.5 font-barlow text-[10px] font-semibold uppercase tracking-wider text-white transition-colors hover:bg-lfc-red/20"
        >
          {bt("viewFixtures")}
        </Link>
        <Link
          href="/season?tab=standings"
          className="inline-flex items-center justify-center border border-stadium-border bg-stadium-surface2 px-2.5 py-1.5 font-barlow text-[10px] font-semibold uppercase tracking-wider text-stadium-muted transition-colors hover:border-white/30 hover:text-white"
        >
          {bt("viewTable")}
        </Link>
      </div>
    </div>
  );
}
