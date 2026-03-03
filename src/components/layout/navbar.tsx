"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
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
  { href: "/squad", label: "Squad" },
  { href: "/fixtures", label: "Fixtures" },
  { href: "/standings", label: "Standings" },
  { href: "/stats", label: "Stats" },
  { href: "/news", label: "News" },
  { href: "/history", label: "History" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

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
            <span className="font-bebas text-xl text-white tracking-wider hidden sm:block">
              Liverpool FC
            </span>
          </Link>

          {/* Desktop nav links */}
          <ul className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "relative px-3 py-2 text-sm font-inter font-medium transition-colors",
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

          {/* Right side: dark mode toggle + auth */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 text-stadium-muted hover:text-white transition-colors rounded-md"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Login button — replaced with Avatar when logged in */}
            <Button
              asChild
              size="sm"
              className="hidden md:flex bg-lfc-red hover:bg-lfc-red-dark text-white font-inter font-medium"
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
                          "px-4 py-3 rounded-lg font-inter font-medium transition-colors",
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
                      className="mt-4 px-4 py-3 bg-lfc-red text-white rounded-lg font-inter font-medium text-center hover:bg-lfc-red-dark transition-colors"
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
