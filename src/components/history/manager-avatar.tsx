"use client";

import { useState } from "react";
import { DuotonePhoto } from "@/components/history/duotone-photo";

interface ManagerAvatarProps {
  name: string;
  image?: string;
}

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

/**
 * Round manager portrait in the same duotone as the legend cards. Falls back to
 * initials (same red-tinted tile) when there is no photo or the remote one fails.
 * The parent must be `relative isolate overflow-hidden`.
 */
export function ManagerAvatar({ name, image }: ManagerAvatarProps) {
  const [error, setError] = useState(false);

  if (image && !error) {
    // Remote thumbnails (Wikimedia) are not in next.config's image hosts: serve them as they are.
    return <DuotonePhoto src={image} fill sizes="56px" unoptimized={image.startsWith("http")} onError={() => setError(true)} />;
  }

  return (
    <span
      aria-hidden
      className="flex size-full items-center justify-center bg-gradient-to-b from-lfc-red/25 to-transparent font-bebas text-2xl text-white/40"
    >
      {getInitials(name)}
    </span>
  );
}
