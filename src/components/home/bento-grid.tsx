"use client";

import { motion } from "framer-motion";
import { Calendar } from "lucide-react";
import { useTranslations } from "next-intl";
import { NextMatchWidget } from "./next-match-widget";
import { StandingsPreview } from "./standings-preview";
import { FormWidget } from "./form-widget";
import type { Fixture, Standing } from "@/lib/types/football";
import type { GameweekInfo } from "@/lib/types/football";

interface BentoGridProps {
  nextMatch: Fixture | null;
  standings: Standing[];
  gameweek?: GameweekInfo | null;
}

const CARD_BASE =
  "bg-stadium-surface/80 backdrop-blur-sm border border-stadium-border/60 rounded-xl overflow-hidden transition-all duration-300 hover:border-stadium-border";

function BentoCard({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay }}
      className={`${CARD_BASE} ${className ?? ""}`}
    >
      {children}
    </motion.div>
  );
}

function formatDeadline(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  });
}

export function BentoGrid({ nextMatch, standings, gameweek }: BentoGridProps) {
  const t = useTranslations("Bento");
  const lfcStanding = standings.find((s) => s.team.id === 40) ?? null;

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="mb-10"
      >
        <p className="font-barlow text-lfc-red uppercase tracking-widest text-sm font-semibold mb-1">
          {t("season")}
        </p>
        <h2 className="font-bebas text-5xl md:text-6xl text-white tracking-wider">
          {t("title")}
        </h2>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-auto">
        {/* Gameweek info — top bar */}
        {gameweek && (
          <BentoCard className="sm:col-span-2 lg:col-span-3 rounded-xl!" delay={0}>
            <div className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-lfc-red/15 flex items-center justify-center">
                  <Calendar size={16} className="text-lfc-red" />
                </div>
                <div>
                  <span className="font-bebas text-xl text-white tracking-wider block leading-tight">
                    {gameweek.currentName}
                  </span>
                  {gameweek.isFinished && (
                    <span className="text-[10px] font-barlow font-semibold text-stadium-muted uppercase tracking-wider">
                      {t("gameweekComplete")}
                    </span>
                  )}
                </div>
              </div>
              {gameweek.nextDeadline && (
                <div className="text-right">
                  <span className="font-barlow text-[10px] text-stadium-muted uppercase tracking-wider block">
                    GW{gameweek.nextGw} {t("deadline")}
                  </span>
                  <span className="font-inter text-xs text-white font-medium">
                    {formatDeadline(gameweek.nextDeadline)}
                  </span>
                </div>
              )}
            </div>
          </BentoCard>
        )}

        {/* Next match — wider card */}
        <BentoCard className="min-h-[220px]" delay={0.05}>
          <NextMatchWidget fixture={nextMatch} />
        </BentoCard>

        {/* Form */}
        <BentoCard className="min-h-[220px]" delay={0.1}>
          <FormWidget standing={lfcStanding} />
        </BentoCard>

        {/* Standings preview */}
        <BentoCard className="min-h-[220px]" delay={0.15}>
          <StandingsPreview standings={standings} />
        </BentoCard>
      </div>
    </section>
  );
}
