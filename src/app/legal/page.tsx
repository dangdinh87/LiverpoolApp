import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Legal",
  description: "Legal information, privacy policy, and terms of use.",
};

const SECTIONS = [
  {
    title: "Privacy Policy",
    content:
      "This is a fan-made website and is not affiliated with Liverpool Football Club or Fenway Sports Group. We do not collect personal data beyond what is necessary for account functionality (email, username, avatar). Authentication is handled securely via Supabase. We do not sell or share your data with third parties.",
  },
  {
    title: "Terms of Use",
    content:
      "This site is provided as-is for informational and entertainment purposes only. All Liverpool FC trademarks, logos, and brand elements are the property of Liverpool Football Club and Athletic Grounds Limited. Match data is sourced from the Fantasy Premier League API and Football-Data.org. News content is aggregated from BBC Sport RSS feeds. Use of this site constitutes acceptance of these terms.",
  },
  {
    title: "Cookie Policy",
    content:
      "This site uses essential cookies for authentication and theme preferences. No tracking or advertising cookies are used. By continuing to use this site, you consent to our use of essential cookies.",
  },
  {
    title: "Data Sources",
    content:
      "Match data, fixtures, and player statistics are provided by the Fantasy Premier League API (fantasy.premierleague.com). League standings are provided by Football-Data.org. News articles are aggregated from BBC Sport RSS feeds. Historical data and trophy information are maintained by the site administrators based on publicly available records.",
  },
] as const;

export default function LegalPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-bebas text-4xl sm:text-5xl text-white mb-2">
          Legal Information
        </h1>
        <p className="text-stadium-muted font-inter text-sm mb-10">
          Last updated: January 2025
        </p>

        <div className="space-y-10">
          {SECTIONS.map(({ title, content }) => (
            <section key={title}>
              <h2 className="font-bebas text-2xl text-white mb-3">{title}</h2>
              <p className="text-stadium-muted font-inter text-sm leading-relaxed">
                {content}
              </p>
            </section>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-stadium-border">
          <p className="text-stadium-muted text-xs font-inter">
            For questions or concerns, contact{" "}
            <a
              href="mailto:contactus@liverpoolfc.com"
              className="text-lfc-red hover:text-lfc-gold transition-colors"
            >
              contactus@liverpoolfc.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
