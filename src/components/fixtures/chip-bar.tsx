"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface ChipItem {
  key: string;
  label: string;
  /** Small count shown after the label. */
  count?: number;
  /** When set the chip is a link (server-driven filters such as ?season=). */
  href?: string;
}

interface ChipBarProps {
  items: ChipItem[];
  active: string;
  onSelect?: (key: string) => void;
  ariaLabel: string;
  /** Stick under the fixed header while the list scrolls. */
  sticky?: boolean;
  className?: string;
}

/**
 * Horizontally scrollable filter chips: 40px+ hit area, no wrapping, the
 * active chip is scrolled into view. Shared by fixtures, standings, stats
 * (season picker) and squad (position tabs).
 */
export function ChipBar({ items, active, onSelect, ariaLabel, sticky, className }: ChipBarProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const row = rowRef.current;
    const el = row?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!row || !el) return;
    // Scroll only the chip row (never the page).
    const target = el.offsetLeft - (row.clientWidth - el.offsetWidth) / 2;
    row.scrollTo({ left: Math.max(0, target), behavior: "auto" });
  }, [active]);

  const chipClass = (isActive: boolean) =>
    cn(
      "inline-flex min-h-10 shrink-0 items-center gap-2 border px-4 font-barlow text-sm font-semibold uppercase tracking-[0.1em] whitespace-nowrap",
      "transition-colors duration-[var(--dur-base)] ease-[var(--ease-out)]",
      isActive
        ? "border-lfc-red bg-lfc-red text-white"
        : "border-[var(--line-strong)] bg-[var(--surface-1)] text-stadium-muted hover:border-white/40 hover:text-white",
    );

  return (
    <div
      className={cn(
        sticky && "sticky top-[var(--header-h)] z-30 -mx-4 border-b border-[var(--line)] bg-stadium-bg/90 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8",
        className,
      )}
    >
      <div ref={rowRef} role="group" aria-label={ariaLabel} className="scroll-x flex gap-2">
        {items.map((item) => {
          const isActive = item.key === active;
          const content = (
            <>
              <span>{item.label}</span>
              {item.count !== undefined && (
                <span className={cn("text-xs tabular-nums", isActive ? "text-white" : "text-stadium-muted")}>
                  {item.count}
                </span>
              )}
            </>
          );
          return item.href ? (
            <Link
              key={item.key}
              href={item.href}
              scroll={false}
              aria-current={isActive ? "true" : undefined}
              className={chipClass(isActive)}
            >
              {content}
            </Link>
          ) : (
            <button
              key={item.key}
              type="button"
              aria-current={isActive ? "true" : undefined}
              aria-pressed={isActive}
              onClick={() => onSelect?.(item.key)}
              className={chipClass(isActive)}
            >
              {content}
            </button>
          );
        })}
      </div>
    </div>
  );
}
