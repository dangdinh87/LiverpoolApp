"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
  type KeyboardEvent,
} from "react";
import { Calendar, TableProperties } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "fixtures", label: "Fixtures", icon: Calendar },
  { id: "standings", label: "Table", icon: TableProperties },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface SeasonTabsProps {
  fixturesPanel: ReactNode;
  standingsPanel: ReactNode;
  defaultTab?: string;
  matchCount: number;
  teamCount: number;
}

export function SeasonTabs({
  fixturesPanel,
  standingsPanel,
  defaultTab = "fixtures",
  matchCount,
  teamCount,
}: SeasonTabsProps) {
  const validDefault = TABS.some((t) => t.id === defaultTab)
    ? (defaultTab as TabId)
    : "fixtures";
  const [activeTab, setActiveTab] = useState<TabId>(validDefault);
  const [fadeKey, setFadeKey] = useState(0);
  const tabBarRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const isInitialRender = useRef(true);

  const badges: Record<TabId, string> = {
    fixtures: `${matchCount}`,
    standings: `${teamCount}`,
  };

  /* ---- switch tab with animation ---- */
  const switchTab = useCallback(
    (id: TabId) => {
      if (id === activeTab) return;
      setActiveTab(id);
      setFadeKey((k) => k + 1);
    },
    [activeTab]
  );

  /* ---- indicator position ---- */
  const updateIndicator = useCallback(() => {
    if (!tabBarRef.current) return;
    const btn = tabBarRef.current.querySelector(
      `[data-tab="${activeTab}"]`
    ) as HTMLElement | null;
    if (btn) {
      setIndicator({ left: btn.offsetLeft, width: btn.offsetWidth });
    }
  }, [activeTab]);

  useEffect(() => {
    const id = requestAnimationFrame(updateIndicator);
    window.addEventListener("resize", updateIndicator);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", updateIndicator);
    };
  }, [updateIndicator]);

  /* ---- scroll to content on tab switch ---- */
  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    // scroll tab bar to top of viewport
    tabBarRef.current
      ?.closest("[class*='sticky']")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeTab]);

  /* ---- URL sync (shallow) ---- */
  useEffect(() => {
    const url = new URL(window.location.href);
    if (activeTab === "fixtures") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", activeTab);
    }
    window.history.replaceState({}, "", url.toString());
  }, [activeTab]);

  /* ---- keyboard navigation ---- */
  const handleKeyDown = (e: KeyboardEvent) => {
    const idx = TABS.findIndex((t) => t.id === activeTab);
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const next = TABS[(idx + 1) % TABS.length].id;
      switchTab(next);
      // focus the new tab button
      const btn = tabBarRef.current?.querySelector(
        `[data-tab="${next}"]`
      ) as HTMLElement | null;
      btn?.focus();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prev = TABS[(idx - 1 + TABS.length) % TABS.length].id;
      switchTab(prev);
      const btn = tabBarRef.current?.querySelector(
        `[data-tab="${prev}"]`
      ) as HTMLElement | null;
      btn?.focus();
    }
  };

  const panels: Record<TabId, ReactNode> = {
    fixtures: fixturesPanel,
    standings: standingsPanel,
  };

  return (
    <>
      {/* ── Sticky tab bar ── */}
      <div className="sticky top-12 z-40 scroll-mt-12 bg-stadium-bg/95 backdrop-blur-md border-b border-stadium-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            ref={tabBarRef}
            className="relative flex"
            role="tablist"
            onKeyDown={handleKeyDown}
          >
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                data-tab={id}
                onClick={() => switchTab(id)}
                role="tab"
                tabIndex={activeTab === id ? 0 : -1}
                aria-selected={activeTab === id}
                aria-controls={`panel-${id}`}
                className={cn(
                  "flex items-center gap-2 px-4 sm:px-5 py-4 font-barlow font-semibold text-sm uppercase tracking-wider transition-colors outline-none focus-visible:ring-1 focus-visible:ring-lfc-red",
                  activeTab === id
                    ? "text-white"
                    : "text-stadium-muted hover:text-white/70"
                )}
              >
                <Icon size={16} className="shrink-0" />
                <span>{label}</span>
                {badges[id] && (
                  <span
                    className={cn(
                      "text-[10px] rounded-full px-1.5 py-0.5 leading-none transition-colors",
                      activeTab === id
                        ? "bg-lfc-red/20 text-lfc-red"
                        : "bg-stadium-surface2 text-stadium-muted"
                    )}
                  >
                    {badges[id]}
                  </span>
                )}
              </button>
            ))}

            {/* animated red underline */}
            <div
              className="absolute bottom-0 h-[3px] bg-lfc-red rounded-full transition-all duration-300 ease-out"
              style={{ left: indicator.left, width: indicator.width }}
            />
          </div>
        </div>
      </div>

      {/* ── Tab panels ── */}
      <div
        ref={contentRef}
        className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16"
      >
        {TABS.map(({ id }) => (
          <div
            key={id}
            id={`panel-${id}`}
            role="tabpanel"
            aria-labelledby={`tab-${id}`}
            className={cn(
              activeTab === id
                ? "animate-[fadeSlideIn_250ms_ease-out_both]"
                : "hidden"
            )}
          >
            {panels[id]}
          </div>
        ))}
      </div>
    </>
  );
}
