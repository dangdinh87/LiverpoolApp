import "server-only";
import { v2 as cloudinary } from "cloudinary";
import { getEnv } from "@/lib/env";

/** Gallery folder in Cloudinary */
const GALLERY_FOLDER = "lfc-gallery";

function getConfiguredCloudinary() {
  cloudinary.config({
    cloud_name: getEnv("CLOUDINARY_CLOUD_NAME"),
    api_key: getEnv("CLOUDINARY_API_KEY"),
    api_secret: getEnv("CLOUDINARY_API_SECRET"),
  });
  return cloudinary;
}

/** Upload an image buffer to the gallery folder */
export async function uploadGalleryImage(
  file: Buffer | string,
  options: { category: string; alt: string },
) {
  const result = await getConfiguredCloudinary().uploader.upload(
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

/** Delete an image from Cloudinary */
export async function deleteGalleryImage(publicId: string) {
  return getConfiguredCloudinary().uploader.destroy(publicId);
}
