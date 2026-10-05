"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { User, Heart, Bookmark, Flame, LogOut, Settings } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { logout } from "@/app/actions/auth";
import { ProfileForm } from "./profile-form";
import { AvatarUpload } from "./avatar-upload";
import { CoverSelector } from "./cover-selector";
import { FavouriteList } from "./favourite-list";
import { SavedArticlesList } from "./saved-articles-list";
import type { UserProfile, FavouritePlayer, SavedArticle } from "@/lib/supabase";
import { formatMonthYear } from "@/lib/format-match-date";

type TabId = "profile" | "articles" | "players";

interface ProfileLayoutProps {
  user: { id: string; email: string | null; createdAt: string };
  profile: UserProfile | null;
  favourites: FavouritePlayer[];
  savedArticles: SavedArticle[];
  isAdmin?: boolean;
  currentHeroBg?: string | null;
}

/** Settings-style profile: identity header, three tabs, one card per tab. */
export function ProfileLayout({ user, profile, favourites, savedArticles, isAdmin, currentHeroBg }: ProfileLayoutProps) {
  const t = useTranslations("Profile");
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    fetch("/api/streak")
      .then((r) => r.json())
      .then((d) => setStreak(d.streak ?? 0))
      .catch(() => {});
  }, []);

  const memberSince = user.createdAt ? formatMonthYear(new Date(user.createdAt), locale === "vi" ? "vi" : "en") : null;

  const tabs: { id: TabId; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "profile", label: t("title"), icon: <Settings size={16} aria-hidden /> },
    { id: "articles", label: t("savedArticles"), icon: <Bookmark size={16} aria-hidden />, count: savedArticles.length },
    { id: "players", label: t("favouritePlayers"), icon: <Heart size={16} aria-hidden />, count: favourites.length },
  ];

  return (
    <div className="pt-[calc(var(--header-h)+1.5rem)] pb-20 sm:pt-[calc(var(--header-h)+2.5rem)]">
      <div className="page-container max-w-4xl">
        {/* Identity */}
        <header className="surface flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-6">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-full ring-2 ring-lfc-red/40 sm:size-20">
            {profile?.avatar_url ? (
              <Image src={profile.avatar_url} alt="" fill className="object-cover" sizes="80px" unoptimized />
            ) : (
              <div className="flex size-full items-center justify-center bg-[var(--surface-3)]">
                <User size={28} aria-hidden className="text-stadium-muted" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-bebas text-4xl leading-none text-white">{profile?.username ?? "Red Member"}</h1>
            <p className="mt-1 truncate text-sm text-stadium-muted">{user.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stadium-muted">
              {memberSince && <span>{t("memberSince", { date: memberSince })}</span>}
              <span className="inline-flex items-center gap-1.5" title={t("streakLabel")}>
                <Flame size={14} aria-hidden className={streak > 0 ? "text-orange-400" : "text-stadium-muted"} />
                <span className={streak > 0 ? "text-orange-400" : undefined}>{t("streakCount", { count: streak })}</span>
              </span>
            </div>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 border border-[var(--line-strong)] px-4 font-barlow text-sm font-semibold uppercase tracking-[0.1em] text-stadium-muted transition-colors hover:border-white/40 hover:text-white sm:w-auto"
            >
              <LogOut size={16} aria-hidden />
              {t("signOut")}
            </button>
          </form>
        </header>

        {/* Tabs */}
        <div role="tablist" aria-label={t("title")} className="scroll-x mt-4 flex gap-1 border-b border-[var(--line)]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              id={`profile-tab-${tab.id}`}
              role="tab"
              type="button"
              aria-selected={activeTab === tab.id}
              aria-controls={`profile-panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "inline-flex min-h-12 shrink-0 items-center gap-2 border-b-2 px-4 font-barlow text-sm font-semibold uppercase tracking-[0.1em] transition-colors",
                activeTab === tab.id ? "border-lfc-red text-white" : "border-transparent text-stadium-muted hover:text-white",
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && <span className="font-inter text-xs text-stadium-muted">{tab.count}</span>}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`profile-panel-${activeTab}`} aria-labelledby={`profile-tab-${activeTab}`} className="mt-4 space-y-4">
          {activeTab === "profile" && (
            <>
              <section className="surface p-4 sm:p-6">
                <div className="flex flex-col gap-6 sm:flex-row">
                  <div className="flex shrink-0 justify-center sm:justify-start">
                    <AvatarUpload currentUrl={profile?.avatar_url ?? null} username={profile?.username ?? null} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <ProfileForm profile={profile ?? null} />
                  </div>
                </div>
              </section>
              {isAdmin && (
                <section className="surface p-4 sm:p-6">
                  <CoverSelector currentCoverUrl={currentHeroBg ?? null} />
                </section>
              )}
            </>
          )}

          {activeTab === "articles" && (
            <section className="surface p-4 sm:p-6">
              <h2 className="mb-4 font-bebas text-2xl text-white">
                {t("savedArticles")}
                {savedArticles.length > 0 && <span className="ml-2 font-inter text-sm font-normal text-stadium-muted">({savedArticles.length})</span>}
              </h2>
              <SavedArticlesList articles={savedArticles} />
            </section>
          )}

          {activeTab === "players" && (
            <section className="surface p-4 sm:p-6">
              <h2 className="mb-4 font-bebas text-2xl text-white">
                {t("favouritePlayers")}
                {favourites.length > 0 && <span className="ml-2 font-inter text-sm font-normal text-stadium-muted">({favourites.length})</span>}
              </h2>
              <FavouriteList favourites={favourites} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
