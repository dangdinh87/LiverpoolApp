import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/seo";

export function generateMetadata(): Metadata {
  return { metadataBase: new URL(getSiteUrl()) };
}

// The real root layout (<html>/<body>) is app/[locale]/layout.tsx. This one exists
// only because app/not-found.tsx needs a parent layout.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
