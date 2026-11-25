import "server-only";

import { cookies } from "next/headers";
import { isAdminEmail } from "@/lib/constants";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { moderateDisplayName } from "./moderation";

export const GUEST_TOKEN_COOKIE = "ad_guest_token";
export const DISPLAY_NAME_COOKIE = "ad_display_name";
export const COMMUNITY_NAME_STORAGE_KEY = "ad_community_name";

const TOKEN_RE = /^[0-9a-f]{64}$/;
const ONE_YEAR_SEC = 365 * 24 * 60 * 60;

export interface CommunityActor {
  actorId: string;
  isMember: boolean;
  isAdmin: boolean;
  username: string | null;
  avatarUrl: string | null;
}

/** Generate a 64-char hex secret token using Web Crypto (workerd compatible). */
export function generateGuestToken(): string {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Derive a deterministic UUIDv4-formatted actorId from a raw guest token.
 * Because SHA-256 is one-way, exposing `actorId` in public DB tables never
 * reveals the caller's `ad_guest_token` cookie.
 */
export async function deriveGuestUuid(token: string): Promise<string> {
  const data = new TextEncoder().encode(`anfield-daily-actor:v1:${token}`);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest.slice(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/** Normalise a public guest nickname and reject profanity, ads, HTML, or reserved labels. */
export function sanitizeDisplayName(raw: unknown): string | null {
  const checked = moderateDisplayName(raw);
  return checked.ok ? checked.name : null;
}

export function fallbackFanName(actorId: string): string {
  const short = actorId.replace(/-/g, "").slice(0, 4).toUpperCase();
  return `Fan ${short || "KOP"}`;
}

function cookieOptions(httpOnly: boolean) {
  return {
    httpOnly,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR_SEC,
  };
}

async function readSignedInMember(): Promise<CommunityActor | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    const user = data.user;
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("username, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();

    const username = sanitizeDisplayName(profile?.username) ?? fallbackFanName(user.id);
    return {
      actorId: user.id,
      isMember: true,
      isAdmin: isAdminEmail(user.email),
      username,
      avatarUrl: profile?.avatar_url ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Read the current viewer's identity without setting cookies (safe for GET
 * endpoints and server actions). Skips Supabase Auth network round-trip when
 * no `sb-` session cookie is present.
 */
export async function readCurrentActor(): Promise<CommunityActor | null> {
  const cookieStore = await cookies();
  const hasSbCookie = cookieStore.getAll().some((c) => c.name.startsWith("sb-"));

  if (hasSbCookie) {
    const member = await readSignedInMember();
    if (member) return member;
  }

  const rawToken = cookieStore.get(GUEST_TOKEN_COOKIE)?.value;
  if (!rawToken || !TOKEN_RE.test(rawToken)) return null;

  const actorId = await deriveGuestUuid(rawToken);
  const rawName = cookieStore.get(DISPLAY_NAME_COOKIE)?.value;
  const savedName = rawName ? sanitizeDisplayName(decodeSafe(rawName)) : null;

  return {
    actorId,
    isMember: false,
    isAdmin: false,
    username: savedName,
    avatarUrl: null,
  };
}

/**
 * Ensure the caller has a persistent identity (signed-in member OR cryptographically
 * hashed guest cookie) before writing a prediction or forum post.
 */
export async function ensureWritableActor(preferredName?: unknown): Promise<CommunityActor> {
  const cookieStore = await cookies();
  const hasSbCookie = cookieStore.getAll().some((c) => c.name.startsWith("sb-"));

  if (hasSbCookie) {
    const member = await readSignedInMember();
    if (member) return member;
  }

  const existingToken = cookieStore.get(GUEST_TOKEN_COOKIE)?.value;
  const validToken = existingToken && TOKEN_RE.test(existingToken) ? existingToken : null;
  const token = validToken ?? generateGuestToken();

  if (!validToken) {
    cookieStore.set(GUEST_TOKEN_COOKIE, token, cookieOptions(true));
  }

  const actorId = await deriveGuestUuid(token);
  const isClearedName = typeof preferredName === "string" && preferredName.trim() === "";
  const cleanPreferred = isClearedName ? null : sanitizeDisplayName(preferredName);
  const rawSavedName = cookieStore.get(DISPLAY_NAME_COOKIE)?.value;
  const savedName =
    isClearedName || !rawSavedName ? null : sanitizeDisplayName(decodeSafe(rawSavedName));

  if (isClearedName) {
    cookieStore.set(DISPLAY_NAME_COOKIE, "", { ...cookieOptions(false), maxAge: 0 });
  } else if (cleanPreferred) {
    cookieStore.set(DISPLAY_NAME_COOKIE, encodeURIComponent(cleanPreferred), cookieOptions(false));
  }

  return {
    actorId,
    isMember: false,
    isAdmin: false,
    username: cleanPreferred ?? savedName ?? fallbackFanName(actorId),
    avatarUrl: null,
  };
}

function decodeSafe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
