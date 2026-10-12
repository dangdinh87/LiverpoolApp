import type { MetadataRoute } from "next";
import { BRAND, brandDescription, brandTagline } from "@/lib/brand";
import { routing } from "@/i18n/routing";

/**
 * One manifest serves the whole site, so it has to pick a language: there is no
 * request locale to read at /manifest.webmanifest, and the install prompt shows
 * whatever is in here to everyone.
 *
 * It used to be hardcoded Vietnamese — name "Fan Liverpool Việt Nam",
 * `lang: "vi"`, the Vietnamese description — from when the site was aimed at
 * Vietnam. The default locale is English now and readers are everywhere, so it
 * follows `routing.defaultLocale` and the shared brand copy instead of naming
 * one country.
 */
export default function manifest(): MetadataRoute.Manifest {
  const locale = routing.defaultLocale;

  return {
    name: `${BRAND.name} — ${brandTagline(locale)}`,
    short_name: BRAND.name,
    description: brandDescription(locale),
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0d0d0d",
    theme_color: BRAND.red,
    lang: locale,
    categories: ["sports"],
    // The own mark only (red square, white L): the club crest is not our logo.
    // The maskable icon is full-bleed with the art shrunk into the safe zone (scripts/build-brand-icons.ts).
    icons: [
      { src: BRAND.assets.favicon32, sizes: "32x32", type: "image/png" },
      { src: BRAND.assets.icon192, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: BRAND.assets.icon512, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: BRAND.assets.iconMaskable, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
