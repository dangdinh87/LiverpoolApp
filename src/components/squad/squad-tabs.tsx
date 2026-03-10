"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Users, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SquadGrid } from "./squad-grid";
import { LfcPlayersView } from "../players/lfc-players-view";
import type { LfcPlayer } from "@/lib/squad-data";
import type { LfcFplPlayer } from "@/lib/fpl-data";

type TabKey = "squad" | "stats";

interface SquadTabsProps {
  squadPlayers: LfcPlayer[];
  fplPlayers: LfcFplPlayer[];
}

export function SquadTabs({ squadPlayers, fplPlayers }: SquadTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("Squad");
  const initialTab = (searchParams.get("tab") as TabKey) || "squad";
  const [activeTab, setActiveTab] = useState<TabKey>(
    initialTab === "stats" ? "stats" : "squad",
  );

  const TABS: { key: TabKey; label: string; icon: typeof Users; source: string }[] = [
    { key: "squad", label: t("tabs.squad"), icon: Users, source: "LiverpoolFC.com" },
    { key: "stats", label: t("tabs.stats"), icon: BarChart3, source: "Fantasy Premier League" },
  ];

  // Sync URL when tab changes
  useEffect(() => {
    const currentTab = searchParams.get("tab") || "squad";
    if (currentTab !== activeTab) {
      const url = activeTab === "squad" ? "/squad" : "/squad?tab=stats";
      router.replace(url, { scroll: false });
    }
  }, [activeTab, router, searchParams]);

  const current = TABS.find((t) => t.key === activeTab)!;

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex items-center gap-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 font-barlow font-semibold uppercase tracking-wider text-sm transition-all duration-200 cursor-pointer",
                isActive
                  ? "bg-lfc-red text-white border border-transparent shadow-[0_0_16px_rgba(200,16,46,0.25)]"
                  : "bg-stadium-surface text-stadium-muted border border-stadium-border hover:border-lfc-red/40 hover:text-white",
              )}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}

        {/* Data source badge */}
        <span className="ml-auto hidden sm:flex items-center gap-1.5 text-[10px] font-inter text-stadium-muted/60 uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500/60" />
          {t("dataSource", { source: current.source })}
        </span>
      </div>

      {/* Mobile data source */}
      <div className="sm:hidden flex items-center gap-1.5 text-[10px] font-inter text-stadium-muted/60 uppercase tracking-wider">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500/60" />
        {t("dataSource", { source: current.source })}
      </div>
      {/* Tab content */}
      {activeTab === "squad" && <SquadGrid players={squadPlayers} />}
      {activeTab === "stats" && <LfcPlayersView players={fplPlayers} />}
    </div>
  );
}
