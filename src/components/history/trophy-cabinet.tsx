import Image from "next/image";
import { getTranslations } from "next-intl/server";

interface Trophy {
  name: string;
  count: number;
  years: string[];
  image: string;
}

/** Trophy tiles: big gold count, name, and the winning years behind a native disclosure. */
export async function TrophyCabinet({ trophies }: { trophies: Trophy[] }) {
  const t = await getTranslations("History.trophies");
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {trophies.map((trophy) => (
        <li key={trophy.name} className="surface-interactive flex flex-col p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <Image src={trophy.image} alt="" width={48} height={48} className="size-12 object-contain" />
            <span className="font-bebas text-5xl leading-none text-lfc-gold sm:text-6xl">{trophy.count}</span>
          </div>
          <h3 className="mt-3 font-bebas text-xl leading-tight text-white sm:text-2xl">{trophy.name}</h3>
          <details className="group mt-2 text-xs text-stadium-muted">
            <summary className="flex min-h-10 cursor-pointer list-none items-center gap-1 font-barlow font-semibold uppercase tracking-[0.12em] hover:text-white [&::-webkit-details-marker]:hidden">
              {t("years")}
              <span aria-hidden className="transition-transform group-open:rotate-90">›</span>
            </summary>
            <p className="pb-1 leading-relaxed">{trophy.years.join(" · ")}</p>
          </details>
        </li>
      ))}
    </ul>
  );
}
