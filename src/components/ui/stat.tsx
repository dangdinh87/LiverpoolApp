import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatProps {
  /** The number/score (League Gothic). */
  value: ReactNode;
  /** Small uppercase caption under the value. */
  label: string;
  /** Highlight the value in gold (winner / live / record). */
  highlight?: boolean;
  className?: string;
}

/**
 * Compact stat tile: big numeral + label. Use in grids of 2-4 on mobile.
 * Pure markup (server-safe), uses the shared `.surface` card.
 */
export function Stat({ value, label, highlight, className }: StatProps) {
  return (
    <div className={cn("surface px-4 py-3 min-w-0", className)}>
      <p
        className={cn(
          "font-bebas text-4xl leading-none tabular-nums",
          highlight ? "text-lfc-gold" : "text-white"
        )}
      >
        {value}
      </p>
      <p className="section-label mt-1.5 truncate text-stadium-muted">{label}</p>
    </div>
  );
}
