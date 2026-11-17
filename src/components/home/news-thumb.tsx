"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { BrandMark } from "@/components/layout/brand-mark";
import { isEmbeddableImageUrl } from "@/components/news/news-text";
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
 * publisher's CORP/hotlink rules or fails to load, the site's own BrandMark
 * tile takes its place (never the club crest, per brand guidelines).
 */
export function NewsThumb({ src, sizes, priority, className, crestClassName }: NewsThumbProps) {
  const [failed, setFailed] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const canEmbed = isEmbeddableImageUrl(src);

  // An image can fail before hydration attaches onError; catch that case too.
  useEffect(() => {
    const img = wrapRef.current?.querySelector("img");
    if (img && img.complete && img.naturalWidth === 0) {
      setFailed(true);
    }
  }, [src]);

  return (
    <div ref={wrapRef} className="absolute inset-0 bg-[var(--surface-3)]">
      {canEmbed && !failed ? (
        <Image
          src={src}
          alt=""
          fill
          unoptimized
          sizes={sizes}
          priority={priority}
          loading={priority ? undefined : "lazy"}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className={cn("object-cover", className)}
        />
      ) : (
        <div
          aria-hidden
          className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-lfc-red/20 via-[var(--surface-2)] to-[var(--surface-1)]"
        >
          <BrandMark className={cn("size-10 opacity-45", crestClassName)} />
        </div>
      )}
    </div>
  );
}
