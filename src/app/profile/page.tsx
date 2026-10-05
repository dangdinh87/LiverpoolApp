import type { Metadata } from "next";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/ui/empty-state";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/constants";
import { getSiteSetting } from "@/lib/gallery/queries";
import { ProfileLayout } from "@/components/profile/profile-layout";
import type { UserProfile, FavouritePlayer, SavedArticle } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "My Profile",
  description: "Manage your Liverpool FC fan profile.",
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Middleware already bounces signed-out visitors to the login page; this is the
  // fallback if it ever lets one through: a clear prompt instead of a redirect.
  if (!user) {
    const t = await getTranslations("Profile.signedOut");
    return (
      <div className="page-container pt-[calc(var(--header-h)+2rem)] pb-16">
        <EmptyState
          icon={<LogIn className="size-10" aria-hidden />}
          title={t("title")}
          description={t("description")}
          actionHref="/auth/login?redirect=/profile"
          actionLabel={t("action")}
        />
        <p className="mt-4 text-center text-sm text-stadium-muted">
          <Link href="/" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">{t("home")}</Link>
        </p>
      </div>
    );
  }

  const [{ data: profile }, { data: favourites }, { data: savedArticles }] = await Promise.all([
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
    supabase
      .from("saved_articles")
      .select("*")
      .eq("user_id", user.id)
      .order("saved_at", { ascending: false }),
  ]);

  const admin = isAdminEmail(user.email);

  // Fetch current homepage hero bg for admin selector
  let currentHeroBg: string | null = null;
  if (admin) {
    try {
      const setting = await getSiteSetting<{ cloudinary_url: string }>("homepage_hero_image");
      currentHeroBg = setting?.cloudinary_url ?? null;
    } catch { /* fallback to null */ }
  }

  return (
    <ProfileLayout
      user={{ id: user.id, email: user.email ?? null, createdAt: user.created_at }}
      profile={profile ?? null}
      favourites={(favourites ?? []) as FavouritePlayer[]}
      savedArticles={(savedArticles ?? []) as SavedArticle[]}
      isAdmin={admin}
      currentHeroBg={currentHeroBg}
    />
  );
}
