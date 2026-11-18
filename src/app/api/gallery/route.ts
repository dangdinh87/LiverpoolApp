import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isAdminEmail, GALLERY_CATEGORIES } from "@/lib/constants";
import { uploadGalleryImage, deleteGalleryImage } from "@/lib/cloudinary";
import {
  listGalleryImagesFromDB,
  insertGalleryImage,
  deleteGalleryImageFromDB,
  getGalleryImageById,
} from "@/lib/gallery/queries";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);
const MAX_GALLERY_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

/** GET /api/gallery?offset=0&limit=50&category=all — paginated gallery images */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const rawOffset = Number.parseInt(searchParams.get("offset") || "0", 10);
    const rawLimit = Number.parseInt(searchParams.get("limit") || "50", 10);
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 50;
    const category = searchParams.get("category") || "all";
    if (
      category !== "all" &&
      !GALLERY_CATEGORIES.includes(category as (typeof GALLERY_CATEGORIES)[number])
    ) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: all, ${GALLERY_CATEGORIES.join(", ")}` },
        { status: 400 },
      );
    }
    const search = (searchParams.get("search") || "").slice(0, 120);

    const { images, total } = await listGalleryImagesFromDB({
      limit,
      offset,
      category,
      search,
    });

    return NextResponse.json(
      {
        images: images.map((img) => ({
          id: img.id,
          src: img.cloudinary_url,
          alt: img.alt,
          category: img.category,
          width: img.width ?? undefined,
          height: img.height ?? undefined,
          cloudinaryId: img.cloudinary_public_id,
          isHomepageEligible: img.is_homepage_eligible,
        })),
        total,
        hasMore: offset + images.length < total,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    console.error("[gallery] list error:", error);
    return NextResponse.json(
      { error: "Failed to list images" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

/** POST /api/gallery — upload image (admin only) */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const alt = String(formData.get("alt") ?? "").trim().slice(0, 300);
    const category = String(formData.get("category") ?? "anfield").trim() || "anfield";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Unsupported image format" },
        { status: 400 },
      );
    }
    if (file.size <= 0 || file.size > MAX_GALLERY_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "Image must be under 10 MB" },
        { status: 400 },
      );
    }

    if (
      !GALLERY_CATEGORIES.includes(
        category as (typeof GALLERY_CATEGORIES)[number],
      )
    ) {
      return NextResponse.json(
        {
          error: `Invalid category. Must be one of: ${GALLERY_CATEGORIES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Upload to Cloudinary
    const buffer = Buffer.from(await file.arrayBuffer());
    const cloudinaryResult = await uploadGalleryImage(buffer, { category, alt });

    // Persist to Supabase
    const dbRow = await insertGalleryImage({
      cloudinary_public_id: cloudinaryResult.id,
      cloudinary_url: cloudinaryResult.src,
      alt,
      category: category as (typeof GALLERY_CATEGORIES)[number],
      width: cloudinaryResult.width,
      height: cloudinaryResult.height,
    });

    return NextResponse.json({
      image: {
        id: dbRow.id,
        src: dbRow.cloudinary_url,
        alt: dbRow.alt,
        category: dbRow.category,
        cloudinaryId: dbRow.cloudinary_public_id,
      },
    });
  } catch (error) {
    console.error("[gallery] upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 },
    );
  }
}

/** DELETE /api/gallery — delete image (admin only) */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const id = typeof body?.id === "string" ? body.id.trim() : "";
    if (!id || id.length > 128) {
      return NextResponse.json({ error: "No valid id provided" }, { status: 400 });
    }

    // Look up the image to get Cloudinary public_id
    const image = await getGalleryImageById(id);
    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Delete from Supabase first, then Cloudinary
    await deleteGalleryImageFromDB(id);
    await deleteGalleryImage(image.cloudinary_public_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[gallery] delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 },
    );
  }
}
