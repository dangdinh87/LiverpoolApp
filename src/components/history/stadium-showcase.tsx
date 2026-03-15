"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { ZoomIn } from "lucide-react";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";

interface StadiumImage {
  src: string;
  alt: string;
}

const S = "/assets/lfc/stadium";
const G = "/assets/lfc/stadium/gallery";

const IMAGES: StadiumImage[] = [
  { src: `${S}/anfield-aerial.webp`, alt: "Anfield — Aerial View" },
  { src: `${S}/anfield-interior.webp`, alt: "Anfield — Interior" },
  { src: `${S}/anfield-champions-league.webp`, alt: "Champions League Night" },
  { src: `${S}/anfield-pitch.webp`, alt: "The Pitch" },
  { src: `${S}/anfield-panorama.jpg`, alt: "Panorama from Main Stand" },
  { src: `${S}/anfield-the-kop.jpg`, alt: "The Kop" },
  { src: `${S}/anfield-main-stand.jpg`, alt: "Main Stand" },
  { src: `${S}/anfield-corner-flag.webp`, alt: "Corner Flag" },
  { src: `${G}/anfield-stadium-main-view.jpg`, alt: "Main View" },
  { src: `${G}/anfield-stadium-from-cathedral.jpg`, alt: "View from Cathedral" },
  { src: `${G}/anfield-stadium-in-may-2024.jpg`, alt: "Anfield May 2024" },
  { src: `${G}/anfield-road-stadium-view.jpg`, alt: "Anfield Road View" },
  { src: `${G}/kop-sign-anfield.jpg`, alt: "The Kop Sign" },
  { src: `${G}/shankly-gates-anfield-liverpool.jpg`, alt: "Shankly Gates" },
  { src: `${G}/champions-wall-outside-anfield.jpg`, alt: "Champions Wall" },
  { src: `${G}/anfield-pre-match-fanzone.jpg`, alt: "Pre-Match Fanzone" },
  { src: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Anfield_-_26-8-2017.jpg/1280px-Anfield_-_26-8-2017.jpg", alt: "Anfield 2017 — Aerial" },
  { src: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Anfield_from_the_air.jpg/1280px-Anfield_from_the_air.jpg", alt: "Anfield from the Air" },
];

export function StadiumShowcase() {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [failedSrcs, setFailedSrcs] = useState<Set<string>>(new Set());

  const handleImageError = useCallback((src: string) => {
    setFailedSrcs((prev) => {
      if (prev.has(src)) return prev;
      const next = new Set(prev);
      next.add(src);
      return next;
    });
  }, []);

  const visible = IMAGES.filter((img) => !failedSrcs.has(img.src));

  return (
    <>
      <div className="columns-2 sm:columns-3 md:columns-4 gap-1.5 space-y-1.5">
        {visible.map((img, i) => (
          <button
            key={img.src}
            onClick={() => { setIndex(i); setOpen(true); }}
            className="relative overflow-hidden cursor-zoom-in group break-inside-avoid block w-full"
          >
            <Image
              src={img.src}
              alt={img.alt}
              width={400}
              height={300 + (i % 3) * 80}
              className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-110"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
              loading="lazy"
              unoptimized
              onError={() => handleImageError(img.src)}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
            </div>
            <p className="absolute bottom-0 inset-x-0 px-2 py-1.5 bg-linear-to-t from-black/80 to-transparent text-white text-[9px] font-barlow uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity truncate">
              {img.alt}
            </p>
          </button>
        ))}
      </div>

      <Lightbox
        open={open}
        close={() => setOpen(false)}
        index={index}
        slides={visible.map((img) => ({ src: img.src }))}
        plugins={[Zoom]}
        styles={{ container: { backgroundColor: "rgba(0,0,0,0.97)" } }}
        zoom={{ maxZoomPixelRatio: 4, scrollToZoom: true }}
      />
    </>
  );
}
