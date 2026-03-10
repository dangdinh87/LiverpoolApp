"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PlayerPosition } from "@/lib/squad-data";
import { POSITION_DISPLAY } from "@/lib/squad-data";
import { cn } from "@/lib/utils";

const POSITION_COLORS: Record<PlayerPosition, string> = {
  goalkeeper: "text-yellow-400",
  defender: "text-blue-400",
  midfielder: "text-green-400",
  forward: "text-lfc-red",
};

interface CarouselPlayer {
  id: number;
  name: string;
  slug: string;
  position: PlayerPosition;
  localPhoto: string;
}

interface SquadCarouselProps {
  players: CarouselPlayer[];
}

export function SquadCarousel({ players }: SquadCarouselProps) {
  const t = useTranslations("Bento");
  const scrollRef = useRef<HTMLDivElement>(null);
  const featured = players.slice(0, 10);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
  };

  return (
    <div className="flex flex-col gap-3 p-5 h-full">
      <div className="flex items-center justify-between">
        <span className="font-barlow text-stadium-muted text-xs uppercase tracking-widest font-semibold">
          {t("squad")}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => scroll("left")}
            className="w-6 h-6 rounded-full bg-stadium-surface2 flex items-center justify-center text-stadium-muted hover:text-white transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="w-6 h-6 rounded-full bg-stadium-surface2 flex items-center justify-center text-stadium-muted hover:text-white transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1"
        style={{ scrollbarWidth: "none" }}
      >
        {featured.map((player) => (
          <Link
            key={player.id}
            href={`/player/${player.slug}`}
            className="flex-shrink-0 w-20 snap-start group"
          >
            <div className="relative w-20 h-20 rounded-none overflow-hidden bg-stadium-surface2 border border-stadium-border group-hover:border-lfc-red/50 transition-colors">
              <Image
                src={player.localPhoto}
                alt={player.name}
                fill
                sizes="80px"
                className="object-contain object-bottom"
              />
            </div>
            <p className="font-inter text-xs text-white font-semibold truncate mt-1 group-hover:text-lfc-red transition-colors">
              {player.name.split(" ").pop()}
            </p>
            <p className={cn("font-barlow text-xs font-semibold uppercase", POSITION_COLORS[player.position])}>
              {POSITION_DISPLAY[player.position]}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
