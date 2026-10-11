"use client";

/**
 * Live pieces of the match page (/fixtures/[id]). The page itself is cached
 * for five minutes, so while a match is in play these islands take over the
 * score, the timeline and the statistics. They all share the one live query
 * (see useLiveMatch), so the page still asks once a minute in total.
 */

import { BarChart3, ListOrdered } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Fixture, FixtureEvent, LiveMatchEvent } from "@/lib/types/football";
import { EmptyState } from "@/components/ui/empty-state";
import { TimelineRow } from "./match-detail-parts";
import { LiveClock, LiveEdgeTrack, LiveScore, LiveStats, LiveStatusBadge } from "./live-match-panel";
import { useLiveMatch } from "./use-live-match";

const LFC_ID = 40;

const EVENT_DETAIL: Record<LiveMatchEvent["kind"], { type: string; detail: string }> = {
  goal: { type: "Goal", detail: "Normal Goal" },
  penalty: { type: "Goal", detail: "Penalty" },
  "own-goal": { type: "Goal", detail: "Own Goal" },
  yellow: { type: "Card", detail: "Yellow Card" },
  red: { type: "Card", detail: "Red Card" },
};

/** A live goal/card in the shape the finished-match timeline already renders. */
function toFixtureEvent(e: LiveMatchEvent, fixture: Fixture): FixtureEvent {
  const team = e.side === "home" ? fixture.teams.home : fixture.teams.away;
  const [, base, extra] = e.minute.match(/^(\d+)'(?:\+(\d+)')?$/) ?? [];
  return {
    time: { elapsed: base ? Number(base) : null, extra: extra ? Number(extra) : null },
    team: { id: team.id, name: team.name, logo: team.logo },
    player: { id: null, name: e.player },
    assist: { id: null, name: null },
    ...EVENT_DETAIL[e.kind],
    comments: null,
  };
}

/** "Live  2nd half" chip in the score header. */
export function LiveDetailBadge({ initial }: { initial: Fixture }) {
  const { fixture, ended, ref } = useLiveMatch(initial);
  return (
    <span ref={ref} className="shrink-0">
      <LiveStatusBadge status={fixture.fixture.status.short} ended={ended} />
    </span>
  );
}

/** Score plus the running clock tab; the header's bottom edge fills with the match minute. */
export function LiveDetailScore({ initial }: { initial: Fixture }) {
  const { fixture, live, ended, updatedAt, ref } = useLiveMatch(initial);
  const { goals, fixture: f } = fixture;
  return (
    <div ref={ref}>
      <LiveScore home={goals.home ?? 0} away={goals.away ?? 0} className="text-5xl text-white sm:text-6xl" />
      <LiveClock
        live={live}
        updatedAt={updatedAt}
        fallback={f.status.elapsed ? `${f.status.elapsed}'` : null}
        status={f.status.short}
        ended={ended}
      />
      {live && <LiveEdgeTrack live={live} ended={ended} />}
    </div>
  );
}

/** Goals and cards so far, newest last, in the same rows as a finished match. */
export function LiveDetailTimeline({ initial }: { initial: Fixture }) {
  const t = useTranslations("Fixtures.detail.empty");
  const { fixture, live, ref } = useLiveMatch(initial);
  const events = live?.events ?? [];
  return (
    <div ref={ref}>
      {events.length > 0 ? (
        <ul className="surface px-4 sm:px-5">
          {events.map((e, i) => (
            <TimelineRow key={`${e.minute}-${i}`} event={toFixtureEvent(e, fixture)} homeTeamId={fixture.teams.home.id} />
          ))}
        </ul>
      ) : (
        <EmptyState
          className="py-8 sm:py-10"
          icon={<ListOrdered className="size-7" aria-hidden />}
          title={t("events.title")}
          description={t("events.description")}
        />
      )}
    </div>
  );
}

/** Possession, shots, on target and corners as the match goes. */
export function LiveDetailStats({ initial, homeName, awayName }: { initial: Fixture; homeName: string; awayName: string }) {
  const t = useTranslations("Fixtures.detail.empty");
  const { fixture, live, ref } = useLiveMatch(initial);
  const lfcSide = fixture.teams.home.id === LFC_ID ? "home" : fixture.teams.away.id === LFC_ID ? "away" : null;
  return (
    <div ref={ref}>
      {live?.stats ? (
        <div className="surface p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3 text-sm font-semibold text-white">
            <span className="min-w-0 truncate">{homeName}</span>
            <span className="min-w-0 truncate text-right">{awayName}</span>
          </div>
          <LiveStats stats={live.stats} lfcSide={lfcSide} rows />
        </div>
      ) : (
        <EmptyState
          className="py-8 sm:py-10"
          icon={<BarChart3 className="size-7" aria-hidden />}
          title={t("stats.title")}
          description={t("stats.description")}
        />
      )}
    </div>
  );
}
