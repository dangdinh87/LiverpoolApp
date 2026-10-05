import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SectionHeader } from "@/components/ui/section-header";
import { POSITION_DISPLAY, type PlayerPosition } from "@/lib/squad-data";

interface CarouselPlayer {
  id: number;
  name: string;
  slug: string;
  shirtNumber: number;
  position: PlayerPosition;
  localPhoto: string;
}

/** Squad teaser: swipeable CSS scroll-snap strip, no JS. */
export async function SquadCarousel({ players }: { players: CarouselPlayer[] }) {
  const t = await getTranslations("Bento");
  const h = await getTranslations("Home.squad");
  if (players.length === 0) return null;

  return (
    <section aria-label={t("squad")} className="defer-render">
      <SectionHeader title={t("squad")} href="/squad" linkLabel={h("viewAll")} />
      <ul className="scroll-x -mx-4 flex snap-x snap-proximity scroll-pl-4 sm:scroll-pl-6 lg:scroll-pl-0 gap-3 px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
        {players.map((p) => (
          <li key={p.id} className="w-32 shrink-0 snap-start sm:w-36">
            <Link href={`/player/${p.slug}`} className="group surface-interactive block overflow-hidden">
              <div className="relative aspect-[4/5] w-full bg-[var(--surface-3)]">
                <Image
                  src={p.localPhoto}
                  alt=""
                  fill
                  sizes="144px"
                  className="object-contain object-bottom"
                />
                <span className="absolute left-2 top-1 font-bebas text-2xl leading-none text-white/80">
                  {p.shirtNumber}
                </span>
              </div>
              <div className="px-3 py-2">
                <p className="truncate text-sm font-semibold text-white">{p.name.split(" ").slice(-1)[0]}</p>
                <p className="font-barlow text-xs uppercase tracking-wider text-stadium-muted">
                  {POSITION_DISPLAY[p.position]}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
