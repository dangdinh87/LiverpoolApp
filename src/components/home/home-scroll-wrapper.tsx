"use client";

import { useEffect, useState, useCallback } from "react";

/**
 * Enables smooth CSS scroll-snap (proximity) on <html> for the home page.
 * Adds dot navigation on the right side for section indicators.
 * Uses "proximity" instead of "mandatory" so the footer and free scrolling work.
 * Cleans up on unmount so other pages scroll normally.
 */
export function HomeScrollWrapper({ children }: { children: React.ReactNode }) {
  const [activeSection, setActiveSection] = useState(0);
  const [sectionCount, setSectionCount] = useState(0);

  useEffect(() => {
    const html = document.documentElement;
    html.style.scrollSnapType = "y proximity";

    const sections = document.querySelectorAll<HTMLElement>("[data-snap-section]");
    setSectionCount(sections.length);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute("data-snap-section"));
            if (!isNaN(idx)) setActiveSection(idx);
          }
        });
      },
      { threshold: 0.3 }
    );

    sections.forEach((s) => observer.observe(s));

    return () => {
      html.style.scrollSnapType = "";
      observer.disconnect();
    };
  }, []);

  const scrollTo = useCallback((idx: number) => {
    const section = document.querySelector<HTMLElement>(`[data-snap-section="${idx}"]`);
    section?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <>
      {children}

      {/* Section dot indicators — right side */}
      {sectionCount > 1 && (
        <div className="fixed right-4 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2.5 max-md:hidden">
          {Array.from({ length: sectionCount }).map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              aria-label={`Go to section ${i + 1}`}
              className={`w-2 h-2 rounded-full transition-all duration-300 cursor-pointer ${
                activeSection === i
                  ? "bg-lfc-red scale-125 shadow-[0_0_8px_rgba(200,16,46,0.6)]"
                  : "bg-white/20 hover:bg-white/40"
              }`}
            />
          ))}
        </div>
      )}
    </>
  );
}
