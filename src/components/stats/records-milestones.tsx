"use client";

import { motion } from "framer-motion";
import { Trophy, TrendingUp, Shield, Target, RotateCcw, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SeasonRecords } from "@/lib/football/season-stats";
import type { LucideIcon } from "lucide-react";

interface Props {
  records: SeasonRecords;
  labels: Record<string, string>;
}

interface RecordItem {
  icon: LucideIcon;
  label: string;
  value: string;
  context: string;
  color: string;
  iconBg: string;
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export function RecordsMilestones({ records, labels }: Props) {
  const items: RecordItem[] = [];

  if (records.biggestWin) {
    items.push({
      icon: Trophy,
      label: labels.biggestWin,
      value: records.biggestWin.display.score,
      context: `${records.biggestWin.display.opponent} (${records.biggestWin.display.venue})`,
      color: "text-lfc-red",
      iconBg: "bg-lfc-red/10",
    });
  }

  if (records.longestWinStreak > 0) {
    items.push({
      icon: TrendingUp,
      label: labels.winStreak,
      value: String(records.longestWinStreak),
      context: `${records.longestWinStreak} ${labels.matches ?? "matches"}`,
      color: "text-lfc-gold",
      iconBg: "bg-lfc-gold/10",
    });
  }

  if (records.longestUnbeatenStreak > 0) {
    items.push({
      icon: Shield,
      label: labels.unbeatenStreak,
      value: String(records.longestUnbeatenStreak),
      context: `${records.longestUnbeatenStreak} ${labels.matches ?? "matches"}`,
      color: "text-green-400",
      iconBg: "bg-green-500/10",
    });
  }

  if (records.scoringFirst.total > 0) {
    const pct = Math.round((records.scoringFirst.wins / records.scoringFirst.total) * 100);
    items.push({
      icon: Target,
      label: labels.scoringFirst,
      value: `${pct}%`,
      context: `${records.scoringFirst.wins}/${records.scoringFirst.total}`,
      color: "text-lfc-red",
      iconBg: "bg-lfc-red/10",
    });
  }

  if (records.comebackWins > 0) {
    items.push({
      icon: RotateCcw,
      label: labels.comebacks,
      value: String(records.comebackWins),
      context: `${records.comebackWins} ${labels.times ?? "times"}`,
      color: "text-lfc-gold",
      iconBg: "bg-lfc-gold/10",
    });
  }

  if (records.highestScoring) {
    items.push({
      icon: Zap,
      label: labels.highestScoring,
      value: records.highestScoring.display.score,
      context: `${records.highestScoring.display.opponent} (${records.highestScoring.display.venue})`,
      color: "text-lfc-red",
      iconBg: "bg-lfc-red/10",
    });
  }

  if (records.biggestLoss) {
    items.push({
      icon: Shield,
      label: labels.biggestLoss,
      value: records.biggestLoss.display.score,
      context: `${records.biggestLoss.display.opponent} (${records.biggestLoss.display.venue})`,
      color: "text-red-400",
      iconBg: "bg-red-500/10",
    });
  }

  if (items.length === 0) return null;

  return (
    <motion.div
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
    >
      {items.map((rec) => (
        <motion.div
          key={rec.label}
          variants={item}
          className="bg-stadium-surface border border-stadium-border p-4 group hover:border-stadium-border/80 transition-colors"
        >
          {/* Icon with colored background */}
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-3", rec.iconBg)}>
            <rec.icon className={cn("w-4 h-4", rec.color)} />
          </div>
          <div className="font-barlow text-[10px] text-stadium-muted uppercase tracking-[0.15em] mb-1">{rec.label}</div>
          <div className={cn("font-bebas text-3xl sm:text-4xl leading-none", rec.color)}>{rec.value}</div>
          <div className="font-inter text-[11px] text-stadium-muted mt-1.5">{rec.context}</div>
        </motion.div>
      ))}
    </motion.div>
  );
}
