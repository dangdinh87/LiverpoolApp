import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { LfcPlayer, PlayerPosition } from "@/lib/squad-data";
import { cn } from "@/lib/utils";

// Position badge color map
const POSITION_COLORS: Record<PlayerPosition, string> = {
  goalkeeper: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  defender: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  midfielder: "bg-green-500/20 text-green-400 border-green-500/30",
  forward: "bg-lfc-red/20 text-lfc-red border-lfc-red/30",
};

// Position key mapping for translations
const POSITION_TRANSLATION_KEYS: Record<PlayerPosition, string> = {
  goalkeeper: "GK",
  defender: "DEF",
  midfielder: "MID",
  forward: "FWD",
};

interface PlayerCardProps {
  player: LfcPlayer;
}

export function PlayerCard({ player }: PlayerCardProps) {
  const t = useTranslations("Squad");
  return (
    <Link href={`/player/${player.slug}`} className="group block">
      <div
        className={cn(
          "relative overflow-hidden rounded-none bg-stadium-surface border border-stadium-border",
          "transition-all duration-300",
          "hover:border-lfc-red/60 hover:bg-stadium-surface2 hover:shadow-[0_0_20px_rgba(200,16,46,0.15)]"
        )}
      >
        {/* Jersey number watermark */}
        {player.shirtNumber && (
          <span
            className="absolute bottom-0 right-0 font-bebas text-white leading-none pointer-events-none select-none translate-x-4 translate-y-4"
            style={{ fontSize: "7rem", opacity: 0.04 }}
            aria-hidden="true"
          >
            {player.shirtNumber}
          </span>
        )}

        {/* Player photo */}
        <div className="relative h-48 bg-gradient-to-b from-stadium-surface2 to-stadium-surface overflow-hidden">
          <Image
            src={player.localPhoto}
            alt={player.name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className="object-contain object-bottom transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>

        {/* Player info */}
        <div className="p-4 relative z-10">
          {/* Position badge + status badges */}
          <div className="flex items-center justify-between mb-2">
            <Badge
              variant="outline"
              className={cn(
                "text-xs font-barlow font-semibold uppercase tracking-wider",
                POSITION_COLORS[player.position]
              )}
            >
              {t(`positions.${POSITION_TRANSLATION_KEYS[player.position]}`)}
            </Badge>
            <div className="flex gap-1">
              {player.onLoan && (
                <Badge
                  variant="outline"
                  className="text-xs bg-amber-500/20 text-amber-400 border-amber-500/30"
                >
                  {t("status.onLoan")}
                </Badge>
              )}
              {player.forever && (
                <Badge
                  variant="outline"
                  className="text-xs bg-lfc-gold/20 text-lfc-gold border-lfc-gold/30"
                >
                  {t("status.forever")}
                </Badge>
              )}
            </div>
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
