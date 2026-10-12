"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface DigestTocItem {
  id: string;
  headline: string;
}

/**
 * The briefing's stories as a sticky list beside the text (desktop). The story
 * being read is marked as you scroll, so the list doubles as a progress guide.
 */
export function DigestToc({ items, label }: { items: DigestTocItem[]; label: string }) {
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    const sections = items.map((it) => document.getElementById(it.id)).filter((el): el is HTMLElement => !!el);
    if (sections.length === 0) return;
    // A story counts as "being read" once its top passes the upper third of the screen.
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: "-25% 0px -65% 0px" },
    );
    sections.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items]);

  return (
    <nav aria-label={label}>
      <p className="mb-3 text-sm font-semibold text-white">{label}</p>
      <ol className="space-y-1 border-l border-[var(--line)]">
        {items.map((it, i) => {
          const on = it.id === active;
          return (
            <li key={it.id}>
              <a
                href={`#${it.id}`}
                aria-current={on ? "true" : undefined}
                className={cn(
                  "-ml-px flex gap-3 border-l-2 py-2 pl-4 pr-2 text-sm leading-snug transition-colors duration-200",
                  on ? "border-lfc-red text-white" : "border-transparent text-stadium-muted hover:text-white",
                )}
              >
                <span className={cn("w-4 shrink-0 font-bebas text-lg leading-none tabular-nums", on ? "text-lfc-gold" : "text-white/35")}>
                  {i + 1}
                </span>
                <span className="line-clamp-3">{it.headline}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
