"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChipBar } from "@/components/fixtures/chip-bar";
import { StandingsTable } from "./standings-table";
import type { Standing } from "@/lib/types/football";
import { competitionName } from "@/lib/competition-labels";

interface StandingsCompTabsProps {
  plStandings: Standing[];
  uclStandings: Standing[];
  /** Liverpool's next league opponent, tagged in the Premier League table. */
  nextOpponentId?: number;
}

export function StandingsCompTabs({ plStandings, uclStandings, nextOpponentId }: StandingsCompTabsProps) {
  const t = useTranslations("Standings");
  const locale = useLocale();
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
            { key: "pl", label: competitionName("pl", locale) },
            { key: "ucl", label: competitionName("ucl", locale) },
          ]}
        />
      )}
      <StandingsTable standings={comp === "pl" || !hasUcl ? plStandings : uclStandings} competition={comp === "pl" || !hasUcl ? "pl" : "ucl"}
        nextOpponentId={comp === "pl" || !hasUcl ? nextOpponentId : undefined}
      />
    </div>
  );
}
