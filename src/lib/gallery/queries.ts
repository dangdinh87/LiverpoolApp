import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { GalleryCategory } from "@/lib/constants";

export interface GalleryImage {
  id: string;
  cloudinary_public_id: string;
  cloudinary_url: string;
  alt: string;
  category: GalleryCategory;
  width: number | null;
  height: number | null;
  is_homepage_eligible: boolean;
  sort_order: number;
  created_at: string;
}

/** List gallery images with pagination, ordered by sort_order then newest first */
export async function listGalleryImagesFromDB(options?: {
  limit?: number;
  offset?: number;
  category?: string;
  search?: string;
}): Promise<{ images: GalleryImage[]; total: number }> {
  const supabase = await createServerSupabaseClient();
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  let query = supabase
    .from("gallery_images")
    .select("*", { count: "exact" });

  if (options?.category && options.category !== "all") {
    query = query.eq("category", options.category);
  }

  if (options?.search?.trim()) {
    query = query.ilike("alt", `%${options.search.trim()}%`);
  }

  const { data, error, count } = await query
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return {
    images: (data as GalleryImage[]) ?? [],
    total: count ?? 0,
  };
}

/** Get image counts per category from DB */
export async function getGalleryCategoryCounts(): Promise<Record<string, number>> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("gallery_images")
    .select("category");
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.category] = (counts[row.category] || 0) + 1;
  }
  return counts;
}

/** Get a single gallery image by id */
export async function getGalleryImageById(
  id: string,
): Promise<GalleryImage | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("gallery_images")
    .select("*")
    .eq("id", id)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return (data as GalleryImage) ?? null;
}

/** Insert a gallery image row */
export async function insertGalleryImage(image: {
  cloudinary_public_id: string;
  cloudinary_url: string;
  alt: string;
  category: GalleryCategory;
  width?: number;
  height?: number;
  is_homepage_eligible?: boolean;
}): Promise<GalleryImage> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("gallery_images")
    .insert(image)
    .select()
    .single();
  if (error) throw error;
  return data as GalleryImage;
}

/** Delete a gallery image by id */
export async function deleteGalleryImageFromDB(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("gallery_images")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

/** Get a site setting by key */
export async function getSiteSetting<T>(key: string): Promise<T | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", key)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return (data?.value as T) ?? null;
}

/** Upsert a site setting. Pass null to delete the setting. */
export async function setSiteSetting(
  key: string,
  value: unknown,
): Promise<void> {
  const supabase = await createServerSupabaseClient();

  // null → delete the row (value column is NOT NULL)
  if (value === null || value === undefined) {
    const { error } = await supabase
      .from("site_settings")
      .delete()
      .eq("key", key);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("site_settings")
    .upsert(
      { key, value, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
  if (error) throw error;
}
