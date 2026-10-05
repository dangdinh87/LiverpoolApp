"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface NewsThumbProps {
  src?: string;
  sizes: string;
  /** Only for the single LCP image on the page. */
  priority?: boolean;
  className?: string;
  crestClassName?: string;
}

/**
 * Fills its (aspect-ratio) parent. When the image is missing, blocked by the
 * publisher's hotlink rules or fails to load, a crest tile takes its place, so
 * a card never shows a broken-image icon or collapses.
 */
export function NewsThumb({ src, sizes, priority, className, crestClassName }: NewsThumbProps) {
  const [failed, setFailed] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // An image can fail before hydration attaches onError; catch that case too.
  useEffect(() => {
    const img = wrapRef.current?.querySelector("img");
    if (img && img.complete && img.naturalWidth === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFailed(true);
    }
  }, [src]);

  return (
    <div ref={wrapRef} className="absolute inset-0 bg-[var(--surface-3)]">
      {src && !failed ? (
        <Image
          src={src}
          alt=""
          fill
          unoptimized
          sizes={sizes}
          priority={priority}
          loading={priority ? undefined : "lazy"}
          onError={() => setFailed(true)}
          className={cn("object-cover", className)}
        />
      ) : (
        <div
          aria-hidden
          className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-lfc-red/25 via-[var(--surface-2)] to-[var(--surface-1)]"
        >
          <Image
            src="/assets/lfc/crest.webp"
            alt=""
            width={48}
            height={60}
            className={cn("h-auto w-10 opacity-40", crestClassName)}
          />
        </div>
      )}
    </div>
  );
}
