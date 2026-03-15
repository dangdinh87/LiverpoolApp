// Server component — fetches auth state and next match info, passes to client Navbar
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { UserProfile } from "@/lib/supabase";
import { getFixtures } from "@/lib/football";
import { NavbarClient } from "./navbar-client";

const LIVE_STATUSES = ["1H", "2H", "HT", "ET", "P", "LIVE"];

/** Find next upcoming match date and whether a match is currently live. */
async function getMatchStatus(): Promise<{ nextMatchDate: string | null; isLive: boolean }> {
  try {
    const fixtures = await getFixtures();
    const isLive = fixtures.some((f) => LIVE_STATUSES.includes(f.fixture.status.short));
    const upcoming = fixtures
      .filter((f) => f.fixture.status.short === "NS")
      .sort((a, b) => a.fixture.date.localeCompare(b.fixture.date));
    return { nextMatchDate: upcoming[0]?.fixture.date ?? null, isLive };
  } catch {
    return { nextMatchDate: null, isLive: false };
  }
}

export async function NavbarAuth() {
  try {
    const [supabase, matchStatus] = await Promise.all([
      createServerSupabaseClient(),
      getMatchStatus(),
    ]);
    const { data: { user } } = await supabase.auth.getUser();

    let profile: UserProfile | null = null;
    if (user) {
      const { data } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single<UserProfile>();
      profile = data;
    }

    return (
      <NavbarClient
        user={user ? { id: user.id, email: user.email ?? null } : null}
        profile={profile}
        nextMatchDate={matchStatus.nextMatchDate}
        isMatchLive={matchStatus.isLive}
      />
    );
  } catch {
    return <NavbarClient user={null} profile={null} nextMatchDate={null} isMatchLive={false} />;
  }
}
