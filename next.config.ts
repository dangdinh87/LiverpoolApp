import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Premier League (FPL player photos + team badges)
      { protocol: "https", hostname: "resources.premierleague.com" },
      // Unsplash (hero backgrounds)
      { protocol: "https", hostname: "images.unsplash.com" },
      // Supabase Storage (user avatars)
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.supabase.in" },
    ],
  },
};

export default nextConfig;
