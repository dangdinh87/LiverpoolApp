"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useTransition,
  type ReactNode,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { Calendar, TableProperties, ChevronDown, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const TAB_IDS = ["fixtures", "standings"] as const;
const TAB_ICONS = { fixtures: Calendar, standings: TableProperties } as const;

type TabId = (typeof TAB_IDS)[number];

interface SeasonOption {
  value: number;
  label: string;
}

interface SeasonTabsProps {
  fixturesPanel: ReactNode;
  standingsPanel: ReactNode;
  defaultTab?: string;
  matchCount: number;
  teamCount: number;
  seasons: SeasonOption[];
  currentSeason: number;
  liveSeasonYear: number;
}

export function SeasonTabs({
  fixturesPanel,
  standingsPanel,
  defaultTab = "fixtures",
  matchCount,
  teamCount,
  seasons,
  currentSeason,
  liveSeasonYear,
}: SeasonTabsProps) {
  const t = useTranslations("Season.tabs");
  const tSeason = useTranslations("Season");
  const router = useRouter();
  const TABS = TAB_IDS.map((id) => ({
    id,
    label: t(id),
    icon: TAB_ICONS[id],
  }));

  const validDefault = TAB_IDS.includes(defaultTab as TabId)
    ? (defaultTab as TabId)
    : "fixtures";
  const [activeTab, setActiveTab] = useState<TabId>(validDefault);
  const [fadeKey, setFadeKey] = useState(0);
  const tabBarRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const [seasonDropdownOpen, setSeasonDropdownOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const currentLabel = seasons.find((s) => s.value === currentSeason)?.label ?? "";

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

  /* ---- close season dropdown on outside click ---- */
  useEffect(() => {
    if (!seasonDropdownOpen) return;
    const close = () => setSeasonDropdownOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [seasonDropdownOpen]);

  /* ---- season switch ---- */
  const switchSeason = (year: number) => {
    setSeasonDropdownOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.set("season", String(year));
    if (activeTab !== "fixtures") {
      url.searchParams.set("tab", activeTab);
    } else {
      url.searchParams.delete("tab");
    }
    startTransition(() => {
      router.push(url.pathname + url.search);
    });
  };

  /* ---- keyboard navigation ---- */
  const handleKeyDown = (e: KeyboardEvent) => {
    const idx = TABS.findIndex((t) => t.id === activeTab);
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const next = TABS[(idx + 1) % TABS.length].id;
      switchTab(next);
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
      <div className="sticky top-16 z-40 bg-stadium-bg/95 backdrop-blur-md border-b border-stadium-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Tabs */}
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
                        "text-[10px] font-bold tabular-nums leading-none rounded-full h-[18px] inline-flex items-center justify-center px-2 transition-colors",
                        activeTab === id
                          ? "bg-lfc-red text-white"
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

            {/* Season selector */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isPending) setSeasonDropdownOpen(!seasonDropdownOpen);
                }}
                disabled={isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-stadium-surface border border-stadium-border hover:border-white/30 transition-colors cursor-pointer group disabled:opacity-70"
                aria-label={tSeason("seasonSelect")}
              >
                {isPending ? (
                  <Loader2 size={14} className="text-lfc-red animate-spin" />
                ) : null}
                <span className="font-barlow font-semibold text-xs sm:text-sm uppercase tracking-wider text-white">
                  {currentLabel}
                </span>
                <ChevronDown
                  size={14}
                  className={cn(
                    "text-stadium-muted transition-transform duration-200",
                    seasonDropdownOpen && "rotate-180"
                  )}
                />
              </button>

              {seasonDropdownOpen && (
                <div
                  className="absolute right-0 top-full mt-1 w-36 bg-stadium-surface border border-stadium-border shadow-2xl z-50 overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  {seasons.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => switchSeason(value)}
                      className={cn(
                        "w-full px-4 py-2.5 text-left font-barlow font-semibold text-sm uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2",
                        value === currentSeason
                          ? "text-white bg-lfc-red"
                          : "text-stadium-muted hover:text-white hover:bg-stadium-surface2"
                      )}
                    >
                      <span>{label}</span>
                      {value === liveSeasonYear && (
                        <span className="relative flex h-2 w-2 ml-auto shrink-0">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab panels ── */}
      <div
        ref={contentRef}
        className={cn(
          "max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16 transition-opacity duration-300",
          isPending && "opacity-40 pointer-events-none"
        )}
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
