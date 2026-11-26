"use client";

import { Link } from "@/i18n/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { buildMatchCentreLinks, type MatchCentreTab } from "./match-centre-links";

interface MatchCentreNavProps {
  active: MatchCentreTab;
  /** Archive season year; omit for the current season (canonical routes). */
  season?: number;
  /** Deprecated: kept for caller type compatibility; counts are omitted to keep tab widths fixed. */
  counts?: Partial<Record<"fixtures" | "results", number>>;
  /**
   * When set, "Lịch đấu" and "Kết quả" are buttons that switch the list in place
   * (no navigation); the other tabs stay links.
   */
  onSelectView?: (view: "fixtures" | "results") => void;
  className?: string;
}

/**
 * The shared "Trận đấu" sub-navigation: Fixtures · Results · Table · Stats · Predictions.
 * Sticks under the site header across full width, scrolls sideways if a label ever does not fit,
 * 44px tall, with a red underline on the current tab matching SectionSubNav pixel-for-pixel.
 */
export function MatchCentreNav(props: MatchCentreNavProps) {
  const { active, season, onSelectView, className } = props;
  const t = useTranslations("Fixtures.nav");
  const tTimeline = useTranslations("Fixtures.timeline");
  const rowRef = useRef<HTMLDivElement>(null);
  const links = buildMatchCentreLinks(season);

  const [pendingTab, setPendingTab] = useState<MatchCentreTab | null>(null);
  const [prevActive, setPrevActive] = useState(active);
  if (prevActive !== active) {
    setPrevActive(active);
    setPendingTab(null);
  }
  const currentTab = pendingTab ?? active;

  // Keep the current tab in view when the row scrolls (narrow phones, long labels).
  useEffect(() => {
    const row = rowRef.current;
    const el = row?.querySelector<HTMLElement>('[aria-current]');
    if (!row || !el) return;
    const target = el.offsetLeft - (row.clientWidth - el.offsetWidth) / 2;
    row.scrollTo({ left: Math.max(0, target), behavior: "auto" });
  }, [currentTab]);

  const itemClass = (isActive: boolean) =>
    cn(
      "inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 sm:px-4 font-barlow text-sm font-semibold uppercase tracking-[0.08em]",
      "transition-colors duration-[var(--dur-base)] ease-[var(--ease-out)]",
      isActive
        ? "border-lfc-red text-white"
        : "border-transparent text-stadium-muted hover:border-white/20 hover:text-white",
    );

  return (
    <nav
      aria-label={t("label")}
      className={cn(
        "section-subnav sticky top-[var(--header-h)] z-30 w-full border-b border-[var(--line)] bg-stadium-bg/95 backdrop-blur-md",
        className,
      )}
    >
      <div className="page-container">
        <div
          ref={rowRef}
          role="group"
          aria-label={tTimeline("viewLabel")}
          className="scroll-x scroll-x-fade flex items-center gap-1 sm:gap-2"
        >
          {links.map(({ key: tab, href }) => {
            const isActive = tab === currentTab;
            if (onSelectView && (tab === "fixtures" || tab === "results")) {
              return (
                <button
                  key={tab}
                  type="button"
                  aria-current={isActive ? "true" : undefined}
                  aria-pressed={isActive}
                  onClick={() => {
                    setPendingTab(null);
                    onSelectView(tab);
                  }}
                  className={itemClass(isActive)}
                >
                  <span>{t(tab)}</span>
                </button>
              );
            }
            return (
              <Link
                key={tab}
                href={href}
                prefetch={true}
                aria-current={isActive ? "page" : undefined}
                onClick={() => setPendingTab(tab)}
                className={itemClass(isActive)}
              >
                <span>{t(tab)}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
