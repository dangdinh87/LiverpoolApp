"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ZoomIn } from "lucide-react";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";

interface Props {
  /** Images for the explicit grid (non-htmlContent articles). */
  extraImages?: string[];
}

/**
 * Renders a clickable image grid (for paragraph-based articles) and
 * attaches lightbox click handlers to all <img> inside #article-body
 * (for htmlContent articles).
 */
export function ArticleImageViewer({ extraImages = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  // Slides built dynamically from DOM (htmlContent) + explicit extraImages
  const [slides, setSlides] = useState<{ src: string }[]>([]);

  // Attach click handlers to inline images inside the article body
  useEffect(() => {
    const body = document.getElementById("article-body");
    if (!body) return;

    const imgs = Array.from(body.querySelectorAll<HTMLImageElement>("img"));
    if (imgs.length === 0) return;

    const srcs = imgs.map((img) => img.src).filter(Boolean);
    setSlides(srcs.map((src) => ({ src })));

    const cleanups: (() => void)[] = [];

    imgs.forEach((img, i) => {
      img.style.cursor = "zoom-in";
      const handler = () => {
        setSlides(srcs.map((s) => ({ src: s })));
        setIndex(i);
        setOpen(true);
      };
      img.addEventListener("click", handler);
      cleanups.push(() => img.removeEventListener("click", handler));
    });

    return () => cleanups.forEach((fn) => fn());
  }, []);

  // Open lightbox for an explicit grid image
  const openGrid = (i: number) => {
    const gridSlides = extraImages.map((src) => ({ src }));
    setSlides(gridSlides);
    setIndex(i);
    setOpen(true);
  };

  return (
    <>
      {/* Extra images grid for paragraph-based articles */}
      {extraImages.length > 0 && (
        <div className="my-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {extraImages.map((img, i) => (
            <button
              key={i}
              onClick={() => openGrid(i)}
              className="relative w-full aspect-video overflow-hidden ring-1 ring-white/10 cursor-zoom-in group"
            >
              <Image
                src={img}
                alt={`Article image ${i + 1}`}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                loading="lazy"
                unoptimized
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ))}
        </div>
      )}

      <Lightbox
        open={open}
        close={() => setOpen(false)}
        index={index}
        slides={slides}
        plugins={[Zoom]}
        styles={{ container: { backgroundColor: "rgba(0,0,0,0.93)" } }}
        zoom={{ maxZoomPixelRatio: 3, scrollToZoom: true }}
      />
    </>
  );
}
