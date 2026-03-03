"use client";

import { motion } from "framer-motion";

interface HistoryEvent {
  year: number;
  title: string;
  description: string;
}

interface ClubTimelineProps {
  events: HistoryEvent[];
}

export function ClubTimeline({ events }: ClubTimelineProps) {
  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-lfc-red via-stadium-border to-transparent md:-translate-x-px" />

      <div className="flex flex-col gap-10">
        {events.map((event, i) => {
          const isLeft = i % 2 === 0;
          return (
            <motion.div
              key={`${event.year}-${i}`}
              initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className={`relative flex items-start gap-6 md:gap-0 ${
                isLeft ? "md:flex-row" : "md:flex-row-reverse"
              }`}
            >
              {/* Year dot on the line */}
              <div className="absolute left-4 md:left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-lfc-red ring-4 ring-stadium-bg z-10 flex-shrink-0" />

              {/* Content card */}
              <div className={`ml-10 md:ml-0 md:w-[calc(50%-2rem)] ${isLeft ? "md:mr-8 md:text-right" : "md:ml-8"}`}>
                <div className="bg-stadium-surface border border-stadium-border rounded-xl p-5 hover:border-lfc-red/30 transition-colors">
                  <span className="font-bebas text-3xl text-lfc-red leading-none block mb-1">
                    {event.year}
                  </span>
                  <h3 className="font-barlow text-white font-semibold uppercase tracking-wider text-sm mb-2">
                    {event.title}
                  </h3>
                  <p className="font-inter text-stadium-muted text-sm leading-relaxed">
                    {event.description}
                  </p>
                </div>
              </div>

              {/* Spacer for opposite side */}
              <div className="hidden md:block md:w-[calc(50%-2rem)]" />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
