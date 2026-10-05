"use client";

import Image from "next/image";
import { useState } from "react";

interface ManagerAvatarProps {
  name: string;
  image?: string;
}

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

/** Round manager portrait that falls back to initials when the (often remote) photo fails. */
export function ManagerAvatar({ name, image }: ManagerAvatarProps) {
  const [error, setError] = useState(false);

  if (image && !error) {
    return (
      <Image
        src={image}
        alt=""
        fill
        className="object-cover object-top"
        sizes="56px"
        unoptimized
        onError={() => setError(true)}
      />
    );
  }

  return (
    <span aria-hidden className="flex size-full items-center justify-center font-bebas text-2xl text-white/60">
      {getInitials(name)}
    </span>
  );
}
