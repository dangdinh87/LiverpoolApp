"use client";

import { useMemo, useState } from "react";
import { CalendarX } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { MatchCard } from "./match-card";
import { ChipBar } from "./chip-bar";
import { EmptyState } from "@/components/ui/empty-state";
import type { Fixture } from "@/lib/types/football";
import { cn } from "@/lib/utils";
import { formatMonthYear } from "@/lib/format-match-date";

// Normalize competition names (FDO/ESPN may use different names for the same comp).
const COMP_ALIASES: Record<string, string> = {
  "Premier League": "Premier League",
  "UEFA Champions League": "UEFA Champions League",
  "Champions League": "UEFA Champions League",
  "FA Cup": "FA Cup",
  "EFL Cup": "Carabao Cup",
  "Carabao Cup": "Carabao Cup",
  "League Cup": "Carabao Cup",
  "Community Shield": "Community Shield",
  "FA Community Shield": "Community Shield",
};

const COMP_ORDER = ["Premier League", "UEFA Champions League", "FA Cup", "Carabao Cup", "Community Shield"];

const COMP_SHORT: Record<string, string> = {
  "Premier League": "Premier League",
  "UEFA Champions League": "Champions League",
  "FA Cup": "FA Cup",
  "Carabao Cup": "Carabao Cup",
  "Community Shield": "Community Shield",
};

const FINISHED = new Set(["FT", "AET", "PEN"]);

const normalizeComp = (name: string) => COMP_ALIASES[name] ?? name;
const time = (f: Fixture) => new Date(f.fixture.date).getTime();

type View = "upcoming" | "results";

interface FixtureTimelineProps {
  fixtures: Fixture[];
  /** Stick the filters under the header (turn off when another sticky bar already sits there). */
  sticky?: boolean;
}

export function FixtureTimeline({ fixtures, sticky = true }: FixtureTimelineProps) {
  const t = useTranslations("Fixtures.timeline");
  const locale = useLocale() === "vi" ? "vi" : "en";

  // Status-based (no clock) so server HTML and hydration agree.
  const hasUpcoming = fixtures.some((f) => !FINISHED.has(f.fixture.status.short));
  const [view, setView] = useState<View>(hasUpcoming ? "upcoming" : "results");
  const [comp, setComp] = useState("All");

  const availableComps = useMemo(() => {
    const set = new Set(fixtures.map((f) => normalizeComp(f.league.name)));
    return COMP_ORDER.filter((c) => set.has(c));
  }, [fixtures]);

  // The next unplayed match overall (not just within the filter) gets the countdown.
  const nextId = useMemo(() => {
    const next = fixtures
      .filter((f) => !FINISHED.has(f.fixture.status.short))
      .sort((a, b) => time(a) - time(b))[0];
    return next?.fixture.id;
  }, [fixtures]);

  const { upcoming, results } = useMemo(() => {
    const scoped = comp === "All" ? fixtures : fixtures.filter((f) => normalizeComp(f.league.name) === comp);
    const sorted = [...scoped].sort((a, b) => time(a) - time(b));
    return {
      upcoming: sorted.filter((f) => !FINISHED.has(f.fixture.status.short)),
      results: sorted.filter((f) => FINISHED.has(f.fixture.status.short)).reverse(),
    };
  }, [fixtures, comp]);

  const list = view === "upcoming" ? upcoming : results;

  // Group by calendar month (Vietnam time), keeping list order.
  const groups = useMemo(() => {
    const out: { key: string; label: string; items: Fixture[] }[] = [];
    for (const f of list) {
      const label = formatMonthYear(new Date(f.fixture.date), locale);
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(f);
      else out.push({ key: label, label, items: [f] });
    }
    return out;
  }, [list, locale]);

  const compItems = [
    { key: "All", label: t("filter.all") },
    ...availableComps.map((c) => ({ key: c, label: COMP_SHORT[c] ?? c })),
  ];
  const viewItems = [
    { key: "upcoming", label: t("tabs.upcoming"), count: upcoming.length },
    { key: "results", label: t("tabs.results"), count: results.length },
  ];

  return (
    <div>
      <div
        className={cn(
          "space-y-2 border-b border-[var(--line)] py-2.5",
          sticky && "sticky top-[var(--header-h)] z-30 -mx-4 bg-stadium-bg/90 px-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8",
        )}
      >
        <ChipBar items={viewItems} active={view} onSelect={(k) => setView(k as View)} ariaLabel={t("viewLabel")} />
        {availableComps.length > 1 && (
          <ChipBar items={compItems} active={comp} onSelect={setComp} ariaLabel={t("filterLabel")} />
        )}
      </div>

      <p className="mt-4 text-xs text-stadium-muted">{t("gmtHint")}</p>

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
        </div>
      )}
    </div>
  );
}
