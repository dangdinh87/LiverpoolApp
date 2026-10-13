"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { CalendarDays } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Fixture } from "@/lib/types/football";
import { defaultTimeZoneForLocale, formatMatchDayMonth, formatMatchTime, formatZoneOffset } from "@/lib/format-match-date";
import { useViewerTimeZone } from "@/hooks/use-viewer-time-zone";
import { useNowAfterMount } from "@/hooks/use-now-after-mount";
import { roundLabel } from "@/components/fixtures/round-label";
import { displayTeamName } from "@/components/fixtures/team-name";
import { WhereToWatch } from "@/components/fixtures/where-to-watch";
import { useLiveMatch } from "@/components/fixtures/use-live-match";
import { LiveClock, LiveEdgeTrack, LiveEventColumns, LiveScore, LiveStats, LiveStatusBadge, LiveTicker } from "@/components/fixtures/live-match-panel";
import { cn } from "@/lib/utils";

const LFC_TEAM_ID = 40;
const LFC_CREST = "/assets/lfc/crest.webp";
const LIVE_STATUSES = new Set(["1H", "HT", "2H", "ET", "P", "BT", "LIVE"]);

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
      <p className="section-label shrink-0 whitespace-nowrap text-brand">{t("title")}</p>
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
      <span className="font-bebas text-xl leading-none tabular-nums text-white sm:text-3xl">{value}</span>
      <span className="font-barlow text-[11px] uppercase tracking-wider text-stadium-muted sm:text-xs">{label}</span>
    </div>
  );
}

function Countdown({ target }: { target: number }) {
  const h = useTranslations("Home.match");
  // null until mounted: server and first client render both show dashes.
  const now = useNowAfterMount(1_000);
  const diff = now === null ? null : Math.max(0, target - now);
  if (diff === 0) {
    return (
      <p className="flex min-h-9 items-center justify-center border-t border-[var(--line)] pt-3 font-barlow text-sm font-semibold uppercase tracking-[0.12em] text-lfc-gold">
        {h("started")}
      </p>
    );
  }
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
      <div className="flex min-h-7 w-full min-w-0 items-center sm:min-h-9 min-[390px]:flex-1" role="timer" aria-live="off">
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
      <span className="relative size-10 sm:size-12">
        <Image
          src={crest(team)}
          alt=""
          fill
          sizes="48px"
          className="object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
        />
      </span>
      <span className="text-sm font-semibold leading-tight text-white text-balance line-clamp-2">{displayTeamName(team.name)}</span>
    </div>
  );
}

function UpcomingMatch({ initial }: { initial: Fixture }) {
  const t = useTranslations("NextMatch");
  const h = useTranslations("Home.match");
  const tRound = useTranslations("Match.round");
  const locale = useLocale();
  // Also listens around kick-off, in case the cached homepage still says "not started".
  const { fixture, live, ended, updatedAt, ref } = useLiveMatch(initial, true);
  // A match that ended while the page was open keeps the live layout with an "FT" chip.
  const isLive = LIVE_STATUSES.has(fixture.fixture.status.short) || ended;

  const { teams, league, fixture: f, goals } = fixture;
  const date = new Date(f.date);
  const lfcSide = teams.home.id === LFC_TEAM_ID ? "home" : teams.away.id === LFC_TEAM_ID ? "away" : null;
  const round = roundLabel(tRound, league.round);
  const zone = useViewerTimeZone(defaultTimeZoneForLocale(locale));
  const hasDetailPage = f.id > 0;
  const detailHref = hasDetailPage ? `/fixtures/${f.id}` : "/fixtures";

  return (
    <div ref={ref} className={cn(CARD, "p-4 sm:p-5", isLive && !ended && "border-lfc-red/60")}>
      <div className="mb-3 flex flex-col items-start gap-1 min-[390px]:flex-row min-[390px]:items-center min-[390px]:justify-between min-[390px]:gap-3">
        {isLive ? (
          <LiveStatusBadge status={f.status.short} ended={ended} />
        ) : (
          <p className="section-label shrink-0 whitespace-nowrap text-brand">{t("title")}</p>
        )}
        <p className="flex min-w-0 items-center gap-2 text-xs text-stadium-muted">
          {league.logo && (
            <span className="relative size-4 shrink-0">
              <Image src={league.logo} alt="" fill sizes="16px" className="object-contain" />
            </span>
          )}
          <span className="truncate">
            {league.name}
            {round && ` · ${round}`}
          </span>
        </p>
      </div>

      <div className="flex items-center gap-2">
        <TeamBlock team={teams.home} />
        <div className="flex w-28 shrink-0 flex-col items-center gap-1 text-center sm:w-36">
          {isLive ? (
            <>
              <LiveScore home={goals.home ?? 0} away={goals.away ?? 0} className="text-5xl text-white" />
              <LiveClock
                live={live}
                updatedAt={updatedAt}
                fallback={f.status.elapsed != null ? `${f.status.elapsed}'` : null}
                status={f.status.short}
                ended={ended}
              />
            </>
          ) : (
            <span className="font-bebas text-3xl leading-none text-white sm:text-4xl">{formatMatchTime(date, zone)}</span>
          )}
          {!isLive && <span className="text-xs text-white/80">{formatMatchDayMonth(date, locale, false, zone)}</span>}
          {!isLive && <span className="text-xs text-stadium-muted">{h("viewerTime")} · {formatZoneOffset(date, zone)}</span>}
        </div>
        <TeamBlock team={teams.away} />
      </div>

      {!isLive && (
        <div className="mt-3 sm:mt-4">
          <Countdown target={date.getTime()} />
        </div>
      )}

      {isLive && live && (
        <div className="mt-3 space-y-4">
          <LiveEventColumns events={live.events} centered />
          {live.stats && <LiveStats stats={live.stats} lfcSide={lfcSide} rows />}
          <LiveTicker live={live} updatedAt={updatedAt} ended={ended} className="border-t border-[var(--line)] pt-3" />
        </div>
      )}

      <WhereToWatch competition={league.name} className="mt-3 justify-center" />

      {/* One action: the full fixture list is a nav item away, so the hero card stays short. */}
      <Link
        href={detailHref}
        className="mt-3 flex min-h-10 items-center justify-center bg-lfc-red px-4 text-center font-barlow text-sm font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-lfc-red-dark"
      >
        {t("viewMatch")}
      </Link>

      {isLive && live && <LiveEdgeTrack live={live} ended={ended} />}
    </div>
  );
}
