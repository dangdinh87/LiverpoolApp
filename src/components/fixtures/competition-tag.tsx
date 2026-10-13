import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { competitionKey, competitionLabel, type CompetitionKey } from "@/lib/competition-labels";

/** Accent dot per competition (the dot carries colour only; the name beside it is text). */
const DOT: Record<CompetitionKey, string> = {
  pl: "bg-purple-400",
  ucl: "bg-sky-400",
  fa: "bg-amber-400",
  efl: "bg-emerald-400",
  shield: "bg-rose-400",
};

/**
 * "● UCL · Vòng 2": the short competition name from the shared label map, with an
 * accent dot, and the round when there is one. Render it inside a flex row.
 */
export function CompetitionTag({ name, round }: { name: string; round?: string | null }) {
  const locale = useLocale();
  const key = competitionKey(name);
  return (
    <>
      {key && <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", DOT[key])} />}
      <span className="truncate">
        <span className="text-white/90">{competitionLabel(name, locale, "short")}</span>
        {round && <span> · {round}</span>}
      </span>
    </>
  );
}
