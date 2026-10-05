"use client";

import { useEffect, useRef } from "react";

/**
 * Slim reading-progress bar at the top of the viewport. Tracks how far the
 * reader is through `#article-body`. Updates one transform per frame; React
 * state is not involved, so scrolling never re-renders anything.
 */
export function ReadingProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;

    function update() {
      frame = 0;
      const bar = barRef.current;
      const body = document.getElementById("article-body");
      if (!bar || !body) return;
      const rect = body.getBoundingClientRect();
      // 0 when the body's top reaches the viewport top, 1 when its end does.
      const total = rect.height - window.innerHeight * 0.4;
      const progress = total <= 0 ? 0 : Math.min(1, Math.max(0, -rect.top / total));
      bar.style.transform = `scaleX(${progress})`;
      bar.style.opacity = progress > 0 ? "1" : "0";
    }

    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px]">
      <div
        ref={barRef}
        className="h-full origin-left bg-lfc-red opacity-0 transition-opacity duration-150"
        style={{ transform: "scaleX(0)" }}
      />
    </div>
  );
}
