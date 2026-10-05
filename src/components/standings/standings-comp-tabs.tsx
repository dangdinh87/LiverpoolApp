"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChipBar } from "@/components/fixtures/chip-bar";
import { StandingsTable } from "./standings-table";
import type { Standing } from "@/lib/types/football";

interface StandingsCompTabsProps {
  plStandings: Standing[];
  uclStandings: Standing[];
}

export function StandingsCompTabs({ plStandings, uclStandings }: StandingsCompTabsProps) {
  const t = useTranslations("Standings");
  const [comp, setComp] = useState<"pl" | "ucl">("pl");
  const hasUcl = uclStandings.length > 0;

  return (
    <div>
      {hasUcl && (
        <ChipBar
          className="mb-4"
          ariaLabel={t("compLabel")}
          active={comp}
          onSelect={(k) => setComp(k as "pl" | "ucl")}
          items={[
            { key: "pl", label: t("comp.pl") },
            { key: "ucl", label: t("comp.ucl") },
          ]}
        />
      )}
      <StandingsTable standings={comp === "pl" || !hasUcl ? plStandings : uclStandings} competition={comp === "pl" || !hasUcl ? "pl" : "ucl"} />
    </div>
  );
}
