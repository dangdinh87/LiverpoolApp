"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";

interface DigestProps {
  date: string;
  title: string;
  summary: string;
  articleCount: number;
}

const DISMISSED_KEY = "lfc-digest-dismissed";

export function DigestCard({
  date,
  title,
  summary,
  articleCount,
}: DigestProps) {
  const t = useTranslations("News.digest");
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const last = localStorage.getItem(DISMISSED_KEY);
    if (last === date) setDismissed(true);
  }, [date]);

  if (dismissed) return null;

  return (
    <div className="relative bg-gradient-to-r from-lfc-red/10 via-stadium-surface to-stadium-surface border border-lfc-red/30 overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-lfc-gold" />
            <span className="font-barlow text-[10px] uppercase tracking-widest text-lfc-gold font-bold">
              {t("badge")}
            </span>
          </div>
          <button
            onClick={() => {
              setDismissed(true);
              localStorage.setItem(DISMISSED_KEY, date);
            }}
            className="text-stadium-muted hover:text-white text-xs cursor-pointer"
          >
            {t("dismiss")}
          </button>
        </div>

        <h3 className="font-inter text-lg font-bold text-white mb-2">
          {title}
        </h3>

        {expanded && (
          <p className="font-inter text-sm text-white/70 leading-relaxed mb-3">
            {summary}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1 font-barlow text-xs uppercase tracking-wider text-stadium-muted hover:text-white transition-colors cursor-pointer"
          >
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
            {expanded ? t("collapse") : t("expand")}
          </button>

          <Link
            href={`/news/digest/${date}`}
            className="font-barlow text-xs uppercase tracking-wider text-lfc-red hover:text-white transition-colors"
          >
            {t("readFull")} →
          </Link>

          <span className="font-inter text-[11px] text-stadium-muted ml-auto">
            {t("articleCount", { count: articleCount })}
          </span>
        </div>
      </div>
    </div>
  );
}
