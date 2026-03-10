import type { Player } from "@/lib/types/football";

// Map player lastname → local LFC headshot (official images from liverpoolfc.com)
const LFC_HEADSHOTS: Record<string, string> = {
  Alisson: "/assets/lfc/players/alisson.webp",
  "van Dijk": "/assets/lfc/players/van-dijk-headshot.webp",
  Salah: "/assets/lfc/players/salah.webp",
  Szoboszlai: "/assets/lfc/players/szoboszlai.webp",
  Gakpo: "/assets/lfc/players/gakpo.webp",
  Gravenberch: "/assets/lfc/players/gravenberch.webp",
  "Mac Allister": "/assets/lfc/players/mac-allister.webp",
  Konaté: "/assets/lfc/players/konate.webp",
  Robertson: "/assets/lfc/players/robertson.webp",
  Gomez: "/assets/lfc/players/gomez.webp",
  Bradley: "/assets/lfc/players/bradley.webp",
  Jones: "/assets/lfc/players/jones.webp",
  Elliott: "/assets/lfc/players/elliott.webp",
  Tsimikas: "/assets/lfc/players/tsimikas.webp",
  Chiesa: "/assets/lfc/players/chiesa.webp",
  Jota: "/assets/lfc/players/jota.webp",
  Endo: "/assets/lfc/players/endo.webp",
  Mamardashvili: "/assets/lfc/players/mamardashvili.webp",
  Kerkez: "/assets/lfc/players/kerkez.webp",
  Wirtz: "/assets/lfc/players/wirtz.webp",
  Ekitike: "/assets/lfc/players/ekitike.webp",
  Frimpong: "/assets/lfc/players/frimpong.webp",
  Isak: "/assets/lfc/players/isak.webp",
  Nyoni: "/assets/lfc/players/nyoni.webp",
};

/** Return local LFC headshot if available, otherwise API photo */
export function getPlayerPhoto(player: Pick<Player, "lastname" | "name" | "photo">): string {
  return LFC_HEADSHOTS[player.lastname] ?? LFC_HEADSHOTS[player.name] ?? player.photo;
}
