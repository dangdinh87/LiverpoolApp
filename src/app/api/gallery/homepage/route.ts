import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/constants";
import { setSiteSetting } from "@/lib/gallery/queries";

const MAX_URL_LEN = 2048;

function isValidHeroUrl(raw: string): boolean {
  if (!raw || raw.length > MAX_URL_LEN) return false;
  if (raw.startsWith("/assets/") && !raw.includes("..")) return true;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "https:" && parsed.hostname === "res.cloudinary.com";
  } catch {
    return false;
  }
}

/** POST /api/gallery/homepage — set homepage hero background (admin only) */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const rawId = (body as { galleryImageId?: unknown }).galleryImageId;
    const rawUrl = (body as { cloudinaryUrl?: unknown }).cloudinaryUrl;

    if (rawId != null && typeof rawId !== "string") {
      return NextResponse.json({ error: "Invalid galleryImageId" }, { status: 400 });
    }
    if (rawUrl != null && typeof rawUrl !== "string") {
      return NextResponse.json({ error: "Invalid cloudinaryUrl" }, { status: 400 });
    }

    const galleryImageId = typeof rawId === "string" ? rawId.trim() : "";
    const cloudinaryUrl = typeof rawUrl === "string" ? rawUrl.trim() : "";

    // Allow resetting to default by passing null/empty
    if (!galleryImageId && !cloudinaryUrl) {
      await setSiteSetting("homepage_hero_image", null);
      return NextResponse.json({ success: true, reset: true });
    }

    // Direct URL mode (from preset selector)
    if (cloudinaryUrl && !galleryImageId) {
      if (!isValidHeroUrl(cloudinaryUrl)) {
        return NextResponse.json({ error: "Unsupported hero image URL" }, { status: 400 });
      }
      await setSiteSetting("homepage_hero_image", {
        gallery_image_id: null,
        cloudinary_url: cloudinaryUrl,
      });
      return NextResponse.json({ success: true });
    }

    if (galleryImageId.length > 128) {
      return NextResponse.json({ error: "Invalid galleryImageId" }, { status: 400 });
    }

    // Gallery image ID mode (from gallery admin)
    const { data: image, error } = await supabase
      .from("gallery_images")
      .select("id, cloudinary_url, is_homepage_eligible")
      .eq("id", galleryImageId)
      .single();

    if (error || !image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    await setSiteSetting("homepage_hero_image", {
      gallery_image_id: image.id,
      cloudinary_url: image.cloudinary_url,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[gallery/homepage] error:", error);
    return NextResponse.json(
      { error: "Failed to update homepage image" },
      { status: 500 },
    );
  }
}
