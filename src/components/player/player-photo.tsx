"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const CREST = "/assets/lfc/crest.webp";

interface PlayerPhotoProps {
  /** Preferred image (e.g. body shot). */
  src: string;
  /** Tried when `src` is missing or fails (e.g. headshot). Then the club crest. */
  fallback?: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}

/**
 * Fills its (positioned, fixed-aspect) parent. Falls back src -> fallback ->
 * crest when a file is missing, including when the error fired before React
 * hydrated (checked via `complete`/`naturalWidth` on mount).
 */
export function PlayerPhoto({ src, fallback, alt, sizes, priority, className }: PlayerPhotoProps) {
  const chain = [src, fallback, CREST].filter((s): s is string => !!s);
  const [stage, setStage] = useState(0);
  const current = chain[Math.min(stage, chain.length - 1)];
  const isCrest = current === CREST;
  const canFallBack = stage < chain.length - 1;

  return (
    <Image
      ref={(img) => {
        // The error may have fired before hydration attached onError.
        if (img && canFallBack && img.complete && img.naturalWidth === 0) setStage((s) => s + 1);
      }}
      key={current}
      src={current}
      alt={isCrest ? "" : alt}
      fill
      sizes={sizes}
      priority={priority}
      onError={() => canFallBack && setStage((s) => s + 1)}
      className={cn(isCrest ? "object-contain p-10 opacity-30" : "object-contain object-bottom", className)}
    />
  );
}
