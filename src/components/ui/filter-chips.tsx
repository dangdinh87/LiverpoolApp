"use client";

import { cn } from "@/lib/utils";

export interface FilterChipOption<T extends string> {
  value: T;
  label: string;
}

interface FilterChipsProps<T extends string> {
  options: readonly FilterChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name of the group (required: chips have no visible legend). */
  ariaLabel: string;
  className?: string;
}

/**
 * Single-select chip row that scrolls sideways on phones (no wrapping, no
 * page overflow). 40px hit area; the active chip is filled red with white text.
 */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: FilterChipsProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("scroll-x -mx-4 flex gap-2 px-4 sm:mx-0 sm:flex-wrap sm:px-0", className)}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "shrink-0 min-h-10 px-4 font-barlow text-sm font-semibold uppercase tracking-[0.12em] border transition-colors cursor-pointer",
              active
                ? "bg-lfc-red border-lfc-red text-white"
                : "border-[var(--line-strong)] text-stadium-muted hover:text-white hover:border-white/40"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
