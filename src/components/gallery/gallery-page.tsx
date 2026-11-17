"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { isAdminEmail } from "@/lib/constants";
import { hasSupabaseSession, loadSupabaseClient } from "@/lib/supabase-lazy";
import { GalleryContent } from "./gallery-content";

export interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  category: string;
  width?: number;
  height?: number;
  cloudinaryId?: string;
  isHomepageEligible?: boolean;
}

interface GalleryPageProps {
  images: GalleryImage[];
  isAdmin?: boolean;
  totalImages: number;
  categoryCounts?: Record<string, number>;
}

export function GalleryPage({
  images: initialImages,
  isAdmin: initialIsAdmin = false,
  totalImages,
  categoryCounts,
}: GalleryPageProps) {
  const [images, setImages] = useState(initialImages);
  const [total, setTotal] = useState(totalImages);
  const [isAdmin, setIsAdmin] = useState(initialIsAdmin);
  const [searching, setSearching] = useState(false);
  const savedAllImagesRef = useRef(initialImages);
  const savedAllTotalRef = useRef(totalImages);
  const activeFetchRef = useRef<AbortController | null>(null);

  // Resolve admin affordances client-side only when a Supabase session cookie exists,
  // keeping /gallery prerendered as static ISR for every visitor.
  useEffect(() => {
    if (!hasSupabaseSession()) return;
    let cancelled = false;
    loadSupabaseClient()
      .then((supabase) => supabase.auth.getUser())
      .then(({ data: { user } }) => {
        if (!cancelled) setIsAdmin(isAdminEmail(user?.email));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(
    () => () => {
      activeFetchRef.current?.abort();
    },
    [],
  );

  const handleDelete = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/gallery", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) return false;
      setImages((prev) => prev.filter((img) => img.id !== id));
      savedAllImagesRef.current = savedAllImagesRef.current.filter((img) => img.id !== id);
      savedAllTotalRef.current = Math.max(0, savedAllTotalRef.current - 1);
      setTotal((prev) => Math.max(0, prev - 1));
      return true;
    } catch (err) {
      console.error("Delete failed:", err);
      return false;
    }
  }, []);

  const handleSetHomepage = useCallback(async (id: string) => {
    try {
      const res = await fetch("/api/gallery/homepage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ galleryImageId: id }),
      });
      return res.ok;
    } catch (err) {
      console.error("Set homepage failed:", err);
      return false;
    }
  }, []);

  const handleLoadMore = useCallback(async (category: string) => {
    try {
      const offset = category === "all"
        ? images.length
        : images.filter((img) => img.category === category).length;
      const params = new URLSearchParams({
        offset: String(offset),
        limit: "50",
        category,
      });
      const res = await fetch(`/api/gallery?${params}`);
      if (!res.ok) return { images: [], hasMore: false, total };
      const data = await res.json();
      const newImages = data.images as GalleryImage[];

      setImages((prev) => {
        const existingIds = new Set(prev.map((img) => img.id));
        const unique = newImages.filter((img: GalleryImage) => !existingIds.has(img.id));
        const merged = [...prev, ...unique];
        if (category === "all") {
          savedAllImagesRef.current = merged;
          savedAllTotalRef.current = data.total;
        }
        return merged;
      });
      setTotal(data.total);

      return { images: newImages, hasMore: data.hasMore, total: data.total };
    } catch (err) {
      console.error("Load more failed:", err);
      return { images: [], hasMore: false, total };
    }
  }, [images, total]);

  const handleCategoryChange = useCallback(async (category: string) => {
    activeFetchRef.current?.abort();
    if (category === "all") {
      setImages(savedAllImagesRef.current);
      setTotal(savedAllTotalRef.current);
      return;
    }
    const controller = new AbortController();
    activeFetchRef.current = controller;
    try {
      const params = new URLSearchParams({
        offset: "0",
        limit: "50",
        category,
      });
      const res = await fetch(`/api/gallery?${params}`, { signal: controller.signal });
      if (!res.ok) return;
      const data = await res.json();
      setImages(data.images as GalleryImage[]);
      setTotal(data.total);
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        console.error("Category fetch failed:", err);
      }
    }
  }, []);

  const handleSearch = useCallback(async (query: string, category: string) => {
    activeFetchRef.current?.abort();
    if (!query.trim()) {
      if (category === "all") {
        setImages(savedAllImagesRef.current);
        setTotal(savedAllTotalRef.current);
        setSearching(false);
        return;
      }
      setSearching(false);
      await handleCategoryChange(category);
      return;
    }
    const controller = new AbortController();
    activeFetchRef.current = controller;
    setSearching(true);
    try {
      const params = new URLSearchParams({
        search: query,
        category,
        limit: "100",
        offset: "0",
      });
      const res = await fetch(`/api/gallery?${params}`, { signal: controller.signal });
      if (!res.ok) return;
      const data = await res.json();
      setImages(data.images as GalleryImage[]);
      setTotal(data.total);
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        console.error("Search failed:", err);
      }
    } finally {
      if (activeFetchRef.current === controller) {
        setSearching(false);
      }
    }
  }, [handleCategoryChange]);

  return (
    <GalleryContent
      images={images}
      isAdmin={isAdmin}
      totalImages={total}
      categoryCounts={categoryCounts}
      onDelete={handleDelete}
      onSetHomepage={handleSetHomepage}
      onLoadMore={handleLoadMore}
      onCategoryChange={handleCategoryChange}
      onSearch={handleSearch}
      isSearching={searching}
    />
  );
}
