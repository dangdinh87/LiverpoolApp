import type { Metadata } from "next";
import { League_Gothic, Inter, Barlow_Condensed } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';
import { NavbarAuth } from "@/components/layout/navbar-auth";
import { Footer } from "@/components/layout/footer";
import { GlobalChat } from "@/components/chat/global-chat";
import { GlobalToast } from "@/components/ui/toast-notification";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { QueryProvider } from "@/components/providers/query-provider";
import { GoogleTagManager } from "@/components/analytics/google-tag-manager";
import { StructuredData } from "@/components/analytics/structured-data";
import { Analytics } from '@vercel/analytics/next';
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
    "Trang fan Liverpool FC Việt Nam — Tin tức mới nhất, đội hình, lịch thi đấu, bảng xếp hạng Ngoại hạng Anh, thống kê và lịch sử CLB Liverpool.",
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
    siteName: "Liverpool FC Việt Nam",
    title: "Liverpool FC Việt Nam — Tin tức, Lịch thi đấu, Đội hình | YNWA",
    description: "Trang fan Liverpool FC Việt Nam — Tin tức mới nhất, đội hình, lịch thi đấu, bảng xếp hạng Ngoại hạng Anh, thống kê và lịch sử CLB Liverpool.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Liverpool FC Việt Nam — Tin tức, Lịch thi đấu, Đội hình | YNWA",
    description: "Trang fan Liverpool FC Việt Nam — Tin tức mới nhất, đội hình, lịch thi đấu, bảng xếp hạng Ngoại hạng Anh, thống kê và lịch sử CLB Liverpool.",
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
      className={[leagueGothic.variable, inter.variable, barlowCondensed.variable].join(" ")}
      suppressHydrationWarning
    >
      <body className="antialiased bg-stadium-bg text-white font-inter" suppressHydrationWarning>
        <GoogleTagManager />
        <StructuredData />
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
              <ScrollToTop />
              <GlobalChat />
            </NextIntlClientProvider>
          </QueryProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
