import type { Metadata } from "next";
import { League_Gothic, Inter, Barlow_Condensed } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';
import { NavbarAuth } from "@/components/layout/navbar-auth";
import { Footer } from "@/components/layout/footer";
import { GlobalChat } from "@/components/chat/global-chat";
import { QueryProvider } from "@/components/providers/query-provider";
import "./globals.css";

// League Gothic — headlines, stats (closest to Liverpool FC brand typeface)
const leagueGothic = League_Gothic({
  variable: "--font-bebas",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

// Inter — body text, UI labels, forms (weights match wireframes)
const inter = Inter({
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

// Barlow Condensed — sub-headlines, stat labels
const barlowCondensed = Barlow_Condensed({
  weight: ["400", "600", "700"],
  variable: "--font-barlow",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: "%s | Liverpool FC",
    default: "Liverpool FC — Anfield's Finest",
  },
  description:
    "The ultimate Liverpool FC fan site. Squad, fixtures, standings, stats and history — all in one place.",
  keywords: ["Liverpool FC", "LFC", "Premier League", "Anfield", "football"],
  openGraph: {
    type: "website",
    siteName: "Liverpool FC Fan Site",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  robots: { index: true, follow: true },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${leagueGothic.variable} ${inter.variable} ${barlowCondensed.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased bg-stadium-bg text-white font-inter" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
        >
          <QueryProvider>
            <NextIntlClientProvider messages={messages}>
              <NavbarAuth />
              <main>{children}</main>
              <Footer />
              <GlobalChat />
            </NextIntlClientProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
