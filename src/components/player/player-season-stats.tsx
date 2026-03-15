"use client";

// Player Premier League season stats — shows summary cards + detailed breakdown.
// Data from FPL API (free, no key needed).

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { PlayerStatistic } from "@/lib/types/football";
import type { FplPlayerStats } from "@/lib/football/fpl-stats";
import {
  Trophy, Clock, Target, Shield, Shirt,
  Crosshair, ArrowRightLeft, Star,
} from "lucide-react";

// ─── Props ──────────────────────────────────────────────────────────────────

interface Props {
  /** Canonical stats from provider (mapped from FPL) */
  statistics: PlayerStatistic[];
  /** Extra FPL-specific data (xG, xA, clean sheets, etc.) */
  fplStats: FplPlayerStats | null;
  position: "goalkeeper" | "defender" | "midfielder" | "forward";
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatMinutes(min: number): string {
  if (min >= 1000) return `${(min / 1000).toFixed(1)}K`;
  return String(min);
}

function formatDecimal(n: number): string {
  if (n === 0) return "0";
  return n.toFixed(2);
}

// ─── Component ──────────────────────────────────────────────────────────────

export function PlayerSeasonStats({ statistics, fplStats, position }: Props) {
  const t = useTranslations("PlayerDetail.stats");

  // No stats available or insufficient game time
  if (statistics.length === 0 || !fplStats || fplStats.minutes < 90) {
    return (
      <section className="bg-stadium-surface border border-stadium-border p-6 md:p-8">
        <h2 className="font-bebas text-3xl text-white tracking-wider mb-4">
          {t("seasonStats")}
        </h2>
        <p className="text-stadium-muted font-inter text-sm">{t("noStats")}</p>
      </section>
    );
  }

  const s = statistics[0]; // PL stats (single entry)
  const isGK = position === "goalkeeper";
  const isDef = position === "defender";
  const apps = s.games.appearences ?? 0;
  const starts = s.games.lineups ?? 0;
  const subIn = Math.max(0, apps - starts);

  return (
    <section className="space-y-4">
      {/* ─── Section title ─── */}
      <div className="flex items-center gap-3">
        <div className="w-1 h-8 bg-lfc-red rounded-full" />
        <div>
          <h2 className="font-bebas text-3xl text-white tracking-wider leading-none">
            {t("seasonStats")}
          </h2>
          <p className="font-barlow text-[10px] text-stadium-muted uppercase tracking-[0.15em] mt-0.5">
            Premier League 2025/26
          </p>
        </div>
      </div>

      {/* ─── Hero summary cards ─── */}
      <div className={cn(
        "grid gap-3",
        isGK ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
      )}>
        <SummaryCard
          icon={<Shirt size={16} />}
          value={apps}
          label={t("appearances")}
          sub={`${starts} ${t("starts")}${subIn > 0 ? ` + ${subIn} ${t("subIn")}` : ""}`}
        />
        <SummaryCard
          icon={<Clock size={16} />}
          value={formatMinutes(fplStats.minutes)}
          label={t("minutes")}
        />
        <SummaryCard
          icon={<Target size={16} />}
          value={fplStats.goalsScored}
          label={t("goals")}
          accent={fplStats.goalsScored > 0 ? "red" : undefined}
        />
        <SummaryCard
          icon={<ArrowRightLeft size={16} />}
          value={fplStats.assists}
          label={t("assists")}
        />
        {isGK ? (
          <>
            <SummaryCard
              icon={<Shield size={16} />}
              value={fplStats.cleanSheets}
              label={t("cleanSheets")}
              accent="gold"
            />
            <SummaryCard
              icon={<Crosshair size={16} />}
              value={fplStats.saves}
              label={t("saves")}
            />
          </>
        ) : (
          <SummaryCard
            icon={<Star size={16} />}
            value={fplStats.cleanSheets}
            label={t("cleanSheets")}
            accent={fplStats.cleanSheets > 0 ? "gold" : undefined}
          />
        )}
      </div>

      {/* ─── Detailed stats grid ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Attack */}
        <DetailCard title={t("attack")} icon={<Target size={14} className="text-lfc-red" />}>
          <StatRow label={t("goals")} value={fplStats.goalsScored} />
          <StatRow label={t("assists")} value={fplStats.assists} />
          <StatRow label="xG" value={formatDecimal(fplStats.expectedGoals)} />
          <StatRow label="xA" value={formatDecimal(fplStats.expectedAssists)} />
          {fplStats.penaltiesMissed > 0 && (
            <StatRow label={t("penMissed")} value={fplStats.penaltiesMissed} />
          )}
          {fplStats.ownGoals > 0 && (
            <StatRow label={t("ownGoals")} value={fplStats.ownGoals} />
          )}
        </DetailCard>

        {/* Defence / GK */}
        <DetailCard title={t("defence")} icon={<Shield size={14} className="text-blue-400" />}>
          <StatRow label={t("cleanSheets")} value={fplStats.cleanSheets} highlight={fplStats.cleanSheets > 0} />
          <StatRow label={t("goalsConceded")} value={fplStats.goalsConceded} />
          {isGK && (
            <>
              <StatRow label={t("saves")} value={fplStats.saves} highlight />
              {fplStats.penaltiesSaved > 0 && (
                <StatRow label={t("penSaved")} value={fplStats.penaltiesSaved} highlight />
              )}
            </>
          )}
          <StatRow label="xGC" value={formatDecimal(fplStats.expectedGoalsConceded)} />
        </DetailCard>

        {/* Discipline & General */}
        <DetailCard title={t("general")} icon={<Trophy size={14} className="text-lfc-gold" />}>
          <StatRow label={t("minutes")} value={fplStats.minutes.toLocaleString()} />
          <StatRow label={t("starts")} value={fplStats.starts} />
          {subIn > 0 && <StatRow label={t("subIn")} value={subIn} />}
          <StatRow label="xGI" value={formatDecimal(fplStats.expectedGoalInvolvements)} />
          {(isDef || isGK) && fplStats.cleanSheets > 0 && apps > 0 && (
            <StatRow
              label={`${t("cleanSheets")} %`}
              value={`${Math.round((fplStats.cleanSheets / apps) * 100)}%`}
            />
          )}
        </DetailCard>
      </div>

      {/* ─── Discipline bar ─── */}
      {(fplStats.yellowCards > 0 || fplStats.redCards > 0) && (
        <div className="flex items-center gap-4 bg-stadium-surface border border-stadium-border px-5 py-3">
          <span className="font-barlow text-xs text-stadium-muted uppercase tracking-widest">
            {t("discipline")}
          </span>
          <div className="flex items-center gap-3 ml-auto">
            {fplStats.yellowCards > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-4 rounded-[1px] bg-yellow-400 inline-block" />
                <span className="font-bebas text-lg text-white">{fplStats.yellowCards}</span>
              </span>
            )}
            {fplStats.redCards > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-4 rounded-[1px] bg-red-500 inline-block" />
                <span className="font-bebas text-lg text-white">{fplStats.redCards}</span>
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function SummaryCard({
  icon, value, label, sub, accent,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  sub?: string;
  accent?: "red" | "gold";
}) {
  return (
    <div className="bg-stadium-surface border border-stadium-border p-4 text-center relative overflow-hidden group hover:border-stadium-muted/40 transition-colors">
      <div className="absolute top-2.5 left-2.5 text-stadium-muted/40">{icon}</div>
      <div className={cn(
        "font-bebas text-4xl md:text-5xl leading-none mb-0.5",
        accent === "red" ? "text-lfc-red"
          : accent === "gold" ? "text-lfc-gold"
            : "text-white"
      )}>
        {value}
      </div>
      <div className="font-barlow text-[10px] text-stadium-muted uppercase tracking-widest">
        {label}
      </div>
      {sub && (
        <div className="font-inter text-[10px] text-stadium-muted/60 mt-0.5">{sub}</div>
      )}
    </div>
  );
}

function DetailCard({
  title, icon, children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-stadium-surface border border-stadium-border overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-stadium-border">
        {icon}
        <h3 className="font-bebas text-lg text-white tracking-wider">{title}</h3>
      </div>
      <div className="px-5 py-2 divide-y divide-stadium-border/30">
        {children}
      </div>
    </div>
  );
}

function StatRow({
  label, value, highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-stadium-muted font-inter text-sm">{label}</span>
      <span className={cn(
        "font-inter text-sm font-semibold",
        highlight ? "text-lfc-gold" : "text-white"
      )}>
        {value}
      </span>
    </div>
  );
}
