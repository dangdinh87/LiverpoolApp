"use client";

import { FormSquare } from "@/components/ui/form-badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  if (entries.length === 0) return null;

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-stadium-border">
        {entries.map((entry, i) => (
          <Tooltip key={`${entry.date}-${i}`}>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="shrink-0 transition-[filter] duration-(--dur-base) hover:brightness-110"
                aria-label={`${legendLabels?.[WORD[entry.result]] ?? entry.result}: ${entry.score} vs ${entry.opponent}`}
              >
                <FormSquare result={entry.result} size="md" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="bg-stadium-surface border-stadium-border">
              <p className="font-inter text-xs">
                <span className="font-semibold text-white">{entry.score}</span>{" "}
                <span className="text-stadium-muted">vs {entry.opponent} ({entry.venue})</span>
              </p>
              <p className="font-inter text-xs text-stadium-muted">{entry.competition}</p>
            </TooltipContent>
          </Tooltip>
        ))}
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
