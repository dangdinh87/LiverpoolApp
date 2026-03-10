"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { NextMatchWidget } from "./next-match-widget";
import { StandingsPreview } from "./standings-preview";
import { FormWidget } from "./form-widget";
import type { Fixture, Standing } from "@/lib/types/football";

interface BentoGridProps {
  nextMatch: Fixture | null;
  standings: Standing[];
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

export function BentoGrid({ nextMatch, standings }: BentoGridProps) {
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
