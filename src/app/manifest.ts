import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#f7faf9",
    categories: ["medical", "business", "productivity"],
    description:
      "Gestion veterinaria para clinicas, agenda, pacientes, inventario y facturacion.",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    icons: [
      {
        src: "/icons/192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        purpose: "maskable",
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        purpose: "maskable",
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    id: "/",
    lang: "es",
    name: "Karey Vet",
    orientation: "portrait",
    scope: "/",
    short_name: "KareyVet",
    start_url: "/",
    theme_color: "#0d9488",
  };
}
