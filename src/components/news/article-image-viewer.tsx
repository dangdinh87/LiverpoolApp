"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const ArticleLightbox = dynamic(() => import("./article-lightbox"), { ssr: false });

interface Slide {
  src: string;
  alt?: string;
}

/**
 * Opens a lightbox when any image inside `#article-body` is tapped.
 * One delegated listener (not one per image), so it keeps working when the body
 * is swapped (original <-> translated) and costs nothing until a photo is tapped.
 */
export function ArticleImageViewer() {
  const [state, setState] = useState<{ slides: Slide[]; index: number } | null>(null);

  useEffect(() => {
    const body = document.getElementById("article-body");
    if (!body) return;

    function onClick(e: MouseEvent) {
      const img = (e.target as HTMLElement | null)?.closest("img");
      if (!img || !body!.contains(img)) return;
      const all = Array.from(body!.querySelectorAll<HTMLImageElement>("img")).filter(
        (i) => !i.closest(".article-video-placeholder") && (i.currentSrc || i.src),
      );
      const index = all.indexOf(img);
      if (index < 0) return;
      e.preventDefault();
      setState({ slides: all.map((i) => ({ src: i.currentSrc || i.src, alt: i.alt })), index });
    }

    body.addEventListener("click", onClick);
    return () => body.removeEventListener("click", onClick);
  }, []);

  if (!state) return null;
  return <ArticleLightbox slides={state.slides} index={state.index} onClose={() => setState(null)} />;
}
