import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { QueryProvider } from "@/components/providers/query-provider";

export const metadata: Metadata = {
  title: "LiverBird AI — Liverpool FC Chat Assistant",
  robots: { index: false, follow: false },
};

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("Common.nav");
  return (
    <div className="chat-shell fixed inset-x-0 top-0 z-60 flex h-dvh flex-col bg-stadium-bg pb-[env(safe-area-inset-bottom)] font-barlow">
      {/* Background image */}
      <Image
        src="/assets/fan_made/background_1.jpg"
        alt=""
        fill
        sizes="100vw"
        className="object-cover opacity-[0.07] pointer-events-none select-none"
        priority
      />
      {/* Exit — the chat shell covers the site header */}
      <Link
        href="/"
        className="absolute top-2 right-2 z-[70] inline-flex min-h-10 items-center gap-1.5 rounded-full border border-stadium-border bg-stadium-surface/90 px-3 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur hover:bg-stadium-surface2 focus-visible:ring-2 focus-visible:ring-lfc-red outline-none"
      >
        <ArrowLeft size={14} />
        {t("home")}
      </Link>
      {/* react-query + tooltip provider are chat-only; not in the root layout. */}
      <QueryProvider>{children}</QueryProvider>
    </div>
  );
}
