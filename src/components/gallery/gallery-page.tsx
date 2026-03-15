"use client";

import { useState, useCallback, useRef } from "react";
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
  isAdmin: boolean;
  totalImages: number;
  categoryCounts?: Record<string, number>;
}

export function GalleryPage({ images: initialImages, isAdmin, totalImages, categoryCounts }: GalleryPageProps) {
  const [images, setImages] = useState(initialImages);
  const [total, setTotal] = useState(totalImages);
  const [searching, setSearching] = useState(false);
  const savedImagesRef = useRef(initialImages);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const res = await fetch("/api/gallery", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setImages((prev) => prev.filter((img) => img.id !== id));
        setTotal((prev) => prev - 1);
      }
    } catch (err) {
      console.error("Delete failed:", err);
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
      if (!res.ok) return { images: [], hasMore: false, total: total };
      const data = await res.json();
      const newImages = data.images as GalleryImage[];

      setImages((prev) => {
        const existingIds = new Set(prev.map((img) => img.id));
        const unique = newImages.filter((img: GalleryImage) => !existingIds.has(img.id));
        const merged = [...prev, ...unique];
        savedImagesRef.current = merged;
        return merged;
      });
      setTotal(data.total);

      return { images: newImages, hasMore: data.hasMore, total: data.total };
    } catch (err) {
      console.error("Load more failed:", err);
      return { images: [], hasMore: false, total: total };
    }
  }, [images, total]);

  const handleCategoryChange = useCallback(async (category: string) => {
    if (category === "all") {
      // Restore saved images (initial load has all categories)
      setImages(savedImagesRef.current);
      setTotal(totalImages);
      return;
    }
    try {
      const params = new URLSearchParams({
        offset: "0",
        limit: "50",
        category,
      });
      const res = await fetch(`/api/gallery?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setImages(data.images as GalleryImage[]);
      setTotal(data.total);
    } catch (err) {
      console.error("Category fetch failed:", err);
    }
  }, [totalImages]);

  const handleSearch = useCallback(async (query: string, category: string) => {
    if (!query.trim()) {
      setImages(savedImagesRef.current);
      setTotal(totalImages);
      setSearching(false);
      return;
    }
    setSearching(true);
    try {
      const params = new URLSearchParams({
        search: query,
        category,
        limit: "100",
        offset: "0",
      });
      const res = await fetch(`/api/gallery?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setImages(data.images as GalleryImage[]);
      setTotal(data.total);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setSearching(false);
    }
  }, [totalImages]);

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
