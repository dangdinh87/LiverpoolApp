"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { cn } from "@/lib/utils";

interface StatNumberProps {
  value: number;
  label: string;
  suffix?: string;
  highlight?: boolean;
  duration?: number;
}

export function StatNumber({
  value,
  label,
  suffix,
  highlight = false,
  duration = 1800,
}: StatNumberProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    let startTime: number | null = null;
    const startValue = 0;

    function step(timestamp: number) {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(startValue + (value - startValue) * eased));
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }, [isInView, value, duration]);

  return (
    <div ref={ref} className="text-center">
      <div className="flex items-end justify-center gap-1">
        <span
          className={cn(
            "font-bebas leading-none",
            highlight ? "text-lfc-red text-8xl md:text-9xl" : "text-white text-7xl md:text-8xl"
          )}
        >
          {displayValue}
        </span>
        {suffix && (
          <span className="font-bebas text-3xl text-stadium-muted mb-2">{suffix}</span>
        )}
      </div>
      <p className="font-barlow text-sm text-stadium-muted uppercase tracking-widest font-semibold mt-1">
        {label}
      </p>
    </div>
  );
}
