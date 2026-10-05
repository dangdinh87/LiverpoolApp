import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/ui/empty-state";
import type { Standing } from "@/lib/types/football";
import { cn } from "@/lib/utils";
import { WidgetHeader } from "./overview-card-shared";

const LFC_TEAM_ID = 40;
/** Rows kept above and below Liverpool so the position always has context. */
const NEIGHBOURS = 2;

/** Liverpool's row ±2 neighbours, clamped to the table; top 5 when Liverpool is absent. */
export function pickStandingsWindow(standings: Standing[]): Standing[] {
  const total = NEIGHBOURS * 2 + 1;
  const idx = standings.findIndex((s) => s.team.id === LFC_TEAM_ID);
  if (idx === -1) return standings.slice(0, total);
  const start = Math.max(0, Math.min(idx - NEIGHBOURS, standings.length - total));
  return standings.slice(start, start + total);
}

/** League table excerpt. Server-rendered; the Liverpool row is always in view. */
export async function StandingsPreview({ standings }: { standings: Standing[] }) {
  const t = await getTranslations("Bento");
  const h = await getTranslations("Home.standings");
  const st = await getTranslations("Standings");

  if (standings.length === 0) {
    return (
      <EmptyState
        tone="error"
        title={h("emptyTitle")}
        description={h("emptyDescription")}
        actionHref="/standings"
        actionLabel={h("emptyAction")}
        className="py-8 sm:py-10"
      />
    );
  }

  const rows = pickStandingsWindow(standings);

  return (
    <section aria-label={t("premierLeague")} className="surface p-4">
      <WidgetHeader title={t("premierLeague")} href="/standings" linkLabel={t("fullTable")} />
      <div className="mb-1 flex items-center gap-3 px-2 font-barlow text-xs uppercase tracking-wider text-stadium-muted">
        <span className="w-6 text-center">{st("rank")}</span>
        <span className="flex-1">{st("club")}</span>
        <span className="w-7 text-center">{st("played")}</span>
        <span className="w-8 text-center">{st("gd")}</span>
        <span className="w-8 text-center">{st("pts")}</span>
      </div>
      <ol>
        {rows.map((s) => {
          const me = s.team.id === LFC_TEAM_ID;
          return (
            <li key={s.team.id}>
              <Link
                href="/standings"
                aria-current={me ? "true" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 border-l-2 px-2 transition-colors",
                  me ? "border-l-lfc-red bg-lfc-red/15" : "border-l-transparent hover:bg-[var(--surface-3)]",
                )}
              >
                <span className={cn("w-6 text-center font-bebas text-lg leading-none", me ? "text-white" : "text-stadium-muted")}>
                  {s.rank}
                </span>
                <span className="flex min-w-0 flex-1 items-center gap-2.5">
                  <span className="relative size-6 shrink-0">
                    <Image src={s.team.logo} alt="" fill sizes="24px" className="object-contain" />
                  </span>
                  <span className={cn("truncate text-sm", me ? "font-semibold text-white" : "text-white/90")}>
                    {s.team.name}
                  </span>
                </span>
                <span className="w-7 text-center text-sm tabular-nums text-stadium-muted">{s.all.played}</span>
                <span className="w-8 text-center text-sm tabular-nums text-stadium-muted">
                  {s.goalsDiff > 0 ? `+${s.goalsDiff}` : s.goalsDiff}
                </span>
                <span className="w-8 text-center font-bebas text-xl leading-none tabular-nums text-white">{s.points}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
