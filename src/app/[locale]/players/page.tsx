import { permanentRedirect } from "@/i18n/navigation";
import type { LocaleParams } from "@/i18n/routing";

export default async function PlayersPage({ params }: LocaleParams) {
  const { locale } = await params;
  // Permanent (308): /players is a legacy URL that should hand its ranking to /squad.
  // Locale-aware: next/navigation's redirect sent /vi/players to the English /squad.
  permanentRedirect({ href: "/squad", locale });
}
