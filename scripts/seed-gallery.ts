/**
 * Seed gallery: upload images from gallery.json to Cloudinary + Supabase.
 *
 * Usage: npx tsx scripts/seed-gallery.ts
 *
 * Requires env vars: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET,
 *                    NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Idempotent: skips images already in Supabase. Re-run to pick up failures.
 * Rate-limit aware: sequential uploads with 3s delay to avoid Wikipedia 429s.
 */
import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";
import { createClient } from "@supabase/supabase-js";
import galleryData from "../src/data/gallery.json";

// --- Config ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // service role bypasses RLS
);

const GALLERY_FOLDER = "lfc-gallery";
const DELAY_MS = 3000; // 3s between uploads to avoid Wikipedia rate limits
const MAX_RETRIES = 2;

interface GalleryEntry {
  id: string;
  src: string;
  alt: string;
  category: string;
  is_homepage_eligible?: boolean;
}

// --- Helpers ---
async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function uploadWithRetry(
  entry: GalleryEntry,
  attempt = 1,
): Promise<{ status: "uploaded" | "skipped" | "failed"; id: string; error?: string }> {
  const publicId = `${GALLERY_FOLDER}/${entry.id}`;

  // 1. Check if already in Supabase
  const { data: existing } = await supabase
    .from("gallery_images")
    .select("id")
    .eq("cloudinary_public_id", publicId)
    .single();

  if (existing) {
    return { status: "skipped", id: entry.id };
  }

  // 2. Upload to Cloudinary (one at a time)
  let result;
  try {
    result = await cloudinary.uploader.upload(entry.src, {
      folder: GALLERY_FOLDER,
      public_id: entry.id,
      tags: [entry.category, "lfc-gallery"],
      context: `alt=${entry.alt}|category=${entry.category}`,
      overwrite: false,
      unique_filename: false,
    });
  } catch (err: unknown) {
    const error = err as { http_code?: number; message?: string; error?: { message?: string } };
    const errMsg = error.message || error.error?.message || JSON.stringify(err);

    // If already exists in Cloudinary, retrieve it
    if (error.http_code === 409 || errMsg.includes("already exists")) {
      try {
        const resource = await cloudinary.api.resource(publicId, { context: true });
        result = resource;
      } catch {
        return { status: "failed", id: entry.id, error: "Cloudinary conflict" };
      }
    }
    // Rate limited by Wikipedia — retry after longer delay
    else if (errMsg.includes("429") && attempt <= MAX_RETRIES) {
      const backoff = DELAY_MS * attempt * 2;
      console.log(`     ⏳ Rate limited, retry ${attempt}/${MAX_RETRIES} in ${backoff / 1000}s...`);
      await sleep(backoff);
      return uploadWithRetry(entry, attempt + 1);
    } else {
      return { status: "failed", id: entry.id, error: errMsg };
    }
  }

  // 3. Insert into Supabase
  const { error: dbError } = await supabase.from("gallery_images").upsert(
    {
      cloudinary_public_id: result.public_id,
      cloudinary_url: result.secure_url,
      alt: entry.alt,
      category: entry.category,
      width: result.width,
      height: result.height,
      is_homepage_eligible: entry.is_homepage_eligible ?? false,
    },
    { onConflict: "cloudinary_public_id" },
  );

  if (dbError) {
    return { status: "failed", id: entry.id, error: dbError.message };
  }

  return { status: "uploaded", id: entry.id };
}

// --- Main ---
async function main() {
  const entries = galleryData as GalleryEntry[];
  console.log(`\n🏟️  LFC Gallery Seed — ${entries.length} images (sequential, ${DELAY_MS / 1000}s delay)\n`);

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const result = await uploadWithRetry(entry);

    if (result.status === "uploaded") {
      uploaded++;
      console.log(`  ✅ [${i + 1}/${entries.length}] ${result.id}`);
    } else if (result.status === "skipped") {
      skipped++;
      console.log(`  ⏭️  [${i + 1}/${entries.length}] ${result.id} (exists)`);
    } else {
      failed++;
      console.log(`  ❌ [${i + 1}/${entries.length}] ${result.id}: ${result.error}`);
    }

    // Delay between uploads (skip for already-existing)
    if (result.status !== "skipped" && i < entries.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Uploaded: ${uploaded}`);
  console.log(`   Skipped:  ${skipped}`);
  console.log(`   Failed:   ${failed}`);
  console.log(`   Total:    ${entries.length}\n`);

  if (failed > 0) {
    console.log("⚠️  Some images failed. Re-run to retry (idempotent).\n");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
