"use client";

import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Timer, BarChart3, Users, Swords } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type TabId = "timeline" | "stats" | "lineups" | "h2h";

const TAB_ICONS = { timeline: Timer, stats: BarChart3, lineups: Users, h2h: Swords } as const;

interface MatchDetailTabsProps {
  timelinePanel: ReactNode;
  statsPanel: ReactNode;
  lineupsPanel: ReactNode;
  h2hPanel: ReactNode;
  hasTimeline: boolean;
  hasStats: boolean;
  hasLineups: boolean;
  hasH2H: boolean;
}

export function MatchDetailTabs({
  timelinePanel,
  statsPanel,
  lineupsPanel,
  h2hPanel,
  hasTimeline,
  hasStats,
  hasLineups,
  hasH2H,
}: MatchDetailTabsProps) {
  const t = useTranslations("Match.tabs");
  const tabBarRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const tabs: { id: TabId; label: string; show: boolean }[] = [
    { id: "stats", label: t("stats"), show: hasStats },
    { id: "timeline", label: t("timeline"), show: hasTimeline },
    { id: "lineups", label: t("lineups"), show: hasLineups },
    { id: "h2h", label: t("h2h"), show: hasH2H },
  ];

  const visibleTabs = tabs.filter((tab) => tab.show);
  const [active, setActive] = useState<TabId>(visibleTabs[0]?.id ?? "stats");

  const panels: Record<TabId, ReactNode> = {
    timeline: timelinePanel,
    stats: statsPanel,
    lineups: lineupsPanel,
    h2h: h2hPanel,
  };

  // Animated underline indicator
  const updateIndicator = useCallback(() => {
    if (!tabBarRef.current) return;
    const btn = tabBarRef.current.querySelector(`[data-tab="${active}"]`) as HTMLElement | null;
    if (btn) {
      setIndicator({ left: btn.offsetLeft, width: btn.offsetWidth });
    }
  }, [active]);

  useEffect(() => {
    const id = requestAnimationFrame(updateIndicator);
    window.addEventListener("resize", updateIndicator);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", updateIndicator);
    };
  }, [updateIndicator]);

  if (visibleTabs.length === 0) return null;

  // Direction for slide animation
  const activeIdx = visibleTabs.findIndex((t) => t.id === active);

  return (
    <div>
      {/* Tab bar with animated indicator */}
      <div
        ref={tabBarRef}
        className="relative flex border-b border-stadium-border mb-4 overflow-x-auto scrollbar-none"
        role="tablist"
      >
        {visibleTabs.map(({ id, label }) => {
          const Icon = TAB_ICONS[id];
          const isActive = active === id;
          return (
            <button
              key={id}
              data-tab={id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-3 font-barlow font-semibold text-sm uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap",
                isActive ? "text-white" : "text-stadium-muted hover:text-white/70"
              )}
            >
              <Icon size={15} className="shrink-0" />
              {label}
            </button>
          );
        })}
        {/* Sliding red underline */}
        <motion.div
          className="absolute bottom-0 h-[3px] bg-lfc-red rounded-full"
          animate={{ left: indicator.left, width: indicator.width }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        />
      </div>

      {/* Animated panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          role="tabpanel"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {panels[active]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
