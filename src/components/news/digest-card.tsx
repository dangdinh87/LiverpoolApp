"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { SiteArticleBadge } from "@/components/news/site-article-badge";
import { formatMatchTime } from "@/lib/format-match-date";

interface DigestProps {
  date: string;
  title: string;
  summary: string;
  articleCount: number;
  generatedAt?: string;
}

const DISMISSED_KEY = "lfc-digest-dismissed";

function formatDigestTime(iso: string): string {
  // `toLocaleTimeString(undefined, …)` reads the runtime's locale and timezone.
  // Vercel renders in UTC while the visitor's browser does not, so the server
  // HTML and the hydrated markup disagreed — React #418 on the live homepage,
  // invisible locally because both sides sat in Asia/Saigon. Vietnam time is
  // what this audience wants anyway, and it is the same on both sides.
  return formatMatchTime(new Date(iso));
}

export function DigestCard(props: DigestProps) {
  const t = useTranslations("News.digest");
  // Branching on `typeof window` in the initial state is the other mismatch
  // React names: the server renders "not dismissed" while the browser may read
  // a stored dismissal and render nothing. Start the same on both sides and
  // apply the stored value after mount.
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY) === props.date) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDismissed(true);
    }
  }, [props.date]);

  const displayTitle = props.title;
  const displaySummary = props.summary;
  const displayTime = props.generatedAt;

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
        {/* Title + site-owned article marker */}
        <div className="flex items-baseline gap-2 flex-wrap mb-1.5">
          <h3 className="font-bebas text-xl sm:text-2xl text-white tracking-wider leading-none">
            {displayTitle}
          </h3>
          <SiteArticleBadge label={t("proBadge")} compact />
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
