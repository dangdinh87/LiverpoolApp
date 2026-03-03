"use client";

import { motion } from "framer-motion";
import { NextMatchWidget } from "./next-match-widget";
import { StandingsPreview } from "./standings-preview";
import { FormWidget } from "./form-widget";
import { SquadCarousel } from "./squad-carousel";
import { LatestNewsWidget } from "./latest-news-widget";
import type { Fixture, Standing, Player } from "@/lib/types/football";
import type { NewsArticle } from "@/lib/rss-parser";

interface BentoGridProps {
  nextMatch: Fixture | null;
  standings: Standing[];
  players: Player[];
  news: NewsArticle[];
}

const CARD_BASE =
  "bg-stadium-surface border border-stadium-border rounded-2xl overflow-hidden";

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

export function BentoGrid({ nextMatch, standings, players, news }: BentoGridProps) {
  const lfcStanding = standings.find((s) => s.team.id === 40) ?? null;

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <p className="font-barlow text-lfc-red uppercase tracking-widest text-sm font-semibold mb-1">
          Season 2024/25
        </p>
        <h2 className="font-bebas text-5xl md:text-6xl text-white tracking-wider">
          Club Overview
        </h2>
      </motion.div>

      {/* Bento grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-auto">
        {/* Next match — wide */}
        <BentoCard className="sm:col-span-2 lg:col-span-2 min-h-[200px]" delay={0.05}>
          <NextMatchWidget fixture={nextMatch} />
        </BentoCard>

        {/* Form */}
        <BentoCard className="min-h-[200px]" delay={0.1}>
          <FormWidget standing={lfcStanding} />
        </BentoCard>

        {/* Standings preview */}
        <BentoCard className="min-h-[200px]" delay={0.15}>
          <StandingsPreview standings={standings} />
        </BentoCard>

        {/* Squad carousel — full width */}
        <BentoCard className="sm:col-span-2 lg:col-span-4 min-h-[180px]" delay={0.2}>
          <SquadCarousel players={players} />
        </BentoCard>

        {/* Latest news — wide */}
        <BentoCard className="sm:col-span-2 lg:col-span-4 min-h-[180px]" delay={0.25}>
          <LatestNewsWidget articles={news} />
        </BentoCard>
      </div>
    </section>
  );
}
