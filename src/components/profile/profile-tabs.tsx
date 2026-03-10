"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Heart,
  Bookmark,
  TrendingUp,
  Trophy,
  Construction,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProfileForm } from "./profile-form";
import { AvatarUpload } from "./avatar-upload";
import { FavouriteList } from "./favourite-list";
import type { UserProfile, FavouritePlayer } from "@/lib/supabase";

interface ProfileTabsProps {
  user: { id: string; email: string | null };
  profile: UserProfile | null;
  favourites: FavouritePlayer[];
}

type TabId = "profile" | "articles" | "players" | "predictions" | "fan-stats";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  comingSoon?: boolean;
}

const TABS: Tab[] = [
  { id: "profile", label: "Profile", icon: <User size={16} /> },
  {
    id: "articles",
    label: "Saved Articles",
    icon: <Bookmark size={16} />,
    comingSoon: true,
  },
  { id: "players", label: "Favourite Players", icon: <Heart size={16} /> },
  {
    id: "predictions",
    label: "Match Predictions",
    icon: <Trophy size={16} />,
    comingSoon: true,
  },
  {
    id: "fan-stats",
    label: "Fan Stats",
    icon: <TrendingUp size={16} />,
    comingSoon: true,
  },
];

export function ProfileTabs({
  user,
  profile,
  favourites,
}: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("profile");

  return (
    <div>
      {/* Tab bar */}
      <div className="flex overflow-x-auto scrollbar-hide border-b border-stadium-border mb-6 gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "relative flex items-center gap-2 px-4 py-3 text-sm font-barlow font-semibold uppercase tracking-[0.08em] whitespace-nowrap transition-colors shrink-0",
              activeTab === tab.id
                ? "text-white"
                : "text-stadium-muted hover:text-white/70"
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.comingSoon && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-lfc-gold/15 text-lfc-gold text-[10px] font-inter font-semibold uppercase tracking-wider rounded-sm">
                Soon
              </span>
            )}
            {activeTab === tab.id && (
              <motion.div
                layoutId="profile-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-lfc-red"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "profile" && (
            <ProfileTabContent user={user} profile={profile} />
          )}
          {activeTab === "players" && (
            <PlayersTabContent favourites={favourites} />
          )}
          {activeTab === "articles" && <ComingSoonTab feature="Saved Articles" description="Save your favourite news articles to read later. Bookmark articles from the News page and they'll appear here." />}
          {activeTab === "predictions" && <ComingSoonTab feature="Match Predictions" description="Predict match scores before kick-off and compete with other fans. Earn points for correct predictions!" />}
          {activeTab === "fan-stats" && <ComingSoonTab feature="Fan Stats" description="Track your activity — articles read, predictions made, match attendance, and your journey as a Liverpool fan." />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function ProfileTabContent({
  user,
  profile,
}: {
  user: { id: string; email: string | null };
  profile: UserProfile | null;
}) {
  return (
    <div className="bg-stadium-surface border border-stadium-border p-6 md:p-8">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          <AvatarUpload
            currentUrl={profile?.avatar_url ?? null}
            username={profile?.username ?? null}
          />
        </div>
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
  );
}

function PlayersTabContent({
  favourites,
}: {
  favourites: FavouritePlayer[];
}) {
  return (
    <div className="bg-stadium-surface border border-stadium-border p-6 md:p-8">
      <h2 className="font-bebas text-2xl text-white tracking-wider mb-5">
        Favourite Players
        {favourites.length > 0 && (
          <span className="font-inter text-sm text-stadium-muted font-normal ml-2">
            ({favourites.length})
          </span>
        )}
      </h2>
      <FavouriteList favourites={favourites} />
    </div>
  );
}

function ComingSoonTab({
  feature,
  description,
}: {
  feature: string;
  description: string;
}) {
  return (
    <div className="bg-stadium-surface border border-stadium-border p-8 md:p-12">
      <div className="flex flex-col items-center text-center max-w-md mx-auto">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
          className="w-16 h-16 rounded-full bg-lfc-red/10 border border-lfc-red/20 flex items-center justify-center mb-5"
        >
          <Construction className="w-7 h-7 text-lfc-red" />
        </motion.div>
        <motion.h3
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="font-bebas text-2xl text-white tracking-wider mb-2"
        >
          {feature}
        </motion.h3>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-lfc-gold/15 text-lfc-gold text-xs font-barlow font-semibold uppercase tracking-wider mb-4">
            Coming Soon
          </span>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="font-inter text-sm text-stadium-muted leading-relaxed"
        >
          {description}
        </motion.p>
      </div>
    </div>
  );
}
