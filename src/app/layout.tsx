import type { Metadata } from "next";
import { League_Gothic, Inter, Barlow_Condensed } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale, setRequestLocale } from 'next-intl/server';
import { Suspense } from "react";
import { NavbarAuth } from "@/components/layout/navbar-auth";
import { NavProgress } from "@/components/layout/nav-progress";
import { SkipLink } from "@/components/layout/skip-link";
import { Footer } from "@/components/layout/footer";
import { GlobalChat } from "@/components/chat/global-chat";
import { GlobalToast } from "@/components/ui/toast-notification";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { GoogleTagManager } from "@/components/analytics/google-tag-manager";
import { GoogleAdsense } from "@/components/analytics/google-adsense";
import { StructuredData } from "@/components/analytics/structured-data";
import { Analytics } from '@vercel/analytics/next';
import { DEFAULT_OG_IMAGE } from "@/lib/seo";
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
// Locale is cookie/header-driven. Keep layout request-bound to avoid static locale lock.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: "%s | Liverpool FC Việt Nam",
    default: "Liverpool FC Việt Nam — Tin tức, Đội hình, Lịch thi đấu | YNWA",
  },
  description:
    "Trang fan Liverpool FC Việt Nam — Tin tức mới nhất, đội hình, lịch thi đấu, bảng xếp hạng Ngoại hạng Anh, thống kê và lịch sử CLB Liverpool.",
  applicationName: "Liverpool FC Việt Nam",
  authors: [{ name: "Liverpool FC Việt Nam Fan Site", url: SITE_URL }],
  creator: "Liverpool FC Việt Nam Fan Site",
  publisher: "Liverpool FC Việt Nam Fan Site",
  category: "sports",
  keywords: [
    "Liverpool FC", "LFC", "Premier League", "Anfield", "YNWA",
    "Liverpool FC Việt Nam", "tin tức Liverpool", "lịch thi đấu Liverpool",
    "đội hình Liverpool", "bảng xếp hạng Ngoại hạng Anh",
    "kết quả Liverpool", "chuyển nhượng Liverpool",
    "bóng đá Anh", "Ngoại hạng Anh", "You'll Never Walk Alone",
  ],
  openGraph: {
    type: "website",
    url: SITE_URL,
    locale: "vi_VN",
    alternateLocale: "en_GB",
    siteName: "Liverpool FC Việt Nam",
    title: "Liverpool FC Việt Nam — Tin tức, Lịch thi đấu, Đội hình | YNWA",
    description: "Trang fan Liverpool FC Việt Nam — Tin tức mới nhất, đội hình, lịch thi đấu, bảng xếp hạng Ngoại hạng Anh, thống kê và lịch sử CLB Liverpool.",
    // The real 1200×630 card (app/opengraph-image.tsx). This used to be a
    // 110×200 crest declared as 1200×630.
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Liverpool FC Việt Nam — Tin tức, Lịch thi đấu, Đội hình | YNWA",
    description: "Trang fan Liverpool FC Việt Nam — Tin tức mới nhất, đội hình, lịch thi đấu, bảng xếp hạng Ngoại hạng Anh, thống kê và lịch sử CLB Liverpool.",
    images: [DEFAULT_OG_IMAGE.url],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
  // No site-wide canonical: child routes inherit it, which pointed /chat,
  // /auth/* and 404 pages at the homepage. Each page sets its own via
  // makePageMeta({ path }) / getHreflangAlternates.
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={[leagueGothic.variable, inter.variable, barlowCondensed.variable].join(" ")}
      suppressHydrationWarning
    >
      <body className="antialiased bg-stadium-bg text-white font-inter" suppressHydrationWarning>
        <GoogleTagManager />
        <GoogleAdsense />
        <StructuredData />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
        >
          <NextIntlClientProvider messages={messages}>
            <SkipLink />
            <Suspense><NavProgress /></Suspense>
            <Suspense><NavbarAuth /></Suspense>
            <main id="main-content" tabIndex={-1} className="min-h-dvh outline-none">{children}</main>
            <Footer />
            <GlobalToast />
            <ScrollToTop />
            <GlobalChat />
          </NextIntlClientProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
