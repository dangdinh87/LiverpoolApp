"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Fixture } from "@/lib/types/football";
import { formatMatchDayMonth, formatMatchTime } from "@/lib/format-match-date";
import { useNowAfterMount } from "@/hooks/use-now-after-mount";
import { cn } from "@/lib/utils";

const LFC_TEAM_ID = 40;
const LFC_CREST = "/assets/lfc/crest.webp";
const LIVE_STATUSES = new Set(["1H", "HT", "2H", "ET", "P", "BT", "LIVE"]);
const POLL_MS = 60_000;

const crest = (team: { id: number; logo: string }) => (team.id === LFC_TEAM_ID ? LFC_CREST : team.logo);

/** The card chrome shared by the real card and the "no match" card: translucent over the hero photo. */
const CARD = "surface relative w-full bg-black/60 backdrop-blur-md border-[var(--line-strong)]";

/**
 * When no upcoming fixture is known (off-season, or the data source is down)
 * say so. This used to render an invented "Liverpool vs Manchester City" three
 * days out with a live countdown, which read as a real fixture.
 */
export function NextMatchWidget({ fixture }: { fixture: Fixture | null }) {
  if (!fixture) return <NoUpcomingMatch />;
  return <UpcomingMatch initial={fixture} />;
}

function NoUpcomingMatch() {
  const t = useTranslations("NextMatch");
  const h = useTranslations("Home.match");
  return (
    <div className={cn(CARD, "p-5")}>
      <p className="section-label text-brand">{t("title")}</p>
      <p className="mt-3 font-bebas text-3xl leading-none text-white">{t("noMatch")}</p>
      <p className="mt-2 text-sm text-stadium-muted">{h("noMatchHint")}</p>
      <Link
        href="/fixtures"
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 bg-lfc-red px-5 font-barlow text-sm font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-lfc-red-dark sm:w-auto"
      >
        <CalendarDays className="size-4" aria-hidden />
        {t("viewAllFixtures")}
      </Link>
    </div>
  );
}

function CountdownUnit({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex min-w-0 flex-1 items-baseline justify-center gap-1">
      <span className="font-bebas text-3xl leading-none tabular-nums text-white">{value}</span>
      <span className="font-barlow text-xs uppercase tracking-wider text-stadium-muted">{label}</span>
    </div>
  );
}

function Countdown({ target }: { target: number }) {
  const h = useTranslations("Home.match");
  // null until mounted: server and first client render both show dashes.
  const now = useNowAfterMount(1_000);
  const diff = now === null ? null : Math.max(0, target - now);
  const part = (ms: number | null, size: number, mod?: number) => {
    if (ms === null) return "--";
    const n = Math.floor(ms / size);
    return String(mod ? n % mod : n).padStart(2, "0");
  };
  return (
    // Below ~390px the label sits above the digits: label + four units were
    // 350px wide in a 256px card at 320px and pushed the whole page sideways.
    <div className="flex flex-col gap-1 border-t border-[var(--line)] pt-3 min-[390px]:flex-row min-[390px]:items-center min-[390px]:gap-2">
      <span className="shrink-0 font-barlow text-xs font-semibold uppercase tracking-[0.14em] text-stadium-muted">
        {h("kickoffIn")}
      </span>
      <div className="flex min-h-9 w-full min-w-0 items-center min-[390px]:flex-1" role="timer" aria-live="off">
        <CountdownUnit value={part(diff, 86_400_000)} label={h("days")} />
        <CountdownUnit value={part(diff, 3_600_000, 24)} label={h("hours")} />
        <CountdownUnit value={part(diff, 60_000, 60)} label={h("minutes")} />
        <CountdownUnit value={part(diff, 1_000, 60)} label={h("seconds")} />
      </div>
    </div>
  );
}

function TeamBlock({ team }: { team: Fixture["teams"]["home"] }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
      <span className="relative size-14 sm:size-16">
        <Image
          src={crest(team)}
          alt=""
          fill
          sizes="64px"
          className="object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
        />
      </span>
      <span className="text-sm font-semibold leading-tight text-white text-balance line-clamp-2">{team.name}</span>
    </div>
  );
}

function UpcomingMatch({ initial }: { initial: Fixture }) {
  const t = useTranslations("NextMatch");
  const h = useTranslations("Home.match");
  const locale = useLocale();
  // undefined = no poll result yet; null = poll says the match is over.
  const [polled, setPolled] = useState<Fixture | null | undefined>(undefined);
  const fixture = polled === undefined ? initial : (polled ?? initial);
  const isLive = polled !== null && LIVE_STATUSES.has(fixture.fixture.status.short);

  useEffect(() => {
    if (!LIVE_STATUSES.has(initial.fixture.status.short)) return;
    let stopped = false;
    const poll = async () => {
      try {
        const res = await fetch("/api/live-fixture");
        if (!res.ok || stopped) return;
        const { fixture: next } = (await res.json()) as { fixture: Fixture | null };
        if (!stopped) setPolled(next);
      } catch {
        /* keep showing the last known score */
      }
    };
    const id = setInterval(poll, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [initial]);

  const { teams, league, fixture: f, goals } = fixture;
  const date = new Date(f.date);
  const isHT = f.status.short === "HT";
  const roundName = league.round.includes(" - ") ? (league.round.split(" - ").at(-1) ?? league.round) : league.round;
  const hasDetailPage = f.id > 0;
  const detailHref = hasDetailPage ? `/fixtures/${f.id}` : "/fixtures";

  return (
    <div className={cn(CARD, "p-4 sm:p-5", isLive && "border-lfc-gold/60")}>
      <div className="mb-4 flex items-center justify-between gap-3">
        {isLive ? (
          <p className="flex items-center gap-2 font-barlow text-sm font-bold uppercase tracking-[0.14em] text-lfc-gold">
            <span aria-hidden className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-lfc-gold opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-lfc-gold" />
            </span>
            {t("live")}
            {isHT ? " · HT" : f.status.elapsed != null ? ` · ${f.status.elapsed}'` : ""}
          </p>
        ) : (
          <p className="section-label text-brand">{t("title")}</p>
        )}
        <p className="flex min-w-0 items-center gap-2 text-xs text-stadium-muted">
          {league.logo && (
            <span className="relative size-4 shrink-0">
              <Image src={league.logo} alt="" fill sizes="16px" className="object-contain" />
            </span>
          )}
          <span className="truncate">
            {league.name} · {roundName}
          </span>
        </p>
      </div>

      <div className="flex items-center gap-2">
        <TeamBlock team={teams.home} />
        <div className="flex w-28 shrink-0 flex-col items-center gap-1 text-center sm:w-36">
          {isLive ? (
            <span className="font-bebas text-5xl leading-none tabular-nums text-white">
              {goals.home ?? 0}
              <span className="px-1 text-stadium-muted">-</span>
              {goals.away ?? 0}
            </span>
          ) : (
            <span className="font-bebas text-5xl leading-none text-white">{formatMatchTime(date)}</span>
          )}
          <span className="text-xs text-white/80">{formatMatchDayMonth(date, locale)}</span>
          {!isLive && <span className="text-xs text-stadium-muted">{h("vnTime")}</span>}
        </div>
        <TeamBlock team={teams.away} />
      </div>

      {!isLive && (
        <div className="mt-4">
          <Countdown target={date.getTime()} />
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Link
          href={detailHref}
          className="inline-flex min-h-11 flex-1 items-center justify-center bg-lfc-red px-5 font-barlow text-sm font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-lfc-red-dark"
        >
          {t("viewMatch")}
        </Link>
        <Link
          href="/fixtures"
          className="inline-flex min-h-11 items-center justify-center border border-[var(--line-strong)] px-5 font-barlow text-sm font-semibold uppercase tracking-[0.12em] text-stadium-muted transition-colors hover:border-white/40 hover:text-white"
        >
          {t("viewAllFixtures")}
        </Link>
      </div>
    </div>
  );
}
