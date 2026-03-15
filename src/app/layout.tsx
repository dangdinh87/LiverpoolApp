import type { Metadata } from "next";
import { League_Gothic, Inter, Barlow_Condensed } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';
import { NavbarAuth } from "@/components/layout/navbar-auth";
import { Footer } from "@/components/layout/footer";
import { GlobalChat } from "@/components/chat/global-chat";
import { GlobalToast } from "@/components/ui/toast-notification";
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
    template: "%s | Liverpool FC Việt Nam",
    default: "Liverpool FC Việt Nam — Tin tức, Đội hình, Lịch thi đấu | YNWA",
  },
  description:
    "Trang fan Liverpool FC — Đội hình, lịch thi đấu, bảng xếp hạng, thống kê và lịch sử CLB. The ultimate Liverpool FC fan site.",
  keywords: [
    "Liverpool FC", "LFC", "Premier League", "Anfield", "YNWA",
    "Liverpool FC Việt Nam", "tin tức Liverpool", "lịch thi đấu Liverpool",
    "đội hình Liverpool", "bảng xếp hạng Ngoại hạng Anh",
    "kết quả Liverpool", "chuyển nhượng Liverpool",
    "bóng đá Anh", "Ngoại hạng Anh", "You'll Never Walk Alone",
  ],
  openGraph: {
    type: "website",
    locale: "vi_VN",
    alternateLocale: "en_GB",
    siteName: "Liverpool FC Fan Site",
    title: "Liverpool FC — Anfield's Finest",
    description: "Trang fan Liverpool FC — Đội hình, lịch thi đấu, bảng xếp hạng, thống kê và lịch sử CLB.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Liverpool FC — Anfield's Finest",
    description: "Trang fan Liverpool FC — Đội hình, lịch thi đấu, bảng xếp hạng, thống kê và tin tức Liverpool.",
  },
  robots: { index: true, follow: true },
  alternates: {
    canonical: SITE_URL,
  },
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
        {/* JSON-LD Structured Data for Google Rich Results */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                name: "Liverpool FC Việt Nam",
                alternateName: ["Liverpool FC VN", "LFC Việt Nam", "Liverpool FC Fan Site"],
                url: SITE_URL,
                description: "Trang fan Liverpool FC Việt Nam — Tin tức, đội hình, lịch thi đấu, bảng xếp hạng Ngoại hạng Anh và lịch sử CLB.",
                inLanguage: ["vi", "en"],
                potentialAction: {
                  "@type": "SearchAction",
                  target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/news?q={search_term_string}` },
                  "query-input": "required name=search_term_string",
                },
              },
              {
                "@context": "https://schema.org",
                "@type": "SportsTeam",
                name: "Liverpool FC",
                alternateName: ["Liverpool", "LFC", "The Reds"],
                url: "https://www.liverpoolfc.com",
                sport: "Football",
                league: "Premier League",
                location: {
                  "@type": "StadiumOrArena",
                  name: "Anfield",
                  address: { "@type": "PostalAddress", addressLocality: "Liverpool", addressCountry: "GB" },
                },
                logo: `${SITE_URL}/assets/lfc/crest.webp`,
              },
              {
                "@context": "https://schema.org",
                "@type": "Organization",
                name: "Liverpool FC Việt Nam Fan Site",
                url: SITE_URL,
                logo: `${SITE_URL}/assets/lfc/crest.webp`,
                sameAs: [
                  "https://www.facebook.com/LiverpoolFC",
                  "https://twitter.com/LFC",
                  "https://www.instagram.com/liverpoolfc",
                  "https://www.youtube.com/liverpoolfc",
                ],
              },
            ]),
          }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
        >
          <QueryProvider>
            <NextIntlClientProvider messages={messages}>
              <NavbarAuth />
              <main className="min-h-screen">{children}</main>
              <Footer />
              <GlobalToast />
              <GlobalChat />
            </NextIntlClientProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
