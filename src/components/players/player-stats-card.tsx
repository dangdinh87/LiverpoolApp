"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { FplPlayerDetail } from "@/lib/fpl-data";

interface Props {
  player: FplPlayerDetail;
}

type StatItem = { labelKey: string; value: string | number; descKey: string };

const STAT_GROUPS: {
  labelKey: string;
  stats: (p: FplPlayerDetail) => StatItem[];
}[] = [
  {
    labelKey: "attack",
    stats: (p) => [
      { labelKey: "goals", value: p.goals, descKey: "goals" },
      { labelKey: "assists", value: p.assists, descKey: "assists" },
      { labelKey: "xG", value: p.xG.toFixed(1), descKey: "xG" },
      { labelKey: "xA", value: p.xA.toFixed(1), descKey: "xA" },
      { labelKey: "pensMissed", value: p.penaltiesMissed, descKey: "pensMissed" },
    ],
  },
  {
    labelKey: "defence",
    stats: (p) => [
      { labelKey: "cleanSheets", value: p.cleanSheets, descKey: "cleanSheets" },
      { labelKey: "goalsConceded", value: p.goalsConceded, descKey: "goalsConceded" },
      { labelKey: "saves", value: p.saves, descKey: "saves" },
      { labelKey: "pensSaved", value: p.penaltiesSaved, descKey: "pensSaved" },
    ],
  },
  {
    labelKey: "general",
    stats: (p) => [
      { labelKey: "minutes", value: p.minutes.toLocaleString(), descKey: "minutes" },
      { labelKey: "starts", value: p.starts, descKey: "starts" },
      { labelKey: "yellowCards", value: p.yellowCards, descKey: "yellowCards" },
      { labelKey: "redCards", value: p.redCards, descKey: "redCards" },
      { labelKey: "ownGoals", value: p.ownGoals, descKey: "ownGoals" },
    ],
  },
  {
    labelKey: "fpl",
    stats: (p) => [
      { labelKey: "totalPoints", value: p.totalPoints, descKey: "totalPoints" },
      { labelKey: "form", value: p.form, descKey: "form" },
      { labelKey: "bonus", value: p.bonus, descKey: "bonus" },
      { labelKey: "bps", value: p.bps, descKey: "bps" },
      { labelKey: "selectedBy", value: `${p.selectedBy}%`, descKey: "selectedBy" },
      { labelKey: "price", value: `£${p.price.toFixed(1)}m`, descKey: "price" },
    ],
  },
  {
    labelKey: "ictIndex",
    stats: (p) => [
      { labelKey: "influence", value: p.influence.toFixed(1), descKey: "influence" },
      { labelKey: "creativity", value: p.creativity.toFixed(1), descKey: "creativity" },
      { labelKey: "threat", value: p.threat.toFixed(1), descKey: "threat" },
      { labelKey: "ictIndexStat", value: p.ictIndex.toFixed(1), descKey: "ictIndexStat" },
    ],
  },
];

export function PlayerStatsCard({ player }: Props) {
  const t = useTranslations("PlayerDetail");

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {STAT_GROUPS.map((group) => {
        const stats = group.stats(player);
        // Hide defence group for attackers with all zeros
        if (group.labelKey === "defence" && stats.every((s) => s.value === 0)) return null;

        return (
          <div
            key={group.labelKey}
            className="bg-stadium-surface border border-stadium-border p-4"
          >
            <h3 className="font-barlow font-semibold text-stadium-muted uppercase tracking-wider text-xs mb-3">
              {t(`stats.${group.labelKey}`)}
            </h3>
            <div className="space-y-3">
              {stats.map((stat) => (
                <div key={stat.labelKey} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-inter text-stadium-muted text-xs">{t(`stats.${stat.labelKey}`)}</span>
                    <p className="font-inter text-stadium-muted/50 text-[10px] leading-tight mt-0.5">{t(`statsDesc.${stat.descKey}`)}</p>
                  </div>
                  <span
                    className={cn(
                      "font-inter text-sm font-semibold shrink-0",
                      (() => {
                        const n = typeof stat.value === "number" ? stat.value : parseFloat(String(stat.value));
                        return !isNaN(n) && n === 0;
                      })()
                        ? "text-stadium-muted"
                        : "text-white",
                    )}
                  >
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
