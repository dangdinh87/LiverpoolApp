// Server component — fetches auth state and passes to client Navbar
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { UserProfile } from "@/lib/supabase";
import { NavbarClient } from "./navbar-client";

export async function NavbarAuth() {
  try {
    const supabase = await createServerSupabaseClient();
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
      />
    );
  } catch {
    // Fallback if Supabase is not configured (dev without .env)
    return <NavbarClient user={null} profile={null} />;
  }
}
