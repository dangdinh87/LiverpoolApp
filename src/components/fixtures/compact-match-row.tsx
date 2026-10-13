"use client";

import { TeamCrest } from "@/components/ui/team-crest";
import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import type { Fixture } from "@/lib/types/football";
import { cn } from "@/lib/utils";
import { defaultTimeZoneForLocale, formatMatchDayMonth, formatMatchTime } from "@/lib/format-match-date";
import { useViewerTimeZone } from "@/hooks/use-viewer-time-zone";
import { CompetitionTag } from "./competition-tag";
import { compactTeamName, displayTeamName } from "./team-name";

const LFC_TEAM_ID = 40;

function Side({ team, align }: { team: Fixture["teams"]["home"]; align: "home" | "away" }) {
  const isLfc = team.id === LFC_TEAM_ID;
  return (
    <span className={cn("flex min-w-0 items-center gap-2", align === "home" ? "flex-row-reverse text-right" : "text-left")}>
      <span className="relative size-5 shrink-0 sm:size-6">
        <TeamCrest src={isLfc ? "/assets/lfc/crest.webp" : team.logo} name={team.name} sizes="24px" />
      </span>
      <span className={cn("min-w-0 truncate text-[13px] font-semibold sm:text-sm", isLfc ? "text-white" : "text-white/80")} title={displayTeamName(team.name)}>
        {compactTeamName(team)}
      </span>
    </span>
  );
}

/**
 * A fixture further down the list, in one ~56px row: date · competition on the
 * left (on top on a phone), then home – kick-off – away, centred like the full cards. The full card keeps
 * for the next few matches, where the countdown and venue earn the space.
 */
export function CompactMatchRow({ fixture }: { fixture: Fixture }) {
  const locale = useLocale() === "vi" ? "vi" : "en";
  const zone = useViewerTimeZone(defaultTimeZoneForLocale(locale));
  const { fixture: f, league, teams } = fixture;
  const date = new Date(f.date);
  const dateStr = formatMatchDayMonth(date, locale, false, zone);
  const timeStr = formatMatchTime(date, zone);
  const home = displayTeamName(teams.home.name);
  const away = displayTeamName(teams.away.name);

  return (
    <Link
      href={`/fixtures/${f.id}`}
      aria-label={`${home} – ${away}, ${dateStr} ${timeStr}`}
      className="surface-interactive block min-h-14 px-3 py-2 sm:grid sm:grid-cols-[8.5rem_minmax(0,1fr)_8.5rem] sm:items-center sm:gap-4 sm:px-4 sm:py-0 lg:grid-cols-[12rem_minmax(0,1fr)_12rem]"
    >
      <p className="flex min-w-0 items-center gap-1.5 font-barlow text-[11px] font-semibold uppercase tracking-[0.1em] text-stadium-muted sm:flex-col sm:items-start sm:gap-0.5 sm:text-xs">
        <span className="shrink-0">{dateStr}</span>
        <span aria-hidden className="sm:hidden">·</span>
        <span className="flex min-w-0 items-center gap-1.5">
          <CompetitionTag name={league.name} />
        </span>
      </p>
      <span className="mt-1 grid grid-cols-[minmax(0,1fr)_3.25rem_minmax(0,1fr)] items-center gap-2 sm:mt-0 sm:grid-cols-[minmax(0,1fr)_4rem_minmax(0,1fr)] sm:gap-4">
        <Side team={teams.home} align="home" />
        <span className="text-center font-bebas text-xl leading-none tracking-wide text-white tabular-nums">{timeStr}</span>
        <Side team={teams.away} align="away" />
      </span>
    </Link>
  );
}
