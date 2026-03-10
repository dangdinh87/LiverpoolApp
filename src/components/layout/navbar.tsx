"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/news", label: "News" },
  { href: "/squad", label: "Squad" },
  { href: "/season", label: "Season" },
  { href: "/history", label: "History" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  // Transition navbar from transparent to solid on scroll
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
          {/* Liverpool crest / wordmark */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-lfc-red rounded-full flex items-center justify-center font-bebas text-white text-sm group-hover:bg-lfc-red-dark transition-colors">
              LFC
            </div>
            <span className="font-barlow font-bold uppercase text-base text-white tracking-[0.2em] hidden sm:block">
              LFCVN
            </span>
          </Link>

          {/* Desktop nav links */}
          <ul className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "relative px-3 py-2 text-sm font-barlow font-semibold uppercase tracking-[0.12em] transition-colors",
                    pathname === href
                      ? "text-white"
                      : "text-stadium-muted hover:text-white"
                  )}
                >
                  {label}
                  {/* Active red underline indicator */}
                  {pathname === href && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-lfc-red rounded-full" />
                  )}
                </Link>
              </li>
            ))}
          </ul>

          {/* Right side: auth */}
          <div className="flex items-center gap-2">
            {/* Login button — replaced with Avatar when logged in */}
            <Button
              asChild
              size="sm"
              className="hidden md:flex bg-lfc-red hover:bg-lfc-red-dark text-white font-barlow font-bold uppercase tracking-[0.12em] text-sm"
            >
              <Link href="/auth/login">Login</Link>
            </Button>

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
              <SheetContent
                side="right"
                className="bg-stadium-bg border-stadium-border w-72"
              >
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
                  <SheetClose asChild>
                    <Link
                      href="/auth/login"
                      className="mt-4 px-4 py-3 bg-lfc-red text-white rounded-none font-barlow font-bold uppercase tracking-[0.12em] text-center hover:bg-lfc-red-dark transition-colors"
                    >
                      Login / Register
                    </Link>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
    </header>
  );
}
