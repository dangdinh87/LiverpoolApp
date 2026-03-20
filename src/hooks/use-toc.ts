"use client";

import { useState, useEffect, useRef } from "react";

export interface TocHeading {
  id: string;
  text: string;
  level: number;
}

/**
 * Observes h2/h3 headings inside #article-body and tracks the active one on scroll.
 * Auto-generates IDs for headings that don't have one.
 * Returns empty headings array if <3 headings found.
 */
export function useToc() {
  const [headings, setHeadings] = useState<TocHeading[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Wait a tick for ArticleHtmlBody to inject innerHTML
    const timer = setTimeout(() => {
      const container = document.getElementById("article-body");
      if (!container) return;

      const elements = Array.from(container.querySelectorAll<HTMLElement>("h2, h3"));
      if (elements.length < 3) return;

      // Auto-generate IDs + build heading list
      const items: TocHeading[] = elements.map((el, i) => {
        if (!el.id) {
          el.id = `toc-${i}-${el.textContent?.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || i}`;
        }
        return {
          id: el.id,
          text: el.textContent?.trim() || "",
          level: el.tagName === "H2" ? 2 : 3,
        };
      });

      setHeadings(items);

      // Observe headings to track active section
      observerRef.current = new IntersectionObserver(
        (entries) => {
          // Find the topmost visible heading
          const visible = entries
            .filter((e) => e.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

          if (visible.length > 0) {
            setActiveId(visible[0].target.id);
          }
        },
        { rootMargin: "-100px 0px -40% 0px" }
      );

      elements.forEach((el) => observerRef.current!.observe(el));
    }, 200);

    return () => {
      clearTimeout(timer);
      observerRef.current?.disconnect();
    };
  }, []);

  return { headings, activeId };
}
