"use client";

import { useTranslations } from "next-intl";
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
  const t = useTranslations("History.legends");
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="bg-stadium-surface border border-stadium-border group relative overflow-hidden transition-all duration-500 hover:border-white/20"
    >
      {/* Decorative background initials */}
      <span className="font-bebas text-[120px] text-white/5 absolute -right-6 -top-12 leading-none select-none pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:text-white/10">
        {getInitials(legend.name)}
      </span>

      {/* Profile Header */}
      <div className="relative p-6 pb-2 border-b border-stadium-border/30">
        <h3 className="font-bebas text-3xl text-white tracking-widest leading-none mb-1 group-hover:text-lfc-red transition-colors duration-500">
          {legend.name}
        </h3>
        <div className="flex items-center gap-2">
          <span className="font-barlow text-lfc-red text-[10px] font-bold uppercase tracking-[0.2em]">
            {legend.role}
          </span>
          <span className="w-1 h-1 rounded-full bg-stadium-border" />
          <span className="font-inter text-stadium-muted text-[10px] uppercase tracking-widest font-bold font-semibold opacity-70">
            {legend.years}
          </span>
        </div>
      </div>

      <div className="p-6 pt-6">
        {/* Stats Row */}
        {(legend.caps !== null || legend.goals !== null) && (
          <div className="flex gap-10 mb-6">
            {legend.caps !== null && (
              <div className="flex flex-col">
                <p className="font-bebas text-3xl text-white leading-none mb-1">{legend.caps}</p>
                <p className="font-barlow text-[9px] text-stadium-muted uppercase tracking-[0.2em] font-bold">{t("appearances")}</p>
              </div>
            )}
            {legend.goals !== null && (
              <div className="flex flex-col">
                <p className="font-bebas text-3xl text-lfc-red leading-none mb-1">{legend.goals}</p>
                <p className="font-barlow text-[9px] text-stadium-muted uppercase tracking-[0.2em] font-bold">{t("goals")}</p>
              </div>
            )}
          </div>
        )}

        <p className="font-inter text-xs text-stadium-muted leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity duration-500 border-l border-white/5 pl-4">
          {legend.bio}
        </p>
      </div>

      {/* Hover Line */}
      <div className="absolute bottom-0 left-0 w-0 h-1 bg-lfc-red transition-all duration-700 group-hover:w-full" />
    </motion.div>
  );
}
