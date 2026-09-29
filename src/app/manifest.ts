import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Erqan Panel",
    short_name: "Erqan",
    description: "Sanal emlak yatırımlarınızı yönetin: mülk satın alın, kiraya verin, kazancınızı takip edin.",
    lang: "tr",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f2f2f7",
    theme_color: "#0F91E3",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Satın al", url: "/market" },
      { name: "İlanlar", url: "/listings" },
      { name: "Cüzdan", url: "/wallet" },
    ],
  }
}
