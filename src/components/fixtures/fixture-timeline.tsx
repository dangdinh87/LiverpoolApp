"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { MatchCard } from "./match-card";
import type { Fixture } from "@/lib/types/football";
import { cn } from "@/lib/utils";

// Normalize competition names (FDO/ESPN may use different names for same comp)
const COMP_ALIASES: Record<string, string> = {
  "Premier League": "Premier League",
  "UEFA Champions League": "UEFA Champions League",
  "Champions League": "UEFA Champions League",
  "FA Cup": "FA Cup",
  "EFL Cup": "Carabao Cup",
  "Carabao Cup": "Carabao Cup",
  "League Cup": "Carabao Cup",
  "Community Shield": "Community Shield",
  "FA Community Shield": "Community Shield",
};

function normalizeCompName(name: string): string {
  return COMP_ALIASES[name] ?? name;
}

// Short display labels for competition filter buttons
const COMP_SHORT: Record<string, string> = {
  "Premier League": "Premier League",
  "UEFA Champions League": "Champions League",
  "FA Cup": "FA Cup",
  "Carabao Cup": "Carabao Cup",
  "Community Shield": "Community Shield",
};

// Brand colors per competition (bg for active filter chip — brightened for dark theme)
const COMP_COLOR: Record<string, string> = {
  All: "bg-lfc-red",
  "Premier League": "bg-[#5B2D8E]",
  "UEFA Champions League": "bg-[#1A3A7A]",
  "FA Cup": "bg-[#B71C1C]",
  "Carabao Cup": "bg-[#1B8C4F]",
  "Community Shield": "bg-[#B71C1C]",
};

interface FixtureTimelineProps {
  fixtures: Fixture[];
}

type FixtureViewTab = "upcoming" | "recent" | "results";
const RECENT_RESULTS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const RECENT_RESULTS_LIMIT = 8;

export function FixtureTimeline({ fixtures }: FixtureTimelineProps) {
  const t = useTranslations("Fixtures.timeline");
  const [compFilter, setCompFilter] = useState<string>("All");
  const [viewTab, setViewTab] = useState<FixtureViewTab>("upcoming");

  // Discover unique competitions from actual data
  const availableComps = useMemo(() => {
    const comps = new Set<string>();
    for (const f of fixtures) {
      comps.add(normalizeCompName(f.league.name));
    }
    // Ordered: PL first, then UCL, then cups
    const order = ["Premier League", "UEFA Champions League", "FA Cup", "Carabao Cup", "Community Shield"];
    return order.filter((c) => comps.has(c));
  }, [fixtures]);

  const { results, upcoming, recentResults } = useMemo(() => {
    const filtered =
      compFilter === "All"
        ? fixtures
        : fixtures.filter((f) => normalizeCompName(f.league.name) === compFilter);

    const sorted = [...filtered].sort(
      (a, b) => new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime()
    );

    const finishedStatuses = new Set(["FT", "AET", "PEN"]);

    const results = sorted.filter((f) => finishedStatuses.has(f.fixture.status.short));
    const recentResults = results
      .filter((f) => Date.now() - new Date(f.fixture.date).getTime() <= RECENT_RESULTS_WINDOW_MS)
      .slice(0, RECENT_RESULTS_LIMIT);
    const upcoming = sorted
      .filter((f) => !finishedStatuses.has(f.fixture.status.short))
      .reverse();

    return { results, upcoming, recentResults };
  }, [fixtures, compFilter]);

  const tabConfig = [
    { key: "upcoming" as const, label: t("tabs.upcoming"), count: upcoming.length },
    { key: "recent" as const, label: t("tabs.recent"), count: recentResults.length },
    { key: "results" as const, label: t("tabs.results"), count: results.length },
  ];

  return (
    <div>
      {/* Competition filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[{ key: "All", label: t("filter.all") }, ...availableComps.map((c) => ({ key: c, label: COMP_SHORT[c] ?? c }))].map(({ key, label }) => {
          const isActive = compFilter === key;
          return (
            <motion.button
              key={key}
              onClick={() => setCompFilter(key)}
              whileTap={{ scale: 0.96 }}
              className={cn(
                "relative px-4 py-2 rounded-none font-barlow font-semibold text-sm uppercase tracking-wider overflow-hidden transition-colors",
                isActive
                  ? "text-white border border-transparent"
                  : "bg-stadium-surface text-stadium-muted border border-stadium-border hover:border-white/30 hover:text-white"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="fixture-comp-filter-bg"
                  className={cn("absolute inset-0", COMP_COLOR[key] ?? "bg-lfc-red")}
                  transition={{ type: "spring", stiffness: 180, damping: 14 }}
                />
              )}
              <span className="relative z-10">{label}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Match state tabs */}
      <div className="mb-5 flex flex-wrap gap-2">
        {tabConfig.map((tab) => {
          const active = viewTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setViewTab(tab.key)}
              className={cn(
                "inline-flex items-center gap-2 border px-3 py-1.5 font-barlow text-xs font-semibold uppercase tracking-wider transition-colors",
                active
                  ? "border-lfc-red bg-lfc-red/15 text-white"
                  : "border-stadium-border bg-stadium-surface text-stadium-muted hover:border-white/30 hover:text-white"
              )}
            >
              <span>{tab.label}</span>
              <span className={cn("rounded-full px-1.5 py-0.5 text-[10px]", active ? "bg-lfc-red text-white" : "bg-stadium-surface2 text-stadium-muted")}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Upcoming fixtures */}
      {viewTab === "upcoming" && upcoming.length > 0 && (
        <section className="mb-10">
          <h2 className="font-bebas text-3xl text-white tracking-wider mb-4 flex items-center gap-3">
            <span>{t("sections.upcoming")}</span>
            <span className="w-8 h-0.5 bg-lfc-red" />
          </h2>
          <div className="space-y-3">
            {upcoming.map((fixture) => (
              <MatchCard key={fixture.fixture.id} fixture={fixture} />
            ))}
          </div>
        </section>
      )}

      {/* Recent results */}
      {viewTab === "recent" && recentResults.length > 0 && (
        <section className="mb-10">
          <h2 className="font-bebas text-3xl text-white tracking-wider mb-4 flex items-center gap-3">
            <span>{t("sections.recent")}</span>
            <span className="w-8 h-0.5 bg-lfc-red" />
          </h2>
          <div className="space-y-3">
            {recentResults.map((fixture) => (
              <MatchCard key={fixture.fixture.id} fixture={fixture} />
            ))}
          </div>
        </section>
      )}

      {/* Results */}
      {viewTab === "results" && results.length > 0 && (
        <section>
          <h2 className="font-bebas text-3xl text-white tracking-wider mb-4 flex items-center gap-3">
            <span>{t("sections.results")}</span>
            <span className="w-8 h-0.5 bg-lfc-red" />
          </h2>
          <div className="space-y-3">
            {results.map((fixture) => (
              <MatchCard key={fixture.fixture.id} fixture={fixture} />
            ))}
          </div>
        </section>
      )}

      {(viewTab === "upcoming" && upcoming.length === 0) ||
      (viewTab === "recent" && recentResults.length === 0) ||
      (viewTab === "results" && results.length === 0) ? (
        <p className="text-stadium-muted text-center py-12 font-inter">
          {viewTab === "recent" ? t("noRecentFixtures") : t("noFixtures")}
        </p>
      ) : null}
    </div>
  );
}
