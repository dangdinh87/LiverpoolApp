import Image from "next/image";

const S = "/assets/lfc/stadium";
const G = "/assets/lfc/stadium/gallery";

/** Local, locally-hosted photos only (no remote hosts that can fail or rate-limit). */
const IMAGES: { src: string; alt: string }[] = [
  { src: `${S}/anfield-aerial.webp`, alt: "Anfield — aerial view" },
  { src: `${S}/anfield-champions-league.webp`, alt: "Anfield on a Champions League night" },
  { src: `${S}/anfield-the-kop.jpg`, alt: "The Kop" },
  { src: `${S}/anfield-pitch.webp`, alt: "The pitch at Anfield" },
  { src: `${S}/anfield-main-stand.jpg`, alt: "The Main Stand" },
  { src: `${S}/anfield-corner-flag.webp`, alt: "Corner flag at Anfield" },
  { src: `${G}/shankly-gates-anfield-liverpool.jpg`, alt: "Shankly Gates" },
  { src: `${G}/champions-wall-outside-anfield.jpg`, alt: "Champions wall outside Anfield" },
  { src: `${G}/kop-sign-anfield.jpg`, alt: "The Kop sign" },
  { src: `${G}/anfield-pre-match-fanzone.jpg`, alt: "Pre-match fanzone" },
];

/** CSS scroll-snap strip: native swipe/trackpad scrolling, zero client JS. */
export function StadiumShowcase({ label }: { label: string }) {
  return (
    <ul
      tabIndex={0}
      aria-label={label}
      className="scroll-x -mx-4 flex snap-x snap-mandatory gap-3 px-4 pb-2 sm:mx-0 sm:px-0"
    >
      {IMAGES.map((img) => (
        <li key={img.src} className="w-[78%] shrink-0 snap-center sm:w-[44%] lg:w-[31%]">
          <figure className="surface overflow-hidden">
            <div className="relative aspect-[4/3] bg-[var(--surface-3)]">
              <Image
                src={img.src}
                alt={img.alt}
                fill
                sizes="(max-width: 640px) 78vw, (max-width: 1024px) 44vw, 340px"
                className="object-cover"
              />
            </div>
          </figure>
        </li>
      ))}
    </ul>
  );
}
