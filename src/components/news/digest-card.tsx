"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, X, ArrowRight, RefreshCw, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { refreshDigest } from "@/app/news/actions";

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local state so we can update inline without reload
  const [displayTitle, setDisplayTitle] = useState(props.title);
  const [displaySummary, setDisplaySummary] = useState(props.summary);
  const [displayTime, setDisplayTime] = useState(props.generatedAt);

  useEffect(() => {
    const last = localStorage.getItem(DISMISSED_KEY);
    if (last === props.date) setDismissed(true);
  }, [props.date]);

  if (dismissed) return null;

  return (
    <div className="relative overflow-hidden bg-stadium-surface border border-stadium-border/60">
      {/* Top red accent line */}
      <div className="h-[2px] w-full bg-linear-to-r from-lfc-red via-lfc-red/60 to-transparent" />

      <div className="flex">
        {/* Left: title + summary */}
        <div className="flex-1 min-w-0 px-4 py-3">
          <div className="flex items-baseline gap-2 flex-wrap mb-1.5">
            <h3 className="font-bebas text-xl sm:text-2xl text-white tracking-wider leading-none">
              {displayTitle}
            </h3>
            <span className="inline-flex items-center gap-1 font-barlow font-bold text-[11px] uppercase tracking-[0.2em] text-lfc-red shrink-0 translate-y-px">
              <Sparkles className="w-3 h-3" />
              {t("badge")}
            </span>
          </div>
          <p className="font-inter text-sm text-white/70 leading-normal">
            {displaySummary}
          </p>
          {/* Footer: timestamp + sync button */}
          <div className="flex items-center gap-3 mt-2">
            {displayTime && (
              <span className="font-inter text-[11px] text-stadium-muted">
                {t("generatedAt", { time: formatDigestTime(displayTime) })}
              </span>
            )}
            <button
              onClick={async () => {
                setIsRefreshing(true);
                setError(null);
                try {
                  const result = await refreshDigest();
                  if (result.ok) {
                    // Update card inline — no reload needed
                    if (result.title) setDisplayTitle(result.title);
                    if (result.summary) setDisplaySummary(result.summary);
                    if (result.generatedAt) setDisplayTime(result.generatedAt);
                  } else {
                    setError(result.error || "Failed");
                    console.error("[DigestCard] refresh failed:", result.error);
                  }
                } catch (err) {
                  const msg = err instanceof Error ? err.message : "Network error";
                  setError(msg);
                  console.error("[DigestCard] refresh error:", err);
                } finally {
                  setIsRefreshing(false);
                }
              }}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1 font-barlow font-bold text-[11px] uppercase tracking-wider text-stadium-muted hover:text-lfc-red transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? t("syncing") : t("refresh")}
            </button>
            {error && (
              <span className="inline-flex items-center gap-1 font-inter text-[11px] text-red-400">
                <AlertCircle className="w-3 h-3" /> {error}
              </span>
            )}
          </div>
        </div>

        {/* Right: action sidebar */}
        <div className="shrink-0 border-l border-stadium-border/40 flex flex-col items-end justify-between px-3 py-3 gap-3">
          {/* Dismiss */}
          <button
            onClick={() => { setDismissed(true); localStorage.setItem(DISMISSED_KEY, props.date); }}
            className="text-stadium-muted/40 hover:text-white transition-colors cursor-pointer"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Read full */}
          <Link
            href={`/news/digest/${props.date}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-lfc-red font-barlow font-bold text-[11px] uppercase tracking-wider text-white hover:bg-lfc-red/80 transition-all duration-200 whitespace-nowrap"
          >
            {t("readFull")} <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
