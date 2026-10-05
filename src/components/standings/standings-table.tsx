import Image from "next/image";
import { TableProperties } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Standing } from "@/lib/types/football";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";

const LFC_ID = 40;

const FORM_DOT = { W: "bg-green-500", D: "bg-amber-400", L: "bg-red-500" } as const;

type Zone = { key: "cl" | "el" | "ecl" | "rel" | "r16" | "playoff" | "elim"; bar: string };

/** Qualification / relegation zone for a rank. */
function getZone(rank: number, competition: "pl" | "ucl"): Zone | null {
  if (competition === "ucl") {
    if (rank <= 8) return { key: "r16", bar: "bg-green-500" };
    if (rank <= 24) return { key: "playoff", bar: "bg-sky-500" };
    return { key: "elim", bar: "bg-red-600" };
  }
  if (rank <= 4) return { key: "cl", bar: "bg-blue-500" };
  if (rank === 5) return { key: "el", bar: "bg-orange-500" };
  if (rank === 6) return { key: "ecl", bar: "bg-green-600" };
  if (rank >= 18) return { key: "rel", bar: "bg-red-600" };
  return null;
}

const LEGEND: Record<"pl" | "ucl", Zone[]> = {
  pl: [
    { key: "cl", bar: "bg-blue-500" },
    { key: "el", bar: "bg-orange-500" },
    { key: "ecl", bar: "bg-green-600" },
    { key: "rel", bar: "bg-red-600" },
  ],
  ucl: [
    { key: "r16", bar: "bg-green-500" },
    { key: "playoff", bar: "bg-sky-500" },
    { key: "elim", bar: "bg-red-600" },
  ],
};

// Opaque row backgrounds: the sticky columns must hide what scrolls beneath them.
const ROW_BG = "bg-[var(--surface-2)]";
const ROW_BG_LFC = "bg-[color-mix(in_oklab,var(--surface-2)_86%,var(--color-lfc-red))]";

interface StandingsTableProps {
  standings: Standing[];
  competition?: "pl" | "ucl";
}

export function StandingsTable({ standings, competition = "pl" }: StandingsTableProps) {
  const t = useTranslations("Standings");

  if (standings.length === 0) {
    return (
      <EmptyState
        tone="error"
        icon={<TableProperties className="size-9" aria-hidden />}
        title={t("outage.title")}
        description={t("outage.description")}
        actionHref="/news"
        actionLabel={t("outage.action")}
      />
    );
  }

  // Columns beyond P / GD / Pts only appear from `sm`.
  const wide = "hidden sm:table-cell";
  const th = "px-1 py-2.5 text-center font-barlow sm:px-1.5 text-xs font-semibold uppercase tracking-wider text-stadium-muted";
  const td = "px-1 py-2 text-center text-sm tabular-nums sm:px-1.5 text-stadium-muted";

  return (
    <div className="surface overflow-hidden">
      <div className="scroll-x">
        <table className="w-full text-sm sm:min-w-[620px]">
          <caption className="sr-only">{t(competition === "ucl" ? "comp.ucl" : "comp.pl")}</caption>
          <thead>
            <tr className="border-b border-[var(--line)] bg-[var(--surface-1)]">
              <th scope="col" className={cn(th, "sticky left-0 z-10 w-9 bg-[var(--surface-1)] sm:w-10")}>{t("rank")}</th>
              <th scope="col" className={cn(th, "sticky left-9 z-10 bg-[var(--surface-1)] pl-1.5 text-left sm:left-10 sm:pl-2")}>{t("club")}</th>
              <th scope="col" className={cn(th, "w-9")}>{t("played")}</th>
              <th scope="col" className={cn(th, wide, "w-9")}>{t("win")}</th>
              <th scope="col" className={cn(th, wide, "w-9")}>{t("draw")}</th>
              <th scope="col" className={cn(th, wide, "w-9")}>{t("lose")}</th>
              <th scope="col" className={cn(th, wide, "w-10")}>{t("gf")}</th>
              <th scope="col" className={cn(th, wide, "w-10")}>{t("ga")}</th>
              <th scope="col" className={cn(th, "w-11")}>{t("gd")}</th>
              <th scope="col" className={cn(th, "w-11 text-white")}>{t("pts")}</th>
              <th scope="col" className={cn(th, "w-14 sm:w-28")}>{t("form")}</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s) => {
              const isLfc = s.team.id === LFC_ID;
              const zone = getZone(s.rank, competition);
              const rowBg = isLfc ? ROW_BG_LFC : ROW_BG;
              const form = (s.form?.split("") ?? []).slice(-5);
              const gd = s.goalsDiff > 0 ? `+${s.goalsDiff}` : String(s.goalsDiff);
              return (
                <tr key={s.team.id} className={cn("border-b border-[var(--line)] last:border-0", rowBg)} aria-current={isLfc ? "true" : undefined}>
                  <td className={cn("sticky left-0 z-10 w-9 px-1 py-2 text-center sm:w-10", rowBg)}>
                    {zone && <span aria-hidden className={cn("absolute inset-y-0 left-0 w-[3px]", zone.bar)} />}
                    <span className={cn("font-bebas text-lg leading-none", isLfc ? "text-brand" : "text-stadium-muted")}>{s.rank}</span>
                    {zone && <span className="sr-only"> ({t(`zones.${zone.key}`)})</span>}
                  </td>
                  <td className={cn("sticky left-9 z-10 max-w-0 pl-1.5 pr-1 sm:left-10 sm:pl-2 py-2", rowBg)}>
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="relative size-5 sm:size-6 shrink-0">
                        <Image
                          src={isLfc ? "/assets/lfc/crest.webp" : s.team.logo}
                          alt=""
                          fill
                          sizes="24px"
                          className="object-contain"
                        />
                      </span>
                      <span className={cn("min-w-0 truncate", isLfc ? "font-bold text-white" : "text-white/85")} title={s.team.name}>
                        {/* Compact name on phones ("Man City" instead of "Manchester …"), full name from sm */}
                        <span className="sm:hidden">{s.team.shortName ?? s.team.name}</span>
                        <span className="hidden sm:inline">{s.team.name}</span>
                      </span>
                    </div>
                  </td>
                  <td className={td}>{s.all.played}</td>
                  <td className={cn(td, wide)}>{s.all.win}</td>
                  <td className={cn(td, wide)}>{s.all.draw}</td>
                  <td className={cn(td, wide)}>{s.all.lose}</td>
                  <td className={cn(td, wide)}>{s.all.goals.for}</td>
                  <td className={cn(td, wide)}>{s.all.goals.against}</td>
                  <td className={cn(td, "font-semibold", s.goalsDiff > 0 ? "text-green-400" : s.goalsDiff < 0 ? "text-red-400" : "")}>{gd}</td>
                  <td className="px-1 py-2 text-center sm:px-1.5">
                    <span className={cn("font-bebas text-xl leading-none tabular-nums", isLfc ? "text-brand" : "text-white")}>{s.points}</span>
                  </td>
                  <td className="px-1 py-2 sm:px-1.5">
                    <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                      {form.map((r, i) => (
                        <span key={i} className={cn("size-1.5 rounded-full sm:size-2.5", FORM_DOT[r as keyof typeof FORM_DOT] ?? "bg-stadium-muted")}>
                          <span className="sr-only">{r === "W" ? t("zones.win") : r === "D" ? t("zones.draw") : t("zones.loss")}</span>
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-wrap gap-x-5 gap-y-2 border-t border-[var(--line)] px-4 py-3">
        {LEGEND[competition].map(({ key, bar }) => (
          <li key={key} className="flex items-center gap-2 text-xs text-stadium-muted">
            <span aria-hidden className={cn("h-3 w-1", bar)} />
            {t(`zones.${key}`)}
          </li>
        ))}
      </ul>
    </div>
  );
}
