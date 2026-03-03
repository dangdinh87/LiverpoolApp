import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import type { Player } from "@/lib/types/football";
import { POSITION_LABELS } from "@/lib/types/football";
import { cn } from "@/lib/utils";

// Position badge color map
const POSITION_COLORS: Record<Player["position"], string> = {
  Goalkeeper: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  Defender: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Midfielder: "bg-green-500/20 text-green-400 border-green-500/30",
  Attacker: "bg-lfc-red/20 text-lfc-red border-lfc-red/30",
};

interface PlayerCardProps {
  player: Player;
}

export function PlayerCard({ player }: PlayerCardProps) {
  return (
    <Link href={`/player/${player.id}`} className="group block">
      <div
        className={cn(
          "relative overflow-hidden rounded-xl bg-stadium-surface border border-stadium-border",
          "transition-all duration-300",
          "hover:border-lfc-red/60 hover:bg-stadium-surface2 hover:shadow-[0_0_20px_rgba(200,16,46,0.15)]"
        )}
      >
        {/* Jersey number watermark — huge Bebas Neue in background */}
        {player.number && (
          <span
            className="absolute bottom-0 right-0 font-bebas text-white leading-none pointer-events-none select-none translate-x-4 translate-y-4"
            style={{ fontSize: "7rem", opacity: 0.04 }}
            aria-hidden="true"
          >
            {player.number}
          </span>
        )}

        {/* Player photo */}
        <div className="relative h-48 bg-gradient-to-b from-stadium-surface2 to-stadium-surface overflow-hidden">
          <Image
            src={player.photo}
            alt={player.name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className="object-contain object-bottom transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>

        {/* Player info */}
        <div className="p-4 relative z-10">
          {/* Position badge */}
          <div className="flex items-center justify-between mb-2">
            <Badge
              variant="outline"
              className={cn(
                "text-xs font-barlow font-semibold uppercase tracking-wider",
                POSITION_COLORS[player.position]
              )}
            >
              {POSITION_LABELS[player.position]}
            </Badge>
            {player.injured && (
              <Badge
                variant="outline"
                className="text-xs bg-red-500/20 text-red-400 border-red-500/30"
              >
                Injured
              </Badge>
            )}
          </div>

          {/* Name */}
          <h3 className="font-inter font-semibold text-white text-sm leading-tight truncate group-hover:text-lfc-red transition-colors">
            {player.name}
          </h3>
          <p className="text-stadium-muted text-xs font-inter mt-0.5">
            {player.nationality}
          </p>
        </div>
      </div>
    </Link>
  );
}
