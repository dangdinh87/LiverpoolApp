"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, ArrowRight, BadgeCheck } from "lucide-react";
import { useTranslations } from "next-intl";

interface DigestProps {
  date: string;
  title: string;
  summary: string;
  articleCount: number;
  generatedAt?: string;
}

const DISMISSED_KEY = "lfc-digest-dismissed";

function formatDigestTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function DigestCard(props: DigestProps) {
  const t = useTranslations("News.digest");
  const [dismissed, setDismissed] = useState(false);

  const displayTitle = props.title;
  const displaySummary = props.summary;
  const displayTime = props.generatedAt;

  useEffect(() => {
    const last = localStorage.getItem(DISMISSED_KEY);
    if (last === props.date) setDismissed(true);
  }, [props.date]);

  if (dismissed) return null;

  return (
    <div className="relative overflow-hidden bg-stadium-surface border border-stadium-border/60">
      {/* Top red accent line */}
      <div className="h-[2px] w-full bg-linear-to-r from-lfc-red via-lfc-red/60 to-transparent" />

      {/* Dismiss button — top right */}
      <button
        onClick={() => { setDismissed(true); localStorage.setItem(DISMISSED_KEY, props.date); }}
        className="absolute top-2.5 right-2.5 text-stadium-muted/40 hover:text-white transition-colors cursor-pointer z-10"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="px-4 py-3 pr-10">
        {/* Title + badge */}
        <div className="flex items-baseline gap-2 flex-wrap mb-1.5">
          <h3 className="font-bebas text-xl sm:text-2xl text-white tracking-wider leading-none">
            {displayTitle}
          </h3>
          <span className="inline-flex items-center gap-1 border border-lfc-gold/40 bg-lfc-gold/10 px-1.5 py-0.5 font-barlow font-bold text-[10px] uppercase tracking-[0.16em] text-lfc-gold shrink-0 translate-y-px">
            <BadgeCheck className="w-3 h-3" />
            {t("proBadge")}
          </span>
        </div>

        {/* Byline */}
        <p className="font-barlow text-[11px] uppercase tracking-[0.14em] text-stadium-muted mb-1.5">
          {t("by", { author: t("author") })}
        </p>

        {/* Summary */}
        <p className="font-inter text-sm text-white/70 leading-relaxed line-clamp-3 sm:line-clamp-none">
          {displaySummary}
        </p>

        {/* Footer: actions row */}
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <Link
            href={`/news/digest/${props.date}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-lfc-red font-barlow font-bold text-[11px] uppercase tracking-wider text-white hover:bg-lfc-red/80 transition-all duration-200 whitespace-nowrap"
          >
            {t("readFull")} <ArrowRight className="w-3 h-3" />
          </Link>
          {displayTime && (
            <span className="font-inter text-[11px] text-stadium-muted">
              {t("generatedAt", { time: formatDigestTime(displayTime) })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
