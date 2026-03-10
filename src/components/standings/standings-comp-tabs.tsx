"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("Standings.comp");
  const [comp, setComp] = useState<"pl" | "ucl">("pl");

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setComp("pl")}
          className={cn(
            "px-4 py-2 font-barlow font-semibold text-sm uppercase tracking-wider transition-colors duration-200 border",
            comp === "pl"
              ? "bg-purple-600 text-white border-purple-600"
              : "bg-stadium-surface text-stadium-muted border-stadium-border hover:border-white/30 hover:text-white"
          )}
        >
          {t("pl")}
        </button>
        {uclStandings.length > 0 && (
          <button
            onClick={() => setComp("ucl")}
            className={cn(
              "px-4 py-2 font-barlow font-semibold text-sm uppercase tracking-wider transition-colors duration-200 border",
              comp === "ucl"
                ? "bg-sky-600 text-white border-sky-600"
                : "bg-stadium-surface text-stadium-muted border-stadium-border hover:border-white/30 hover:text-white"
            )}
          >
            {t("ucl")}
          </button>
        )}
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
