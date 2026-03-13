"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { StandingsTable } from "./standings-table";
import type { Standing } from "@/lib/types/football";

interface StandingsCompTabsProps {
  plStandings: Standing[];
  uclStandings: Standing[];
}

export function StandingsCompTabs({
  plStandings,
  uclStandings,
}: StandingsCompTabsProps) {
  const [comp, setComp] = useState<"pl" | "ucl">("pl");

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {([
          { key: "pl" as const, label: "Premier League", bg: "bg-[#5B2D8E]" },
          ...(uclStandings.length > 0 ? [{ key: "ucl" as const, label: "Champions League", bg: "bg-[#1A3A7A]" }] : []),
        ]).map(({ key, label, bg }) => {
          const isActive = comp === key;
          return (
            <motion.button
              key={key}
              onClick={() => setComp(key)}
              whileTap={{ scale: 0.96 }}
              className={cn(
                "relative px-4 py-2 rounded-none font-barlow font-semibold text-sm uppercase tracking-wider overflow-hidden border transition-colors",
                isActive
                  ? "text-white border-transparent"
                  : "bg-stadium-surface text-stadium-muted border-stadium-border hover:border-white/30 hover:text-white"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="standings-comp-bg"
                  className={cn("absolute inset-0", bg)}
                  transition={{ type: "spring", stiffness: 180, damping: 14 }}
                />
              )}
              <span className="relative z-10">{label}</span>
            </motion.button>
          );
        })}
      </div>
      <div className="min-h-[400px]">
        {comp === "pl" ? (
          <StandingsTable standings={plStandings} competition="pl" />
        ) : (
          <StandingsTable standings={uclStandings} competition="ucl" />
        )}
      </div>
    </div>
  );
}
