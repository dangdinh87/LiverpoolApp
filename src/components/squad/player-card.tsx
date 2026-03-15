import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { FavouriteHeart } from "./favourite-heart";
import { calculateAge, type LfcPlayer, type PlayerPosition } from "@/lib/squad-data";
import { cn } from "@/lib/utils";

// Nationality → flag emoji
const NATIONALITY_FLAGS: Record<string, string> = {
  Argentinian: "🇦🇷", Brazilian: "🇧🇷", Czech: "🇨🇿", Dutch: "🇳🇱",
  Egyptian: "🇪🇬", English: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", French: "🇫🇷", Georgian: "🇬🇪",
  German: "🇩🇪", Greek: "🇬🇷", Hungarian: "🇭🇺", Italian: "🇮🇹",
  Japanese: "🇯🇵", "Northern Irish": "🇬🇧", Portuguese: "🇵🇹",
  Scottish: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", Spanish: "🇪🇸", Swedish: "🇸🇪",
  Irish: "🇮🇪", Welsh: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", Colombian: "🇨🇴", Uruguayan: "🇺🇾",
  Belgian: "🇧🇪", Senegalese: "🇸🇳", Guinean: "🇬🇳", American: "🇺🇸",
};

// Position badge color map
const POSITION_COLORS: Record<PlayerPosition, string> = {
  goalkeeper: "bg-yellow-500 text-white",
  defender: "bg-blue-500 text-white",
  midfielder: "bg-green-600 text-white",
  forward: "bg-lfc-red text-white",
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
  isFavourited?: boolean;
  isLoggedIn?: boolean;
  onToggleFavourite?: (playerId: number, added: boolean) => void;
  onFavNotify?: (playerName: string, added: boolean) => void;
}

export function PlayerCard({ player, isFavourited = false, isLoggedIn = false, onToggleFavourite, onFavNotify }: PlayerCardProps) {
  const t = useTranslations("Squad");
  const pt = useTranslations("PlayerDetail.info");
  const age = calculateAge(player.dateOfBirth);
  const flag = player.nationality ? NATIONALITY_FLAGS[player.nationality] ?? "" : "";
  const metaItems = [
    Number.isFinite(age) ? { label: pt("age"), value: pt("ageYears", { age }) } : null,
    player.height ? { label: pt("height"), value: player.height } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <Link href={`/player/${player.slug}`} className="group block">
      <div
        className={cn(
          "relative overflow-hidden rounded-none bg-stadium-surface border border-stadium-border",
          "transition-all duration-300",
          "hover:border-lfc-red/60 hover:bg-stadium-surface2 hover:shadow-[0_0_30px_rgba(200,16,46,0.25),0_0_60px_rgba(200,16,46,0.08)]"
        )}
      >
        {/* Jersey number watermark — stronger and more legible */}
        {player.shirtNumber && (
          <span
            className="absolute bottom-0 right-0 font-bebas text-white leading-none pointer-events-none select-none translate-x-3 translate-y-3 transition-all duration-500 group-hover:translate-x-1 group-hover:translate-y-1"
            style={{
              fontSize: "7.5rem",
              opacity: 0.18,
              WebkitTextStroke: "1px rgba(255,255,255,0.18)",
              textShadow: "0 0 30px rgba(200,16,46,0.15)",
            }}
            aria-hidden="true"
          >
            {player.shirtNumber}
          </span>
        )}

        {/* Player photo */}
        <div className="relative h-48 bg-linear-to-b from-stadium-surface2 via-stadium-surface2 to-stadium-surface overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(200,16,46,0.22),transparent_38%)] pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(13,13,13,0.92),rgba(13,13,13,0.1))] pointer-events-none" />
          {/* LFC crest watermark behind player photo */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <Image
              src="/assets/lfc/crest.webp"
              alt=""
              width={160}
              height={160}
              className="object-contain opacity-[0.12]"
              aria-hidden="true"
            />
          </div>
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
            <span className={cn(
              "text-xs font-barlow font-bold uppercase tracking-widest px-2.5 py-1",
              POSITION_COLORS[player.position]
            )}>
              {t(`positions.${POSITION_TRANSLATION_KEYS[player.position]}`)}
            </span>
            <div className="flex gap-1">
              {player.onLoan && (
                <span className="text-xs font-barlow font-bold uppercase tracking-widest px-2.5 py-1 bg-amber-500 text-white">
                  {t("status.onLoan")}
                </span>
              )}
              {player.forever && (
                <span className="text-xs font-barlow font-bold uppercase tracking-widest px-2.5 py-1 bg-lfc-gold text-black">
                  {t("status.forever")}
                </span>
              )}
            </div>
          </div>

          {/* Name + favourite */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-inter font-semibold text-white text-sm leading-tight truncate group-hover:text-lfc-red transition-colors">
                {flag && <span className="mr-1" aria-label={player.nationality}>{flag}</span>}{player.name}
              </h3>
              <p className="text-white/70 text-xs font-inter mt-0.5 truncate">
                {player.shirtName}
              </p>
            </div>
            {onToggleFavourite && (
              <FavouriteHeart
                playerId={player.id}
                playerName={player.name}
                playerPhoto={player.photo}
                isFavourited={isFavourited}
                isLoggedIn={isLoggedIn}
                onToggle={onToggleFavourite}
                onNotify={onFavNotify}
                variant="inline"
              />
            )}
          </div>

          {metaItems.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-stadium-border/70 pt-3">
              {metaItems.slice(0, 4).map((item) => (
                <div key={item.label} className="min-w-0">
                  <p className="font-barlow text-[9px] uppercase tracking-[0.18em] text-stadium-muted mb-1">
                    {item.label}
                  </p>
                  <p className="font-inter text-xs text-white truncate">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
