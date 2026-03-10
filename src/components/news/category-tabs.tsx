"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
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
  { value: "match-report", icon: Target },
  { value: "transfer", icon: CircleDollarSign },
  { value: "injury", icon: HeartPulse },
  { value: "team-news", icon: Users },
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
          <button
            key={value}
            onClick={() => {
              const params = new URLSearchParams();
              if (value !== "all") params.set("category", value);
              const qs = params.toString();
              router.push(qs ? `${pathname}?${qs}` : pathname, {
                scroll: false,
              });
            }}
            className={`inline-flex items-center gap-1.5 font-barlow text-xs uppercase tracking-wider px-3 py-1.5 whitespace-nowrap border transition-colors cursor-pointer ${
              isActive
                ? "border-lfc-red text-lfc-red bg-lfc-red/10"
                : "border-stadium-border text-stadium-muted hover:border-lfc-red/40 hover:text-white"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {t(value)}
          </button>
        );
      })}
    </div>
  );
}
