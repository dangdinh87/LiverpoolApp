import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { LogIn } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { LocaleParams } from "@/i18n/routing";
import { EmptyState } from "@/components/ui/empty-state";
import { PresetConnectedGrid } from "@/components/ui/hub-links";
import { getCachedFixtures } from "@/lib/football/cached-fixtures";
import { predictionPoints } from "@/lib/fan-predictions/scoring";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/constants";
import { getSiteSetting } from "@/lib/gallery/queries";
import { ProfileLayout } from "@/components/profile/profile-layout";
import type { UserProfile, FavouritePlayer, SavedArticle } from "@/lib/supabase";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Profile.metadata" });
  return { title: t("title"), description: t("description"), robots: { index: false, follow: false } };
}

export default async function ProfilePage({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);
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

  const admin = isAdminEmail(user.email);

  const [{ data: profile }, { data: favourites }, { data: savedArticles }, { data: predictions }, fixtures, heroSetting, tHub] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle<UserProfile>(),
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
    supabase
      .from("match_predictions")
      .select("fixture_id, home_goals, away_goals")
      .eq("user_id", user.id),
    getCachedFixtures().catch(() => []),
    admin
      ? getSiteSetting<{ cloudinary_url: string }>("homepage_hero_image").catch(() => null)
      : Promise.resolve(null),
    getTranslations("Hub"),
  ]);

  const currentHeroBg = heroSetting?.cloudinary_url ?? null;
  const finished = new Set(["FT", "AET", "PEN"]);
  const scoreByFixture = new Map<number, { home: number; away: number }>();
  for (const f of fixtures) {
    if (finished.has(f.fixture.status.short) && f.goals.home !== null && f.goals.away !== null) {
      scoreByFixture.set(f.fixture.id, { home: f.goals.home, away: f.goals.away });
    }
  }
  let totalPoints = 0;
  for (const p of predictions ?? []) {
    const actual = scoreByFixture.get(p.fixture_id);
    if (actual) {
      totalPoints += predictionPoints({ home: p.home_goals, away: p.away_goals }, actual);
    }
  }
  const favCount = (favourites ?? []).length;
  const savedCount = (savedArticles ?? []).length;

  return (
    <>
      <ProfileLayout
        user={{ id: user.id, email: user.email ?? null, createdAt: user.created_at }}
        profile={profile ?? null}
        favourites={(favourites ?? []) as FavouritePlayer[]}
        savedArticles={(savedArticles ?? []) as SavedArticle[]}
        isAdmin={admin}
        currentHeroBg={currentHeroBg}
      />
      <div className="page-container -mt-8 max-w-4xl pb-20">
        <PresetConnectedGrid
          preset="fromProfile"
          metaOverrides={{
            predictions: `${totalPoints} ${tHub("metrics.predictionPoints")}`,
            ...(favCount > 0 && { squad: `${favCount} ${tHub("cards.squad.badge")}` }),
            ...(savedCount > 0 && { news: `${savedCount} ${tHub("metrics.savedArticles")}` }),
          }}
        />
      </div>
    </>
  );
}
