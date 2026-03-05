"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import type { Injury } from "@/lib/types/football";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

// Status config: label, description, colors, severity order
const STATUS_CONFIG: Record<
  string,
  { label: string; description: string; bg: string; text: string; border: string; dot: string; order: number }
> = {
  "Missing Fixture": {
    label: "OUT",
    description: "Confirmed out",
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/25",
    dot: "bg-red-500",
    order: 0,
  },
  Doubtful: {
    label: "DOUBT",
    description: "Unlikely to play",
    bg: "bg-orange-500/10",
    text: "text-orange-400",
    border: "border-orange-500/25",
    dot: "bg-orange-500",
    order: 1,
  },
  Questionable: {
    label: "50/50",
    description: "Fitness test required",
    bg: "bg-yellow-500/10",
    text: "text-yellow-400",
    border: "border-yellow-500/25",
    dot: "bg-yellow-500",
    order: 2,
  },
};

const DEFAULT_STATUS = STATUS_CONFIG["Missing Fixture"];

export function InjuryWidget({ injuries }: { injuries: Injury[] }) {
  const [open, setOpen] = useState(false);

  // Deduplicate by player id, keep latest entry
  const unique = Array.from(
    new Map(injuries.map((inj) => [inj.player.id, inj])).values()
  ).sort((a, b) => {
    const aOrder = (STATUS_CONFIG[a.player.type] ?? DEFAULT_STATUS).order;
    const bOrder = (STATUS_CONFIG[b.player.type] ?? DEFAULT_STATUS).order;
    return aOrder - bOrder;
  });

  if (unique.length === 0) return null;

  // Count by severity
  const outCount = unique.filter((i) => i.player.type === "Missing Fixture").length;
  const doubtCount = unique.length - outCount;

  // Group by status type
  const grouped = unique.reduce<Record<string, Injury[]>>((acc, inj) => {
    const key = inj.player.type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(inj);
    return acc;
  }, {});

  const groupOrder = Object.entries(grouped).sort(([a], [b]) => {
    return (STATUS_CONFIG[a]?.order ?? 99) - (STATUS_CONFIG[b]?.order ?? 99);
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="inline-flex items-center gap-2 px-3 py-2 rounded-none border text-sm transition-colors bg-stadium-surface border-stadium-border text-stadium-muted hover:border-red-500/30 hover:text-white"
        >
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="font-barlow font-semibold text-xs uppercase tracking-wider">
            Injuries
          </span>
          <span className="font-bebas text-base leading-none text-red-400">
            {unique.length}
          </span>
        </button>
      </DialogTrigger>

      <DialogContent
        className="bg-stadium-bg border-stadium-border p-0 gap-0 overflow-hidden sm:max-w-lg"
        showCloseButton
      >
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-stadium-border bg-stadium-surface gap-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-none bg-red-500/15 flex items-center justify-center">
              <AlertCircle size={20} className="text-red-400" />
            </div>
            <div>
              <DialogTitle className="font-bebas text-2xl text-white tracking-wider leading-none">
                Injury Room
              </DialogTitle>
              <DialogDescription asChild>
                <div className="flex items-center gap-3 mt-1.5">
                  {outCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-inter">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="text-red-400 font-medium">{outCount} out</span>
                    </span>
                  )}
                  {doubtCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-inter">
                      <span className="w-2 h-2 rounded-full bg-yellow-500" />
                      <span className="text-yellow-400 font-medium">{doubtCount} doubtful</span>
                    </span>
                  )}
                </div>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Grouped player list */}
        <div className="max-h-[60vh] overflow-y-auto">
          {groupOrder.map(([type, players]) => {
            const cfg = STATUS_CONFIG[type] ?? DEFAULT_STATUS;
            return (
              <div key={type}>
                {/* Group label */}
                <div
                  className={cn(
                    "sticky top-0 z-10 px-6 py-2.5 flex items-center gap-2 border-b border-stadium-border/50",
                    cfg.bg
                  )}
                >
                  <span className={cn("w-2 h-2 rounded-full shrink-0", cfg.dot)} />
                  <span className={cn("font-barlow font-semibold text-xs uppercase tracking-wider", cfg.text)}>
                    {cfg.label}
                  </span>
                  <span className="text-stadium-muted font-inter text-xs">
                    — {cfg.description}
                  </span>
                  <span className={cn("ml-auto font-bebas text-sm leading-none", cfg.text)}>
                    {players.length}
                  </span>
                </div>

                {/* Players in group */}
                {players.map((inj) => (
                  <Link
                    key={inj.player.id}
                    href={`/player/${inj.player.id}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-stadium-surface/60 transition-colors border-b border-stadium-border/20 last:border-b-0"
                  >
                    {/* Avatar */}
                    <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0 ring-2 ring-stadium-border">
                      <Image
                        src={inj.player.photo}
                        alt={inj.player.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>

                    {/* Name + reason */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-inter text-[15px] font-semibold truncate leading-tight">
                        {inj.player.name}
                      </p>
                      <p className={cn("font-inter text-sm mt-1 font-medium", cfg.text)}>
                        {inj.player.reason}
                      </p>
                    </div>

                    {/* Status badge */}
                    <span
                      className={cn(
                        "px-3 py-1 rounded-none text-xs font-bebas tracking-wider shrink-0 border",
                        cfg.bg, cfg.text, cfg.border
                      )}
                    >
                      {cfg.label}
                    </span>
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
