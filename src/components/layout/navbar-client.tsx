"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { logout } from "@/app/actions/auth";
import type { UserProfile } from "@/lib/supabase";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/squad", label: "Squad" },
  { href: "/players", label: "Players" },
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
  const [scrolled, setScrolled] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();

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
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-stadium-bg/95 backdrop-blur-md border-b border-stadium-border"
          : "bg-transparent"
      )}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <Image
              src="/assets/lfc/crest.webp"
              alt="Liverpool FC"
              width={32}
              height={40}
              className="h-9 w-auto group-hover:scale-105 transition-transform"
              priority
            />
            <span className="font-bebas text-xl text-white tracking-widest hidden sm:block">
              Liverpool FC
            </span>
          </Link>

          {/* Desktop nav */}
          <ul className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "relative px-3 py-2 text-sm font-barlow font-semibold uppercase tracking-[0.12em] transition-colors",
                    pathname === href ? "text-white" : "text-stadium-muted hover:text-white"
                  )}
                >
                  {label}
                  {pathname === href && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-lfc-red rounded-full" />
                  )}
                </Link>
              </li>
            ))}
          </ul>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Auth: avatar dropdown or login button */}
            {user ? (
              <div className="relative hidden md:block">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setAvatarMenuOpen(!avatarMenuOpen);
                  }}
                  className="w-8 h-8 rounded-full overflow-hidden border border-stadium-border hover:border-lfc-red/60 transition-colors"
                  aria-label="Account menu"
                >
                  {profile?.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt={profile.username ?? "Avatar"}
                      width={32}
                      height={32}
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-stadium-surface2 flex items-center justify-center">
                      <User size={16} className="text-stadium-muted" />
                    </div>
                  )}
                </button>

                {avatarMenuOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-10 w-48 bg-stadium-surface border border-stadium-border rounded-none shadow-xl overflow-hidden z-50"
                  >
                    <div className="px-4 py-3 border-b border-stadium-border">
                      <p className="font-inter text-xs text-white font-semibold truncate">
                        {profile?.username ?? "My Account"}
                      </p>
                      <p className="font-inter text-xs text-stadium-muted truncate">
                        {user.email}
                      </p>
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setAvatarMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm font-inter text-white hover:bg-stadium-surface2 transition-colors"
                    >
                      <User size={14} className="text-stadium-muted" />
                      Profile
                    </Link>
                    <form
                      action={() => startTransition(() => logout())}
                      className="border-t border-stadium-border"
                    >
                      <button
                        type="submit"
                        disabled={isPending}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-inter text-stadium-muted hover:text-white hover:bg-stadium-surface2 transition-colors"
                      >
                        <LogOut size={14} />
                        Sign Out
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ) : (
              <Button
                asChild
                size="sm"
                className="hidden md:flex bg-lfc-red hover:bg-lfc-red-dark text-white font-barlow font-bold uppercase tracking-[0.12em] text-sm"
              >
                <Link href="/auth/login">Login</Link>
              </Button>
            )}

            {/* Mobile hamburger */}
            <Sheet>
              <SheetTrigger asChild>
                <button
                  className="md:hidden p-2 text-stadium-muted hover:text-white transition-colors"
                  aria-label="Open menu"
                >
                  <Menu size={22} />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-stadium-bg border-stadium-border w-72">
                <div className="flex flex-col gap-1 mt-8">
                  {NAV_LINKS.map(({ href, label }) => (
                    <SheetClose asChild key={href}>
                      <Link
                        href={href}
                        className={cn(
                          "px-4 py-3 rounded-none font-barlow font-semibold uppercase tracking-[0.12em] transition-colors",
                          pathname === href
                            ? "bg-lfc-red text-white"
                            : "text-stadium-muted hover:bg-stadium-surface hover:text-white"
                        )}
                      >
                        {label}
                      </Link>
                    </SheetClose>
                  ))}
                  {user ? (
                    <>
                      <SheetClose asChild>
                        <Link
                          href="/profile"
                          className="mt-4 px-4 py-3 border border-stadium-border text-white rounded-none font-barlow font-bold uppercase tracking-[0.12em] text-center hover:bg-stadium-surface transition-colors"
                        >
                          My Profile
                        </Link>
                      </SheetClose>
                      <form action={() => startTransition(() => logout())}>
                        <button
                          type="submit"
                          className="w-full mt-2 px-4 py-3 text-stadium-muted rounded-none font-barlow font-semibold uppercase tracking-[0.12em] text-center hover:bg-stadium-surface hover:text-white transition-colors"
                        >
                          Sign Out
                        </button>
                      </form>
                    </>
                  ) : (
                    <SheetClose asChild>
                      <Link
                        href="/auth/login"
                        className="mt-4 px-4 py-3 bg-lfc-red text-white rounded-none font-barlow font-bold uppercase tracking-[0.12em] text-center hover:bg-lfc-red-dark transition-colors"
                      >
                        Login / Register
                      </Link>
                    </SheetClose>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
    </header>
  );
}
