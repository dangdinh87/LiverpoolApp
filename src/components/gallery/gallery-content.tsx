"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Trash2, Home, Loader2, Search, X, ImageOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { GALLERY_CATEGORIES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
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

// The lightbox (and its CSS) is only needed once someone opens a photo.
const GalleryLightbox = dynamic(() => import("./gallery-lightbox"), { ssr: false });

type Category = "all" | (typeof GALLERY_CATEGORIES)[number];

/**
 * Smaller rendition for grid thumbnails (lightbox + download keep `src`).
 * Wikimedia: reuse the `/thumb/.../{w}px-` pattern with a standard width.
 * Cloudinary: width-limited, auto quality/format. Anything else is untouched.
 */
function thumbSrc(src: string, width: number): string {
  try {
    const u = new URL(src);
    if (u.hostname === "upload.wikimedia.org") {
      if (/\.svg$/i.test(u.pathname)) return src;
      const thumb = u.pathname.match(/^(.*\/thumb\/.+\/)(\d+)px-([^/]+)$/);
      if (thumb) {
        return Number(thumb[2]) <= width ? src : `${u.origin}${thumb[1]}${width}px-${thumb[3]}`;
      }
      const orig = u.pathname.match(/^\/wikipedia\/(commons|en)\/([0-9a-f]\/[0-9a-f]{2})\/([^/]+)$/);
      if (orig) {
        return `${u.origin}/wikipedia/${orig[1]}/thumb/${orig[2]}/${orig[3]}/${width}px-${orig[3]}`;
      }
      return src;
    }
    if (u.hostname === "res.cloudinary.com" && u.pathname.includes("/upload/")) {
      const [head, tail] = src.split("/upload/");
      if (/^(w_|c_|q_|f_)/.test(tail)) return src;
      return `${head}/upload/w_600,c_limit,q_auto,f_auto/${tail}`;
    }
  } catch {
    // relative or malformed URL — use as-is
  }
  return src;
}

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

/** Same grid classes for photos and skeletons so nothing moves when data arrives. */
const GRID = "grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4";
const TILE = "relative aspect-[4/3] overflow-hidden";

function SkeletonTiles({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className={cn(TILE, "w-full")} />
      ))}
    </>
  );
}

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
  const [search, setSearch] = useState("");
  const [failedSrcs, setFailedSrcs] = useState<Set<string>>(new Set());
  const [homepageSet, setHomepageSet] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [hasMore, setHasMore] = useState(images.length < totalImages);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const slides = useMemo(
    () => filtered.map((img) => ({ src: img.src, alt: img.alt, download: img.src })),
    [filtered],
  );

  /** Category count from the server; `null` (hidden) when we do not know it. */
  const countFor = useCallback(
    (cat: Category): number | null => {
      if (!categoryCounts || Object.keys(categoryCounts).length === 0) return null;
      const n = cat === "all" ? Object.values(categoryCounts).reduce((a, b) => a + b, 0) : categoryCounts[cat];
      return typeof n === "number" && n > 0 ? n : null;
    },
    [categoryCounts],
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

  const handleCategoryChange = useCallback(
    async (cat: Category) => {
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
    },
    [onCategoryChange],
  );

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

  const handleDelete = useCallback(
    (id: string) => {
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
    [onDelete, showToast, t],
  );

  const handleSetHomepage = useCallback(
    (id: string) => {
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
    [onSetHomepage, showToast, t],
  );

  const showGrid = !categoryLoading;

  return (
    <>
      {/* Admin confirm dialog (only ever opened by admin controls) */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(v) => setConfirmDialog((prev) => ({ ...prev, open: v }))}>
        <AlertDialogContent className="bg-stadium-surface border-stadium-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white font-bebas text-2xl tracking-wider">{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription className="text-stadium-muted font-inter">{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-stadium-surface2 border-stadium-border text-white hover:bg-stadium-surface hover:text-white cursor-pointer">
              {t("admin.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDialog.onConfirm} className="bg-lfc-red hover:bg-lfc-red/80 text-white cursor-pointer">
              {t("admin.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toolbar: search + category chips */}
      <div className="mb-6 flex flex-col gap-3">
        <div className="relative w-full sm:max-w-sm">
          <Search
            aria-hidden
            className={cn(
              "pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2",
              isSearching ? "animate-pulse text-brand" : "text-stadium-muted",
            )}
          />
          <input
            type="search"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t("search.placeholder")}
            aria-label={t("search.placeholder")}
            className="h-11 w-full border border-[var(--line-strong)] bg-[var(--surface-1)] pl-10 pr-10 text-[15px] text-white placeholder:text-stadium-muted focus-visible:border-lfc-red focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {search && (
            <button
              type="button"
              onClick={() => handleSearchChange("")}
              aria-label={t("search.clear")}
              className="absolute right-0 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center text-stadium-muted hover:text-white"
            >
              <X className="size-4" aria-hidden />
            </button>
          )}
        </div>

        <div role="group" aria-label={t("hero.label")} className="scroll-x -mx-4 flex gap-2 px-4 sm:mx-0 sm:px-0">
          {ALL_CATEGORIES.map((cat) => {
            const isActive = category === cat;
            const count = countFor(cat);
            return (
              <button
                key={cat}
                type="button"
                aria-pressed={isActive}
                onClick={() => handleCategoryChange(cat)}
                className={cn(
                  "inline-flex min-h-10 shrink-0 items-center gap-2 border px-4 font-barlow text-sm font-semibold uppercase tracking-[0.1em] whitespace-nowrap transition-colors",
                  isActive
                    ? "border-lfc-red bg-lfc-red text-white"
                    : "border-[var(--line-strong)] text-stadium-muted hover:border-white/40 hover:text-white",
                )}
              >
                {categoryLabels[cat]}
                {count !== null && <span className={cn("font-inter text-xs", isActive ? "text-white" : "text-stadium-muted")}>{count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading (category switch) */}
      {categoryLoading && (
        <div role="status" aria-label={t("loadMore.loading")} className={GRID}>
          <SkeletonTiles count={8} />
        </div>
      )}

      {/* Grid: every tile has a fixed aspect box, so images arriving never move anything */}
      {showGrid && filtered.length > 0 && (
        <ul className={GRID}>
          {filtered.map((img, i) => (
            <li key={img.id} className={cn(TILE, "surface group")}>
              <button
                type="button"
                onClick={() => {
                  setIndex(i);
                  setOpen(true);
                }}
                aria-label={img.alt}
                className="absolute inset-0 block size-full cursor-zoom-in"
              >
                <Image
                  src={thumbSrc(img.src, 500)}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
                  className="object-cover opacity-90 transition-opacity duration-200 group-hover:opacity-100"
                  loading={i < 4 ? "eager" : "lazy"}
                  unoptimized
                  onError={() => handleImageError(img.src)}
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-6 text-left font-barlow text-[11px] uppercase tracking-wider text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                >
                  {img.alt}
                </span>
              </button>

              {/* Admin-only controls: not rendered for everyone else */}
              {isAdmin && onDelete && (
                <button
                  type="button"
                  onClick={() => handleDelete(img.id)}
                  aria-label={t("admin.delete")}
                  title={t("admin.delete")}
                  className="absolute left-1.5 top-1.5 inline-flex size-9 items-center justify-center bg-red-600/90 text-white hover:bg-red-600"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              )}
              {isAdmin && onSetHomepage && img.isHomepageEligible && (
                <button
                  type="button"
                  onClick={() => handleSetHomepage(img.id)}
                  aria-label={t("admin.setHomepage")}
                  title={t("admin.setHomepage")}
                  className={cn(
                    "absolute right-1.5 top-1.5 inline-flex size-9 items-center justify-center text-black",
                    homepageSet === img.id ? "bg-green-400" : "bg-lfc-gold/90 hover:bg-lfc-gold",
                  )}
                >
                  <Home className="size-4" aria-hidden />
                </button>
              )}
            </li>
          ))}
          {loading && <SkeletonTiles count={8} />}
        </ul>
      )}

      {/* Empty */}
      {showGrid && filtered.length === 0 && (
        <EmptyState
          icon={<ImageOff className="size-10" aria-hidden />}
          title={t("empty.title")}
          description={search ? t("empty.searchHint") : t("empty.description")}
        />
      )}

      {/* Load more */}
      {showGrid && hasMore && onLoadMore && filtered.length > 0 && (
        <div className="mt-8 flex justify-center">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={loading}
            className="h-11 border-[var(--line-strong)] bg-transparent px-8 font-barlow text-sm font-bold uppercase tracking-[0.14em] text-white hover:bg-[var(--surface-3)] hover:text-white"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {t("loadMore.loading")}
              </>
            ) : (
              <>
                {t("loadMore.button")}
                <span className="font-inter text-xs text-stadium-muted">
                  {filtered.length} / {totalImages}
                </span>
              </>
            )}
          </Button>
        </div>
      )}

      {/* Lightbox: mounted on first open only */}
      {open && (
        <GalleryLightbox
          open={open}
          index={index}
          slides={slides}
          onClose={() => setOpen(false)}
          onIndexChange={setIndex}
          labels={{
            previous: t("lightbox.previous"),
            next: t("lightbox.next"),
            close: t("lightbox.close"),
            zoomIn: t("lightbox.zoomIn"),
            zoomOut: t("lightbox.zoomOut"),
            download: t("admin.download"),
          }}
        />
      )}
    </>
  );
}
