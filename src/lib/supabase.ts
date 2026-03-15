import { createBrowserClient } from "@supabase/ssr";

// Database types for user-related tables
export interface UserProfile {
  id: string;
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  cover_url: string | null;
  created_at: string;
}

export interface FavouritePlayer {
  id: string;
  user_id: string;
  player_id: number;
  player_name: string;
  player_photo: string | null;
  added_at: string;
}

export interface SavedArticle {
  id: string;
  user_id: string;
  article_url: string;
  article_title: string;
  article_snippet: string | null;
  article_thumbnail: string | null;
  article_source: string | null;
  article_language: string;
  article_published_at: string | null;
  saved_at: string;
}

/**
 * Client-side Supabase client.
 * Use in Client Components ("use client").
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
