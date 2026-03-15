"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Check, RotateCcw, ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/stores/toast-store";

// Curated high-res landscape covers — dark tones prioritized, width >= 1600
const COVER_PRESETS = [
  // === Dark / Night / Moody (best for hero overlay) ===
  {
    id: "anfield-sunset",
    url: "https://res.cloudinary.com/darlrynqm/image/upload/v1773477604/lfc-gallery/unsplash-anfield-aerial-sunset.jpg",
    alt: "Aerial view of Anfield at sunset",
  },
  {
    id: "anfield-matchday",
    url: "https://res.cloudinary.com/darlrynqm/image/upload/v1773477627/lfc-gallery/unsplash-anfield-matchday-atmosphere.jpg",
    alt: "Anfield full of fans on matchday",
  },
  {
    id: "anfield-cloudy",
    url: "https://res.cloudinary.com/darlrynqm/image/upload/v1773477607/lfc-gallery/unsplash-anfield-cloudy-sky.jpg",
    alt: "Anfield with cloudy sky",
  },
  {
    id: "anfield-players-pitch",
    url: "https://res.cloudinary.com/darlrynqm/image/upload/v1773477631/lfc-gallery/unsplash-anfield-players-on-pitch.jpg",
    alt: "Players on the Anfield pitch",
  },
  {
    id: "anfield-empty-red-seats",
    url: "https://res.cloudinary.com/darlrynqm/image/upload/v1773477661/lfc-gallery/pexels-anfield-empty-red-seats.jpg",
    alt: "Empty Anfield with iconic red seats and pitch",
  },
  {
    id: "anfield-gates",
    url: "https://res.cloudinary.com/darlrynqm/image/upload/v1773477667/lfc-gallery/pexels-anfield-gates-sunrays.jpg",
    alt: "Shankly Gates with sunrays",
  },
  {
    id: "anfield-red-seats",
    url: "https://res.cloudinary.com/darlrynqm/image/upload/v1773477670/lfc-gallery/pexels-anfield-red-seats-numbered.jpg",
    alt: "Close-up of numbered red seats at Anfield",
  },
  {
    id: "anfield-lfc-seats",
    url: "https://res.cloudinary.com/darlrynqm/image/upload/v1773477658/lfc-gallery/pexels-anfield-lfc-letters-seats.jpg",
    alt: "Anfield seats spelling LFC",
  },
  {
    id: "champions-league-trophy",
    url: "https://res.cloudinary.com/darlrynqm/image/upload/v1773477731/lfc-gallery/unsplash-champions-league-trophy.jpg",
    alt: "UEFA Champions League trophy",
  },
  {
    id: "anfield-exterior-brick",
    url: "https://res.cloudinary.com/darlrynqm/image/upload/v1773477620/lfc-gallery/unsplash-anfield-exterior-brick-crest.jpg",
    alt: "Anfield brick building with crest",
  },
  // === Medium tone ===
  {
    id: "anfield-empty-pitch",
    url: "https://res.cloudinary.com/darlrynqm/image/upload/v1773477617/lfc-gallery/unsplash-anfield-empty-pitch.jpg",
    alt: "Empty Anfield with soccer field",
  },
  {
    id: "anfield-exterior-fans",
    url: "https://res.cloudinary.com/darlrynqm/image/upload/v1773477638/lfc-gallery/unsplash-anfield-exterior-fans-walking.jpg",
    alt: "Anfield exterior with fans",
  },
  {
    id: "anfield-green-field",
    url: "https://res.cloudinary.com/darlrynqm/image/upload/v1773477600/lfc-gallery/unsplash-anfield-green-field-red-seats.jpg",
    alt: "Anfield with green field and red seats",
  },
  {
    id: "anfield-aerial",
    url: "https://res.cloudinary.com/darlrynqm/image/upload/v1773477613/lfc-gallery/unsplash-anfield-aerial-surroundings.jpg",
    alt: "Aerial view of Anfield",
  },
  {
    id: "anfield-stadium-field",
    url: "https://res.cloudinary.com/darlrynqm/image/upload/v1773477597/lfc-gallery/unsplash-anfield-stadium-field-seating.jpg",
    alt: "Anfield with field and seating",
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
