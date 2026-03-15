"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Heart,
  Bookmark,
  Flame,
  LogOut,
  Settings,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { logout } from "@/app/actions/auth";
import { ProfileForm } from "./profile-form";
import { AvatarUpload } from "./avatar-upload";
import { CoverSelector } from "./cover-selector";
import { FavouriteList } from "./favourite-list";
import { SavedArticlesList } from "./saved-articles-list";
import type { UserProfile, FavouritePlayer, SavedArticle } from "@/lib/supabase";

type TabId = "profile" | "articles" | "players";

interface ProfileLayoutProps {
  user: { id: string; email: string | null; createdAt: string };
  profile: UserProfile | null;
  favourites: FavouritePlayer[];
  savedArticles: SavedArticle[];
  isAdmin?: boolean;
  currentHeroBg?: string | null;
}

export function ProfileLayout({ user, profile, favourites, savedArticles, isAdmin, currentHeroBg }: ProfileLayoutProps) {
  const t = useTranslations("Profile");
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    fetch("/api/streak")
      .then((r) => r.json())
      .then((d) => setStreak(d.streak ?? 0))
      .catch(() => {});
  }, []);

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("vi-VN", {
        month: "long",
        year: "numeric",
      })
    : null;

  const tabs: { id: TabId; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "profile", label: t("title"), icon: <Settings size={16} /> },
    { id: "articles", label: t("savedArticles"), icon: <Bookmark size={16} />, count: savedArticles.length },
    { id: "players", label: t("favouritePlayers"), icon: <Heart size={16} />, count: favourites.length },
  ];

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile layout: sidebar + content */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left sidebar */}
          <aside className="lg:w-64 shrink-0">
            {/* User card */}
            <div className="bg-stadium-surface border border-stadium-border p-5 mb-4">
              <div className="flex flex-col items-center text-center">
                {/* Avatar */}
                <div className="relative w-20 h-20 rounded-full overflow-hidden ring-2 ring-lfc-red/40 mb-3">
                  {profile?.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt={profile.username ?? "Avatar"}
                      fill
                      className="object-cover"
                      sizes="80px"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full bg-stadium-surface2 flex items-center justify-center">
                      <User size={28} className="text-stadium-muted" />
                    </div>
                  )}
                </div>
                <h1 className="font-bebas text-2xl text-white tracking-wider leading-none">
                  {profile?.username ?? "Red Member"}
                </h1>
                <p className="font-inter text-[11px] text-stadium-muted mt-0.5 truncate max-w-full">
                  {user.email}
                </p>
                {memberSince && (
                  <p className="font-inter text-[10px] text-stadium-muted/60 mt-1">
                    {t("memberSince", { date: memberSince })}
                  </p>
                )}

                {/* Streak badge */}
                <div
                  className="flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-stadium-bg border border-stadium-border rounded-full"
                  title={t("streakLabel")}
                >
                  <Flame size={14} className={streak > 0 ? "text-orange-400" : "text-stadium-muted"} />
                  <span className={cn(
                    "font-inter text-xs leading-none",
                    streak > 0 ? "text-orange-400" : "text-stadium-muted"
                  )}>
                    {t("streakCount", { count: streak })}
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation tabs */}
            <nav className="bg-stadium-surface border border-stadium-border overflow-hidden">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-sm font-barlow font-semibold uppercase tracking-[0.08em] transition-colors cursor-pointer",
                    activeTab === tab.id
                      ? "bg-lfc-red/10 text-white border-l-2 border-lfc-red"
                      : "text-stadium-muted hover:bg-stadium-surface2 hover:text-white border-l-2 border-transparent"
                  )}
                >
                  {tab.icon}
                  <span className="flex-1 text-left">{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="font-inter text-[10px] bg-stadium-bg px-1.5 py-0.5 rounded-full text-stadium-muted">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}

              {/* Logout */}
              <form action={logout} className="border-t border-stadium-border">
                <button
                  type="submit"
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-barlow font-semibold uppercase tracking-[0.08em] text-stadium-muted hover:text-white hover:bg-stadium-surface2 transition-colors cursor-pointer border-l-2 border-transparent"
                >
                  <LogOut size={16} />
                  {t("signOut")}
                </button>
              </form>
            </nav>
          </aside>

          {/* Right content */}
          <main className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
              >
                {activeTab === "profile" && (
                  <div className="space-y-4">
                    <div className="bg-stadium-surface border border-stadium-border p-5 sm:p-6">
                      <h2 className="font-bebas text-xl text-white tracking-wider mb-5 flex items-center gap-2">
                        <Settings size={16} className="text-lfc-red" />
                        {t("title")}
                      </h2>
                      <div className="flex flex-col sm:flex-row gap-6">
                        <div className="flex flex-col items-center shrink-0">
                          <AvatarUpload
                            currentUrl={profile?.avatar_url ?? null}
                            username={profile?.username ?? null}
                          />
                        </div>
                        <div className="flex-1">
                          <ProfileForm profile={profile ?? null} />
                        </div>
                      </div>
                    </div>

                    {/* Homepage background selector (admin only) */}
                    {isAdmin && (
                      <div className="bg-stadium-surface border border-stadium-border p-5 sm:p-6">
                        <CoverSelector currentCoverUrl={currentHeroBg ?? null} />
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "articles" && (
                  <div className="bg-stadium-surface border border-stadium-border p-5 sm:p-6">
                    <h2 className="font-bebas text-xl text-white tracking-wider mb-5 flex items-center gap-2">
                      <Bookmark size={16} className="text-lfc-red" />
                      {t("savedArticles")}
                      {savedArticles.length > 0 && (
                        <span className="font-inter text-sm text-stadium-muted font-normal">
                          ({savedArticles.length})
                        </span>
                      )}
                    </h2>
                    <SavedArticlesList articles={savedArticles} />
                  </div>
                )}

                {activeTab === "players" && (
                  <div className="bg-stadium-surface border border-stadium-border p-5 sm:p-6">
                    <h2 className="font-bebas text-xl text-white tracking-wider mb-5 flex items-center gap-2">
                      <Heart size={16} className="text-lfc-red" />
                      {t("favouritePlayers")}
                      {favourites.length > 0 && (
                        <span className="font-inter text-sm text-stadium-muted font-normal">
                          ({favourites.length})
                        </span>
                      )}
                    </h2>
                    <FavouriteList favourites={favourites} />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}
