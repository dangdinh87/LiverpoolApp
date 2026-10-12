import Image from "next/image";
import { getTranslations } from "next-intl/server";

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

/**
 * Club timeline by era: era name and years stay pinned beside its events on
 * wide screens; each event is a compact row (year, title, text, small photo),
 * so 130 years read in a few screens instead of a dozen. Server component.
 */
export async function ClubTimeline({ events }: { events: HistoryEvent[] }) {
  const t = await getTranslations("History.eras");
  const eras = groupByEra(events);

  return (
    <div>
      {/* Jump to an era */}
      <nav aria-label={t("jump")} className="scroll-x scroll-x-fade -mx-4 mb-8 flex gap-2 px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {eras.map((era) => (
          <a
            key={era.key}
            href={`#era-${era.key}`}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 border border-[var(--line-strong)] px-3 text-sm text-white/85 transition-colors hover:border-white/40 hover:text-white"
          >
            <span className="font-semibold">{t(`${era.key}.name`)}</span>
            <span className="text-xs text-stadium-muted tabular-nums">{era.from}</span>
          </a>
        ))}
      </nav>

      <div className="space-y-14">
        {eras.map((era) => (
          <section
            key={era.key}
            id={`era-${era.key}`}
            aria-labelledby={`era-${era.key}-title`}
            className="scroll-mt-[calc(var(--header-h)+4rem)] lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-12"
          >
            <header className="mb-5 lg:mb-0">
              <div className="lg:sticky lg:top-[calc(var(--header-h)+4.5rem)]">
                <p className="font-bebas text-2xl leading-none text-stadium-muted tabular-nums">
                  {era.from}–{era.to ?? t("now")}
                </p>
                <h3 id={`era-${era.key}-title`} className="mt-1 font-bebas text-4xl leading-none text-white">
                  {t(`${era.key}.name`)}
                </h3>
                <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-stadium-muted">{t(`${era.key}.summary`)}</p>
              </div>
            </header>

            <ol className="border-l border-[var(--line-strong)]">
              {era.events.map((event, i) => (
                <li key={`${event.year}-${i}`} className="relative pb-8 pl-6 last:pb-0 sm:pl-8">
                  <span aria-hidden className="absolute -left-[5px] top-2 size-[9px] rounded-full bg-lfc-red" />
                  <article className="flex items-start gap-4 sm:gap-6">
                    <div className="min-w-0 flex-1">
                      <p className="font-bebas text-3xl leading-none text-brand tabular-nums">{event.year}</p>
                      <h4 className="mt-1 text-lg font-bold leading-snug text-white">{event.title}</h4>
                      <p className="mt-2 max-w-[60ch] text-[15px] leading-relaxed text-white/75">{event.description}</p>
                    </div>
                    {event.image && (
                      <div className="relative mt-1 aspect-square w-20 shrink-0 overflow-hidden bg-[var(--surface-3)] sm:aspect-[16/10] sm:w-48">
                        <Image src={event.image} alt="" fill sizes="(max-width: 640px) 80px, 192px" className="object-cover" />
                      </div>
                    )}
                  </article>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
