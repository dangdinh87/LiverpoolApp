import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Liverpool FC Việt Nam",
    short_name: "LFC VN",
    description:
      "Tin tức Liverpool FC, lịch thi đấu, đội hình, bảng xếp hạng và thống kê cho cộng đồng fan Việt Nam.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0b0b0d",
    theme_color: "#c8102e",
    lang: "vi",
    categories: ["sports", "news"],
    icons: [
      {
        src: "/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/assets/lfc/crest.webp",
        sizes: "512x512",
        type: "image/webp",
        purpose: "any",
      },
    ],
  };
}
