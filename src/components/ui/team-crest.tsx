"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface TeamCrestProps {
  src: string | null | undefined;
  /** Team name: only used to draw the fallback initials. */
  name: string;
  /** Pixel size hint for `next/image` (the box itself is sized by the parent). */
  sizes?: string;
  className?: string;
}

const initials = (name: string) =>
  name
    .replace(/\b(FC|AFC|CF|SC)\b/gi, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

/**
 * A club crest that never leaves a blank hole: when the provider has no logo
 * (Brighton's is missing in the data) or the image fails to load, it shows the
 * club's initials on a neutral disc instead. Fills its parent, which must be
 * `relative` and sized.
 */
export function TeamCrest({ src, name, sizes = "48px", className }: TeamCrestProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 flex items-center justify-center rounded-full bg-white/10 font-barlow text-[0.55em] font-bold leading-none tracking-wide text-white/70",
          className,
        )}
      >
        {initials(name)}
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt=""
      fill
      sizes={sizes}
      className={cn("object-contain", className)}
      onError={() => setFailed(true)}
    />
  );
}
