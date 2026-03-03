"use client";

import { motion } from "framer-motion";

interface Trophy {
  name: string;
  count: number;
  years: string[];
  emoji: string;
}

interface TrophyCabinetProps {
  trophies: Trophy[];
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

export function TrophyCabinet({ trophies }: TrophyCabinetProps) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
    >
      {trophies.map((trophy) => (
        <motion.div
          key={trophy.name}
          variants={item}
          className="bg-stadium-surface border border-stadium-border rounded-2xl p-5 flex flex-col gap-3 hover:border-lfc-gold/40 transition-colors group"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="text-3xl">{trophy.emoji}</span>
            <span className="font-bebas text-5xl text-lfc-gold leading-none">{trophy.count}</span>
          </div>
          <p className="font-barlow text-white font-semibold uppercase tracking-wider text-sm leading-tight">
            {trophy.name}
          </p>
          <p className="font-inter text-xs text-stadium-muted leading-relaxed">
            {trophy.years.join(" · ")}
          </p>
        </motion.div>
      ))}
    </motion.div>
  );
}
