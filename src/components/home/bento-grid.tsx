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
  "relative bg-stadium-surface border border-stadium-border/70 overflow-hidden transition-all duration-300 hover:border-lfc-red/40 hover:shadow-[0_4px_24px_rgba(200,16,46,0.08)]";

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
        <p className="font-barlow text-stadium-muted uppercase tracking-widest text-xs font-semibold mb-1">
          {t("season")}
        </p>
        <h2 className="font-bebas text-4xl sm:text-5xl md:text-6xl text-white tracking-wider">
          {t("title")}
        </h2>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-auto items-stretch">
        <BentoCard className="min-h-[280px] md:min-h-0 md:aspect-square" delay={0.05}>
          <NextMatchWidget fixture={nextMatch} />
        </BentoCard>

        <BentoCard className="min-h-[280px] md:min-h-0 md:aspect-square" delay={0.1}>
          <FormWidget standing={lfcStanding} />
        </BentoCard>

        <BentoCard className="min-h-[280px] md:min-h-0 md:aspect-square" delay={0.15}>
          <StandingsPreview standings={standings} />
        </BentoCard>
      </div>
    </section>
  );
}
