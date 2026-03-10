"use client";

import { useEffect, useState } from "react";

/** Fixed thin progress bar at top of viewport, tracks scroll within #article-body */
export function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function handleScroll() {
      const el = document.getElementById("article-body");
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const scrollable = el.scrollHeight - window.innerHeight;
      if (scrollable <= 0) { setProgress(100); return; }
      const scrolled = Math.max(0, -rect.top);
      setProgress(Math.min(100, (scrolled / scrollable) * 100));
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (progress <= 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-stadium-surface/50">
      <div
        className="h-full bg-lfc-red transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
