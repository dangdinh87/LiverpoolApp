"use client";

import { useToc } from "@/hooks/use-toc";
import { useTranslations } from "next-intl";

/**
 * Auto-generated table of contents for htmlContent articles.
 * Renders nothing if <3 headings found in #article-body.
 */
export function ArticleTOC() {
  const { headings, activeId } = useToc();
  const t = useTranslations("News.sidebar");

  if (headings.length === 0) return null;

  return (
    <nav aria-label="Table of contents" className="bg-stadium-surface border border-stadium-border p-5">
      <p className="font-barlow text-[10px] text-stadium-muted uppercase tracking-widest mb-3">
        {t("toc")}
      </p>
      <ul className="space-y-1.5">
        {headings.map((h) => (
          <li key={h.id}>
            <button
              onClick={() => {
                const el = document.getElementById(h.id);
                el?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={`w-full text-left font-inter text-sm leading-snug transition-colors line-clamp-2 cursor-pointer ${
                h.level === 3 ? "pl-3" : ""
              } ${
                activeId === h.id
                  ? "text-lfc-red border-l-2 border-lfc-red pl-2"
                  : "text-white/60 hover:text-white/80"
              }`}
            >
              {h.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
