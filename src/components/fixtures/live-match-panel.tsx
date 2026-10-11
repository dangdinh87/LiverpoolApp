"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Goal } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { LiveMatchEvent, LiveMatchSnapshot, LiveSide } from "@/lib/types/football";
import { useNowAfterMount } from "@/hooks/use-now-after-mount";
import { cn } from "@/lib/utils";

type Stats = NonNullable<LiveMatchSnapshot["stats"]>;

/** "1st half", "Half-time", … for a Fixture status code; null when there is nothing to add. */
function usePeriodLabel() {
  const t = useTranslations("Match.liveCard");
  return (status: string, ended: boolean): string | null => {
    if (ended || status === "FT" || status === "AET" || status === "PEN") return t("fullTime");
    if (status === "1H") return t("firstHalf");
    if (status === "2H") return t("secondHalf");
    if (status === "HT") return t("halfTime");
    if (status === "ET") return t("extraTime");
    if (status === "P") return t("penalties");
    return null;
  };
}

/** Pulsing "Live  1st half"; a quiet "Full time" once the match is over. */
export function LiveStatusBadge({ status, ended }: { status: string; ended: boolean }) {
  const t = useTranslations("Match.liveCard");
  const period = usePeriodLabel()(status, ended);
  if (ended) return <span className="text-sm font-semibold text-white/70">{period}</span>;
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span aria-hidden className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-lfc-red opacity-75 motion-reduce:hidden" />
        <span className="relative inline-flex size-2 rounded-full bg-lfc-red" />
      </span>
      <span className="font-semibold text-lfc-red-text">{t("live")}</span>
      {period && <span className="text-stadium-muted">{period}</span>}
    </span>
  );
}

/** Score that pops gold for a moment when it changes (not on first paint). */
export function LiveScore({ home, away, className }: { home: number; away: number; className?: string }) {
  const key = `${home}-${away}`;
  const [firstKey] = useState(key);
  const reduce = useReducedMotion();
  return (
    <motion.p
      key={key}
      initial={key === firstKey || reduce ? false : { scale: 1.35, color: "#f6eb61" }}
      animate={{ scale: 1, color: "#ffffff" }}
      transition={{ duration: 0.9, ease: "easeOut" }}
      className={cn("font-bebas leading-none tracking-wide tabular-nums", className)}
      aria-live="polite"
    >
      {home}
      <span className="px-1 text-stadium-muted">-</span>
      {away}
    </motion.p>
  );
}

/** Minute shown between polls: ESPN's minute plus the time since that answer, stoppage time as "45'+2'". */
function runningClock(live: LiveMatchSnapshot, updatedAt: number | null, now: number | null): string {
  const cap = live.statusShort === "1H" ? 45 : live.statusShort === "2H" ? 90 : live.statusShort === "ET" ? 120 : null;
  if (cap === null || live.minute === null || updatedAt === null || now === null) return live.clock;
  const minute = live.minute + Math.max(0, Math.floor((now - updatedAt) / 60_000));
  return minute > cap ? `${cap}'+${minute - cap}'` : `${minute}'`;
}

/**
 * The scorebug tab under the score: red while the clock runs, gold at half-time,
 * grey at full time. The minute ticks on the client, so polls can be a minute apart.
 */
export function LiveClock({
  live,
  updatedAt,
  fallback,
  status,
  ended,
}: {
  live: LiveMatchSnapshot | null;
  updatedAt: number | null;
  /** Shown before the first poll answers. */
  fallback: string | null;
  status: string;
  ended: boolean;
}) {
  const t = useTranslations("Match.liveCard");
  const now = useNowAfterMount(15_000);
  const isHT = !ended && status === "HT";
  const text = ended ? t("ftShort") : isHT ? t("htShort") : live ? runningClock(live, updatedAt, now) : fallback;
  if (!text) return null;
  return (
    <p
      className={cn(
        "mx-auto mt-2 w-fit min-w-12 px-2 py-0.5 text-center font-barlow text-sm font-bold leading-tight tabular-nums",
        ended ? "bg-white/10 text-white/70" : isHT ? "bg-lfc-gold text-black" : "bg-lfc-red text-white",
      )}
    >
      {text}
    </p>
  );
}

function EventIcon({ kind }: { kind: LiveMatchEvent["kind"] }) {
  if (kind === "yellow") return <span aria-hidden className="inline-block h-3 w-2 shrink-0 rounded-[1px] bg-lfc-gold" />;
  if (kind === "red") return <span aria-hidden className="inline-block h-3 w-2 shrink-0 rounded-[1px] bg-red-500" />;
  return <Goal aria-hidden className={cn("size-3.5 shrink-0", kind === "own-goal" ? "text-red-400" : "text-white")} />;
}

function EventList({ events, side, centered }: { events: LiveMatchEvent[]; side: LiveSide; centered: boolean }) {
  const t = useTranslations("Match.liveCard");
  const mine = events.filter((e) => e.side === side);
  if (mine.length === 0) return <div />;
  return (
    <ul className="min-w-0 space-y-1 text-xs text-stadium-muted">
      {mine.map((e, i) => (
        <li
          key={`${e.minute}-${e.player}-${i}`}
          className={cn(
            "flex items-center justify-center gap-1.5",
            !centered && (side === "home" ? "sm:flex-row-reverse sm:justify-start" : "sm:justify-start"),
          )}
        >
          <EventIcon kind={e.kind} />
          <span className="sr-only">{t(`event.${e.kind}`)}</span>
          <span className="min-w-0 truncate text-white/90">{e.player ?? "—"}</span>
          <span className="shrink-0 tabular-nums text-lfc-gold">{e.minute}</span>
          {e.kind === "penalty" && <span className="shrink-0">({t("penShort")})</span>}
          {e.kind === "own-goal" && <span className="shrink-0 text-red-400">({t("ogShort")})</span>}
        </li>
      ))}
    </ul>
  );
}

/**
 * Goals and cards under each team. The default grid matches the match card's team
 * row; `centered` lists them under centred crests (the homepage widget).
 */
export function LiveEventColumns({ events, centered = false, className }: { events: LiveMatchEvent[]; centered?: boolean; className?: string }) {
  if (events.length === 0) return null;
  return (
    <div
      className={cn(
        "grid gap-2",
        centered
          ? "grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)] sm:grid-cols-[minmax(0,1fr)_9rem_minmax(0,1fr)]"
          : "grid-cols-[minmax(0,1fr)_5.25rem_minmax(0,1fr)] sm:grid-cols-[minmax(0,1fr)_8rem_minmax(0,1fr)] sm:gap-4",
        className,
      )}
    >
      <EventList events={events} side="home" centered={centered} />
      <div />
      <EventList events={events} side="away" centered={centered} />
    </div>
  );
}

/**
 * The card's bottom edge doubles as the match clock: it fills red up to the
 * current minute, with goals and cards ticked where they happened. Place it in
 * a `relative` container; it pins itself to the bottom.
 */
export function LiveEdgeTrack({ live, ended }: { live: LiveMatchSnapshot; ended: boolean }) {
  const t = useTranslations("Match.liveCard");
  const extraTime = live.statusShort === "ET" || live.statusShort === "P" || (live.minute ?? 0) > 100;
  const total = extraTime ? 120 : 90;
  const minute = live.statusShort === "HT" ? 45 : (live.minute ?? 0);
  const pct = ended ? 100 : Math.min(100, (minute / total) * 100);
  const at = (m: number) => `${Math.min(99.5, (m / total) * 100)}%`;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 h-3"
      role="meter"
      aria-label={t("progress")}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={Math.min(minute, total)}
    >
      <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/[0.07]">
        <div
          className={cn(
            "h-full transition-[width] duration-700",
            ended ? "bg-white/30" : "bg-lfc-red shadow-[0_0_12px_rgba(200,16,46,0.9)]",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {/* Half-time (and, in extra time, full-time) notch */}
      <span aria-hidden className="absolute bottom-0 h-2 w-px bg-white/25" style={{ left: at(45) }} />
      {extraTime && <span aria-hidden className="absolute bottom-0 h-2 w-px bg-white/25" style={{ left: at(90) }} />}
      {live.events.map((e, i) => (
        <span
          key={`${e.minute}-${i}`}
          aria-hidden
          className={cn(
            "absolute bottom-0 w-1 -translate-x-1/2",
            e.kind === "yellow" ? "h-2.5 bg-lfc-gold" : e.kind === "red" ? "h-2.5 bg-red-500" : "h-3 bg-white",
          )}
          style={{ left: at(e.at) }}
        />
      ))}
    </div>
  );
}

const lead = (mine: number, theirs: number) => (mine >= theirs ? "text-white" : "text-white/45");

/**
 * Possession split plus shots / on target / corners. Liverpool's share is red.
 * Three columns on small screens, head-to-head rows from `lg` (the card's side
 * column); `rows` uses the head-to-head rows at every width.
 */
export function LiveStats({ stats, lfcSide, rows = false }: { stats: Stats; lfcSide: LiveSide | null; rows?: boolean }) {
  const t = useTranslations("Match.liveCard");
  const [ph, pa] = stats.possession;
  const red = lfcSide ?? "home";
  const items: [string, [number, number]][] = [
    [t("shots"), stats.shots],
    [t("onTarget"), stats.onTarget],
    [t("corners"), stats.corners],
  ];
  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
          <span className="font-bebas text-lg leading-none text-white tabular-nums">{ph}%</span>
          <span className="text-stadium-muted">{t("possession")}</span>
          <span className="font-bebas text-lg leading-none text-white tabular-nums">{pa}%</span>
        </div>
        <div className="flex h-1 gap-0.5" aria-hidden>
          <div className={cn("h-full transition-[width] duration-700", red === "home" ? "bg-lfc-red" : "bg-white/40")} style={{ width: `${ph}%` }} />
          <div className={cn("h-full flex-1", red === "away" ? "bg-lfc-red" : "bg-white/40")} />
        </div>
      </div>

      {/* Head-to-head rows */}
      <dl className={cn("grid-cols-[2rem_minmax(0,1fr)_2rem] items-baseline gap-y-1", rows ? "grid" : "hidden lg:grid")}>
        {items.map(([label, [h, a]]) => (
          <div key={label} className="contents">
            <dd className={cn("font-bebas text-lg leading-none tabular-nums", lead(h, a))}>{h}</dd>
            <dt className="text-center text-xs text-stadium-muted">{label}</dt>
            <dd className={cn("text-right font-bebas text-lg leading-none tabular-nums", lead(a, h))}>{a}</dd>
          </div>
        ))}
      </dl>

      {/* Three columns */}
      {!rows && (
        <dl className="grid grid-cols-3 gap-2 lg:hidden">
          {items.map(([label, [h, a]]) => (
            <div key={label} className="flex flex-col-reverse items-center gap-0.5">
              <dt className="text-xs text-stadium-muted">{label}</dt>
              <dd className="font-bebas text-xl leading-none tabular-nums">
                <span className={lead(h, a)}>{h}</span>
                <span className="px-1 text-stadium-muted">–</span>
                <span className={lead(a, h)}>{a}</span>
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/** Newest commentary line (ESPN writes it in English, so only English pages show it) and the freshness stamp. */
export function LiveTicker({ live, updatedAt, ended, className }: { live: LiveMatchSnapshot; updatedAt: number | null; ended: boolean; className?: string }) {
  const t = useTranslations("Match.liveCard");
  const locale = useLocale();
  const now = useNowAfterMount(15_000);
  const latest = locale === "en" ? live.latest : null;
  const ago = now !== null && updatedAt !== null ? Math.max(0, Math.round((now - updatedAt) / 1000)) : null;
  if (!latest && (ago === null || ended)) return null;
  return (
    <div className={cn("flex items-baseline justify-between gap-4 text-[13px] leading-snug", className)}>
      {latest ? (
        <p className="flex min-w-0 items-baseline gap-2">
          <span className="shrink-0 font-semibold tabular-nums text-lfc-gold">{latest.minute}</span>
          <span className="min-w-0 truncate text-white/75">{latest.text}</span>
        </p>
      ) : (
        <span />
      )}
      {ago !== null && !ended && (
        <p className="shrink-0 text-xs text-stadium-muted">{ago < 5 ? t("updatedNow") : t("updatedAgo", { s: ago })}</p>
      )}
    </div>
  );
}
