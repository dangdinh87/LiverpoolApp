"use client";

import { useLocale, useTranslations } from "next-intl";
import { displayTeamName } from "@/components/fixtures/team-name";
import { FormSquare } from "@/components/ui/form-badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { competitionLabel } from "@/lib/competition-labels";
import type { FormEntry } from "@/lib/football/season-stats";

interface Props {
  entries: FormEntry[];
  legendLabels?: { win: string; draw: string; loss: string };
}

const WORD = { W: "win", D: "draw", L: "loss" } as const;

/**
 * Every recent result as a lettered square (the same marker as the standings
 * form and the overview strip), oldest to newest, each with the score and
 * opponent on hover or focus.
 */
export function FormTimeline({ entries, legendLabels }: Props) {
  const tMatch = useTranslations("Match");
  const locale = useLocale();
  if (entries.length === 0) return null;

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-stadium-border">
        {entries.map((entry, i) => {
          const opponent = displayTeamName(entry.opponent);
          const venue = entry.venue === "H" ? tMatch("home") : tMatch("away");
          const score = entry.score.replace("-", "–");
          return (
            <Tooltip key={`${entry.date}-${i}`}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center transition-[filter] duration-(--dur-base) hover:brightness-110 active:scale-[0.97]"
                  aria-label={`${legendLabels?.[WORD[entry.result]] ?? entry.result}: ${score} vs ${opponent} (${venue})`}
                >
                  <FormSquare result={entry.result} size="md" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-stadium-surface border-stadium-border">
                <p className="font-inter text-xs">
                  <span className="font-semibold text-white tabular-nums">{score}</span>{" "}
                  <span className="text-stadium-muted">vs {opponent} ({venue})</span>
                </p>
                <p className="font-inter text-xs text-stadium-muted">{competitionLabel(entry.competition, locale)}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Legend: the letter and the word, so the colour is never the only cue */}
      <div className="mt-3 flex gap-4 text-xs text-stadium-muted">
        {(["W", "D", "L"] as const).map((r) => (
          <span key={r} className="flex items-center gap-1.5">
            <FormSquare result={r} />
            {legendLabels?.[WORD[r]] ?? r}
          </span>
        ))}
      </div>
    </TooltipProvider>
  );
}
