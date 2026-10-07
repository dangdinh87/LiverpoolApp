"use client";

import { useState } from "react";
import Image from "next/image";
import { SOURCE_CONFIG, type NewsSource } from "@/lib/news-config";
import { isHttpUrl } from "./news-text";

interface NewsThumbProps {
  src?: string;
  /** Empty for decorative thumbnails (the card title already names the story). */
  alt?: string;
  source: NewsSource;
  sizes: string;
  priority?: boolean;
  className?: string;
}

/**
 * Thumbnail that always fills its parent (the parent owns the aspect ratio, so
 * nothing shifts). Missing or broken images fall back to a neutral tile with
 * the source name as plain text (no outlet colours or logos).
 *
 * News images stay `unoptimized` (publisher CDNs, Vercel Hobby image quota) and
 * are sent without a referrer: several publishers block hot-linking by Referer.
 */
export function NewsThumb({ src, alt = "", source, sizes, priority, className }: NewsThumbProps) {
  const [failed, setFailed] = useState(false);
  const cfg = SOURCE_CONFIG[source];

  if (!isHttpUrl(src) || failed) {
    return (
      <div
        aria-hidden
        className="absolute inset-0 flex items-center justify-center bg-[var(--surface-3)] px-3 text-center"
      >
        <span className="font-bebas text-xl leading-tight tracking-wide text-stadium-muted">{cfg?.label ?? ""}</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      loading={priority ? undefined : "lazy"}
      unoptimized
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`object-cover ${className ?? ""}`}
    />
  );
}
