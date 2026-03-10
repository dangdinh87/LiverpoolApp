"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ExternalLink, X } from "lucide-react";
import type { Fixture } from "@/lib/types/football";

const LIVE_STATUSES = new Set(["1H", "HT", "2H", "ET", "P", "BT", "LIVE"]);
const POLL_INTERVAL = 60_000; // 1 minute

/* Override LFC logo with local crest (same as match-card.tsx) */
const LFC_CREST = "/assets/lfc/crest.webp";
const logo = (id: number, src: string) => (id === 40 ? LFC_CREST : src);

/* Find first live Liverpool fixture */
function findLive(fixtures: Fixture[]): Fixture | null {
  return (
    fixtures.find(
      (f) =>
        LIVE_STATUSES.has(f.fixture.status.short) &&
        (f.teams.home.id === 40 || f.teams.away.id === 40)
    ) ?? null
  );
}

interface LiveMatchBannerProps {
  fixtures: Fixture[];
}

export function LiveMatchBanner({ fixtures }: LiveMatchBannerProps) {
  const t = useTranslations("LiveBanner");
  const bannerRef = useRef<HTMLDivElement>(null);
  const [match, setMatch] = useState<Fixture | null>(() => findLive(fixtures));
  const [dismissed, setDismissed] = useState(false);

  /* Poll /api/live-fixture every 60s for updated scores */
  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/live-fixture");
      if (!res.ok) return;
      const { fixture } = await res.json();
      setMatch(fixture);
    } catch {
      /* silently ignore network errors */
    }
  }, []);

  useEffect(() => {
    if (!match) return;
    const id = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [match, poll]);

  /* Sync with SSR data on prop change */
  useEffect(() => {
    setMatch(findLive(fixtures));
  }, [fixtures]);

  /* Push body down by banner height */
  useEffect(() => {
    if (!match || dismissed || !bannerRef.current) {
      document.body.style.removeProperty("padding-top");
      document.documentElement.style.removeProperty("--live-banner-h");
      return;
    }

    const update = () => {
      const h = bannerRef.current?.offsetHeight ?? 0;
      document.body.style.paddingTop = `${h}px`;
      document.documentElement.style.setProperty("--live-banner-h", `${h}px`);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(bannerRef.current);

    return () => {
      ro.disconnect();
      document.body.style.removeProperty("padding-top");
      document.documentElement.style.removeProperty("--live-banner-h");
    };
  }, [match, dismissed]);

  if (!match || dismissed) return null;

  const { teams, goals, fixture: fx, league } = match;
  const elapsed = fx.status.elapsed;
  const isHT = fx.status.short === "HT";
  /* Only show time if we have it — the LIVE badge already signals liveness */
  const statusLabel = isHT ? "HT" : elapsed != null ? `${elapsed}'` : null;

  /* Single link: Google live score */
  const q = encodeURIComponent(`${teams.home.name} vs ${teams.away.name} live score`);
  const liveUrl = `https://www.google.com/search?q=${q}`;

  return (
    <div
      ref={bannerRef}
      className="fixed top-0 left-0 right-0 z-60 overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-lfc-red animate-[livePulse_3s_ease-in-out_infinite]" />

      <div className="relative max-w-5xl mx-auto px-3 pr-10 sm:px-6 sm:pr-12 py-2 flex items-center justify-center gap-2.5 sm:gap-4">
        {/* Live pulse */}
        <span className="flex items-center gap-1.5 shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
          </span>
          <span className="font-barlow text-[10px] sm:text-xs font-bold text-white uppercase tracking-[0.15em]">
            {t("live")}
          </span>
        </span>

        {/* Competition (desktop) */}
        {league?.logo && (
          <div className="hidden sm:block relative w-4 h-4 shrink-0">
            <Image src={league.logo} alt={league.name} fill sizes="16px" className="object-contain" />
          </div>
        )}

        {/* Home */}
        <div className="flex items-center gap-1.5">
          <div className="relative w-5 h-5 sm:w-6 sm:h-6 shrink-0">
            <Image src={logo(teams.home.id, teams.home.logo)} alt={teams.home.name} fill sizes="24px" className="object-contain" />
          </div>
          <span className="font-inter text-xs sm:text-sm text-white font-semibold hidden sm:inline">
            {teams.home.name}
          </span>
        </div>

        {/* Score + time */}
        <div className="flex items-center gap-1.5">
          <span className="font-bebas text-xl sm:text-2xl text-white leading-none">
            {goals.home ?? 0} - {goals.away ?? 0}
          </span>
          {statusLabel && (
            <span className={`font-barlow text-[10px] sm:text-xs font-semibold uppercase ${isHT ? "text-lfc-gold" : "text-white/70"}`}>
              {statusLabel}
            </span>
          )}
        </div>

        {/* Away */}
        <div className="flex items-center gap-1.5">
          <div className="relative w-5 h-5 sm:w-6 sm:h-6 shrink-0">
            <Image src={logo(teams.away.id, teams.away.logo)} alt={teams.away.name} fill sizes="24px" className="object-contain" />
          </div>
          <span className="font-inter text-xs sm:text-sm text-white font-semibold hidden sm:inline">
            {teams.away.name}
          </span>
        </div>

        {/* Link */}
        <a
          href={liveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/15 hover:bg-white/25 transition-colors shrink-0"
        >
          <span className="font-barlow text-[9px] sm:text-[10px] text-white uppercase tracking-wider font-medium">
            {t("watchNow")}
          </span>
          <ExternalLink className="w-2.5 h-2.5 text-white/60" />
        </a>

        {/* Fixtures (desktop) */}
        <Link
          href="/fixtures"
          className="hidden sm:flex items-center px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 transition-colors"
        >
          <span className="font-barlow text-[10px] text-white/80 uppercase tracking-wider font-medium">
            {t("fixtures")}
          </span>
        </Link>

      </div>

      {/* Dismiss — absolute right, outside center flow */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/10 hover:bg-white/25 transition-colors"
        aria-label="Close"
      >
        <X className="w-4 h-4 text-white/80" />
      </button>
    </div>
  );
}
