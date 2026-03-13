"use client";

import { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { ZoomIn, Download } from "lucide-react";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";

type Category = "all" | "stadium" | "kop" | "landmarks" | "memorial" | "trophies";

interface GalleryImage {
  src: string;
  alt: string;
  category: Category;
}

const G = "/assets/lfc/stadium/gallery";
const S = "/assets/lfc/stadium";

const IMAGES: GalleryImage[] = [
  // Stadium Views & Exteriors
  { src: `${S}/anfield-interior.webp`, alt: "Anfield Interior", category: "stadium" },
  { src: `${S}/anfield-aerial.webp`, alt: "Aerial View", category: "stadium" },
  { src: `${S}/anfield-pitch.webp`, alt: "The Pitch", category: "stadium" },
  { src: `${S}/anfield-champions-league.webp`, alt: "Champions League Night", category: "stadium" },
  { src: `${S}/anfield-corner-flag.webp`, alt: "Corner Flag", category: "stadium" },
  { src: `${S}/anfield-panorama.jpg`, alt: "Panorama from Main Stand", category: "stadium" },
  { src: `${G}/anfield-stadium-main-view.jpg`, alt: "Main View", category: "stadium" },
  { src: `${G}/anfield-stadium-from-cathedral.jpg`, alt: "View from Cathedral", category: "stadium" },
  { src: `${G}/anfield-stadium-in-may-2024.jpg`, alt: "Anfield May 2024", category: "stadium" },
  { src: `${G}/anfield-road-stadium-view.jpg`, alt: "Anfield Road View", category: "stadium" },
  { src: `${G}/anfield-stadium-liverpool-geograph.jpg`, alt: "Stadium Exterior", category: "stadium" },
  { src: `${G}/anfield-corner-home-of-lfc.jpg`, alt: "Home of Liverpool FC", category: "stadium" },
  { src: `${G}/anfield-main-stand-from-road.jpg`, alt: "Main Stand from Road", category: "stadium" },
  { src: `${G}/liverpool-fc-stadium-anfield-road.jpg`, alt: "Anfield Road", category: "stadium" },
  { src: `${G}/anfield-pre-match-fanzone.jpg`, alt: "Pre-Match Fanzone", category: "stadium" },
  { src: `${S}/anfield-main-stand.jpg`, alt: "Main Stand", category: "stadium" },
  // External — Wikimedia Commons (stable URLs)
  { src: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Anfield_-_26-8-2017.jpg/1280px-Anfield_-_26-8-2017.jpg", alt: "Anfield 2017", category: "stadium" },
  { src: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Entrancetothekop.jpg/1280px-Entrancetothekop.jpg", alt: "Kop Entrance", category: "stadium" },
  { src: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Anfield_from_the_air.jpg/1280px-Anfield_from_the_air.jpg", alt: "Anfield Aerial II", category: "stadium" },
  { src: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Anfieldroad08.jpg/1280px-Anfieldroad08.jpg", alt: "Anfield Road 2008", category: "stadium" },
  { src: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Centenary_Stand%2C_Anfield.jpg/1280px-Centenary_Stand%2C_Anfield.jpg", alt: "Centenary Stand", category: "stadium" },

  // The Kop
  { src: `${S}/anfield-the-kop.jpg`, alt: "The Kop", category: "kop" },
  { src: `${G}/kop-sign-anfield.jpg`, alt: "The Kop Sign", category: "kop" },
  { src: `${G}/the-kop-anfield-geograph.jpg`, alt: "The Kop Stand", category: "kop" },
  { src: `${G}/kop-at-anfield-stadium-liverpool.jpg`, alt: "Kop at Anfield", category: "kop" },
  { src: `${G}/kop-end-anfield-stadium.jpg`, alt: "Kop End", category: "kop" },
  { src: `${G}/pitch-view-from-kop-anfield.jpg`, alt: "Pitch from Kop", category: "kop" },
  { src: `${G}/kop-from-centenary-stand.jpg`, alt: "Kop from Centenary", category: "kop" },
  { src: `${G}/kop-of-anfield-liverpool.jpg`, alt: "Kop of Anfield", category: "kop" },
  { src: `${G}/kop-anfield-2.jpg`, alt: "The Kop II", category: "kop" },
  { src: `${G}/centenary-stand-from-kop.jpg`, alt: "Centenary from Kop", category: "kop" },
  { src: `${G}/expanding-main-stand-from-kop.jpg`, alt: "New Main Stand from Kop", category: "kop" },
  // External
  { src: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/The_Kop%2C_Anfield.jpg/1280px-The_Kop%2C_Anfield.jpg", alt: "The Kop Exterior", category: "kop" },
  { src: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/KopStandAnfield.jpg/1280px-KopStandAnfield.jpg", alt: "Kop Stand View", category: "kop" },

  // Gates, Statues & Icons
  { src: `${S}/anfield-shankly-statue.jpg`, alt: "Shankly Statue", category: "landmarks" },
  { src: `${S}/anfield-badge.jpg`, alt: "LFC Badge", category: "landmarks" },
  { src: `${G}/shankly-gates-anfield-liverpool.jpg`, alt: "Shankly Gates", category: "landmarks" },
  { src: `${G}/paisley-gateway-anfield.jpg`, alt: "Paisley Gateway", category: "landmarks" },
  { src: `${G}/bill-shankly-statue-2018.jpg`, alt: "Shankly Statue 2018", category: "landmarks" },
  { src: `${G}/paisley-gates-kop-end.jpg`, alt: "Paisley Gates & Kop", category: "landmarks" },
  { src: `${G}/lfc-crest-walton-breck-road.jpg`, alt: "LFC Crest", category: "landmarks" },
  { src: `${G}/champions-wall-outside-anfield.jpg`, alt: "Champions Wall", category: "landmarks" },
  { src: `${G}/lfc-badge-main-stand.jpg`, alt: "Badge on Main Stand", category: "landmarks" },
  // External
  { src: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Shankly_Gates%2C_Anfield%2C_Liverpool_%282%29.jpg/800px-Shankly_Gates%2C_Anfield%2C_Liverpool_%282%29.jpg", alt: "Shankly Gates II", category: "landmarks" },
  { src: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Bill_shankly_statue_at_anfield.jpg/800px-Bill_shankly_statue_at_anfield.jpg", alt: "Shankly Monument", category: "landmarks" },
  { src: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/This_Is_Anfield_Sign.jpg/800px-This_Is_Anfield_Sign.jpg", alt: "This Is Anfield Sign", category: "landmarks" },
  { src: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/PaisleyGateway.JPG/800px-PaisleyGateway.JPG", alt: "Paisley Gateway II", category: "landmarks" },

  // Hillsborough Memorial
  { src: `${G}/hillsborough-memorial-at-anfield.jpg`, alt: "Hillsborough Memorial", category: "memorial" },
  { src: `${G}/hillsborough-memorial-anfield-liverpool.jpg`, alt: "Memorial at Anfield", category: "memorial" },
  { src: `${G}/hillsborough-memorial-outside-anfield.jpg`, alt: "Memorial Outside Anfield", category: "memorial" },
  { src: `${G}/hillsborough-memorial-anfield-large.jpg`, alt: "Hillsborough Memorial II", category: "memorial" },
  { src: `${G}/hillsborough-memorial-anfield-portrait.jpg`, alt: "Memorial Portrait", category: "memorial" },
  // External
  { src: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Hillsborough_Memorial%2C_Anfield.jpg/800px-Hillsborough_Memorial%2C_Anfield.jpg", alt: "Hillsborough Tribute", category: "memorial" },

  // Trophies & Celebrations
  { src: `${G}/six-ucl-trophies-liverpool.jpg`, alt: "6 Champions League Trophies", category: "trophies" },
  { src: `${G}/lfc-parade-2025.jpg`, alt: "2025 Trophy Parade", category: "trophies" },
  { src: `${G}/vvd-trophy-parade-2025.jpg`, alt: "Van Dijk — 2025 Parade", category: "trophies" },
  { src: `${G}/efl-cup-trophy-museum.jpg`, alt: "EFL Cup Trophy", category: "trophies" },
  { src: `${G}/fa-cup-trophy-museum.jpg`, alt: "FA Cup Trophy", category: "trophies" },
  { src: `${G}/ucl-trophy-anfield-museum.jpg`, alt: "UCL Trophy at Museum", category: "trophies" },
  { src: `${G}/lfc-parade-2022-01.jpg`, alt: "2022 Parade", category: "trophies" },
  { src: `${G}/lfc-parade-2022-02.jpg`, alt: "2022 Parade II", category: "trophies" },
  { src: `${G}/lfc-parade-2022-03.jpg`, alt: "2022 Parade III", category: "trophies" },
];

const CATEGORIES: { key: Category; label: string }[] = [
  { key: "all", label: "All" },
  { key: "stadium", label: "Stadium" },
  { key: "kop", label: "The Kop" },
  { key: "landmarks", label: "Landmarks" },
  { key: "memorial", label: "Memorial" },
  { key: "trophies", label: "Trophies" },
];

export function AnfieldGallery() {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [category, setCategory] = useState<Category>("all");
  // Track broken images so we can hide them
  const [failedSrcs, setFailedSrcs] = useState<Set<string>>(new Set());

  const handleImageError = useCallback((src: string) => {
    setFailedSrcs((prev) => {
      if (prev.has(src)) return prev;
      const next = new Set(prev);
      next.add(src);
      return next;
    });
  }, []);

  // Filter by category and exclude broken images
  const filtered = useMemo(() => {
    const byCategory = category === "all" ? IMAGES : IMAGES.filter((img) => img.category === category);
    return byCategory.filter((img) => !failedSrcs.has(img.src));
  }, [category, failedSrcs]);

  // Count valid images per category (excluding broken)
  const validCount = useCallback(
    (cat: Category) => {
      if (cat === "all") return IMAGES.filter((img) => !failedSrcs.has(img.src)).length;
      return IMAGES.filter((img) => img.category === cat && !failedSrcs.has(img.src)).length;
    },
    [failedSrcs],
  );

  const openLightbox = (filteredIdx: number) => {
    setIndex(filteredIdx);
    setOpen(true);
  };

  return (
    <>
      {/* Category filter chips */}
      <div className="flex flex-wrap gap-2 mb-5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setCategory(cat.key)}
            className={`px-4 py-1.5 text-[10px] font-barlow font-bold uppercase tracking-[0.15em] border transition-all ${
              category === cat.key
                ? "bg-lfc-red border-lfc-red text-white"
                : "bg-transparent border-stadium-border text-stadium-muted hover:border-white/30 hover:text-white"
            }`}
          >
            {cat.label}
            <span className="ml-1.5 opacity-60">{validCount(cat.key)}</span>
          </button>
        ))}
      </div>

      {/* Image grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
        {filtered.map((img, i) => (
          <button
            key={img.src}
            onClick={() => openLightbox(i)}
            className="relative overflow-hidden cursor-zoom-in group aspect-square"
          >
            <Image
              src={img.src}
              alt={img.alt}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
              loading="lazy"
              unoptimized
              onError={() => handleImageError(img.src)}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
            </div>
            {/* Download button */}
            <a
              href={img.src}
              download={img.alt.replace(/\s+/g, "-").toLowerCase() + ".jpg"}
              onClick={(e) => e.stopPropagation()}
              className="absolute top-2 right-2 p-1.5 bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 z-10"
              title="Download"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
            <p className="absolute bottom-0 inset-x-0 px-2 py-1.5 bg-gradient-to-t from-black/80 to-transparent text-white text-[9px] font-barlow uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity truncate">
              {img.alt}
            </p>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      <Lightbox
        open={open}
        close={() => setOpen(false)}
        index={index}
        slides={filtered.map((img) => ({ src: img.src }))}
        plugins={[Zoom]}
        styles={{ container: { backgroundColor: "rgba(0,0,0,0.97)" } }}
        zoom={{ maxZoomPixelRatio: 4, scrollToZoom: true }}
      />
    </>
  );
}
