import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // API-Football player/team photos
      { protocol: "https", hostname: "media.api-sports.io" },
      { protocol: "https", hostname: "media.api-sports.com" },
      // Unsplash (hero backgrounds)
      { protocol: "https", hostname: "images.unsplash.com" },
      // Supabase Storage (user avatars)
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.supabase.in" },
    ],
  },
};

export default nextConfig;
