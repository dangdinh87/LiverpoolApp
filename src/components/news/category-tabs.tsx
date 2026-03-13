"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  Layers,
  Target,
  CircleDollarSign,
  HeartPulse,
  Users,
  BarChart3,
  MessageSquareQuote,
  type LucideIcon,
} from "lucide-react";

const CATEGORIES: { value: string; icon: LucideIcon }[] = [
  { value: "all", icon: Layers },
  { value: "team-news", icon: Users },
  { value: "transfer", icon: CircleDollarSign },
  { value: "match-report", icon: Target },
  { value: "injury", icon: HeartPulse },
  { value: "analysis", icon: BarChart3 },
  { value: "opinion", icon: MessageSquareQuote },
];

interface CategoryTabsProps {
  active: string;
}

export function CategoryTabs({ active }: CategoryTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("News.categories");

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {CATEGORIES.map(({ value, icon: Icon }) => {
        const isActive = active === value;
        return (
          <motion.button
            key={value}
            onClick={() => {
              const params = new URLSearchParams();
              if (value !== "all") params.set("category", value);
              const qs = params.toString();
              router.push(qs ? `${pathname}?${qs}` : pathname, {
                scroll: false,
              });
            }}
            whileTap={{ scale: 0.96 }}
            className={`relative inline-flex items-center gap-1.5 font-barlow text-xs uppercase tracking-wider px-3 py-1.5 whitespace-nowrap border overflow-hidden cursor-pointer transition-colors ${
              isActive
                ? "border-lfc-red text-white"
                : "border-stadium-border text-stadium-muted hover:border-lfc-red/40 hover:text-white"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="category-tab-bg"
                className="absolute inset-0 bg-lfc-red"
                transition={{ type: "spring", stiffness: 180, damping: 14 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5" />
              {t(value)}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
