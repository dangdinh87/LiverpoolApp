import Image from "next/image";

interface HistoryEvent {
  year: number;
  title: string;
  description: string;
  image?: string;
}

/**
 * Club timeline. One vertical rail: events hang off it on the right on phones,
 * and alternate left/right from `md` up. Server component, no animation JS.
 */
export function ClubTimeline({ events }: { events: HistoryEvent[] }) {
  return (
    <ol className="relative">
      <div
        aria-hidden
        className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-lfc-red via-[var(--line-strong)] to-transparent md:left-1/2 md:-translate-x-1/2"
      />
      {events.map((event, i) => {
        const isLeft = i % 2 === 0;
        return (
          <li
            key={`${event.year}-${i}`}
            className={`relative pl-8 pb-8 last:pb-0 md:flex md:pl-0 md:pb-10 ${isLeft ? "md:justify-start" : "md:justify-end"}`}
          >
            <span
              aria-hidden
              className="absolute left-0 top-1.5 size-[15px] rounded-full bg-lfc-red ring-4 ring-stadium-bg md:left-1/2 md:-translate-x-1/2"
            />
            <article className="surface min-w-0 overflow-hidden md:w-[calc(50%-2rem)]">
              {event.image && (
                <div className="relative aspect-[16/9] bg-[var(--surface-3)]">
                  <Image
                    src={event.image}
                    alt=""
                    fill
                    sizes="(max-width: 768px) calc(100vw - 4rem), 460px"
                    className="object-cover"
                  />
                </div>
              )}
              <div className="p-4 sm:p-5">
                <p className="font-bebas text-3xl leading-none text-brand">{event.year}</p>
                <h3 className="mt-1.5 font-barlow text-base font-semibold uppercase tracking-wider text-white">
                  {event.title}
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-stadium-muted">{event.description}</p>
              </div>
            </article>
          </li>
        );
      })}
    </ol>
  );
}
