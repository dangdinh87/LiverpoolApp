import "server-only";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/** Gallery folder in Cloudinary */
const GALLERY_FOLDER = "lfc-gallery";

/** Upload an image buffer to the gallery folder */
export async function uploadGalleryImage(
  file: Buffer | string,
  options: { category: string; alt: string },
) {
  const result = await cloudinary.uploader.upload(
    typeof file === "string"
      ? file
      : `data:image/jpeg;base64,${file.toString("base64")}`,
    {
      folder: GALLERY_FOLDER,
      tags: [options.category, "lfc-gallery"],
      context: `alt=${options.alt}|category=${options.category}`,
      transformation: [{ quality: "auto", fetch_format: "auto" }],
    },
  );
  return {
    id: result.public_id,
    src: result.secure_url,
    width: result.width,
    height: result.height,
  };
}

/** Upload an image from URL (used by seed script) */
export async function uploadFromUrl(
  url: string,
  options: { publicId: string; category: string; alt: string },
) {
  const result = await cloudinary.uploader.upload(url, {
    folder: GALLERY_FOLDER,
    public_id: options.publicId,
    tags: [options.category, "lfc-gallery"],
    context: `alt=${options.alt}|category=${options.category}`,
    overwrite: false,
    unique_filename: false,
  });
  return {
    publicId: result.public_id,
    url: result.secure_url,
    width: result.width,
    height: result.height,
  };
}

/** Delete an image from Cloudinary */
export async function deleteGalleryImage(publicId: string) {
  return cloudinary.uploader.destroy(publicId);
}

/** List all gallery images from Cloudinary (fallback, prefer Supabase) */
export async function listGalleryImages() {
  const result = await cloudinary.api.resources_by_tag("lfc-gallery", {
    max_results: 500,
    context: true,
    tags: true,
  });

  return result.resources.map(
    (r: {
      public_id: string;
      secure_url: string;
      width: number;
      height: number;
      context?: { custom?: { alt?: string; category?: string } };
      tags?: string[];
    }) => ({
      id: r.public_id,
      src: r.secure_url,
      alt: r.context?.custom?.alt || r.public_id.split("/").pop() || "",
      category: r.context?.custom?.category || "anfield",
      width: r.width,
      height: r.height,
    }),
  );
}

export { cloudinary };
