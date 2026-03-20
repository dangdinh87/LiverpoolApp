"use client";

import { useState, useEffect, useRef } from "react";

/**
 * Detects scroll direction with threshold debouncing to prevent jitter.
 * Returns "up" or "down" — useful for show/hide floating UI elements.
 */
export function useScrollDirection(threshold = 10) {
  const [direction, setDirection] = useState<"up" | "down">("up");
  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    lastY.current = window.scrollY;

    function onScroll() {
      if (ticking.current) return;
      ticking.current = true;

      requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const delta = currentY - lastY.current;

        if (Math.abs(delta) > threshold) {
          setDirection(delta > 0 ? "down" : "up");
          lastY.current = currentY;
        }

        ticking.current = false;
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return direction;
}
