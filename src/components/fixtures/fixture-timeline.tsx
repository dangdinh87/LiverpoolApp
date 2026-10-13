"use client";

import { useMemo, useState } from "react";
import { useUrlSearchParam } from "@/hooks/use-url-search-param";
import { Link } from "@/i18n/navigation";
import { CalendarX, Clock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { MatchCard } from "./match-card";
import { CompactMatchRow } from "./compact-match-row";
import { ChipBar } from "./chip-bar";
import { MatchCentreNav } from "./match-centre-nav";
import { AddToCalendar } from "./add-to-calendar";
import { SpoilerToggle } from "./spoiler-controls";
import { EmptyState } from "@/components/ui/empty-state";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Fixture } from "@/lib/types/football";
import { defaultTimeZoneForLocale, formatMonthYear, formatZoneOffset } from "@/lib/format-match-date";
import { useViewerTimeZone } from "@/hooks/use-viewer-time-zone";
import { COMPETITION_ORDER, competitionKey, competitionName } from "@/lib/competition-labels";

const FINISHED = new Set(["FT", "AET", "PEN"]);

const time = (f: Fixture) => new Date(f.fixture.date).getTime();

/** Next match + the following four stay full cards; later ones fold into months as compact rows. */
const FULL_CARDS = 5;

type View = "upcoming" | "results";

/** Group a list by calendar month in the viewer's zone, keeping list order. */
function groupByMonth(items: Fixture[], locale: string, timeZone: string) {
  const out: { key: string; label: string; items: Fixture[] }[] = [];
  for (const f of items) {
    const label = formatMonthYear(new Date(f.fixture.date), locale, timeZone);
    const last = out[out.length - 1];
    if (last && last.label === label) last.items.push(f);
    else out.push({ key: label, label, items: [f] });
  }
  return out;
}

interface FixtureTimelineProps {
  fixtures: Fixture[];
  /** Which list opens first (from ?view=); defaults to upcoming, or results when nothing is left to play. */
  initialView?: View;
  /** Archive season year; omit for the current season. */
  season?: number;
  /** Footer link to the season archive (only the /fixtures page needs it). */
  showArchiveLink?: boolean;
}

export function FixtureTimeline({ fixtures, initialView, season, showArchiveLink = false }: FixtureTimelineProps) {
  const t = useTranslations("Fixtures.timeline");
  const locale = useLocale() === "vi" ? "vi" : "en";

  // Status-based (no clock) so server HTML and hydration agree.
  const hasUpcoming = fixtures.some((f) => !FINISHED.has(f.fixture.status.short));
  const defaultView: View = initialView ?? (hasUpcoming ? "upcoming" : "results");
  // Read on the client so the page itself stays static — see useUrlSearchParam.
  const urlView = useUrlSearchParam("view");
  const [picked, setPicked] = useState<View | null>(null);
  const view: View = picked ?? (urlView === "results" && !initialView ? "results" : defaultView);
  const [comp, setComp] = useState("All");

  // Keep ?view= in the URL (shallow) so a refresh or shared link lands on the same list.
  const selectView = (next: "fixtures" | "results") => {
    const nextView: View = next === "fixtures" ? "upcoming" : "results";
    setPicked(nextView);
    const url = new URL(window.location.href);
    if (nextView === "results") url.searchParams.set("view", "results");
    else url.searchParams.delete("view");
    window.history.replaceState(window.history.state, "", url.toString());
  };

  const availableComps = useMemo(() => {
    const set = new Set(fixtures.map((f) => competitionKey(f.league.name)));
    return COMPETITION_ORDER.filter((c) => set.has(c));
  }, [fixtures]);

  // The next unplayed match overall (not just within the filter) gets the countdown.
  const nextId = useMemo(() => {
    const next = fixtures
      .filter((f) => !FINISHED.has(f.fixture.status.short))
      .sort((a, b) => time(a) - time(b))[0];
    return next?.fixture.id;
  }, [fixtures]);

  const { upcoming, results } = useMemo(() => {
    const scoped = comp === "All" ? fixtures : fixtures.filter((f) => competitionKey(f.league.name) === comp);
    const sorted = [...scoped].sort((a, b) => time(a) - time(b));
    return {
      upcoming: sorted.filter((f) => !FINISHED.has(f.fixture.status.short)),
      results: sorted.filter((f) => FINISHED.has(f.fixture.status.short)).reverse(),
    };
  }, [fixtures, comp]);

  const viewerZone = useViewerTimeZone(defaultTimeZoneForLocale(locale));
  const zoneOffset = formatZoneOffset(new Date(fixtures[0]?.fixture.date ?? 0), viewerZone);

  // Upcoming is ~40 matches: a few full cards, the rest as compact rows folded by month.
  const { groups, laterGroups, laterCount } = useMemo(() => {
    const list = view === "upcoming" ? upcoming : results;
    const featured = view === "upcoming" ? list.slice(0, FULL_CARDS) : list;
    const later = view === "upcoming" ? list.slice(FULL_CARDS) : [];
    return {
      groups: groupByMonth(featured, locale, viewerZone),
      laterGroups: groupByMonth(later, locale, viewerZone),
      laterCount: later.length,
    };
  }, [view, upcoming, results, locale, viewerZone]);

  const compItems = [
    { key: "All", label: t("filter.all") },
    ...availableComps.map((c) => ({ key: c, label: competitionName(c, locale) })),
  ];
  // The watch hint is country-independent: it points at the match pages, which
  // resolve the broadcaster for wherever the reader is.
  const showWatchHint = view === "upcoming" && upcoming.some((f) => competitionKey(f.league.name) === "pl");

  return (
    <div>
      <MatchCentreNav
        active={view === "upcoming" ? "fixtures" : "results"}
        season={season}
        counts={{ fixtures: upcoming.length, results: results.length }}
        onSelectView={selectView}
      />

      {availableComps.length > 1 && (
        <div className="pt-3">
          <ChipBar items={compItems} active={comp} onSelect={setComp} ariaLabel={t("filterLabel")} />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        {/* The zone is said once here, not under every kick-off. */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex min-h-11 items-center gap-2 border border-[var(--line-strong)] bg-[var(--surface-1)] px-3 font-barlow text-xs font-semibold uppercase tracking-[0.1em] text-stadium-muted transition-colors hover:border-white/40 hover:text-white"
            >
              <Clock size={14} aria-hidden />
              {t("zoneChip", { zone: zoneOffset })}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 text-[13px] leading-snug text-stadium-muted">
            <p>{t("gmtHint", { zone: zoneOffset })}</p>
            {showWatchHint && <p className="mt-2">{t("plWatch")}</p>}
          </PopoverContent>
        </Popover>
        {/* `shrink-0` only once there is room beside the hint. On a 320px phone
            it kept this row at its max-content width — both buttons plus the gap
            — so `flex-wrap` never got the chance to wrap and the page scrolled
            sideways by 44px. */}
        <div className="flex flex-wrap gap-2 sm:shrink-0">
          <SpoilerToggle />
          {!season && <AddToCalendar />}
        </div>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={<CalendarX className="size-9" aria-hidden />}
          title={t("emptyTitle")}
          description={view === "upcoming" ? t("noFixtures") : t("noResults")}
        />
      ) : (
        <div className="mt-4 space-y-8">
          {groups.map((group) => (
            <section key={group.key} aria-label={group.label}>
              <h2 className="mb-3 font-barlow text-sm font-semibold uppercase tracking-[0.14em] text-brand">
                {group.label}
              </h2>
              <ul className="space-y-3">
                {group.items.map((fixture) => (
                  <li key={fixture.fixture.id}>
                    <MatchCard fixture={fixture} isNext={fixture.fixture.id === nextId} />
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {laterGroups.length > 0 && (
            <section aria-label={t("later")}>
              <h2 className="mb-1 font-barlow text-sm font-semibold uppercase tracking-[0.14em] text-white">
                {t("later")}
                <span className="ml-2 text-stadium-muted">{laterCount}</span>
              </h2>
              <Accordion type="multiple" className="border-t border-[var(--line)]">
                {laterGroups.map((group) => (
                  <AccordionItem key={group.key} value={group.key} className="border-[var(--line)]">
                    <AccordionTrigger className="min-h-12 items-center rounded-none py-3 font-barlow text-sm font-semibold uppercase tracking-[0.14em] text-white hover:no-underline [&>svg]:translate-y-0">
                      <span className="flex flex-1 items-baseline justify-between gap-3">
                        {group.label}
                        <span className="text-xs font-medium tracking-[0.1em] text-stadium-muted">{t("matchCount", { count: group.items.length })}</span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-3">
                      <ul className="space-y-2">
                        {group.items.map((fixture) => (
                          <li key={fixture.fixture.id}>
                            <CompactMatchRow fixture={fixture} />
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          )}
        </div>
      )}

      {showArchiveLink && (
        <p className="mt-8 text-center text-sm">
          <Link href="/season" className="inline-flex min-h-11 items-center text-stadium-muted underline-offset-4 transition-colors hover:text-white hover:underline">
            {t("archive")}
          </Link>
        </p>
      )}
    </div>
  );
}
