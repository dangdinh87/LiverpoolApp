"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { useTranslations } from "next-intl";

interface ShareButtonProps {
  title: string;
  url: string;
}

export function ShareButton({ title, url }: ShareButtonProps) {
  const t = useTranslations("News.actions");
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const fullUrl = `${window.location.origin}${url}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, url: fullUrl });
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-1.5 font-barlow text-xs text-white/60 hover:text-white uppercase tracking-wider transition-colors cursor-pointer"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-green-400" />
          {t("copied")}
        </>
      ) : (
        <>
          <Share2 className="w-3.5 h-3.5" />
          {t("share")}
        </>
      )}
    </button>
  );
}
