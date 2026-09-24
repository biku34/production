import type { MetadataRoute } from "next";

/** Served by Next at /manifest.webmanifest. Makes the app installable (PWA). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fabric Plant — Production",
    short_name: "Fabric Prod",
    description:
      "Production module for a fabric manufacturing plant — work orders, job board, stage tracking, QC, packing and dispatch.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f6f7f9",
    theme_color: "#0b7d54",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
