import Image from "next/image";

const S = "/assets/lfc/stadium";
const G = "/assets/lfc/stadium/gallery";

/** Local, locally-hosted photos only (no remote hosts that can fail or rate-limit). */
const IMAGES: { src: string; altEn: string; altVi: string }[] = [
  { src: `${S}/anfield-aerial.webp`, altEn: "Anfield — aerial view", altVi: "Toàn cảnh sân Anfield từ trên cao" },
  { src: `${S}/anfield-champions-league.webp`, altEn: "Anfield on a Champions League night", altVi: "Anfield trong một đêm Champions League" },
  { src: `${S}/anfield-the-kop.jpg`, altEn: "The Kop", altVi: "Khán đài The Kop" },
  { src: `${S}/anfield-pitch.webp`, altEn: "The pitch at Anfield", altVi: "Mặt cỏ sân Anfield" },
  { src: `${S}/anfield-main-stand.jpg`, altEn: "The Main Stand", altVi: "Khán đài Main Stand" },
  { src: `${S}/anfield-corner-flag.webp`, altEn: "Corner flag at Anfield", altVi: "Cột cờ góc trên sân Anfield" },
  { src: `${G}/shankly-gates-anfield-liverpool.jpg`, altEn: "Shankly Gates", altVi: "Cổng Shankly tại Anfield" },
  { src: `${G}/champions-wall-outside-anfield.jpg`, altEn: "Champions wall outside Anfield", altVi: "Bức tường vinh danh các nhà vô địch bên ngoài Anfield" },
  { src: `${G}/kop-sign-anfield.jpg`, altEn: "The Kop sign", altVi: "Biển hiệu khán đài The Kop" },
  { src: `${G}/anfield-pre-match-fanzone.jpg`, altEn: "Pre-match fanzone", altVi: "Khu vực cổ động viên trước giờ bóng lăn" },
];

/** CSS scroll-snap strip: native swipe/trackpad scrolling, zero client JS. */
export function StadiumShowcase({ label, locale }: { label: string; locale: string }) {
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
                alt={locale === "vi" ? img.altVi : img.altEn}
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
