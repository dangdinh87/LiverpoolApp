import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { ProfileLayout } from "@/components/profile/profile-layout";
import type { UserProfile, FavouritePlayer } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "My Profile",
  description: "Manage your Liverpool FC fan profile.",
};

export default async function ProfilePage() {
  const [supabase, t] = await Promise.all([
    createServerSupabaseClient(),
    getTranslations("Profile"),
  ]);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?redirect=/profile");

  const [{ data: profile }, { data: favourites }] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single<UserProfile>(),
    supabase
      .from("favourite_players")
      .select("*")
      .eq("user_id", user.id)
      .order("added_at", { ascending: false }),
  ]);

  return (
    <ProfileLayout
      user={{ id: user.id, email: user.email ?? null, createdAt: user.created_at }}
      profile={profile ?? null}
      favourites={(favourites ?? []) as FavouritePlayer[]}
    />
  );
}
