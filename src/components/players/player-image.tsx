"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const PLACEHOLDER = "/assets/lfc/player-placeholder.svg";

interface PlayerImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
}

/** Player photo with automatic fallback to LFC-branded placeholder on error */
export function PlayerImage({ src, alt, width, height, className, priority }: PlayerImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  return (
    <Image
      src={imgSrc}
      alt={alt}
      width={width}
      height={height}
      className={cn(className, hasError && "opacity-60")}
      unoptimized={hasError}
      priority={priority}
      onError={() => {
        if (!hasError) {
          setImgSrc(PLACEHOLDER);
          setHasError(true);
        }
      }}
    />
  );
}
