import { notFound } from "next/navigation";

// Unknown paths under a locale render the localized not-found page with the
// site layout instead of the bare global 404.
export default function CatchAllNotFound() {
  notFound();
}
