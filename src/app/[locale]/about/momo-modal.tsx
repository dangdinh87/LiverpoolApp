"use client";

import Image from "next/image";
import { QrCode } from "lucide-react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

/** MoMo donation QR. Radix Dialog gives Esc, focus trap and focus return for free. */
export function MomoModal() {
  const t = useTranslations("About.support");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 border border-[var(--line-strong)] px-5 font-barlow text-sm font-bold uppercase tracking-[0.12em] text-white transition-colors hover:border-white/40"
        >
          <QrCode size={16} aria-hidden />
          MoMo
        </button>
      </DialogTrigger>
      <DialogContent
        closeLabel={t("close")}
        className="max-w-sm gap-3 border-[var(--line-strong)] bg-white p-4 text-neutral-900 sm:max-w-sm [&_[data-slot=dialog-close]]:top-2 [&_[data-slot=dialog-close]]:right-2 [&_[data-slot=dialog-close]]:flex [&_[data-slot=dialog-close]]:size-11 [&_[data-slot=dialog-close]]:items-center [&_[data-slot=dialog-close]]:justify-center [&_[data-slot=dialog-close]]:bg-black/75 [&_[data-slot=dialog-close]]:text-white [&_[data-slot=dialog-close]]:opacity-100 hover:[&_[data-slot=dialog-close]]:bg-black"
      >
        <DialogTitle className="sr-only">{t("momoTitle")}</DialogTitle>
        <DialogDescription className="sr-only">{t("momoAlt")}</DialogDescription>
        <Image src="/assets/momo-qr.png" alt={t("momoAlt")} width={400} height={400} className="h-auto w-full" />
      </DialogContent>
    </Dialog>
  );
}
