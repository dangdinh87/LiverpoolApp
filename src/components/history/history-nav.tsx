"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface HistoryNavProps {
  items: { id: string; label: string }[];
  ariaLabel: string;
}

/**
 * Inline section-jump chip bar for the history page. Plain anchor links (work
 * without JS); IntersectionObserver only highlights the section being read.
 */
export function HistoryNav({ items, ariaLabel }: HistoryNavProps) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const targets = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          // The section nearest the top of the reading band wins.
          visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          setActive(visible[0].target.id);
        }
      },
      { rootMargin: "-20% 0px -65% 0px" },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav
      aria-label={ariaLabel}
      className="mb-8 flex flex-wrap items-center gap-2 border-y border-[var(--line)] py-3"
    >
      {items.map((item) => {
        const isActive = active === item.id;
        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            aria-current={isActive ? "location" : undefined}
            className={cn(
              "inline-flex min-h-9 items-center border px-3 py-1.5 font-barlow text-xs font-semibold uppercase tracking-[0.12em] transition-colors",
              isActive
                ? "border-lfc-red bg-lfc-red/15 text-white"
                : "border-[var(--line)] bg-[var(--surface-2)] text-stadium-muted hover:border-white/25 hover:text-white",
            )}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
