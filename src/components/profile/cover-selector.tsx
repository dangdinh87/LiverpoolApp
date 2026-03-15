"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Check, RotateCcw, ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/stores/toast-store";

// Default hero background — must match DEFAULT_HERO_BG in hero.tsx
const DEFAULT_COVER_URL = "/assets/lfc/stadium/bg_3.jpg";

// Hero background presets — curated high-quality Anfield/Liverpool images
const COVER_PRESETS = [
  // === Default first ===
  {
    id: "dalglish-stand-matchday",
    url: DEFAULT_COVER_URL,
    alt: "Sir Kenny Dalglish Stand on matchday",
    isDefault: true,
  },
  {
    id: "kop-flags-night",
    url: "/assets/lfc/stadium/bg_1.jpg",
    alt: "The Kop flags & banners at night",
  },
  {
    id: "ynwa-scarves-night",
    url: "/assets/lfc/stadium/bg_2.jpg",
    alt: "YNWA scarves — The Kop at night",
  },
  {
    id: "anfield-aerial-dusk",
    url: "/assets/lfc/stadium/bg_4.jpg",
    alt: "Anfield aerial view at dusk",
  },
  {
    id: "anfield-panorama-interior",
    url: "/assets/lfc/stadium/bg_5.jpg",
    alt: "Anfield Stadium panoramic interior",
  },
  {
    id: "anfield-pitch-kop-view",
    url: "/assets/lfc/stadium/bg_6.jpg",
    alt: "Anfield pitch from The Kop end",
  },
  {
    id: "champions-parade-crowd",
    url: "/assets/lfc/stadium/bg_7.jpg",
    alt: "Champions of Europe victory parade",
  },
  {
    id: "kop-matchday-flags",
    url: "/assets/lfc/stadium/bg_8.jpg",
    alt: "The Kop matchday with flags",
  },
  // === Best Cloudinary gallery picks ===
  {
    id: "anfield-matchday",
    url: "https://res.cloudinary.com/darlrynqm/image/upload/v1773477627/lfc-gallery/unsplash-anfield-matchday-atmosphere.jpg",
    alt: "Anfield full of fans on matchday night",
  },
  {
    id: "anfield-lfc-seats",
    url: "https://res.cloudinary.com/darlrynqm/image/upload/v1773477658/lfc-gallery/pexels-anfield-lfc-letters-seats.jpg",
    alt: "Anfield seats spelling LFC",
  },
] as const;

interface CoverSelectorProps {
  currentCoverUrl: string | null;
}

export function CoverSelector({ currentCoverUrl }: CoverSelectorProps) {
  const t = useTranslations("Profile");
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string | null>(currentCoverUrl);
  const { show: showToast } = useToast();

  function handleSelect(url: string | null) {
    const prev = selected;
    setSelected(url);

    startTransition(async () => {
      try {
        const res = await fetch("/api/gallery/homepage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(url ? { cloudinaryUrl: url } : {}),
        });
        if (!res.ok) {
          setSelected(prev); // revert
          showToast({ type: "error", message: t("coverError") });
          return;
        }
        showToast({
          type: "success",
          message: url ? t("coverUpdated") : t("coverResetDone"),
        });
      } catch {
        setSelected(prev);
        showToast({ type: "error", message: t("coverError") });
      }
    });
  }

  return (
    <div>
      {/* Header + reset */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bebas text-lg text-white tracking-wider flex items-center gap-2">
          <ImageIcon size={16} className="text-lfc-red" />
          {t("coverTitle")}
        </h3>
        {selected && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSelect(null)}
            disabled={isPending}
            className="text-stadium-muted hover:text-white text-xs font-barlow uppercase tracking-wider"
          >
            <RotateCcw size={12} className="mr-1.5" />
            {t("coverReset")}
          </Button>
        )}
      </div>

      {/* Preset grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {COVER_PRESETS.map((preset) => {
          const isActive = selected === preset.url;
          const isDefault = "isDefault" in preset && preset.isDefault;
          return (
            <motion.button
              key={preset.id}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleSelect(preset.url)}
              disabled={isPending}
              className={cn(
                "relative aspect-[16/9] overflow-hidden border-2 transition-all cursor-pointer group",
                isActive
                  ? "border-lfc-red ring-1 ring-lfc-red/50"
                  : isDefault
                    ? "border-lfc-gold/50 hover:border-lfc-gold"
                    : "border-stadium-border hover:border-white/40",
                isPending && "opacity-50 pointer-events-none"
              )}
            >
              <Image
                src={preset.url}
                alt={preset.alt}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                unoptimized
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              {/* Default badge */}
              {isDefault && !isActive && (
                <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-lfc-gold/90 text-black text-[9px] font-barlow font-bold uppercase tracking-wider">
                  {t("coverDefault")}
                </span>
              )}
              {isActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <div className="bg-lfc-red p-1">
                    <Check size={16} className="text-white" />
                  </div>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
