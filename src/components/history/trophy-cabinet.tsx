"use client";

import Image from "next/image";
import { motion } from "framer-motion";

interface Trophy {
  name: string;
  count: number;
  years: string[];
  image: string;
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
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
    >
      {trophies.map((trophy) => (
        <motion.div
          key={trophy.name}
          variants={item}
          className="group relative bg-stadium-surface border border-stadium-border/50 p-6 flex flex-col gap-4 hover:border-lfc-gold/50 transition-all duration-500 overflow-hidden"
        >
          {/* Accent glow on hover */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-lfc-gold/5 blur-[80px] -mr-16 -mt-16 group-hover:bg-lfc-gold/15 transition-colors duration-500" />

          <div className="flex items-center justify-between gap-4">
            <div className="relative w-14 h-14 shrink-0 drop-shadow-[0_0_8px_rgba(246,235,97,0.2)] group-hover:drop-shadow-[0_0_12px_rgba(246,235,97,0.4)] transition-all duration-500">
              <Image
                src={trophy.image}
                alt={trophy.name}
                width={56}
                height={56}
                className="object-contain"
              />
            </div>
            <span className="font-bebas text-6xl text-lfc-gold leading-none tracking-tighter drop-shadow-sm select-none">
              {trophy.count}
            </span>
          </div>

          <div>
            <p className="font-bebas text-2xl text-white tracking-wider leading-tight mb-2 group-hover:text-lfc-gold transition-colors duration-500">
              {trophy.name}
            </p>
            <div className="h-px w-8 bg-lfc-gold/30 mb-3 group-hover:w-full transition-all duration-700" />
            <div className="flex flex-wrap gap-x-2 gap-y-1">
              {trophy.years.map((year, idx) => (
                <span
                  key={year}
                  className="font-inter text-[10px] text-stadium-muted font-bold tracking-tighter"
                >
                  {year}{idx !== trophy.years.length - 1 ? " ·" : ""}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
