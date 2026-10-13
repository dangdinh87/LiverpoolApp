import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { DuotonePhoto } from "@/components/history/duotone-photo";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Legend {
  name: string;
  role: string;
  years: string;
  caps: number | null;
  goals: number | null;
  bio: string;
  image?: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** 3:4 portrait box; the parent supplies the width. Initials when there is no photo. */
function Portrait({ legend, sizes, className }: { legend: Legend; sizes: string; className?: string }) {
  return (
    <span className={`relative isolate block aspect-[3/4] overflow-hidden bg-[var(--surface-3)] ${className ?? ""}`}>
      {legend.image ? (
        <DuotonePhoto src={legend.image} fill sizes={sizes} />
      ) : (
        <span
          aria-hidden
          className="flex size-full select-none items-center justify-center bg-gradient-to-b from-lfc-red/25 to-transparent font-bebas text-6xl leading-none text-white/25"
        >
          {getInitials(legend.name)}
        </span>
      )}
    </span>
  );
}

/** Career numbers as spans (not a <dl>) so they are valid inside the card's <button>. */
function Stats({ legend, className }: { legend: Legend; className?: string }) {
  const t = useTranslations("History.legends");
  if (legend.caps === null && legend.goals === null) return null;
  return (
    <span className={`flex flex-wrap gap-x-5 gap-y-2 ${className ?? ""}`}>
      {legend.caps !== null && (
        <span className="block">
          <b className="block font-bebas text-2xl font-normal leading-none text-white">{legend.caps}</b>
          <span className="mt-0.5 block font-barlow text-[11px] font-bold uppercase tracking-[0.08em] text-stadium-muted">{t("appearances")}</span>
        </span>
      )}
      {legend.goals !== null && (
        <span className="block">
          <b className="block font-bebas text-2xl font-normal leading-none text-brand">{legend.goals}</b>
          <span className="mt-0.5 block font-barlow text-[11px] font-bold uppercase tracking-[0.08em] text-stadium-muted">{t("goals")}</span>
        </span>
      )}
    </span>
  );
}

/**
 * Compact legend card: portrait, name, years, role and the two career numbers.
 * The full biography opens in a dialog. The bio is also in the page as screen-
 * reader/crawler text, because dialog content only exists once opened.
 */
export function LegendCard({ legend }: { legend: Legend }) {
  const t = useTranslations("History.legends");
  const hasStats = legend.caps !== null || legend.goals !== null;

  // `relative`: the sr-only bio is absolutely positioned and must not stretch the page sideways.
  return (
    <article className="relative h-full">
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            className="group surface-interactive flex h-full w-full flex-col overflow-hidden text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lfc-red"
          >
            <span className="relative block">
              <Portrait legend={legend} sizes="(max-width: 640px) 152px, (max-width: 1024px) 30vw, 260px" className="w-full" />
              <span aria-hidden className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
              <span aria-hidden className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-black/55 text-white/85">
                <Plus size={14} />
              </span>
              <span className="absolute inset-x-0 bottom-0 block p-3">
                <span className="block font-bebas text-2xl leading-[0.95] text-white">{legend.name}</span>
                <span className="mt-1 block font-barlow text-xs font-semibold uppercase tracking-[0.1em] text-white/70">{legend.years}</span>
              </span>
            </span>
            <span className="flex flex-1 flex-col gap-1 border-t border-[var(--line)] px-3 py-2.5">
              <span className="font-barlow text-xs font-bold uppercase tracking-[0.14em] text-brand">{legend.role}</span>
              {hasStats && <Stats legend={legend} className="mt-1" />}
            </span>
          </button>
        </DialogTrigger>

        <DialogContent closeLabel={t("close")} className="max-h-[calc(100dvh-2rem)] gap-5 overflow-y-auto sm:max-w-xl">
          <div className="flex gap-4 pr-6 sm:gap-5">
            {/* 112px wide: the smallest source photos are 156px */}
            <Portrait legend={legend} sizes="112px" className="w-24 shrink-0 sm:w-28" />
            <div className="min-w-0 self-end">
              <p className="font-barlow text-xs font-bold uppercase tracking-[0.14em] text-brand">{legend.role}</p>
              <DialogTitle className="mt-1 font-bebas text-4xl font-normal leading-none text-white">{legend.name}</DialogTitle>
              <p className="mt-1.5 font-barlow text-sm font-semibold uppercase tracking-[0.1em] text-stadium-muted">{legend.years}</p>
              <Stats legend={legend} className="mt-3" />
            </div>
          </div>
          <DialogDescription className="text-[15px] leading-relaxed text-white/80">{legend.bio}</DialogDescription>
        </DialogContent>
      </Dialog>
      <p className="sr-only">{legend.bio}</p>
    </article>
  );
}
