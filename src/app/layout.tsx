import type { Metadata } from "next";
import { Bebas_Neue, Inter, Barlow_Condensed } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { NavbarAuth } from "@/components/layout/navbar-auth";
import { Footer } from "@/components/layout/footer";
import "./globals.css";

// Bebas Neue — headlines, stats numbers, jersey watermarks
const bebasNeue = Bebas_Neue({
  weight: "400",
  variable: "--font-bebas",
  subsets: ["latin"],
  display: "swap",
});

// Inter — body text, UI labels, forms
const inter = Inter({
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Barlow Condensed — sub-headlines, stat labels
const barlowCondensed = Barlow_Condensed({
  weight: ["400", "600", "700"],
  variable: "--font-barlow",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
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
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${bebasNeue.variable} ${inter.variable} ${barlowCondensed.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased bg-stadium-bg text-white font-inter">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
        >
          <NavbarAuth />
          <main>{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
