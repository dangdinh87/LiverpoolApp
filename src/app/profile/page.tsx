import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { logout } from "@/app/actions/auth";
import { ProfileForm } from "@/components/profile/profile-form";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { FavouriteList } from "@/components/profile/favourite-list";
import type { UserProfile, FavouritePlayer } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "My Profile",
  description: "Manage your Liverpool FC fan profile.",
};

export default async function ProfilePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?redirect=/profile");

  // Fetch profile row
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single<UserProfile>();

  // Fetch favourites
  const { data: favourites } = await supabase
    .from("favourite_players")
    .select("*")
    .eq("user_id", user.id)
    .order("added_at", { ascending: false });

  const favList = (favourites ?? []) as FavouritePlayer[];

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="font-barlow text-lfc-red uppercase tracking-widest text-sm font-semibold mb-1">
              My Account
            </p>
            <h1 className="font-bebas text-5xl text-white tracking-wider leading-none">
              Profile
            </h1>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-2 text-stadium-muted hover:text-white font-inter text-sm transition-colors border border-stadium-border rounded-lg px-3 py-2 hover:border-white/30"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </form>
        </div>

        {/* Profile info section */}
        <div className="bg-stadium-surface border border-stadium-border rounded-2xl p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <AvatarUpload
                currentUrl={profile?.avatar_url ?? null}
                username={profile?.username ?? null}
              />
            </div>

            {/* Profile form */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <User size={14} className="text-stadium-muted" />
                <span className="font-inter text-xs text-stadium-muted">
                  {user.email}
                </span>
              </div>
              <h2 className="font-bebas text-2xl text-white tracking-wider mb-5">
                {profile?.username ?? "Set your username"}
              </h2>
              <ProfileForm profile={profile ?? null} />
            </div>
          </div>
        </div>

        {/* Favourite players */}
        <div className="bg-stadium-surface border border-stadium-border rounded-2xl p-6 md:p-8">
          <h2 className="font-bebas text-2xl text-white tracking-wider mb-5">
            Favourite Players
            {favList.length > 0 && (
              <span className="font-inter text-sm text-stadium-muted font-normal ml-2">
                ({favList.length})
              </span>
            )}
          </h2>
          <FavouriteList favourites={favList} />
        </div>
      </div>
    </div>
  );
}
