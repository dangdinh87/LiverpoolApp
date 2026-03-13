"use client";

import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

interface Legend {
  name: string;
  role: string;
  years: string;
  caps: number | null;
  goals: number | null;
  bio: string;
  image?: string;
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
  const [imgError, setImgError] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="bg-stadium-surface border border-stadium-border group relative overflow-hidden transition-all duration-500 hover:border-white/20"
    >
      {/* Photo or initials banner */}
      <div className="relative h-52 overflow-hidden bg-stadium-surface2">
        {legend.image && !imgError ? (
          <Image
            src={legend.image}
            alt={legend.name}
            fill
            className="object-cover object-center transition-transform duration-700 scale-105 group-hover:scale-100"
            sizes="(max-width: 768px) 100vw, 33vw"
            unoptimized
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-bebas text-[100px] text-white/10 leading-none select-none">
              {getInitials(legend.name)}
            </span>
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-stadium-surface via-stadium-surface/40 to-transparent" />
        {/* Role badge */}
        <div className="absolute top-3 left-3">
          <span className="font-barlow text-[10px] font-bold uppercase tracking-[0.2em] px-2 py-1 bg-lfc-red/90 text-white">
            {legend.role}
          </span>
        </div>
      </div>

      {/* Profile Header */}
      <div className="relative px-5 pt-4 pb-2 border-b border-stadium-border/30">
        <h3 className="font-bebas text-3xl text-white tracking-widest leading-none mb-1 group-hover:text-lfc-red transition-colors duration-500">
          {legend.name}
        </h3>
        <span className="font-inter text-stadium-muted text-[10px] uppercase tracking-widest font-semibold opacity-70">
          {legend.years}
        </span>
      </div>

      <div className="px-5 py-4">
        {/* Stats Row */}
        {(legend.caps !== null || legend.goals !== null) && (
          <div className="flex gap-8 mb-4">
            {legend.caps !== null && (
              <div className="flex flex-col">
                <p className="font-bebas text-2xl text-white leading-none mb-0.5">{legend.caps}</p>
                <p className="font-barlow text-[9px] text-stadium-muted uppercase tracking-[0.2em] font-bold">{t("appearances")}</p>
              </div>
            )}
            {legend.goals !== null && (
              <div className="flex flex-col">
                <p className="font-bebas text-2xl text-lfc-red leading-none mb-0.5">{legend.goals}</p>
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
