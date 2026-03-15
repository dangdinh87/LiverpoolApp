"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import {
  ZoomIn,
  Download,
  Trash2,
  Home,
  Loader2,
  LayoutGrid,
  List,
  Search,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import { useTranslations } from "next-intl";
import { GALLERY_CATEGORIES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/stores/toast-store";
import { cn } from "@/lib/utils";

type Category = "all" | (typeof GALLERY_CATEGORIES)[number];
type ViewMode = "card" | "list";

interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  category: string;
  width?: number;
  height?: number;
  cloudinaryId?: string;
  isHomepageEligible?: boolean;
}

interface GalleryContentProps {
  images: GalleryImage[];
  isAdmin?: boolean;
  totalImages: number;
  categoryCounts?: Record<string, number>;
  onDelete?: (id: string) => void;
  onSetHomepage?: (id: string) => Promise<boolean>;
  onLoadMore?: (category: string) => Promise<{
    images: GalleryImage[];
    hasMore: boolean;
    total: number;
  }>;
  onCategoryChange?: (category: string) => Promise<void>;
  onSearch?: (query: string, category: string) => Promise<void>;
  isSearching?: boolean;
}

const ALL_CATEGORIES: Category[] = ["all", ...GALLERY_CATEGORIES];

export function GalleryContent({
  images,
  isAdmin,
  totalImages,
  categoryCounts,
  onDelete,
  onSetHomepage,
  onLoadMore,
  onCategoryChange,
  onSearch,
  isSearching,
}: GalleryContentProps) {
  const t = useTranslations("Gallery");
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [category, setCategory] = useState<Category>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [search, setSearch] = useState("");
  const [failedSrcs, setFailedSrcs] = useState<Set<string>>(new Set());
  const [homepageSet, setHomepageSet] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [hasMore, setHasMore] = useState(images.length < totalImages);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Toast + confirm dialog
  const { show: showToast } = useToast();
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ open: false, title: "", description: "", onConfirm: () => {} });

  const handleImageError = useCallback((src: string) => {
    setFailedSrcs((prev) => {
      if (prev.has(src)) return prev;
      const next = new Set(prev);
      next.add(src);
      return next;
    });
  }, []);

  // Debounced DB search
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onSearch?.(value, category);
      }, 400);
    },
    [onSearch, category],
  );

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const filtered = useMemo(() => {
    let result = images.filter((img) => !failedSrcs.has(img.src));
    if (category !== "all") {
      result = result.filter((img) => img.category === category);
    }
    return result;
  }, [images, category, failedSrcs]);

  // Badge counts: use categoryCounts (from server) as stable source of truth
  const dbCount = useCallback(
    (cat: Category) => {
      if (categoryCounts) {
        if (cat === "all") {
          // Sum all category counts for stable "all" total
          return Object.values(categoryCounts).reduce((a, b) => a + b, 0);
        }
        return categoryCounts[cat] ?? 0;
      }
      const valid = images.filter((img) => !failedSrcs.has(img.src));
      if (cat === "all") return valid.length;
      return valid.filter((img) => img.category === cat).length;
    },
    [categoryCounts, images, failedSrcs],
  );

  const handleLoadMore = useCallback(async () => {
    if (!onLoadMore || loading) return;
    setLoading(true);
    try {
      const result = await onLoadMore(category);
      setHasMore(result.hasMore);
    } finally {
      setLoading(false);
    }
  }, [onLoadMore, loading, category]);

  const handleCategoryChange = useCallback(async (cat: Category) => {
    setCategory(cat);
    setHasMore(true);
    setSearch("");
    if (onCategoryChange) {
      setCategoryLoading(true);
      try {
        await onCategoryChange(cat);
      } finally {
        setCategoryLoading(false);
      }
    }
  }, [onCategoryChange]);

  const categoryLabels: Record<string, string> = {
    all: t("categories.all"),
    anfield: t("categories.anfield"),
    squad: t("categories.squad"),
    matches: t("categories.matches"),
    fans: t("categories.fans"),
    legends: t("categories.legends"),
    trophies: t("categories.trophies"),
    history: t("categories.history"),
  };

  // Actions with confirm + toast
  const handleDelete = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setConfirmDialog({
        open: true,
        title: t("admin.delete"),
        description: t("admin.deleteConfirm"),
        onConfirm: () => {
          onDelete?.(id);
          showToast({ type: "success", message: t("admin.deleteSuccess") });
          setConfirmDialog((prev) => ({ ...prev, open: false }));
        },
      });
    },
    [onDelete, t],
  );

  const handleSetHomepage = useCallback(
    async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setConfirmDialog({
        open: true,
        title: t("admin.setHomepage"),
        description: t("admin.setHomepageConfirm"),
        onConfirm: async () => {
          const ok = await onSetHomepage?.(id);
          if (ok) {
            setHomepageSet(id);
            showToast({ type: "success", message: t("admin.setHomepageSuccess") });
          } else {
            showToast({ type: "error", message: t("admin.actionError") });
          }
          setConfirmDialog((prev) => ({ ...prev, open: false }));
        },
      });
    },
    [onSetHomepage, t],
  );

  return (
    <TooltipProvider delayDuration={300}>
      {/* Confirm dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(v) => setConfirmDialog((prev) => ({ ...prev, open: v }))}
      >
        <AlertDialogContent className="bg-stadium-surface border-stadium-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white font-bebas text-2xl tracking-wider">
              {confirmDialog.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-stadium-muted font-inter">
              {confirmDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-stadium-surface2 border-stadium-border text-white hover:bg-stadium-surface hover:text-white cursor-pointer">
              {t("admin.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDialog.onConfirm}
              className="bg-lfc-red hover:bg-lfc-red/80 text-white cursor-pointer"
            >
              {t("admin.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 mb-6">
        {/* Row 1: categories + view toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {ALL_CATEGORIES.map((cat) => {
              const isActive = category === cat;
              return (
                <motion.button
                  key={cat}
                  onClick={() => handleCategoryChange(cat)}
                  whileTap={{ scale: 0.96 }}
                  className={cn(
                    "relative inline-flex items-center gap-1.5 font-barlow text-xs uppercase tracking-wider px-3 py-1.5 whitespace-nowrap border overflow-hidden cursor-pointer transition-colors",
                    isActive
                      ? "border-lfc-red text-white"
                      : "border-stadium-border text-stadium-muted hover:border-lfc-red/40 hover:text-white",
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="gallery-tab-bg"
                      className="absolute inset-0 bg-lfc-red"
                      transition={{ type: "spring", stiffness: 180, damping: 14 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    {categoryLabels[cat]}
                    <span className="opacity-60 font-inter">{dbCount(cat)}</span>
                  </span>
                </motion.button>
              );
            })}
          </div>

          <div className="flex items-center gap-0.5 border border-stadium-border p-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewMode("card")}
                  className={cn(
                    "h-7 w-7",
                    viewMode === "card"
                      ? "bg-lfc-red text-white hover:bg-lfc-red/90 hover:text-white"
                      : "text-stadium-muted hover:text-white hover:bg-stadium-surface",
                  )}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("viewMode.card")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "h-7 w-7",
                    viewMode === "list"
                      ? "bg-lfc-red text-white hover:bg-lfc-red/90 hover:text-white"
                      : "text-stadium-muted hover:text-white hover:bg-stadium-surface",
                  )}
                >
                  <List className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("viewMode.list")}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Row 2: search */}
        <div className="relative max-w-xs">
          <Search
            className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none",
              isSearching ? "text-lfc-red animate-pulse" : "text-stadium-muted",
            )}
          />
          <Input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t("search.placeholder")}
            className="h-9 pl-9 pr-8 bg-stadium-surface border-stadium-border text-white text-xs font-inter placeholder:text-stadium-muted/60 focus-visible:ring-lfc-red/30 focus-visible:border-lfc-red/50"
          />
          {search && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-stadium-muted hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Loading skeleton */}
      {categoryLoading && (
        <div className="columns-2 sm:columns-3 md:columns-4 gap-1.5 space-y-1.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="break-inside-avoid bg-stadium-surface animate-pulse"
              style={{ aspectRatio: `1 / ${[0.75, 1.0, 0.66, 0.85][i % 4]}` }}
            />
          ))}
        </div>
      )}

      {/* === CARD VIEW (Masonry) === */}
      {!categoryLoading && viewMode === "card" && (
        <div className="columns-2 sm:columns-3 md:columns-4 gap-1.5 space-y-1.5">
          {filtered.map((img, i) => {
            const aspectRatio =
              img.width && img.height
                ? img.height / img.width
                : [0.75, 1.0, 0.66][i % 3];

            return (
              <div
                key={img.id}
                role="button"
                tabIndex={0}
                onClick={() => { setIndex(i); setOpen(true); }}
                onKeyDown={(e) => { if (e.key === "Enter") { setIndex(i); setOpen(true); } }}
                className="relative overflow-hidden cursor-zoom-in group break-inside-avoid block w-full"
                style={{ aspectRatio: `1 / ${aspectRatio}` }}
              >
                <div className="absolute inset-0 bg-stadium-surface animate-pulse" />
                <Image
                  src={img.src}
                  alt={img.alt}
                  width={400}
                  height={Math.round(400 * aspectRatio)}
                  className="relative w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                  loading="lazy"
                  unoptimized
                  onError={() => handleImageError(img.src)}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                </div>

                {/* Download */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      href={img.src}
                      download={`${img.id}.jpg`}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 z-10"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </TooltipTrigger>
                  <TooltipContent side="left">{t("admin.download")}</TooltipContent>
                </Tooltip>

                {/* Admin: Delete */}
                {isAdmin && onDelete && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => handleDelete(e, img.id)}
                        className="absolute top-2 left-2 p-1.5 bg-red-600/80 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">{t("admin.delete")}</TooltipContent>
                  </Tooltip>
                )}

                {/* Admin: Set homepage bg */}
                {isAdmin && onSetHomepage && img.isHomepageEligible && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => handleSetHomepage(e, img.id)}
                        className={cn(
                          "absolute bottom-8 right-2 p-1.5 text-black opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer",
                          homepageSet === img.id ? "bg-green-400" : "bg-lfc-gold/80 hover:bg-lfc-gold",
                        )}
                      >
                        <Home className="w-3.5 h-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left">{t("admin.setHomepage")}</TooltipContent>
                  </Tooltip>
                )}

                <p className="absolute bottom-0 inset-x-0 px-2 py-1.5 bg-linear-to-t from-black/80 to-transparent text-white text-[9px] font-barlow uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity truncate">
                  {img.alt}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* === LIST VIEW === */}
      {!categoryLoading && viewMode === "list" && (
        <div className="flex flex-col gap-2">
          {filtered.map((img, i) => (
            <div
              key={img.id}
              className="flex items-center gap-4 bg-stadium-surface border border-stadium-border hover:border-stadium-muted/50 transition-colors group"
            >
              <button
                onClick={() => { setIndex(i); setOpen(true); }}
                className="relative shrink-0 w-24 h-16 sm:w-32 sm:h-20 overflow-hidden cursor-zoom-in"
              >
                <div className="absolute inset-0 bg-stadium-surface2 animate-pulse" />
                <Image
                  src={img.src}
                  alt={img.alt}
                  width={128}
                  height={80}
                  className="relative w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  unoptimized
                  onError={() => handleImageError(img.src)}
                />
              </button>

              <div className="flex-1 min-w-0 py-2">
                <p className="text-white text-xs sm:text-sm font-inter truncate">{img.alt}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                  <Badge variant="outline" className="text-[9px] font-barlow font-bold uppercase tracking-wider text-lfc-red border-lfc-red/30 px-1.5 py-0">
                    {categoryLabels[img.category] || img.category}
                  </Badge>
                  {img.width && img.height && (
                    <span className="text-[10px] font-barlow text-stadium-muted">
                      {img.width} x {img.height}px
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-0.5 pr-3 shrink-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-stadium-muted hover:text-white hover:bg-stadium-surface2">
                      <a href={img.src} download={`${img.id}.jpg`}>
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("admin.download")}</TooltipContent>
                </Tooltip>

                {isAdmin && onSetHomepage && img.isHomepageEligible && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleSetHomepage(e, img.id)}
                        className={cn(
                          "h-8 w-8",
                          homepageSet === img.id ? "text-green-400" : "text-lfc-gold/60 hover:text-lfc-gold hover:bg-stadium-surface2",
                        )}
                      >
                        <Home className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("admin.setHomepage")}</TooltipContent>
                  </Tooltip>
                )}

                {isAdmin && onDelete && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleDelete(e, img.id)}
                        className="h-8 w-8 text-stadium-muted hover:text-red-500 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("admin.delete")}</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More */}
      {hasMore && onLoadMore && (
        <div className="flex justify-center mt-10">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={loading}
            className="bg-stadium-surface border-stadium-border text-white font-barlow font-bold uppercase tracking-[0.15em] text-xs hover:bg-stadium-surface2 hover:border-lfc-red/50 hover:text-white px-8 py-5"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                {t("loadMore.loading")}
              </>
            ) : (
              <>
                {t("loadMore.button")}
                <span className="opacity-50 text-[10px] ml-2">
                  {filtered.length} / {totalImages}
                </span>
              </>
            )}
          </Button>
        </div>
      )}

      {/* Lightbox */}
      <Lightbox
        open={open}
        close={() => setOpen(false)}
        index={index}
        slides={filtered.map((img) => ({ src: img.src }))}
        plugins={[Zoom]}
        styles={{ container: { backgroundColor: "rgba(0,0,0,0.97)" } }}
        zoom={{ maxZoomPixelRatio: 4, scrollToZoom: true }}
      />
    </TooltipProvider>
  );
}
