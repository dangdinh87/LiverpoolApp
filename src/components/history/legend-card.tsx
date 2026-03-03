"use client";

import { motion } from "framer-motion";

interface Legend {
  name: string;
  role: string;
  years: string;
  caps: number | null;
  goals: number | null;
  bio: string;
}

interface LegendCardProps {
  legend: Legend;
}

// Deterministic initials from name
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function LegendCard({ legend }: LegendCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45 }}
      className="bg-stadium-surface border border-stadium-border rounded-2xl overflow-hidden hover:border-lfc-red/30 transition-colors group"
    >
      {/* Avatar area */}
      <div className="relative h-24 bg-gradient-to-br from-lfc-red/10 to-stadium-bg flex items-center justify-center border-b border-stadium-border">
        {/* Jersey number style initials */}
        <span className="font-bebas text-6xl text-white/10 absolute right-3 bottom-0 leading-none select-none">
          {getInitials(legend.name)}
        </span>
        <div className="w-14 h-14 rounded-full bg-stadium-surface2 border border-stadium-border flex items-center justify-center z-10">
          <span className="font-bebas text-xl text-lfc-red">{getInitials(legend.name)}</span>
        </div>
      </div>

      <div className="p-5">
        <h3 className="font-bebas text-2xl text-white tracking-wider leading-tight mb-0.5">
          {legend.name}
        </h3>
        <div className="flex items-center gap-2 mb-3">
          <span className="font-barlow text-lfc-red text-xs font-semibold uppercase tracking-wider">
            {legend.role}
          </span>
          <span className="text-stadium-border">·</span>
          <span className="font-inter text-stadium-muted text-xs">{legend.years}</span>
        </div>

        {/* Stats row */}
        {(legend.caps !== null || legend.goals !== null) && (
          <div className="flex gap-4 mb-3 border-t border-stadium-border/60 pt-3">
            {legend.caps !== null && (
              <div>
                <p className="font-bebas text-xl text-white">{legend.caps}</p>
                <p className="font-barlow text-xs text-stadium-muted uppercase tracking-wider">Apps</p>
              </div>
            )}
            {legend.goals !== null && (
              <div>
                <p className="font-bebas text-xl text-lfc-red">{legend.goals}</p>
                <p className="font-barlow text-xs text-stadium-muted uppercase tracking-wider">Goals</p>
              </div>
            )}
          </div>
        )}

        <p className="font-inter text-xs text-stadium-muted leading-relaxed line-clamp-4">
          {legend.bio}
        </p>
      </div>
    </motion.div>
  );
}
