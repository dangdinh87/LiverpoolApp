"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { CompetitionStats } from "@/lib/football/season-stats";

// Competition logos already exist locally
const COMP_LOGOS: Record<string, string> = {
  "Premier League": "/assets/lfc/premier-league.svg",
  "UEFA Champions League": "/assets/lfc/champions-league.png",
  "FA Cup": "/assets/lfc/fa-cup.png",
  "Carabao Cup": "/assets/lfc/carabao-cup.png",
};

interface Props {
  competitions: CompetitionStats[];
  labels: { winRate: string; gf: string; ga: string };
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export function CompetitionBreakdown({ competitions, labels }: Props) {
  if (competitions.length === 0) return null;

  return (
    <motion.div
      className="grid grid-cols-2 md:grid-cols-4 gap-3"
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
    >
      {competitions.map((comp) => {
        const winRate = comp.played > 0 ? Math.round((comp.wins / comp.played) * 100) : 0;
        const drawRate = comp.played > 0 ? Math.round((comp.draws / comp.played) * 100) : 0;
        const logo = COMP_LOGOS[comp.name];

        return (
          <motion.div
            key={comp.name}
            variants={item}
            className="bg-stadium-surface border border-stadium-border p-4"
          >
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
              {logo ? (
                <Image src={logo} alt={comp.name} width={20} height={20} className="object-contain" />
              ) : (
                <span className="text-sm">⚽</span>
              )}
              <span className="font-inter text-xs sm:text-sm font-semibold text-white truncate">{comp.name}</span>
            </div>

            {/* W/D/L */}
            <div className="flex gap-2 text-xs font-bebas tracking-wider mb-2">
              <span className="text-green-400">{comp.wins}W</span>
              <span className="text-amber-400">{comp.draws}D</span>
              <span className="text-red-400">{comp.losses}L</span>
            </div>

            {/* Win rate bar */}
            <div className="h-1.5 bg-stadium-surface2 rounded-full overflow-hidden flex mb-2">
              <div className="h-full bg-green-500 transition-all" style={{ width: `${winRate}%` }} />
              <div className="h-full bg-amber-500 transition-all" style={{ width: `${drawRate}%` }} />
            </div>

            {/* Goals */}
            <div className="font-inter text-[11px] text-stadium-muted">
              {comp.goalsFor} {labels.gf} · {comp.goalsAgainst} {labels.ga}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
