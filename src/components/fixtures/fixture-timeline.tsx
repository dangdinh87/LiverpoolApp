"use client";

import { useState, useMemo } from "react";
import { MatchCard } from "./match-card";
import type { Fixture } from "@/lib/types/football";
import { cn } from "@/lib/utils";

type CompFilter = "All" | "Premier League" | "UEFA Champions League" | "FA Cup" | "EFL Cup";

const COMP_FILTERS: CompFilter[] = [
  "All",
  "Premier League",
  "UEFA Champions League",
  "FA Cup",
  "EFL Cup",
];

interface FixtureTimelineProps {
  fixtures: Fixture[];
}

export function FixtureTimeline({ fixtures }: FixtureTimelineProps) {
  const [compFilter, setCompFilter] = useState<CompFilter>("All");

  // Split into results (FT) and upcoming (NS/scheduled)
  const { results, upcoming } = useMemo(() => {
    const filtered =
      compFilter === "All"
        ? fixtures
        : fixtures.filter((f) => f.league.name === compFilter);

    const sorted = [...filtered].sort(
      (a, b) => new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime()
    );

    return {
      results: sorted.filter((f) => f.fixture.status.short === "FT"),
      upcoming: sorted
        .filter((f) => f.fixture.status.short === "NS")
        .reverse(), // upcoming in chronological order
    };
  }, [fixtures, compFilter]);

  return (
    <div>
      {/* Competition filter */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {COMP_FILTERS.map((comp) => {
          const hasMatches =
            comp === "All" ||
            fixtures.some((f) => f.league.name === comp);
          if (!hasMatches) return null;
          return (
            <button
              key={comp}
              onClick={() => setCompFilter(comp)}
              className={cn(
                "px-4 py-2 rounded-lg font-barlow font-semibold text-sm uppercase tracking-wider transition-all duration-200",
                compFilter === comp
                  ? "bg-lfc-red text-white"
                  : "bg-stadium-surface text-stadium-muted border border-stadium-border hover:border-white/30 hover:text-white"
              )}
            >
              {comp === "All" ? "All Comps" : comp}
            </button>
          );
        })}
      </div>

      {/* Upcoming fixtures section */}
      {upcoming.length > 0 && (
        <section className="mb-10">
          <h2 className="font-bebas text-3xl text-white tracking-wider mb-4 flex items-center gap-3">
            <span>Upcoming</span>
            <span className="w-8 h-0.5 bg-lfc-red" />
          </h2>
          <div className="space-y-3">
            {upcoming.map((fixture) => (
              <MatchCard key={fixture.fixture.id} fixture={fixture} />
            ))}
          </div>
        </section>
      )}

      {/* Results section */}
      {results.length > 0 && (
        <section>
          <h2 className="font-bebas text-3xl text-white tracking-wider mb-4 flex items-center gap-3">
            <span>Results</span>
            <span className="w-8 h-0.5 bg-lfc-red" />
          </h2>
          <div className="space-y-3">
            {results.map((fixture) => (
              <MatchCard key={fixture.fixture.id} fixture={fixture} />
            ))}
          </div>
        </section>
      )}

      {upcoming.length === 0 && results.length === 0 && (
        <p className="text-stadium-muted text-center py-12 font-inter">
          No fixtures found for this competition.
        </p>
      )}
    </div>
  );
}
