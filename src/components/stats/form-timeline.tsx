"use client";

import { cn } from "@/lib/utils";
import { RESULT_BADGE, RESULT_SWATCH } from "@/lib/result-style";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { FormEntry } from "@/lib/football/season-stats";

interface Props {
  entries: FormEntry[];
  legendLabels?: { win: string; draw: string; loss: string };
}

const RESULT_COLORS: Record<string, string> = RESULT_BADGE;

export function FormTimeline({ entries, legendLabels }: Props) {
  if (entries.length === 0) return null;

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-stadium-border">
        {entries.map((entry, i) => (
          <Tooltip key={`${entry.date}-${i}`}>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  "size-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-[filter] duration-[var(--dur-base)] hover:brightness-110",
                  RESULT_COLORS[entry.result] ?? "bg-gray-500 text-white"
                )}
                aria-label={`${entry.result} ${entry.score} vs ${entry.opponent}`}
              >
                {entry.result}
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

      {/* Legend */}
      <div className="flex gap-3 mt-3 text-xs text-stadium-muted">
        <span className="flex items-center gap-1"><span className={cn("size-2.5 rounded-full", RESULT_SWATCH.W)} />{legendLabels?.win ?? "Win"}</span>
        <span className="flex items-center gap-1"><span className={cn("size-2.5 rounded-full", RESULT_SWATCH.D)} />{legendLabels?.draw ?? "Draw"}</span>
        <span className="flex items-center gap-1"><span className={cn("size-2.5 rounded-full", RESULT_SWATCH.L)} />{legendLabels?.loss ?? "Loss"}</span>
      </div>
    </TooltipProvider>
  );
}
