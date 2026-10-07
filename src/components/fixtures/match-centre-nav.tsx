"use client";

import { Link } from "@/i18n/navigation";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { matchCentreHref, type MatchCentreTab } from "./match-centre-links";

interface MatchCentreNavProps {
  active: MatchCentreTab;
  /** Archive season year; omit for the current season (canonical routes). */
  season?: number;
  /** Small numbers after the first two labels (only the fixtures list knows them). */
  counts?: Partial<Record<"fixtures" | "results", number>>;
  /**
   * When set, "Lịch đấu" and "Kết quả" are buttons that switch the list in place
   * (no navigation); the other tabs stay links.
   */
  onSelectView?: (view: "fixtures" | "results") => void;
  className?: string;
}

const TABS: MatchCentreTab[] = ["fixtures", "results", "standings", "stats"];

/**
 * The shared "Trận đấu" sub-navigation: Lịch đấu · Kết quả · BXH · Thống kê.
 * Sticks under the site header, scrolls sideways if a label ever does not fit,
 * 44px tall, with a red underline on the current tab. Rendered by all four
 * match pages so they read as one section.
 */
export function MatchCentreNav({ active, season, counts, onSelectView, className }: MatchCentreNavProps) {
  const t = useTranslations("Fixtures.nav");
  const tTimeline = useTranslations("Fixtures.timeline");
  const rowRef = useRef<HTMLDivElement>(null);

  // Keep the current tab in view when the row scrolls (narrow phones, long labels).
  useEffect(() => {
    const row = rowRef.current;
    const el = row?.querySelector<HTMLElement>('[aria-current]');
    if (!row || !el) return;
    const target = el.offsetLeft - (row.clientWidth - el.offsetWidth) / 2;
    row.scrollTo({ left: Math.max(0, target), behavior: "auto" });
  }, [active]);

  const itemClass = (isActive: boolean) =>
    cn(
      "relative inline-flex min-h-11 min-w-max flex-1 items-center justify-center gap-1.5 whitespace-nowrap border-b-2 px-3 font-barlow text-[15px] font-semibold uppercase tracking-[0.08em] sm:flex-none sm:px-6",
      "transition-colors duration-[var(--dur-base)] ease-[var(--ease-out)]",
      isActive
        ? "border-lfc-red text-white"
        : "border-transparent text-stadium-muted hover:text-white",
    );

  return (
    <nav
      aria-label={t("label")}
      className={cn(
        "sticky top-[var(--header-h)] z-30 -mx-4 border-b border-[var(--line)] bg-stadium-bg/95 px-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8",
        className,
      )}
    >
      <div ref={rowRef} role="group" aria-label={tTimeline("viewLabel")} className="scroll-x flex sm:-ml-6">
        {TABS.map((tab) => {
          const isActive = tab === active;
          const count = tab === "fixtures" || tab === "results" ? counts?.[tab] : undefined;
          const content = (
            <>
              <span>{t(tab)}</span>
              {count !== undefined && (
                <span className={cn("text-xs tabular-nums", isActive ? "text-white/80" : "text-stadium-muted")}>{count}</span>
              )}
            </>
          );
          if (onSelectView && (tab === "fixtures" || tab === "results")) {
            return (
              <button
                key={tab}
                type="button"
                aria-current={isActive ? "true" : undefined}
                aria-pressed={isActive}
                onClick={() => onSelectView(tab)}
                className={itemClass(isActive)}
              >
                {content}
              </button>
            );
          }
          return (
            <Link
              key={tab}
              href={matchCentreHref(tab, season)}
              aria-current={isActive ? "page" : undefined}
              className={itemClass(isActive)}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
