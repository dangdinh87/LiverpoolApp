// Lightweight server component — no cookies/headers to allow ISR caching.
// Auth state is fetched client-side in NavbarClient.
import { NavbarClient } from "./navbar-client";

export function NavbarAuth() {
  return <NavbarClient user={null} profile={null} nextMatchDate={null} isMatchLive={false} />;
}
