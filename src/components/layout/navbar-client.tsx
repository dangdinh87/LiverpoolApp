"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, User, LogOut, Shield, ChevronDown, Flame } from "lucide-react";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { logout } from "@/app/actions/auth";
import { LoginForm } from "@/components/auth/login-form";
import type { UserProfile } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/squad", label: "Squad" },
  { href: "/season", label: "Season" },
  { href: "/news", label: "News" },
  { href: "/history", label: "The Club" },
  { href: "/about", label: "About" },
];

interface NavbarClientProps {
  user: { id: string; email: string | null } | null;
  profile: UserProfile | null;
}

export function NavbarClient({ user, profile }: NavbarClientProps) {
  const t = useTranslations("Common.nav");
  const [scrolled, setScrolled] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [streak, setStreak] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Sync server auth state to client zustand store (used by chat)
  const setAuthUser = useAuthStore((s) => s.setUser);
  useEffect(() => {
    setAuthUser(
      user
        ? { id: user.id, email: user.email ?? undefined, name: profile?.username ?? undefined, avatarUrl: profile?.avatar_url ?? undefined }
        : null
    );
  }, [user, profile, setAuthUser]);

  // Fetch & record streak on mount (authenticated users only)
  useEffect(() => {
    if (!user) return;
    fetch("/api/streak").then((r) => r.json()).then((d) => setStreak(d.streak ?? 0)).catch(() => {});
  }, [user]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close avatar dropdown on outside click
  useEffect(() => {
    if (!avatarMenuOpen) return;
    const close = () => setAvatarMenuOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [avatarMenuOpen]);

  return (
    <header
      className={cn(
        "fixed left-0 right-0 z-50 transition-all duration-300 backdrop-blur-md",
        scrolled
          ? "bg-stadium-bg/95 border-b border-stadium-border"
          : "bg-stadium-bg/40"
      )}
      style={{ top: "var(--live-banner-h, 0px)" }}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={cn(
          "flex items-center justify-between transition-all duration-300",
          scrolled ? "h-12" : "h-16"
        )}>
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <Image
              src="/assets/lfc/crest.webp"
              alt="Liverpool FC"
              width={32}
              height={40}
              className={cn("w-auto transition-all duration-300", scrolled ? "h-7" : "h-9")}
              priority
            />
            <span className={cn("font-barlow font-bold uppercase text-white tracking-[0.2em] hidden sm:block transition-all duration-300", scrolled ? "text-sm" : "text-base")}>
              LFCVN
            </span>
          </Link>

          {/* Desktop nav */}
          <ul className="hidden md:flex items-center gap-1">
            {[
              { href: "/", label: t("home") || "Home" },
              { href: "/news", label: t("news"), highlight: true },
              { href: "/squad", label: t("squad") },
              { href: "/season", label: t("season") || "Season" },
              { href: "/history", label: t("history") || "The Club" },
              { href: "/about", label: t("about") || "About" },
            ].map(({ href, label, highlight }) => {
              // Parse href to check for tab param
              const hasTab = href.includes("tab=");
              const targetTab = hasTab ? new URL(href, "http://localhost").searchParams.get("tab") : null;
              const currentTab = searchParams.get("tab");

              // Active check: exact match, or startsWith for /news (covers /news/[...slug])
              const basePath = href.split("?")[0];
              const isActive = basePath === "/"
                ? pathname === "/"
                : pathname === basePath && (hasTab ? targetTab === currentTab : true)
                  || (basePath !== "/" && pathname.startsWith(basePath + "/"));

              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      "relative px-3 py-2 text-sm font-barlow font-semibold uppercase tracking-[0.12em] transition-colors",
                      isActive ? "text-white" : "text-stadium-muted hover:text-white"
                    )}
                  >
                    {label}
                    {highlight && (
                      <span className="absolute -top-1 -right-1 px-1 py-px text-[8px] font-bold leading-none bg-lfc-red text-white rounded-sm uppercase">
                        {t("hot")}
                      </span>
                    )}
                    {isActive && (
                      <motion.span
                        layoutId="nav-underline"
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-lfc-red rounded-full"
                        transition={{ type: "spring", stiffness: 180, damping: 14 }}
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Chat AI button */}
            <Link
              href="/chat"
              className="ai-btn group relative hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-barlow font-semibold uppercase tracking-wider transition-all duration-300 hover:scale-105 active:scale-95"
            >
              <span className="ai-btn-text">LiverBird AI</span>
            </Link>
            <LanguageSwitcher />
            {/* Auth: member button with avatar or Members CTA */}
            {user ? (
              <div className="relative hidden md:block">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setAvatarMenuOpen(!avatarMenuOpen);
                  }}
                  className="flex items-center gap-2 px-2 py-1.5 bg-transparent hover:bg-white/10 transition-all duration-200 group cursor-pointer"
                  aria-label={t("profile")}
                >
                  {/* User avatar */}
                  <div className="relative w-7 h-7 rounded-full overflow-hidden shrink-0 ring-1 ring-stadium-border/50 group-hover:ring-lfc-red/50 transition-all">
                    {profile?.avatar_url ? (
                      <Image
                        src={profile.avatar_url}
                        alt={profile.username ?? "Avatar"}
                        fill
                        className="object-cover"
                        sizes="28px"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full bg-stadium-surface2 flex items-center justify-center">
                        <User size={14} className="text-stadium-muted" />
                      </div>
                    )}
                  </div>
                  <span className="font-barlow text-xs font-semibold uppercase tracking-wider text-stadium-muted group-hover:text-white transition-colors">
                    {profile?.username ?? user.email?.split("@")[0] ?? t("profile")}
                  </span>
                  <ChevronDown size={12} className={cn("text-stadium-muted transition-transform duration-200", avatarMenuOpen && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {avatarMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-12 w-52 bg-stadium-surface border border-stadium-border shadow-2xl overflow-hidden z-50"
                    >
                      {/* User info header */}
                      <div className="px-4 py-3.5 border-b border-stadium-border bg-stadium-surface2/50">
                        <div className="flex items-center gap-3">
                          <div className="relative w-11 h-11 rounded-full overflow-hidden shrink-0 ring-2 ring-lfc-red/40">
                            {profile?.avatar_url ? (
                              <Image
                                src={profile.avatar_url}
                                alt={profile.username ?? "Avatar"}
                                fill
                                className="object-cover"
                                sizes="44px"
                                unoptimized
                              />
                            ) : (
                              <div className="w-full h-full bg-stadium-surface flex items-center justify-center">
                                <User size={18} className="text-stadium-muted" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-inter text-sm text-white font-semibold truncate leading-tight">
                              {profile?.username ?? t("profile")}
                            </p>
                            <p className="font-inter text-[11px] text-stadium-muted truncate">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Streak bar */}
                      <div className="px-4 py-2.5 border-b border-stadium-border bg-stadium-bg/50 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Flame size={14} className={streak > 0 ? "text-orange-400" : "text-stadium-muted"} />
                          <span className="font-barlow text-xs uppercase tracking-wider text-stadium-muted">
                            {t("streak")}
                          </span>
                        </div>
                        <span className={cn(
                          "font-bebas text-lg leading-none",
                          streak > 0 ? "text-orange-400" : "text-stadium-muted"
                        )}>
                          {streak} {streak === 1 ? t("day") : t("days")}
                        </span>
                      </div>

                      {/* Menu items */}
                      <Link
                        href="/profile"
                        onClick={() => setAvatarMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-inter text-white hover:bg-stadium-surface2 transition-colors"
                      >
                        <User size={14} className="text-stadium-muted" />
                        {t("profile")}
                      </Link>
                      <form
                        action={() => startTransition(() => logout())}
                        className="border-t border-stadium-border"
                      >
                        <button
                          type="submit"
                          disabled={isPending}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-inter text-stadium-muted hover:text-white hover:bg-stadium-surface2 transition-colors cursor-pointer"
                        >
                          <LogOut size={14} />
                          {t("logout")}
                        </button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={() => setLoginOpen(true)}
                className="hidden md:flex bg-lfc-red hover:bg-lfc-red-dark text-white font-barlow font-bold uppercase tracking-[0.12em] text-sm group relative overflow-hidden cursor-pointer"
              >
                <Shield size={14} className="transition-transform group-hover:scale-110" />
                {t("members")}
              </Button>
            )}

            {/* Mobile hamburger — only mount Sheet after hydration to avoid Radix ID mismatch */}
            {!mounted ? (
              <button
                className="md:hidden p-2 text-stadium-muted hover:text-white transition-colors"
                aria-label={t("auth")}
              >
                <Menu size={22} />
              </button>
            ) : (
            <Sheet>
              <SheetTrigger asChild>
                <button
                  className="md:hidden p-2 text-stadium-muted hover:text-white transition-colors"
                  aria-label={t("auth")}
                >
                  <Menu size={22} />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-stadium-bg border-stadium-border w-72">
                <div className="flex flex-col gap-1 mt-8">
                  {[
                    { href: "/", label: t("home") },
                    { href: "/news", label: t("news") },
                    { href: "/squad", label: t("squad") },
                    { href: "/season", label: t("season") },
                    { href: "/history", label: t("history") },
                    { href: "/about", label: t("about") },
                  ].map(({ href, label }) => {
                    const url = new URL(href, "http://localhost");
                    const hasTab = url.searchParams.has("tab");
                    const targetTab = url.searchParams.get("tab");
                    const currentTab = searchParams.get("tab");
                    const basePath = url.pathname;
                    const isActive = basePath === "/"
                      ? pathname === "/"
                      : pathname === basePath && (hasTab ? targetTab === currentTab : true)
                        || (basePath !== "/" && pathname.startsWith(basePath + "/"));

                    return (
                      <SheetClose asChild key={href}>
                        <Link
                          href={href}
                          className={cn(
                            "relative block px-4 py-3 rounded-none font-barlow font-semibold uppercase tracking-[0.12em] transition-colors overflow-hidden",
                            isActive
                              ? "text-white"
                              : "text-stadium-muted hover:bg-stadium-surface hover:text-white"
                          )}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="mobile-nav-bg"
                              className="absolute inset-0 bg-lfc-red"
                              transition={{ type: "spring", stiffness: 180, damping: 14 }}
                            />
                          )}
                          <span className="relative z-10">{label}</span>
                        </Link>
                      </SheetClose>
                    );
                  })}
                  {/* Chat AI link in mobile */}
                  <SheetClose asChild>
                    <Link
                      href="/chat"
                      className="mt-2 px-4 py-3 bg-lfc-red/10 border border-lfc-red/30 text-lfc-red rounded-none font-barlow font-bold uppercase tracking-[0.12em] text-center hover:bg-lfc-red/20 transition-colors flex items-center justify-center gap-2"
                    >
                      LiverBird AI
                    </Link>
                  </SheetClose>
                  {user ? (
                    <>
                      <SheetClose asChild>
                        <Link
                          href="/profile"
                          className="mt-4 px-4 py-3 border border-stadium-border text-white rounded-none font-barlow font-bold uppercase tracking-[0.12em] text-center hover:bg-stadium-surface transition-colors flex items-center justify-center gap-2"
                        >
                          <Shield size={14} className="text-lfc-red" />
                          {t("memberArea")}
                        </Link>
                      </SheetClose>
                      <form action={() => startTransition(() => logout())}>
                        <button
                          type="submit"
                          className="w-full mt-2 px-4 py-3 text-stadium-muted rounded-none font-barlow font-semibold uppercase tracking-[0.12em] text-center hover:bg-stadium-surface hover:text-white transition-colors"
                        >
                          {t("logout")}
                        </button>
                      </form>
                    </>
                  ) : (
                    <SheetClose asChild>
                      <button
                        onClick={() => setLoginOpen(true)}
                        className="mt-4 px-4 py-3 bg-lfc-red text-white rounded-none font-barlow font-bold uppercase tracking-[0.12em] text-center hover:bg-lfc-red-dark transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Shield size={14} />
                        {t("members")}
                      </button>
                    </SheetClose>
                  )}
                </div>
              </SheetContent>
            </Sheet>
            )}
          </div>
        </div>
      </nav>

      {/* Login popup */}
      {!user && (
        <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
          <DialogContent
            className="bg-transparent border-none shadow-none p-0 sm:max-w-sm"
            showCloseButton={false}
          >
            <DialogTitle className="sr-only">{t("memberLogin")}</DialogTitle>
            <LoginForm />
          </DialogContent>
        </Dialog>
      )}
    </header>
  );
}
