import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Snapbell Photos",
    short_name: "Photos",
    description: "View, favorite and order your picture day photos.",
    start_url: "/shop",
    scope: "/shop/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf7f2",
    theme_color: "#faf7f2",
    icons: [
      { src: "/shop/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/shop/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/shop/icons/512", sizes: "512x512", type: "image/png" },
      { src: "/shop/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
