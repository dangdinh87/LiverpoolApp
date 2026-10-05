import Image from "next/image";
import { useTranslations } from "next-intl";

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

/** Legend card: photo (or initials), role badge, career numbers, short bio. Server component. */
export function LegendCard({ legend }: { legend: Legend }) {
  const t = useTranslations("History.legends");
  return (
    <article className="surface-interactive flex flex-col overflow-hidden">
      <div className="relative aspect-[4/3] bg-[var(--surface-3)]">
        {legend.image ? (
          <Image
            src={legend.image}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
            className="object-cover object-top"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <span className="font-bebas text-8xl leading-none text-white/10 select-none">{getInitials(legend.name)}</span>
          </div>
        )}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[var(--surface-2)] via-transparent to-transparent" />
        <span className="absolute left-3 top-3 bg-lfc-red px-2 py-1 font-barlow text-xs font-bold uppercase tracking-[0.16em] text-white">
          {legend.role}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div>
          <h3 className="font-bebas text-3xl leading-none text-white">{legend.name}</h3>
          <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-stadium-muted">{legend.years}</p>
        </div>
        {(legend.caps !== null || legend.goals !== null) && (
          <dl className="flex gap-8">
            {legend.caps !== null && (
              <div>
                <dd className="font-bebas text-2xl leading-none text-white">{legend.caps}</dd>
                <dt className="mt-0.5 font-barlow text-xs font-bold uppercase tracking-[0.16em] text-stadium-muted">{t("appearances")}</dt>
              </div>
            )}
            {legend.goals !== null && (
              <div>
                <dd className="font-bebas text-2xl leading-none text-brand">{legend.goals}</dd>
                <dt className="mt-0.5 font-barlow text-xs font-bold uppercase tracking-[0.16em] text-stadium-muted">{t("goals")}</dt>
              </div>
            )}
          </dl>
        )}
        <p className="text-sm leading-relaxed text-stadium-muted">{legend.bio}</p>
      </div>
    </article>
  );
}
