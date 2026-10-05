import { permanentRedirect } from "next/navigation";

export default function PlayersPage() {
  // Permanent (308): /players is a legacy URL that should hand its ranking to /squad.
  permanentRedirect("/squad");
}
