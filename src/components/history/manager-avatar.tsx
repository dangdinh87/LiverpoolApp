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

export function ManagerAvatar({ name, image }: ManagerAvatarProps) {
  const [error, setError] = useState(false);

  if (image && !error) {
    return (
      <Image
        src={image}
        alt={name}
        fill
        className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
        sizes="56px"
        unoptimized
        onError={() => setError(true)}
      />
    );
  }

  return (
    <span className="w-full h-full flex items-center justify-center font-bebas text-2xl text-white/20">
      {getInitials(name)}
    </span>
  );
}
