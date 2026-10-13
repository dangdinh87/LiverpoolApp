import { ChevronDown } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DuotonePhoto } from "@/components/history/duotone-photo";

interface HistoryEvent {
  year: number;
  title: string;
  description: string;
  image?: string;
  /** Set when the year alone is ambiguous (2024: Klopp's farewell and Slot's arrival). */
  era?: string;
}

/**
 * The club's story in eras. An event belongs to the last era starting on or
 * before its year, unless it names its era; the ranges follow the managers.
 */
const ERAS = [
  { key: "beginnings", from: 1892 },
  { key: "shankly", from: 1959 },
  { key: "paisley", from: 1974 },
  { key: "rebuild", from: 1991 },
  { key: "klopp", from: 2015 },
  { key: "today", from: 2024 },
] as const;

type EraKey = (typeof ERAS)[number]["key"];

function groupByEra(events: HistoryEvent[]) {
  const groups = new Map<EraKey, HistoryEvent[]>();
  for (const event of [...events].sort((a, b) => a.year - b.year)) {
    const era = ERAS.find((e) => e.key === event.era) ?? [...ERAS].reverse().find((e) => event.year >= e.from) ?? ERAS[0];
    groups.set(era.key, [...(groups.get(era.key) ?? []), event]);
  }
  return ERAS.filter((e) => groups.has(e.key)).map((e, i, list) => {
    const events = groups.get(e.key)!;
    const last = events[events.length - 1].year;
    // An era ends the year before the next one starts, or later if one of its events says so.
    const to = list[i + 1] ? Math.max(list[i + 1].from - 1, last) : null;
    return { key: e.key, from: e.from, to, events };
  });
}

/** Eras shown open on first view; the rest sit behind their heading. */
const OPEN_ERAS = 2;

/**
 * Club timeline by era. Every era is a native <details>: the first two start
 * open, the others show only years and name, so 130 years read in two screens
 * on a phone. Native on purpose: all of the text stays in the HTML (a closed
 * Radix accordion unmounts its content, taking the story out of the page for
 * crawlers) and it needs no JavaScript. Photos are thumbnails from `sm` up, one
 * per distinct picture, so a phone gets text without 80px squares squeezing it.
 * Server component.
 */
export async function ClubTimeline({ events }: { events: HistoryEvent[] }) {
  const t = await getTranslations("History.eras");
  const eras = groupByEra(events);
  const shown = new Set<string>();

  return (
    <div className="border-t border-[var(--line-strong)]">
      {eras.map((era, index) => (
        <details
          key={era.key}
          id={`era-${era.key}`}
          open={index < OPEN_ERAS}
          className="group scroll-mt-[calc(var(--header-h)+4rem)] border-b border-[var(--line-strong)]"
        >
          <summary className="flex min-h-14 cursor-pointer list-none items-center gap-4 py-5 outline-none focus-visible:ring-2 focus-visible:ring-lfc-red focus-visible:ring-offset-2 focus-visible:ring-offset-stadium-bg sm:py-6 [&::-webkit-details-marker]:hidden">
            <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-4 gap-y-1">
              <p className="font-bebas text-2xl leading-none text-stadium-muted tabular-nums">
                {era.from}–{era.to ?? t("now")}
              </p>
              <h3 className="font-bebas text-3xl leading-none text-white sm:text-4xl">{t(`${era.key}.name`)}</h3>
              <p className="font-barlow text-xs font-semibold uppercase tracking-[0.14em] text-stadium-muted sm:ml-auto">
                {t("events", { count: era.events.length })}
              </p>
            </div>
            <ChevronDown aria-hidden className="size-5 shrink-0 text-white/70 transition-transform duration-200 group-open:rotate-180" />
          </summary>

          <div className="pb-8 lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-12">
            <p className="mb-6 max-w-sm text-[15px] leading-relaxed text-stadium-muted lg:mb-0">{t(`${era.key}.summary`)}</p>

            <ol className="border-l border-[var(--line-strong)]">
              {era.events.map((event, i) => {
                const image = event.image && !shown.has(event.image) ? event.image : undefined;
                if (image) shown.add(image);
                return (
                  <li key={`${event.year}-${i}`} className="relative pb-8 pl-6 last:pb-0 sm:pl-8">
                    <span aria-hidden className="absolute -left-[5px] top-2 size-[9px] rounded-full bg-lfc-red" />
                    <article className="flex items-start gap-6">
                      <div className="min-w-0 flex-1">
                        <p className="font-bebas text-3xl leading-none text-brand tabular-nums">{event.year}</p>
                        <h4 className="mt-1 text-lg font-bold leading-snug text-white">{event.title}</h4>
                        <p className="mt-2 max-w-[60ch] text-[15px] leading-relaxed text-white/75">{event.description}</p>
                      </div>
                      {image && (
                        <div className="group relative isolate mt-1 hidden aspect-[16/10] w-48 shrink-0 overflow-hidden bg-[var(--surface-3)] sm:block">
                          <DuotonePhoto src={image} fill sizes="192px" className="object-[50%_20%]" />
                        </div>
                      )}
                    </article>
                  </li>
                );
              })}
            </ol>
          </div>
        </details>
      ))}
    </div>
  );
}
