import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND.name} — Fan Liverpool Việt Nam`,
    short_name: BRAND.name,
    description: BRAND.description.vi,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0d0d0d",
    theme_color: BRAND.red,
    lang: "vi",
    categories: ["sports"],
    // The own mark only (red square, white L): the club crest is not our logo.
    // The L sits inside the maskable safe zone, so one file serves both purposes.
    icons: [
      { src: BRAND.assets.favicon32, sizes: "32x32", type: "image/png" },
      { src: BRAND.assets.icon192, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: BRAND.assets.icon512, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: BRAND.assets.icon512, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
