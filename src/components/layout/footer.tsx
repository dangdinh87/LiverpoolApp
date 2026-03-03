import Link from "next/link";

const QUICK_LINKS = [
  { href: "/squad", label: "Squad" },
  { href: "/fixtures", label: "Fixtures" },
  { href: "/standings", label: "Standings" },
  { href: "/stats", label: "Stats" },
  { href: "/news", label: "News" },
  { href: "/history", label: "History" },
];

export function Footer() {
  return (
    <footer className="bg-stadium-surface border-t border-stadium-border mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-lfc-red rounded-full flex items-center justify-center font-bebas text-white text-sm">
                LFC
              </div>
              <span className="font-bebas text-xl text-white tracking-wider">
                Liverpool FC
              </span>
            </div>
            <p className="text-stadium-muted text-sm font-inter leading-relaxed">
              Fan-made site dedicated to Liverpool Football Club. Not affiliated
              with Liverpool FC or FSG.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-barlow font-semibold text-white uppercase tracking-wider text-sm mb-4">
              Quick Links
            </h3>
            <ul className="space-y-2">
              {QUICK_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-stadium-muted hover:text-white text-sm font-inter transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* About */}
          <div>
            <h3 className="font-barlow font-semibold text-white uppercase tracking-wider text-sm mb-4">
              About
            </h3>
            <ul className="space-y-2">
              <li>
                <span className="text-stadium-muted text-sm font-inter">
                  Data: API-Football
                </span>
              </li>
              <li>
                <span className="text-stadium-muted text-sm font-inter">
                  News: BBC Sport RSS / Sky Sports RSS
                </span>
              </li>
              <li>
                <Link
                  href="/auth/register"
                  className="text-lfc-red hover:text-lfc-gold text-sm font-inter transition-colors"
                >
                  Create Account →
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-stadium-border mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-stadium-muted text-xs font-inter">
            © {new Date().getFullYear()} Liverpool FC Fan Site. Fan-made,
            unofficial.
          </p>
          <p className="text-stadium-muted text-xs font-inter">
            You&apos;ll Never Walk Alone
          </p>
        </div>
      </div>
    </footer>
  );
}
