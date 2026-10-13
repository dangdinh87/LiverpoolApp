import type { Metadata } from "next";
import { League_Gothic, Inter, Barlow_Condensed, Newsreader } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { NextIntlClientProvider } from 'next-intl';
import { hasLocale } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { SPOILER_BOOT_SCRIPT } from "@/lib/spoiler-mode";
import { Suspense } from "react";
import { NavbarAuth } from "@/components/layout/navbar-auth";
import { NavProgress } from "@/components/layout/nav-progress";
import { SkipLink } from "@/components/layout/skip-link";
import { Footer } from "@/components/layout/footer";
import { BottomNav } from "@/components/layout/bottom-nav";
import { GlobalChat } from "@/components/chat/global-chat";
import { GlobalToast } from "@/components/ui/toast-notification";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { QueryProvider } from "@/components/providers/query-provider";
import { GoogleTagManager } from "@/components/analytics/google-tag-manager";
import { AdsenseGate } from "@/components/analytics/adsense-gate";
import { StructuredData } from "@/components/analytics/structured-data";
import { Analytics } from '@vercel/analytics/next';
import { DEFAULT_OG_IMAGE, keywordsFor } from "@/lib/seo";
import { BRAND, brandDescription, brandLocale, brandTitle } from "@/lib/brand";
import "../globals.css";

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

// Newsreader — story and page headlines (the "paper" half of the brand)
const newsreader = Newsreader({
  weight: ["500", "600"],
  variable: "--font-newsreader",
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

// Both locales are prerendered; pages then follow their own `revalidate`.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const OG_LOCALE = { vi: "vi_VN", en: "en_GB" } as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = brandLocale(rawLocale);
  const title = brandTitle(locale);
  const description = brandDescription(locale);

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      template: `%s | ${BRAND.name}`,
      default: title,
    },
    description,
    applicationName: BRAND.name,
    authors: [{ name: BRAND.name, url: SITE_URL }],
    creator: BRAND.name,
    publisher: BRAND.name,
    category: "sports",
    keywords: [BRAND.name, ...keywordsFor(locale)],
    openGraph: {
      type: "website",
      url: SITE_URL,
      locale: OG_LOCALE[locale],
      alternateLocale: locale === "vi" ? OG_LOCALE.en : OG_LOCALE.vi,
      siteName: BRAND.name,
      title,
      description,
      // The real 1200×630 card (app/opengraph-image.tsx). This used to be a
      // 110×200 crest declared as 1200×630.
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
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
    // Own mark (red square, white L), never the club crest. /favicon.ico comes
    // from app/favicon.ico; the rest live in public/brand/.
    icons: {
      icon: [
        { url: BRAND.assets.icon, type: "image/svg+xml" },
        { url: BRAND.assets.favicon32, sizes: "32x32", type: "image/png" },
        // Google Search only uses a favicon whose size is a multiple of 48px; 32x32 does not qualify.
        { url: BRAND.assets.icon192, sizes: "192x192", type: "image/png" },
      ],
      apple: [{ url: BRAND.assets.appleTouchIcon, sizes: "180x180", type: "image/png" }],
    },
    manifest: "/manifest.webmanifest",
    // No site-wide canonical: child routes inherit it, which pointed /chat,
    // /auth/* and 404 pages at the homepage. Each page sets its own via
    // makePageMeta({ path }) / getHreflangAlternates.
  };
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode; params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={[leagueGothic.variable, inter.variable, newsreader.variable, barlowCondensed.variable].join(" ")}
      suppressHydrationWarning
    >
      <body className="antialiased bg-stadium-bg text-white font-inter" suppressHydrationWarning>
        {/* Before anything paints: spoiler-free readers must never see a score flash up. */}
        <script dangerouslySetInnerHTML={{ __html: SPOILER_BOOT_SCRIPT }} />
        <GoogleTagManager />
        <AdsenseGate />
        <StructuredData />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
        >
          <QueryProvider>
            <NextIntlClientProvider messages={messages}>
              <SkipLink />
              <Suspense><NavProgress /></Suspense>
              <Suspense><NavbarAuth /></Suspense>
              <main id="main-content" tabIndex={-1} className="min-h-dvh outline-none">{children}</main>
              <Footer />
              {/* After the footer on purpose: keyboard order stays header, content, footer, bar. */}
              <BottomNav />
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
