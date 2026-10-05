"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface HistoryNavProps {
  items: { id: string; label: string }[];
  ariaLabel: string;
}

/**
 * Sticky in-page navigation for the history page. Plain anchor links (work
 * without JS); IntersectionObserver only highlights the section being read and
 * keeps the active chip centred in the scrollable strip on phones.
 */
export function HistoryNav({ items, ariaLabel }: HistoryNavProps) {
  const [active, setActive] = useState<string | null>(null);
  const stripRef = useRef<HTMLUListElement>(null);

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

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip || !active) return;
    const chip = strip.querySelector<HTMLElement>(`[data-id="${active}"]`);
    if (!chip) return;
    strip.scrollTo({ left: chip.offsetLeft - (strip.clientWidth - chip.offsetWidth) / 2, behavior: "smooth" });
  }, [active]);

  return (
    <nav
      aria-label={ariaLabel}
      className="sticky top-[var(--header-h)] z-30 border-b border-[var(--line)] bg-stadium-bg/90 backdrop-blur-md"
    >
      <div className="page-container">
        <ul ref={stripRef} className="scroll-x flex gap-1 sm:gap-2">
          {items.map((item) => {
            const isActive = active === item.id;
            return (
              <li key={item.id} data-id={item.id} className="shrink-0">
                <a
                  href={`#${item.id}`}
                  aria-current={isActive ? "location" : undefined}
                  className={cn(
                    "inline-flex min-h-12 items-center border-b-2 px-3 sm:px-4 font-barlow text-sm font-semibold uppercase tracking-[0.12em] transition-colors",
                    isActive
                      ? "border-lfc-red text-white"
                      : "border-transparent text-stadium-muted hover:text-white",
                  )}
                >
                  {item.label}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
