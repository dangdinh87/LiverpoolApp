"use server";

import { revalidateLocalizedPath } from "@/i18n/revalidate";
import { getEnv } from "@/lib/env";
import { isKnownNewsSourceUrl } from "@/lib/news-config";
import { articleUrlVariants, canonicalizeArticleUrl } from "@/lib/news/url";
import { getPlayerById } from "@/lib/squad-data";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 30;
const MAX_BIO_LENGTH = 200;
const MAX_TITLE_LENGTH = 500;
const MAX_SNIPPET_LENGTH = 1000;
const MAX_URL_LENGTH = 2048;

function isValidUserAvatarUrl(publicUrl: string, userId: string): boolean {
  if (!publicUrl || typeof publicUrl !== "string" || publicUrl.length > MAX_URL_LENGTH) {
    return false;
  }
  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseUrl) return false;
  try {
    const parsed = new URL(publicUrl);
    const expectedOrigin = new URL(supabaseUrl).origin;
    if (parsed.protocol !== "https:" || parsed.origin !== expectedOrigin) return false;
    const expectedPrefix = `/storage/v1/object/public/avatars/${userId}/avatar.`;
    if (!parsed.pathname.startsWith(expectedPrefix)) return false;
    const ext = parsed.pathname.slice(expectedPrefix.length);
    return /^(jpg|jpeg|png|webp|gif)$/i.test(ext);
  } catch {
    return false;
  }
}

export async function updateProfile(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim() || null;
  const bio = String(formData.get("bio") ?? "").trim() || null;

  if (username && username.length < MIN_USERNAME_LENGTH) {
    return { error: `Username must be at least ${MIN_USERNAME_LENGTH} characters` };
  }
  if (username && username.length > MAX_USERNAME_LENGTH) {
    return { error: `Username must be ${MAX_USERNAME_LENGTH} characters or less` };
  }
  if (bio && bio.length > MAX_BIO_LENGTH) {
    return { error: `Bio must be ${MAX_BIO_LENGTH} characters or less` };
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("user_profiles")
    .upsert({ user_id: user.id, username, bio }, { onConflict: "user_id" });

  if (error) {
    console.error("[profile] updateProfile failed:", error.code);
    return { error: "Failed to update profile" };
  }

  revalidateLocalizedPath("/profile");
  return { success: true };
}

/**
 * Update avatar URL after client-side upload to Supabase Storage.
 * Only accepts URLs inside the caller's own folder on the project's Storage bucket.
 */
export async function updateAvatarUrl(publicUrl: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (!isValidUserAvatarUrl(publicUrl, user.id)) {
    return { error: "Invalid avatar URL" };
  }

  const { error } = await supabase
    .from("user_profiles")
    .upsert({ user_id: user.id, avatar_url: publicUrl }, { onConflict: "user_id" });

  if (error) return { error: "Failed to update avatar" };

  revalidateLocalizedPath("/profile");
  return { success: true };
}

export async function toggleFavouritePlayer(
  playerId: number,
  playerName: string,
  playerPhoto: string
) {
  if (!Number.isInteger(playerId) || playerId <= 0) {
    return { error: "Invalid player" };
  }
  const cleanName = String(playerName ?? "").trim().slice(0, 120);
  const cleanPhoto = String(playerPhoto ?? "").trim().slice(0, MAX_URL_LENGTH);
  if (!cleanName) return { error: "Invalid player name" };

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: existing } = await supabase
    .from("favourite_players")
    .select("id")
    .eq("user_id", user.id)
    .eq("player_id", playerId)
    .maybeSingle();

  const slug = getPlayerById(playerId)?.slug;

  if (existing) {
    const { error } = await supabase
      .from("favourite_players")
      .delete()
      .eq("user_id", user.id)
      .eq("player_id", playerId);

    if (error) return { error: "Failed to remove favourite" };

    revalidateLocalizedPath("/profile");
    if (slug) revalidateLocalizedPath(`/player/${slug}`);
    return { favourited: false };
  }

  const { error } = await supabase.from("favourite_players").insert({
    user_id: user.id,
    player_id: playerId,
    player_name: cleanName,
    player_photo: cleanPhoto,
  });

  if (error) return { error: "Failed to add favourite" };

  revalidateLocalizedPath("/profile");
  if (slug) revalidateLocalizedPath(`/player/${slug}`);
  return { favourited: true };
}

/* ── Saved Articles ── */

export async function toggleSavedArticle(article: {
  url: string;
  title: string;
  snippet?: string;
  thumbnail?: string;
  source?: string;
  language?: string;
  publishedAt?: string;
}) {
  if (!article || typeof article.url !== "string" || !isKnownNewsSourceUrl(article.url)) {
    return { error: "Invalid article URL" };
  }
  const cleanTitle = String(article.title ?? "").trim().slice(0, MAX_TITLE_LENGTH);
  if (!cleanTitle) return { error: "Invalid article title" };

  const canonicalUrl = canonicalizeArticleUrl(article.url);
  const variants = articleUrlVariants(article.url);

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: existing } = await supabase
    .from("saved_articles")
    .select("id")
    .eq("user_id", user.id)
    .in("article_url", variants)
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("saved_articles")
      .delete()
      .eq("user_id", user.id)
      .in("article_url", variants);

    if (error) return { error: "Failed to unsave" };
    revalidateLocalizedPath("/profile");
    return { saved: false };
  }

  const cleanThumb =
    article.thumbnail && /^https:\/\//i.test(article.thumbnail)
      ? article.thumbnail.slice(0, MAX_URL_LENGTH)
      : null;

  const { error } = await supabase.from("saved_articles").insert({
    user_id: user.id,
    article_url: canonicalUrl,
    article_title: cleanTitle,
    article_snippet: article.snippet ? String(article.snippet).slice(0, MAX_SNIPPET_LENGTH) : null,
    article_thumbnail: cleanThumb,
    article_source: article.source ? String(article.source).slice(0, 40) : null,
    article_language: article.language === "vi" ? "vi" : "en",
    article_published_at: article.publishedAt ? String(article.publishedAt).slice(0, 64) : null,
  });

  if (error) return { error: "Failed to save" };
  revalidateLocalizedPath("/profile");
  return { saved: true };
}

export async function unsaveArticle(articleUrl: string) {
  if (!articleUrl || typeof articleUrl !== "string" || articleUrl.length > MAX_URL_LENGTH) {
    return { error: "Invalid article URL" };
  }
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("saved_articles")
    .delete()
    .eq("user_id", user.id)
    .in("article_url", articleUrlVariants(articleUrl));

  if (error) return { error: "Failed to unsave" };
  revalidateLocalizedPath("/profile");
  return { success: true };
}
