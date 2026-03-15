"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
  type KeyboardEvent,
} from "react";
import { motion } from "framer-motion";
import { Info, MapPin, Trophy, Users, History } from "lucide-react";
import { cn } from "@/lib/utils";

const TAB_IDS = ["overview", "anfield", "honours", "timeline", "legends"] as const;
type TabId = (typeof TAB_IDS)[number];

const TAB_ICONS: Record<TabId, React.ElementType> = {
  overview: Info,
  anfield: MapPin,
  honours: Trophy,
  timeline: History,
  legends: Users,
};

interface ClubTabsProps {
  overviewPanel: ReactNode;
  anfieldPanel: ReactNode;
  honoursPanel: ReactNode;
  timelinePanel: ReactNode;
  legendsPanel: ReactNode;
  defaultTab?: string;
  tabLabels: Record<TabId, string>;
}

export function ClubTabs({
  overviewPanel,
  anfieldPanel,
  honoursPanel,
  timelinePanel,
  legendsPanel,
  defaultTab = "overview",
  tabLabels,
}: ClubTabsProps) {
  const validDefault = TAB_IDS.includes(defaultTab as TabId)
    ? (defaultTab as TabId)
    : "overview";
  const [prevDefaultTab, setPrevDefaultTab] = useState<TabId>(validDefault);
  const [activeTab, setActiveTab] = useState<TabId>(validDefault);

  if (defaultTab !== prevDefaultTab) {
    setPrevDefaultTab(defaultTab as TabId);
    setActiveTab(defaultTab as TabId);
  }

  const tabBarRef = useRef<HTMLDivElement>(null);

  /* ---- switch tab ---- */
  const switchTab = useCallback(
    (id: TabId) => {
      if (id === activeTab) return;
      setActiveTab(id);
    },
    [activeTab]
  );

  /* ---- URL sync ---- */
  useEffect(() => {
    const url = new URL(window.location.href);
    if (activeTab === "overview") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", activeTab);
    }
    window.history.replaceState({}, "", url.toString());
  }, [activeTab]);

  /* ---- keyboard navigation ---- */
  const handleKeyDown = (e: KeyboardEvent) => {
    const idx = TAB_IDS.indexOf(activeTab);
    let nextId: TabId | null = null;
    if (e.key === "ArrowRight") {
      nextId = TAB_IDS[(idx + 1) % TAB_IDS.length];
    } else if (e.key === "ArrowLeft") {
      nextId = TAB_IDS[(idx - 1 + TAB_IDS.length) % TAB_IDS.length];
    }
    if (nextId) {
      e.preventDefault();
      switchTab(nextId);
      (
        tabBarRef.current?.querySelector(
          `[data-tab="${nextId}"]`
        ) as HTMLElement | null
      )?.focus();
    }
  };

  const panels: Record<TabId, ReactNode> = {
    overview: overviewPanel,
    anfield: anfieldPanel,
    honours: honoursPanel,
    timeline: timelinePanel,
    legends: legendsPanel,
  };

  return (
    <>
      {/* ── Sticky tab bar ── */}
      <div className="sticky top-12 z-40 bg-stadium-bg/80 backdrop-blur-xl border-b border-stadium-border/50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            ref={tabBarRef}
            className="relative flex overflow-x-auto no-scrollbar scroll-smooth"
            role="tablist"
            onKeyDown={handleKeyDown}
          >
            {TAB_IDS.map((id) => {
              const Icon = TAB_ICONS[id];
              const isActive = activeTab === id;
              return (
                <motion.button
                  key={id}
                  data-tab={id}
                  onClick={() => switchTab(id)}
                  whileTap={{ scale: 0.97 }}
                  role="tab"
                  tabIndex={isActive ? 0 : -1}
                  aria-selected={isActive}
                  aria-controls={`club-panel-${id}`}
                  className={cn(
                    "relative flex items-center gap-2 px-4 sm:px-6 py-5 font-barlow font-bold text-[13px] uppercase tracking-[0.15em] transition-colors outline-none whitespace-nowrap group",
                    isActive
                      ? "text-white"
                      : "text-stadium-muted hover:text-white/80"
                  )}
                >
                  <Icon
                    size={16}
                    className={cn(
                      "shrink-0 transition-transform duration-300 group-hover:scale-110",
                      isActive ? "text-lfc-red" : "text-stadium-muted"
                    )}
                  />
                  <span>{tabLabels[id]}</span>

                  {/* Animated underline indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="club-tab-underline"
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-lfc-red rounded-full"
                      transition={{ type: "spring", stiffness: 180, damping: 20 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Tab panels ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 pb-28">
        {TAB_IDS.map((id) => (
          <div
            key={id}
            id={`club-panel-${id}`}
            role="tabpanel"
            aria-labelledby={`tab-${id}`}
            className={cn(
              activeTab === id
                ? "animate-[fadeSlideIn_400ms_ease-out_both] pointer-events-auto"
                : "hidden pointer-events-none"
            )}
          >
            {panels[id]}
          </div>
        ))}
      </div>
    </>
  );
}
